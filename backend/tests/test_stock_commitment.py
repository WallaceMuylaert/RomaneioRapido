import pytest
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal, Base, engine
from backend.models.users import User
from backend.models.products import Product
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.inventory import InventoryMovement, MovementType
from backend.crud.pending_romaneio import create_pending_romaneio, update_pending_romaneio, delete_pending_romaneio
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingRomaneioUpdate, PendingItem

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="module")
def test_user(db):
    email = "test_reserve_real@logicai.com.br"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="pw", full_name="Tester Real", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
    yield user
    # Cleanup user movements and data
    try:
        db.query(InventoryMovement).filter(InventoryMovement.created_by == user.id).delete()
        db.query(PendingRomaneio).filter(PendingRomaneio.user_id == user.id).delete()
        db.query(Product).filter(Product.user_id == user.id).delete()
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()

@pytest.fixture
def test_product(db, test_user):
    product = Product(
        name="Produto Teste Real",
        sku="SKU_REAL_123",
        stock_quantity=100.0,
        price=10.0,
        unit="UN",
        user_id=test_user.id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

def test_sync_stock_commitment_flow_real_db(db, test_user, test_product):
    initial_stock = test_product.stock_quantity
    
    # 1. Create pending with commitment
    pending_create = PendingRomaneioCreate(
        customer_name="Cliente Teste Real",
        empenhar_estoque=True,
        items=[
            PendingItem(product_id=test_product.id, name=test_product.name, quantity=10.0, unit="UN", price=10.0)
        ]
    )
    db_pending = create_pending_romaneio(db, pending_create, test_user.id)
    
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock - 10.0
    
    movement = db.query(InventoryMovement).filter(InventoryMovement.pending_romaneio_id == db_pending.id).first()
    assert movement is not None
    assert movement.quantity == 10.0
    
    # 2. Update quantity
    pending_update = PendingRomaneioUpdate(
        customer_name="Cliente Teste Real",
        empenhar_estoque=True,
        items=[
            PendingItem(product_id=test_product.id, name=test_product.name, quantity=15.0, unit="UN", price=10.0)
        ]
    )
    update_pending_romaneio(db, db_pending.id, pending_update, test_user.id)
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock - 15.0
    
    db.refresh(movement)
    assert movement.quantity == 15.0
    
    # 3. Disable commitment
    pending_update.empenhar_estoque = False
    update_pending_romaneio(db, db_pending.id, pending_update, test_user.id)
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock
    assert db.query(InventoryMovement).filter(InventoryMovement.pending_romaneio_id == db_pending.id).count() == 0
    
    # 4. Re-enable and then delete
    pending_update.empenhar_estoque = True
    update_pending_romaneio(db, db_pending.id, pending_update, test_user.id)
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock - 15.0
    
    delete_pending_romaneio(db, db_pending.id, test_user.id)
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock
