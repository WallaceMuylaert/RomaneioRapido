from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.models.products import Product
from backend.schemas.products import ProductCreate, ProductUpdate


# Colunas permitidas para ordenação — whitelist explícita para evitar inference attacks
_ALLOWED_SORT_COLUMNS = {
    "name", "price", "cost_price", "stock_quantity",
    "min_stock", "sku", "barcode", "created_at", "updated_at",
}


def get_products(db: Session, user_id: int, skip: int = 0, limit: int = 100, search: str = None, category_id: int = None, sort_by: str = "name", order: str = "asc"):
    query = db.query(Product).filter(Product.is_active == True, Product.user_id == user_id)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.barcode.ilike(f"%{search}%")) |
            (Product.sku.ilike(f"%{search}%"))
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)

    if sort_by not in _ALLOWED_SORT_COLUMNS:
        sort_by = "name"
    
    column = getattr(Product, sort_by)
    
    if sort_by == "name":
        if order.lower() == "desc":
            query = query.order_by(func.length(Product.name).desc(), Product.name.desc())
        else:
            query = query.order_by(func.length(Product.name).asc(), Product.name.asc())
    else:
        if order.lower() == "desc":
            query = query.order_by(column.desc())
        else:
            query = query.order_by(column.asc())

    return query.offset(skip).limit(limit).all()


def count_products(db: Session, user_id: int, search: str = None, category_id: int = None):
    query = db.query(Product).filter(Product.is_active == True, Product.user_id == user_id)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.barcode.ilike(f"%{search}%")) |
            (Product.sku.ilike(f"%{search}%"))
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    return query.count()


def get_product(db: Session, product_id: int, user_id: int):
    return db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()


def get_product_by_barcode(db: Session, barcode: str, user_id: int):
    return db.query(Product).filter(Product.barcode == barcode, Product.user_id == user_id).first()


def get_product_by_sku(db: Session, sku: str, user_id: int):
    return db.query(Product).filter(Product.sku == sku, Product.user_id == user_id).first()


def create_product(db: Session, product: ProductCreate, user_id: int):
    from backend.models.inventory import InventoryMovement, MovementType
    db_product = Product(**product.model_dump(), user_id=user_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Criar movimentação inicial se houver estoque
    if db_product.stock_quantity > 0:
        initial_movement = InventoryMovement(
            product_id=db_product.id,
            quantity=db_product.stock_quantity,
            movement_type=MovementType.IN,
            notes='Estoque Inicial (Cadastro)',
            product_name_snapshot=db_product.name,
            product_barcode_snapshot=db_product.barcode,
            unit_price_snapshot=db_product.price,
            unit_snapshot=db_product.unit,
            created_by=user_id
        )
        db.add(initial_movement)
        db.commit()

    return db_product


def update_product(db: Session, product_id: int, product: ProductUpdate, user_id: int):
    from backend.models.inventory import InventoryMovement, MovementType
    db_product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()
    if not db_product:
        return None
    
    old_stock = db_product.stock_quantity
    update_data = product.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_product, key, value)
    
    new_stock = db_product.stock_quantity

    # Se o estoque mudou, registra a movimentação
    if old_stock != new_stock:
        diff = new_stock - old_stock
        mov_type = MovementType.IN if diff > 0 else MovementType.OUT
        
        movement = InventoryMovement(
            product_id=db_product.id,
            quantity=abs(diff),
            movement_type=mov_type,
            notes='Não identificado pelo operador',
            product_name_snapshot=db_product.name,
            product_barcode_snapshot=db_product.barcode,
            unit_price_snapshot=db_product.price,
            unit_snapshot=db_product.unit,
            created_by=user_id
        )
        db.add(movement)

    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, product_id: int, user_id: int):
    db_product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()
    if not db_product:
        return None
    db_product.is_active = False
    db.commit()
    db.refresh(db_product)
    return db_product
