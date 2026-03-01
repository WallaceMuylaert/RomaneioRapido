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
            "unit_snapshot": "unit"
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
    product_id: int = None, 
    search: str = None,
    movement_type: MovementType = None,
    skip: int = 0, 
    limit: int = 100
):
    query = db.query(InventoryMovement).options(
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
        
    total = query.count()
    items = query.order_by(InventoryMovement.created_at.desc()).offset(skip).limit(limit).all()
    
    return items, total


def get_stock_levels(db: Session):
    products = db.query(Product).filter(Product.is_active == True).all()
    levels = []
    for product in products:
        levels.append({
            "product_id": product.id,
            "product_name": product.name,
            "barcode": product.barcode,
            "stock_quantity": product.stock_quantity,
            "min_stock": product.min_stock,
            "price": product.price,
            "is_low_stock": product.stock_quantity <= product.min_stock
        })
    return levels
