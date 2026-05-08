from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload
from backend.models.clients import Client
from backend.models.pending_romaneio import PendingRomaneio
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingRomaneioUpdate
from backend.models.inventory import InventoryMovement, MovementType
from backend.models.products import Product


def get_pending_romaneios(db: Session, user_id: int):
    return db.query(PendingRomaneio).filter(PendingRomaneio.user_id == user_id).all()


def get_pending_romaneio(db: Session, pending_id: int, user_id: int):
    return db.query(PendingRomaneio).filter(
        PendingRomaneio.id == pending_id, 
        PendingRomaneio.user_id == user_id
    ).first()


def _validate_pending_payload(db: Session, pending, user_id: int) -> None:
    if pending.client_id is not None:
        client = db.query(Client).filter(Client.id == pending.client_id, Client.user_id == user_id).first()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cliente não encontrado",
            )

    product_ids = {item.product_id for item in pending.items if item.product_id}
    if not product_ids:
        return

    owned_product_ids = {
        product_id
        for product_id, in db.query(Product.id).filter(
            Product.id.in_(product_ids),
            Product.user_id == user_id,
            Product.is_active == True,
        ).all()
    }

    if product_ids != owned_product_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado",
        )


def create_pending_romaneio(db: Session, pending: PendingRomaneioCreate, user_id: int):
    _validate_pending_payload(db, pending, user_id)
    db_pending = PendingRomaneio(
        **pending.model_dump(),
        user_id=user_id
    )
    db.add(db_pending)
    try:
        db.flush()
        # Sync stock if needed
        if db_pending.empenhar_estoque:
            sync_pending_romaneio_stock(db, db_pending)
        else:
            db.commit()
        db.refresh(db_pending)
    except Exception:
        db.rollback()
        raise
        
    return db_pending


def update_pending_romaneio(db: Session, pending_id: int, pending: PendingRomaneioUpdate, user_id: int):
    db_pending = get_pending_romaneio(db, pending_id, user_id)
    if not db_pending:
        return None

    _validate_pending_payload(db, pending, user_id)
    
    update_data = pending.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_pending, key, value)
    
    try:
        # Sync stock always (it handles empenhar_estoque toggle inside)
        sync_pending_romaneio_stock(db, db_pending)
        db.refresh(db_pending)
    except Exception:
        db.rollback()
        raise
    
    return db_pending


def delete_pending_romaneio(db: Session, pending_id: int, user_id: int):
    db_pending = get_pending_romaneio(db, pending_id, user_id)
    if not db_pending:
        return False
    
    # Ensure stock is restored before deleting
    if db_pending.empenhar_estoque:
        db_pending.empenhar_estoque = False
        sync_pending_romaneio_stock(db, db_pending)
        
    db.delete(db_pending)
    db.commit()
    return True


def _load_products_by_ids(db: Session, user_id: int, product_ids: set, only_active: bool):
    if not product_ids:
        return {}
    query = db.query(Product).filter(
        Product.id.in_(product_ids),
        Product.user_id == user_id,
    )
    if only_active:
        query = query.filter(Product.is_active == True)
    return {p.id: p for p in query.all()}


