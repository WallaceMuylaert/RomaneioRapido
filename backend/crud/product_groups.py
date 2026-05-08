from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from backend.models.product_groups import ProductGroup
from backend.models.products import Product
from backend.schemas.product_groups import ProductGroupCreate, ProductGroupUpdate


_DUPLICATE_CODE_MESSAGE = "Já existe um grupo com este código"


def _aggregate_columns():
    """Single source of truth for the columns we aggregate over Product."""
    return (
        func.count(Product.id).label("products_count"),
        func.coalesce(func.sum(Product.stock_quantity), 0.0).label("total_stock"),
        func.coalesce(func.sum(Product.stock_quantity * Product.price), 0.0).label("total_value"),
    )


def _aggregates_from_row(row) -> dict:
    return {
        "products_count": int(row.products_count or 0),
        "total_stock": float(row.total_stock or 0.0),
        "total_value": float(row.total_value or 0.0),
    }


def _empty_aggregates() -> dict:
    return {"products_count": 0, "total_stock": 0.0, "total_value": 0.0}


def _group_to_dict(group: ProductGroup, aggregates: dict) -> dict:
    return {
        "id": group.id,
        "code": group.code,
        "name": group.name,
        "description": group.description,
        "created_at": group.created_at,
        **aggregates,
    }


def _join_products_for_user(query, user_id: int):
    return query.join(
        Product,
        (Product.group_id == ProductGroup.id)
        & (Product.is_active == True)
        & (Product.user_id == user_id),
        isouter=True,
    )


def get_group_orm(db: Session, group_id: int, user_id: int) -> ProductGroup:
    return db.query(ProductGroup).filter(
        ProductGroup.id == group_id, ProductGroup.user_id == user_id
    ).first()


