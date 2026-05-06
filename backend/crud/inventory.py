from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from decimal import Decimal, ROUND_HALF_UP
import uuid
from backend.models.clients import Client
from backend.models.inventory import InventoryMovement, MovementType
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.products import Product
from backend.schemas.inventory import InventoryMovementCreate, RomaneioFinalizeRequest


def _get_owned_product(db: Session, product_id: int, user_id: int) -> Product:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.user_id == user_id,
        Product.is_active == True
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )
    return product


def _validate_owned_relationships(db: Session, movement_data: dict, user_id: int) -> None:
    client_id = movement_data.get("client_id")
    if client_id is not None:
        client = db.query(Client).filter(Client.id == client_id, Client.user_id == user_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado",
            )

    pending_romaneio_id = movement_data.get("pending_romaneio_id")
    if pending_romaneio_id is not None:
        pending = db.query(PendingRomaneio).filter(
            PendingRomaneio.id == pending_romaneio_id,
            PendingRomaneio.user_id == user_id,
        ).first()
        if not pending:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Rascunho não encontrado",
            )


def create_movement(db: Session, movement: InventoryMovementCreate, user_id: int = None):
    # Buscar o produto para atualizar o estoque e preencher snapshots
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado",
        )

    product = _get_owned_product(db, movement.product_id, user_id)
    
    movement_data = movement.model_dump()
    _validate_owned_relationships(db, movement_data, user_id)
    
    # Preenchimento automático de snapshots se não forem fornecidos
    snapshot_map = {
        "product_name_snapshot": "name",
        "product_barcode_snapshot": "barcode",
        "unit_price_snapshot": "price",
        "unit_snapshot": "unit",
        "product_color_snapshot": "color",
        "product_size_snapshot": "size"
    }
    for snap_field, prod_field in snapshot_map.items():
        if not movement_data.get(snap_field):
            movement_data[snap_field] = getattr(product, prod_field)

    old_stock = product.stock_quantity
    if movement.movement_type == MovementType.OUT and product.stock_quantity < movement.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estoque insuficiente para {product.name}. Disponivel: {product.stock_quantity}, solicitado: {movement.quantity}",
        )

    # Criar o registro de movimentação
    db_movement = InventoryMovement(
        **movement_data,
        stock_before_snapshot=old_stock,
        created_by=user_id
    )
    db.add(db_movement)

    # Atualizar o estoque do produto
    if movement.movement_type == MovementType.IN:
        product.stock_quantity += movement.quantity
    elif movement.movement_type == MovementType.OUT:
        product.stock_quantity -= movement.quantity
    elif movement.movement_type == MovementType.ADJUSTMENT:
        product.stock_quantity = movement.quantity

    db.commit()
    db.refresh(db_movement)
    return db_movement


