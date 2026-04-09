from sqlalchemy.orm import Session, joinedload
from backend.models.inventory import InventoryMovement, MovementType
from backend.models.products import Product
from backend.schemas.inventory import InventoryMovementCreate


def create_movement(db: Session, movement: InventoryMovementCreate, user_id: int = None):
    # Buscar o produto para atualizar o estoque e preencher snapshots
    product = db.query(Product).filter(Product.id == movement.product_id).first()
    
    movement_data = movement.model_dump()
    
    # Preenchimento automático de snapshots se não forem fornecidos
    if product:
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

    # Criar o registro de movimentação
    db_movement = InventoryMovement(
        **movement_data,
        created_by=user_id
    )
    db.add(db_movement)

    # Atualizar o estoque do produto
    if product:
        if movement.movement_type == MovementType.IN:
            product.stock_quantity += movement.quantity
        elif movement.movement_type == MovementType.OUT:
            product.stock_quantity -= movement.quantity
        elif movement.movement_type == MovementType.ADJUSTMENT:
            product.stock_quantity = movement.quantity

    db.commit()
    db.refresh(db_movement)
    return db_movement


def get_movements(
    db: Session, 
    user_id: int,
    product_id: int = None, 
    search: str = None,
    movement_type: MovementType = None,
    start_date: str = None,
    end_date: str = None,
    skip: int = 0, 
    limit: int = 1000
):
    query = db.query(InventoryMovement).filter(InventoryMovement.created_by == user_id).options(
        joinedload(InventoryMovement.product),
        joinedload(InventoryMovement.client)
    )
    
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
    
    # Adicionar product_price a cada item se não estiver no snapshot
    for item in items:
        if item.unit_price_snapshot is None and item.product:
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
            "is_low_stock": product.stock_quantity < product.min_stock
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
        InventoryMovement.created_at >= start_of_day_utc,
        InventoryMovement.created_at <= end_of_day_utc,
        InventoryMovement.romaneio_id.isnot(None)
    ).scalar() or 0

    # 2. Contar movimentações avulsas (sem romaneio) do dia
    single_movements_count = db.query(sql_func.count(InventoryMovement.id)).filter(
        InventoryMovement.created_by == user_id,
        InventoryMovement.created_at >= start_of_day_utc,
        InventoryMovement.created_at <= end_of_day_utc,
        InventoryMovement.romaneio_id.is_(None)
    ).scalar() or 0

    # Produtos com estoque baixo
    low_stock_count = db.query(sql_func.count(Product.id)).filter(
        Product.is_active == True,
        Product.user_id == user_id,
        Product.stock_quantity < Product.min_stock
    ).scalar() or 0

    return {
        "total_products": total_products,
        "today_movements": romaneios_count + single_movements_count,
        "low_stock_count": low_stock_count,
    }
    
    
def get_daily_reports(db: Session, user_id: int, start_date=None, end_date=None, movement_type: MovementType = None):
    from sqlalchemy import func
    from datetime import datetime, time
    
    query = db.query(InventoryMovement).filter(
        InventoryMovement.created_by == user_id,
        InventoryMovement.is_cancelled == False
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
        romaneios[rid] += (m.quantity * (m.unit_price_snapshot or 0))
        
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
        
    # Buscar o produto para reverter o estoque
    if movement.product_id:
        product = db.query(Product).filter(Product.id == movement.product_id).first()
        if product:
            if movement.movement_type == MovementType.IN:
                product.stock_quantity -= movement.quantity
            elif movement.movement_type == MovementType.OUT:
                product.stock_quantity += movement.quantity
                
    # Marcar como cancelado
    movement.is_cancelled = True
    
    db.commit()
    db.refresh(movement)
    return movement
