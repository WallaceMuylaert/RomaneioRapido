from sqlalchemy.orm import Session
from backend.models.products import Product
from backend.schemas.products import ProductCreate, ProductUpdate


def get_products(db: Session, skip: int = 0, limit: int = 100, search: str = None, category_id: int = None, sort_by: str = "name", order: str = "asc"):
    query = db.query(Product).filter(Product.is_active == True)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.barcode.ilike(f"%{search}%")) |
            (Product.sku.ilike(f"%{search}%"))
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    # Dynamic Sorting
    try:
        column = getattr(Product, sort_by)
        if order.lower() == "desc":
            query = query.order_by(column.desc())
        else:
            query = query.order_by(column.asc())
    except AttributeError:
        query = query.order_by(Product.name.asc())

    return query.offset(skip).limit(limit).all()


def count_products(db: Session, search: str = None, category_id: int = None):
    query = db.query(Product).filter(Product.is_active == True)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.barcode.ilike(f"%{search}%")) |
            (Product.sku.ilike(f"%{search}%"))
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)
    return query.count()


def get_product(db: Session, product_id: int):
    return db.query(Product).filter(Product.id == product_id).first()


def get_product_by_barcode(db: Session, barcode: str):
    return db.query(Product).filter(Product.barcode == barcode).first()


def get_product_by_sku(db: Session, sku: str):
    return db.query(Product).filter(Product.sku == sku).first()


def create_product(db: Session, product: ProductCreate):
    from backend.models.inventory import InventoryMovement
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Criar movimentação inicial se houver estoque
    if db_product.stock_quantity > 0:
        initial_movement = InventoryMovement(
            product_id=db_product.id,
            quantity=db_product.stock_quantity,
            movement_type='IN',
            notes='Estoque Inicial (Cadastro)',
            product_name_snapshot=db_product.name,
            product_barcode_snapshot=db_product.barcode,
            unit_price_snapshot=db_product.price,
            unit_snapshot=db_product.unit
        )
        db.add(initial_movement)
        db.commit()

    return db_product


def update_product(db: Session, product_id: int, product: ProductUpdate):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        return None
    update_data = product.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product


def delete_product(db: Session, product_id: int):
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        return None
    db_product.is_active = False
    db.commit()
    db.refresh(db_product)
    return db_product