def _money(value: float) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def finalize_romaneio(db: Session, request: RomaneioFinalizeRequest, user_id: int):
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario nao autenticado",
        )

    if request.client_id is not None:
        client = db.query(Client).filter(Client.id == request.client_id, Client.user_id == user_id).first()
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente nao encontrado")

    pending = None
    pending_movements = []
    restored_by_product = {}
    if request.pending_romaneio_id is not None:
        pending = db.query(PendingRomaneio).filter(
            PendingRomaneio.id == request.pending_romaneio_id,
            PendingRomaneio.user_id == user_id,
        ).first()
        if pending:
            pending_movements = db.query(InventoryMovement).filter(
                InventoryMovement.pending_romaneio_id == pending.id,
                InventoryMovement.created_by == user_id,
            ).all()
            for movement in pending_movements:
                if movement.movement_type == MovementType.OUT:
                    restored_by_product[movement.product_id] = restored_by_product.get(movement.product_id, 0) + movement.quantity
                elif movement.movement_type == MovementType.IN:
                    restored_by_product[movement.product_id] = restored_by_product.get(movement.product_id, 0) - movement.quantity

    requested_by_product = {}
    product_ids = set()
    for item in request.items:
        product_ids.add(item.product_id)
        requested_by_product[item.product_id] = requested_by_product.get(item.product_id, 0) + item.quantity

    products = (
        db.query(Product)
        .filter(Product.id.in_(product_ids), Product.user_id == user_id, Product.is_active == True)
        .with_for_update()
        .all()
    )
    products_by_id = {product.id: product for product in products}
    if set(products_by_id) != product_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto nao encontrado")

    if not request.allow_negative_stock:
        insufficient = []
        for product_id, requested_qty in requested_by_product.items():
            product = products_by_id[product_id]
            available = product.stock_quantity + restored_by_product.get(product_id, 0)
            if requested_qty > available:
                insufficient.append(
                    f"{product.name}: disponivel {available}, solicitado {requested_qty}"
                )
        if insufficient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estoque insuficiente: " + "; ".join(insufficient),
            )

    subtotal = Decimal("0.00")
    item_totals = []
    for item in request.items:
        product = products_by_id[item.product_id]
        price = item.unit_price_snapshot if item.unit_price_snapshot is not None else product.price
        item_total = _money(price) * Decimal(str(item.quantity))
        item_totals.append(item_total)
        subtotal += item_total

    subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    discount_amount = (subtotal * Decimal(str(request.discount_percentage)) / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    discounts = []
    allocated_discount = Decimal("0.00")
    for index, item_total in enumerate(item_totals):
        if index == len(item_totals) - 1:
            item_discount = discount_amount - allocated_discount
        elif subtotal > 0:
            item_discount = (discount_amount * item_total / subtotal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            allocated_discount += item_discount
        else:
            item_discount = Decimal("0.00")
        discounts.append(float(item_discount))

    romaneio_id = f"ROM-{uuid.uuid4().hex[:12].upper()}"
    notes = f"Romaneio: {request.customer_name.strip()}" if request.customer_name and request.customer_name.strip() else "Nao identificado pelo operador"

    try:
        for movement in pending_movements:
            product = products_by_id.get(movement.product_id)
            if not product:
                product = db.query(Product).filter(Product.id == movement.product_id, Product.user_id == user_id).first()
            if product:
                if movement.movement_type == MovementType.OUT:
                    product.stock_quantity += movement.quantity
                elif movement.movement_type == MovementType.IN:
                    product.stock_quantity -= movement.quantity
            db.delete(movement)

        if pending:
            db.delete(pending)

        movement_ids = []
        for index, item in enumerate(request.items):
            product = products_by_id[item.product_id]
            old_stock = product.stock_quantity
            price = item.unit_price_snapshot if item.unit_price_snapshot is not None else product.price
            unit = item.unit_snapshot or product.unit

            db_movement = InventoryMovement(
                product_id=product.id,
                quantity=item.quantity,
                movement_type=MovementType.OUT,
                notes=notes,
                created_by=user_id,
                client_id=request.client_id,
                romaneio_id=romaneio_id,
                product_name_snapshot=item.product_name_snapshot or product.name,
                product_barcode_snapshot=item.product_barcode_snapshot or product.barcode,
                unit_price_snapshot=price,
                unit_snapshot=unit,
                product_color_snapshot=item.product_color_snapshot if item.product_color_snapshot is not None else product.color,
                product_size_snapshot=item.product_size_snapshot if item.product_size_snapshot is not None else product.size,
                discount_snapshot=discounts[index],
                stock_before_snapshot=old_stock,
            )
            db.add(db_movement)
            db.flush()
            movement_ids.append(db_movement.id)
            product.stock_quantity -= item.quantity

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "romaneio_id": romaneio_id,
        "movement_ids": movement_ids,
        "subtotal": float(subtotal),
        "discount_amount": float(discount_amount),
        "total_value": float(subtotal - discount_amount),
    }


def get_movements(
    db: Session, 
    user_id: int,
    product_id: int = None, 
    search: str = None,
    movement_type: MovementType = None,
    start_date: str = None,
    end_date: str = None,
    include_cancelled: bool = False,
    skip: int = 0, 
    limit: int = 1000
):
    query = db.query(InventoryMovement).filter(InventoryMovement.created_by == user_id).options(
        joinedload(InventoryMovement.product),
        joinedload(InventoryMovement.client)
    )
    query = query.filter(InventoryMovement.pending_romaneio_id.is_(None))

    if not include_cancelled:
        query = query.filter(InventoryMovement.is_cancelled.isnot(True))
    
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (InventoryMovement.product_name_snapshot.ilike(search_filter)) |
            (InventoryMovement.product_barcode_snapshot.ilike(search_filter))
        )
        
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)

    if start_date:
        from datetime import datetime, time, timedelta
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        # Ajuste para timezone local (Brasília -3h)
        # created_at é UTC. Se queremos o começo do dia local, subtraímos a diferença.
        base_start = datetime.combine(start_date, time.min)
        query = query.filter(InventoryMovement.created_at >= base_start + timedelta(hours=3))
        
    if end_date:
        from datetime import datetime, time, timedelta
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
        base_end = datetime.combine(end_date, time.max)
        query = query.filter(InventoryMovement.created_at <= base_end + timedelta(hours=3))
        
    total = query.count()
    items = query.order_by(InventoryMovement.created_at.desc()).offset(skip).limit(limit).all()
    
    # Sempre incluir o preco atual do produto, quando existir
    for item in items:
        if item.product:
            item.product_price = item.product.price
    
    return items, total


