from fastapi import HTTPException, status
from sqlalchemy.orm import Session
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
    db.commit()
    db.refresh(db_pending)
    
    # Sync stock if needed
    if db_pending.empenhar_estoque:
        sync_pending_romaneio_stock(db, db_pending)
        
    return db_pending


def update_pending_romaneio(db: Session, pending_id: int, pending: PendingRomaneioUpdate, user_id: int):
    db_pending = get_pending_romaneio(db, pending_id, user_id)
    if not db_pending:
        return None

    _validate_pending_payload(db, pending, user_id)
    
    update_data = pending.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_pending, key, value)
    
    db.commit()
    db.refresh(db_pending)
    
    # Sync stock always (it handles empenhar_estoque toggle inside)
    sync_pending_romaneio_stock(db, db_pending)
    
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


def sync_pending_romaneio_stock(db: Session, db_pending: PendingRomaneio):
    """
    Sincroniza as movimentaçōes de estoque vinculadas a este rascunho de romaneio.
    Cria, remove ou ajusta quantidades dependendo do estado atual do rascunho.
    """
    # 1. Buscar movimentos existentes para este rascunho
    existing_movements = db.query(InventoryMovement).filter(
        InventoryMovement.pending_romaneio_id == db_pending.id,
        InventoryMovement.created_by == db_pending.user_id
    ).all()
    
    if not db_pending.empenhar_estoque:
        # Se empenho desativado, remover todos e devolver ao estoque
        for m in existing_movements:
            product = db.query(Product).filter(
                Product.id == m.product_id,
                Product.user_id == db_pending.user_id,
            ).first()
            if product:
                if m.movement_type == MovementType.OUT:
                    product.stock_quantity += m.quantity
                elif m.movement_type == MovementType.IN:
                    product.stock_quantity -= m.quantity
            db.delete(m)
        db.commit()
        return

    # 2. Empenho ativo. Sincronizar itens.
    # Agrupar itens do JSON por product_id (caso haja duplicatas acidentais)
    new_items_map = {}
    for item_data in db_pending.items:
        pid = item_data.get('product_id')
        qty = item_data.get('quantity', 0)
        if pid:
            new_items_map[pid] = new_items_map.get(pid, 0) + qty
    
    # Mapear movimentos antigos por product_id
    old_movements_map = {m.product_id: m for m in existing_movements}
    
    # Processar atualizações e novos empenhos
    for pid, new_qty in new_items_map.items():
        product = db.query(Product).filter(
            Product.id == pid,
            Product.user_id == db_pending.user_id,
            Product.is_active == True,
        ).first()
        if not product:
            continue
            
        old_movement = old_movements_map.pop(pid, None)
        if old_movement:
            # Atualizar movimento existente
            diff = new_qty - old_movement.quantity
            if diff != 0:
                old_movement.quantity = new_qty
                # Se aumentou a reserva (diff > 0), diminui o estoque disponível
                product.stock_quantity -= diff
        else:
            # Criar novo movimento de reserva
            new_movement = InventoryMovement(
                product_id=pid,
                quantity=new_qty,
                movement_type=MovementType.OUT,
                notes=f"Empenho: {db_pending.customer_name or 'Cliente Avulso'}",
                pending_romaneio_id=db_pending.id,
                created_by=db_pending.user_id,
                client_id=db_pending.client_id,
                # Snapshots do produto no momento do empenho
                product_name_snapshot=product.name,
                product_barcode_snapshot=product.barcode,
                unit_price_snapshot=product.price,
                unit_snapshot=product.unit,
                product_color_snapshot=product.color,
                product_size_snapshot=product.size
            )
            db.add(new_movement)
            product.stock_quantity -= new_qty
            
    # Remover movimentos de produtos que saíram do romaneio
    for pid, m in old_movements_map.items():
        product = db.query(Product).filter(
            Product.id == pid,
            Product.user_id == db_pending.user_id,
        ).first()
        if product:
            product.stock_quantity += m.quantity
        db.delete(m)
        
    db.commit()
