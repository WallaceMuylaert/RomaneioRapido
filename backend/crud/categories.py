from sqlalchemy.orm import Session
from backend.models.categories import Category
from backend.models.products import Product
from backend.schemas.categories import CategoryCreate, CategoryUpdate


def get_categories(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Category).filter(Category.user_id == user_id).order_by(Category.position.asc(), Category.id.asc()).offset(skip).limit(limit).all()


def get_category(db: Session, category_id: int, user_id: int):
    return db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()


def create_category(db: Session, category: CategoryCreate, user_id: int):
    # Assign position as the next available
    from sqlalchemy import func
    max_pos = db.query(func.max(Category.position)).filter(Category.user_id == user_id).scalar()
    new_pos = (max_pos + 1) if max_pos is not None else 0
    db_category = Category(**category.model_dump(), position=new_pos, user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(db: Session, category_id: int, category: CategoryUpdate, user_id: int):
    db_category = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
    if not db_category:
        return None
    update_data = category.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)
    db.commit()
    db.refresh(db_category)
    return db_category


def delete_category(db: Session, category_id: int, user_id: int):
    db_category = db.query(Category).filter(Category.id == category_id, Category.user_id == user_id).first()
    if not db_category:
        return None
    db.query(Product).filter(
        Product.user_id == user_id,
        Product.category_id == category_id,
    ).update({Product.category_id: None}, synchronize_session=False)
    db.delete(db_category)
    db.commit()
    return db_category


def reorder_categories(db: Session, items: list, user_id: int):
    for item in items:
        db_category = db.query(Category).filter(Category.id == item.id, Category.user_id == user_id).first()
        if db_category:
            db_category.position = item.position
    db.commit()
