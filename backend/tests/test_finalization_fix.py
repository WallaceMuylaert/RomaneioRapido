import pytest
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.models.users import User
from backend.models.categories import Category
from backend.models.clients import Client
from backend.models.products import Product
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.inventory import InventoryMovement, MovementType
from backend.crud.pending_romaneio import create_pending_romaneio, delete_pending_romaneio
from backend.crud.inventory import create_movement
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingItem
from backend.schemas.inventory import InventoryMovementCreate

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="module")
def test_user(db):
    email = "finalize_fix_test@logicai.com.br"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="pw", full_name="Tester Finalize", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
    yield user
    # Cleanup
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
        name="Produto Teste Finalizacao",
        sku="SKU_FIN_123",
        stock_quantity=100.0,
        price=50.0,
        unit="UN",
        user_id=test_user.id,
        is_active=True
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

def test_finalization_flow_and_stock_consistency(db, test_user, test_product):
    """
    Simula o fluxo completo de finalização:
    1. Criação de um rascunho com empenho (reserva).
    2. Exclusão do rascunho durante a finalização (deve restaurar estoque).
    3. Criação dos movimentos de estoque finais (deve deduzir estoque).
    Verifica se o saldo final do estoque está correto e se o rascunho sumiu.
    """
    initial_stock = test_product.stock_quantity
    
    # 1. Criar pedido em separação com empenho ativo
    pending_create = PendingRomaneioCreate(
        customer_name="Cliente Finalização",
        empenhar_estoque=True,
        items=[
            PendingItem(product_id=test_product.id, name=test_product.name, quantity=10.0, unit="UN", price=50.0)
        ]
    )
    db_pending = create_pending_romaneio(db, pending_create, test_user.id)
    
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock - 10.0 # Estoque reservado
    
    # 2. Simular o que o frontend faz no executeFinalize: deletar rascunho
    # Isso deve restaurar o estoque temporariamente
    delete_pending_romaneio(db, db_pending.id, test_user.id)
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock # Estoque restaurado
    
    # 3. Simular a criação do movimento de saída final
    movement_create = InventoryMovementCreate(
        product_id=test_product.id,
        quantity=10.0,
        movement_type=MovementType.OUT,
        notes="Venda Finalizada",
        romaneio_id="ROM-TEST-123",
        product_name_snapshot=test_product.name,
        unit_price_snapshot=test_product.price,
        unit_snapshot=test_product.unit
    )
    create_movement(db, movement_create, user_id=test_user.id)
    
    db.refresh(test_product)
    assert test_product.stock_quantity == initial_stock - 10.0 # Estoque final deduzido corretamente
    
    # 4. Verificar se o rascunho realmente sumiu
    assert db.query(PendingRomaneio).filter(PendingRomaneio.id == db_pending.id).first() is None
    
    # 5. Verificar se não há movimentos órfãos de empenho
    movements = db.query(InventoryMovement).filter(InventoryMovement.pending_romaneio_id == db_pending.id).all()
    assert len(movements) == 0