def list_groups(db: Session, user_id: int, search: str = None, skip: int = 0, limit: int = 200):
    """Single GROUP BY query — eliminates N+1."""
    base_filter = [ProductGroup.user_id == user_id]
    if search:
        like = f"%{search}%"
        base_filter.append(
            (ProductGroup.code.ilike(like)) | (ProductGroup.name.ilike(like))
        )

    total = db.query(func.count(ProductGroup.id)).filter(*base_filter).scalar() or 0

    rows = (
        _join_products_for_user(
            db.query(ProductGroup, *_aggregate_columns()),
            user_id,
        )
        .filter(*base_filter)
        .group_by(ProductGroup.id)
        .order_by(ProductGroup.name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    items = [_group_to_dict(row[0], _aggregates_from_row(row)) for row in rows]
    return items, total


def get_group(db: Session, group_id: int, user_id: int):
    row = (
        _join_products_for_user(
            db.query(ProductGroup, *_aggregate_columns()),
            user_id,
        )
        .filter(ProductGroup.id == group_id, ProductGroup.user_id == user_id)
        .group_by(ProductGroup.id)
        .first()
    )
    if not row:
        return None
    return _group_to_dict(row[0], _aggregates_from_row(row))


def count_groups(db: Session, user_id: int) -> int:
    return db.query(func.count(ProductGroup.id)).filter(
        ProductGroup.user_id == user_id
    ).scalar() or 0


def _check_code_collision(db: Session, user_id: int, code: str, exclude_id: int = None):
    """App-level case-insensitive collision check. Best-effort UX guard.

    Authoritative protection lives at the DB layer via a case-insensitive
    functional unique index — see backend/database/migrate.py.
    """
    query = db.query(ProductGroup.id).filter(
        ProductGroup.user_id == user_id,
        func.lower(ProductGroup.code) == code.lower(),
    )
    if exclude_id is not None:
        query = query.filter(ProductGroup.id != exclude_id)
    if query.first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_DUPLICATE_CODE_MESSAGE)


def _commit_or_translate_duplicate(db: Session):
    """Commit, translating any case-insensitive uniqueness violation into a 400."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_DUPLICATE_CODE_MESSAGE)


def create_group(db: Session, payload: ProductGroupCreate, user_id: int):
    code = payload.code.strip()
    name = payload.name.strip()

    _check_code_collision(db, user_id, code)

    db_group = ProductGroup(
        user_id=user_id,
        code=code,
        name=name,
        description=payload.description,
    )
    db.add(db_group)
    _commit_or_translate_duplicate(db)
    db.refresh(db_group)
    return _group_to_dict(db_group, _empty_aggregates())


def update_group(db: Session, group_id: int, payload: ProductGroupUpdate, user_id: int):
    db_group = get_group_orm(db, group_id, user_id)
    if not db_group:
        return None

    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] is not None:
        new_code = data["code"].strip()
        _check_code_collision(db, user_id, new_code, exclude_id=group_id)
        data["code"] = new_code
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

    for key, value in data.items():
        setattr(db_group, key, value)
    _commit_or_translate_duplicate(db)
    db.refresh(db_group)
    return get_group(db, group_id, user_id)


def delete_group(db: Session, group_id: int, user_id: int):
    db_group = get_group_orm(db, group_id, user_id)
    if not db_group:
        return None

    snapshot = get_group(db, group_id, user_id)
    db.query(Product).filter(
        Product.user_id == user_id, Product.group_id == group_id
    ).update({Product.group_id: None}, synchronize_session=False)
    db.delete(db_group)
    db.commit()
    return snapshot


def get_group_stock_report(db: Session, group_id: int, user_id: int):
    group = get_group(db, group_id, user_id)
    if not group:
        return None

    products = db.query(Product).filter(
        Product.user_id == user_id,
        Product.group_id == group_id,
        Product.is_active == True,
    ).order_by(
        Product.color.asc().nullsfirst(),
        Product.size.asc().nullsfirst(),
        Product.name.asc(),
    ).all()

    variants = [
        {
            "product_id": p.id,
            "name": p.name,
            "sku": p.sku,
            "barcode": p.barcode,
            "color": p.color,
            "size": p.size,
            "unit": p.unit,
            "stock_quantity": p.stock_quantity,
            "min_stock": p.min_stock,
            "price": p.price,
            "is_low_stock": p.stock_quantity <= p.min_stock,
        }
        for p in products
    ]

    return {"group": group, "variants": variants}


def get_grouped_stock_report(db: Session, user_id: int, search: str = None, include_ungrouped: bool = True):
    """Aggregated report — one row per group (plus optional 'Sem grupo')."""
    query = _join_products_for_user(
        db.query(
            ProductGroup.id.label("group_id"),
            ProductGroup.code.label("group_code"),
            ProductGroup.name.label("group_name"),
            *_aggregate_columns(),
        ),
        user_id,
    ).filter(ProductGroup.user_id == user_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            (ProductGroup.code.ilike(like)) | (ProductGroup.name.ilike(like))
        )

    rows = (
        query.group_by(ProductGroup.id, ProductGroup.code, ProductGroup.name)
        .order_by(ProductGroup.name.asc())
        .all()
    )

    items = [
        {
            "group_id": row.group_id,
            "group_code": row.group_code,
            "group_name": row.group_name,
            **_aggregates_from_row(row),
        }
        for row in rows
    ]

    if include_ungrouped and not search:
        ungrouped = db.query(*_aggregate_columns()).filter(
            Product.user_id == user_id,
            Product.is_active == True,
            Product.group_id.is_(None),
        ).first()
        if ungrouped and (ungrouped.products_count or 0) > 0:
            items.append({
                "group_id": None,
                "group_code": None,
                "group_name": "Sem grupo",
                **_aggregates_from_row(ungrouped),
            })

    total_products = sum(item["products_count"] for item in items)
    total_stock = sum(item["total_stock"] for item in items)
    total_value = sum(item["total_value"] for item in items)

    return {
        "items": items,
        "total_groups": len(items),
        "total_products": total_products,
        "total_stock": total_stock,
        "total_value": total_value,
    }
