import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base
from backend.crud.inventory import create_movement
from backend.crud.pending_romaneio import create_pending_romaneio
from backend.models.categories import Category
from backend.models.clients import Client
from backend.models.inventory import InventoryMovement, MovementType
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.products import Product
from backend.models.users import User
from backend.schemas.inventory import InventoryMovementCreate
from backend.schemas.pending_romaneio import PendingItem, PendingRomaneioCreate


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def isolated_users(db):
    for email in ("security-user-a@logicai.com.br", "security-user-b@logicai.com.br"):
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.query(InventoryMovement).filter(InventoryMovement.created_by == existing.id).delete()
            db.query(PendingRomaneio).filter(PendingRomaneio.user_id == existing.id).delete()
            db.query(Product).filter(Product.user_id == existing.id).delete()
            db.query(Client).filter(Client.user_id == existing.id).delete()
            db.delete(existing)
    db.commit()

    user_a = User(
        email="security-user-a@logicai.com.br",
        hashed_password="pw",
        full_name="Security User A",
        is_active=True,
    )
    user_b = User(
        email="security-user-b@logicai.com.br",
        hashed_password="pw",
        full_name="Security User B",
        is_active=True,
    )
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)

    try:
        yield user_a, user_b
    finally:
        for user in (user_a, user_b):
            db.query(InventoryMovement).filter(InventoryMovement.created_by == user.id).delete()
            db.query(PendingRomaneio).filter(PendingRomaneio.user_id == user.id).delete()
            db.query(Product).filter(Product.user_id == user.id).delete()
            db.query(Client).filter(Client.user_id == user.id).delete()
            db.delete(user)
        db.commit()


def test_inventory_movement_cannot_touch_another_users_product(db, isolated_users):
    user_a, user_b = isolated_users
    product_b = Product(
        name="Produto Privado B",
        sku="SEC-PROD-B",
        stock_quantity=50,
        price=10,
        unit="UN",
        user_id=user_b.id,
    )
    db.add(product_b)
    db.commit()
    db.refresh(product_b)

    movement = InventoryMovementCreate(
        product_id=product_b.id,
        quantity=5,
        movement_type=MovementType.OUT,
    )

    with pytest.raises(HTTPException) as exc:
        create_movement(db, movement, user_id=user_a.id)

    assert exc.value.status_code == 404
    db.refresh(product_b)
    assert product_b.stock_quantity == 50


def test_inventory_movement_cannot_link_another_users_client(db, isolated_users):
    user_a, user_b = isolated_users
    product_a = Product(
        name="Produto Privado A",
        sku="SEC-PROD-A",
        stock_quantity=50,
        price=10,
        unit="UN",
        user_id=user_a.id,
    )
    client_b = Client(name="Cliente B", user_id=user_b.id)
    db.add_all([product_a, client_b])
    db.commit()
    db.refresh(product_a)
    db.refresh(client_b)

    movement = InventoryMovementCreate(
        product_id=product_a.id,
        quantity=5,
        movement_type=MovementType.OUT,
        client_id=client_b.id,
    )

    with pytest.raises(HTTPException) as exc:
        create_movement(db, movement, user_id=user_a.id)

    assert exc.value.status_code == 404
    db.refresh(product_a)
    assert product_a.stock_quantity == 50


def test_pending_romaneio_cannot_commit_another_users_product(db, isolated_users):
    user_a, user_b = isolated_users
    product_b = Product(
        name="Produto Rascunho B",
        sku="SEC-PENDING-B",
        stock_quantity=30,
        price=15,
        unit="UN",
        user_id=user_b.id,
    )
    db.add(product_b)
    db.commit()
    db.refresh(product_b)

    pending = PendingRomaneioCreate(
        customer_name="Cliente Teste",
        empenhar_estoque=True,
        items=[
            PendingItem(
                product_id=product_b.id,
                name=product_b.name,
                quantity=3,
                unit=product_b.unit,
                price=product_b.price,
            )
        ],
    )

    with pytest.raises(HTTPException) as exc:
        create_pending_romaneio(db, pending, user_id=user_a.id)

    assert exc.value.status_code == 404
    db.refresh(product_b)
    assert product_b.stock_quantity == 30