def sync_pending_romaneio_stock(db: Session, db_pending: PendingRomaneio):
    """
    Sincroniza as movimentaçōes de estoque vinculadas a este rascunho de romaneio.
    Cria, remove ou ajusta quantidades dependendo do estado atual do rascunho.

    Otimização: carrega todos os produtos envolvidos em uma única query (IN clause),
    eliminando o N+1 que tornava o auto-save lento em carrinhos grandes.
    """
    # 1. Buscar movimentos existentes para este rascunho (single query).
    # selectinload do product evita N+1 quando o SQLAlchemy precisa do
    # relationship ao deletar movements (back_populates="movements" em Product).
    existing_movements = db.query(InventoryMovement).options(
        selectinload(InventoryMovement.product)
    ).filter(
        InventoryMovement.pending_romaneio_id == db_pending.id,
        InventoryMovement.created_by == db_pending.user_id
    ).all()

    if not db_pending.empenhar_estoque:
        # Empenho desativado: devolve estoque (inclusive de produtos inativos) e remove movimentos.
        product_ids = {m.product_id for m in existing_movements}
        products_map = _load_products_by_ids(db, db_pending.user_id, product_ids, only_active=False)

        movements_to_delete = []
        for m in existing_movements:
            product = products_map.get(m.product_id)
            if product:
                if m.movement_type == MovementType.OUT:
                    product.stock_quantity += m.quantity
                elif m.movement_type == MovementType.IN:
                    product.stock_quantity -= m.quantity
            movements_to_delete.append(m)

        # Bulk delete via DELETE WHERE id IN (...) evita N lazy-loads do
        # relationship Product que session.delete() dispararia.
        if movements_to_delete:
            db.query(InventoryMovement).filter(
                InventoryMovement.id.in_([m.id for m in movements_to_delete])
            ).delete(synchronize_session=False)
            # Remove os objetos deletados da identity map para evitar conflitos
            # caso o auto-increment reaproveite IDs (comportamento do SQLite).
            for m in movements_to_delete:
                db.expunge(m)
        db.commit()
        return

    # 2. Empenho ativo. Sincronizar itens.
    # Agrupar itens do JSON por product_id (caso haja duplicatas acidentais)
    new_items_map: dict = {}
    for item_data in db_pending.items:
        pid = item_data.get('product_id')
        qty = item_data.get('quantity', 0)
        if pid:
            new_items_map[pid] = new_items_map.get(pid, 0) + qty

    old_movements_map = {m.product_id: m for m in existing_movements}

    # Carrega TODOS os produtos envolvidos numa única query (ativos E inativos).
    # O filtro de is_active é aplicado em memória apenas onde faz sentido —
    # validação e criação de novos empenhos exigem produto ativo, mas a
    # devolução de estoque ao remover empenhos antigos deve funcionar mesmo
    # se o produto foi desativado depois (preserva comportamento original).
    all_pids = set(new_items_map.keys()) | set(old_movements_map.keys())
    products_map = _load_products_by_ids(db, db_pending.user_id, all_pids, only_active=False)

    # Validação prévia: estoque suficiente para os deltas positivos.
    insufficient = []
    for pid, new_qty in new_items_map.items():
        product = products_map.get(pid)
        if not product or not product.is_active:
            continue
        old_qty = old_movements_map[pid].quantity if pid in old_movements_map else 0
        diff = new_qty - old_qty
        if diff > 0 and diff > product.stock_quantity:
            insufficient.append(
                f"{product.name}: disponivel {product.stock_quantity}, solicitado adicional {diff}"
            )

    if insufficient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estoque insuficiente para empenho: " + "; ".join(insufficient),
        )

    # Aplicar deltas / criar novos movimentos (apenas para produtos ativos).
    for pid, new_qty in new_items_map.items():
        product = products_map.get(pid)
        if not product or not product.is_active:
            continue

        old_movement = old_movements_map.pop(pid, None)
        if old_movement:
            diff = new_qty - old_movement.quantity
            if diff != 0:
                old_movement.quantity = new_qty
                product.stock_quantity -= diff
        else:
            new_movement = InventoryMovement(
                product_id=pid,
                quantity=new_qty,
                movement_type=MovementType.OUT,
                notes=f"Empenho: {db_pending.customer_name or 'Cliente Avulso'}",
                pending_romaneio_id=db_pending.id,
                created_by=db_pending.user_id,
                client_id=db_pending.client_id,
                product_name_snapshot=product.name,
                product_barcode_snapshot=product.barcode,
                unit_price_snapshot=product.price,
                unit_snapshot=product.unit,
                product_color_snapshot=product.color,
                product_size_snapshot=product.size,
            )
            db.add(new_movement)
            product.stock_quantity -= new_qty

    # Remover movimentos de produtos que saíram do romaneio — devolve estoque
    # mesmo se o produto foi desativado entre o empenho e a remoção.
    movements_to_delete = []
    for pid, m in old_movements_map.items():
        product = products_map.get(pid)
        if product:
            product.stock_quantity += m.quantity
        movements_to_delete.append(m)

    if movements_to_delete:
        db.query(InventoryMovement).filter(
            InventoryMovement.id.in_([m.id for m in movements_to_delete])
        ).delete(synchronize_session=False)
        for m in movements_to_delete:
            db.expunge(m)

    db.commit()