def get_stock_levels(
    db: Session, 
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    search: str = None,
    sort_by: str = "product_name",
    order: str = "asc"
):
    """Retorna níveis de estoque simplificados com paginação, busca e ordenação."""
    query = db.query(Product).filter(Product.is_active == True, Product.user_id == user_id)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_filter)) |
            (Product.barcode.ilike(search_filter)) |
            (Product.sku.ilike(search_filter))
        )
    
    # Mapeamento de campos de ordenação do frontend para o modelo
    sort_map = {
        "product_name": Product.name,
        "stock_quantity": Product.stock_quantity,
        "price": Product.price
    }
    
    sort_field = sort_map.get(sort_by, Product.name)
    if order == "desc":
        query = query.order_by(sort_field.desc())
    else:
        query = query.order_by(sort_field.asc())
        
    total = query.count()
    products = query.offset(skip).limit(limit).all()
    
    levels = []
    for product in products:
        levels.append({
            "product_id": product.id,
            "product_name": product.name,
            "barcode": product.barcode,
            "stock_quantity": product.stock_quantity,
            "min_stock": product.min_stock,
            "color": product.color,
            "size": product.size,
            "unit": product.unit,
            "price": product.price,
            "is_low_stock": product.stock_quantity <= product.min_stock
        })
    return levels, total


def get_dashboard_summary(db: Session, user_id: int):
    """Retorna contagens otimizadas para o Dashboard usando agregação SQL."""
    from sqlalchemy import func as sql_func, distinct
    from datetime import datetime, time, timedelta, timezone

    # Total de produtos ativos
    total_products = db.query(sql_func.count(Product.id)).filter(
        Product.is_active == True,
        Product.user_id == user_id
    ).scalar() or 0

    # Movimentações de hoje (contagem de romaneios únicos + movimentações avulsas)
    # Cálculo baseado no horário de Brasília (UTC-3)
    now_utc = datetime.now(timezone.utc)
    today_brasilia = (now_utc - timedelta(hours=3)).date()
    start_of_day_utc = datetime.combine(today_brasilia, time.min) + timedelta(hours=3)
    end_of_day_utc = datetime.combine(today_brasilia, time.max) + timedelta(hours=3)

    # 1. Contar romaneios únicos do dia
    romaneios_count = db.query(sql_func.count(distinct(InventoryMovement.romaneio_id))).filter(
        InventoryMovement.created_by == user_id,
        InventoryMovement.is_cancelled.isnot(True),
        InventoryMovement.pending_romaneio_id.is_(None),
        InventoryMovement.created_at >= start_of_day_utc,
        InventoryMovement.created_at <= end_of_day_utc,
        InventoryMovement.romaneio_id.isnot(None)
    ).scalar() or 0

    # 2. Contar movimentações avulsas (sem romaneio) do dia
    single_movements_count = db.query(sql_func.count(InventoryMovement.id)).filter(
        InventoryMovement.created_by == user_id,
        InventoryMovement.is_cancelled.isnot(True),
        InventoryMovement.pending_romaneio_id.is_(None),
        InventoryMovement.created_at >= start_of_day_utc,
        InventoryMovement.created_at <= end_of_day_utc,
        InventoryMovement.romaneio_id.is_(None)
    ).scalar() or 0

    # Produtos com estoque baixo
    low_stock_count = db.query(sql_func.count(Product.id)).filter(
        Product.is_active == True,
        Product.user_id == user_id,
        Product.stock_quantity <= Product.min_stock
    ).scalar() or 0

    return {
        "total_products": total_products,
        "today_movements": romaneios_count + single_movements_count,
        "low_stock_count": low_stock_count,
    }
    
    
def get_daily_reports(db: Session, user_id: int, start_date=None, end_date=None, movement_type: MovementType = None):
    from sqlalchemy import func
    from datetime import datetime, time
    
    query = db.query(InventoryMovement).options(joinedload(InventoryMovement.product)).filter(
        InventoryMovement.created_by == user_id,
        InventoryMovement.is_cancelled.isnot(True),
        InventoryMovement.pending_romaneio_id.is_(None)
    )
    
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)
    
    if start_date:
        from datetime import datetime, time, timedelta
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        base_start = datetime.combine(start_date, time.min)
        query = query.filter(InventoryMovement.created_at >= base_start + timedelta(hours=3))
        
    if end_date:
        from datetime import datetime, time, timedelta
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
        base_end = datetime.combine(end_date, time.max)
        query = query.filter(InventoryMovement.created_at <= base_end + timedelta(hours=3))
        
    movements = query.order_by(InventoryMovement.created_at.desc()).all()
    
    # Agrupar por romaneio_id para contar pedidos e somar valores
    romaneios = {}
    for m in movements:
        rid = m.romaneio_id or f"single-{m.id}"
        if rid not in romaneios:
            romaneios[rid] = 0
        unit_price = m.unit_price_snapshot if m.unit_price_snapshot is not None else (m.product.price if m.product else 0)
        gross_value = m.quantity * unit_price
        romaneios[rid] += gross_value - (m.discount_snapshot or 0)
        
    total_romaneios = len(romaneios)
    total_value = sum(romaneios.values())
    
    return {
        "total_romaneios": total_romaneios,
        "total_value": total_value,
        "start_date": start_date,
        "end_date": end_date
    }

def cancel_movement(db: Session, movement_id: int, user_id: int):
    # Buscar a movimentação
    movement = db.query(InventoryMovement).filter(
        InventoryMovement.id == movement_id,
        InventoryMovement.created_by == user_id
    ).first()
    
    if not movement:
        return None
        
    if movement.is_cancelled:
        return movement

    if movement.pending_romaneio_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Movimentacao de empenho deve ser alterada pelo rascunho de separacao.",
        )
        
    # Buscar o produto para reverter o estoque
    if movement.product_id:
        product = db.query(Product).filter(
            Product.id == movement.product_id,
            Product.user_id == user_id,
        ).first()
        if product:
            if movement.movement_type == MovementType.IN:
                product.stock_quantity -= movement.quantity
            elif movement.movement_type == MovementType.OUT:
                product.stock_quantity += movement.quantity
            elif movement.movement_type == MovementType.ADJUSTMENT and movement.stock_before_snapshot is not None:
                product.stock_quantity = movement.stock_before_snapshot
            elif movement.movement_type == MovementType.ADJUSTMENT:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ajuste antigo sem saldo anterior registrado nao pode ser cancelado automaticamente.",
                )
                
    # Marcar como cancelado
    movement.is_cancelled = True
    
    db.commit()
    db.refresh(movement)
    return movement
