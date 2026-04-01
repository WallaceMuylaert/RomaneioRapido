import pytest
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.models.users import User
from backend.models.products import Product
from backend.models.pending_romaneio import PendingRomaneio
from backend.crud import pending_romaneio as crud_pending
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingRomaneioUpdate, PendingItem

@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="module")
def test_user(db_session):
    email = "manual_save_test@logicai.com.br"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="pw", full_name="Manual Save Tester", is_active=True)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    yield user
    # Cleanup
    db_session.query(PendingRomaneio).filter(PendingRomaneio.user_id == user.id).delete()
    db_session.query(Product).filter(Product.user_id == user.id).delete()
    db_session.delete(user)
    db_session.commit()

def test_manual_save_flow(db_session, test_user):
    """
    Testa o fluxo de salvamento manual (POST seguido de PUT)
    Garante que rascunhos retomados sejam atualizados em vez de duplicados.
    """
    # 1. Setup: Criar um produto
    product = Product(name="Produto Teste Manual", sku="SKU-MAN-1", stock_quantity=100.0, price=10.0, unit="UN", user_id=test_user.id)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)

    # 2. Simular primeiro salvamento manual (POST)
    pending_create = PendingRomaneioCreate(
        customer_name="Cliente Teste Manual",
        empenhar_estoque=True,
        items=[PendingItem(product_id=product.id, name=product.name, quantity=10.0, unit="UN", price=10.0)]
    )
    db_pending = crud_pending.create_pending_romaneio(db_session, pending_create, test_user.id)
    assert db_pending.id is not None
    assert db_pending.customer_name == "Cliente Teste Manual"
    
    # Verificar que o estoque foi empenhado
    db_session.refresh(product)
    assert product.stock_quantity == 90.0

    # 3. Simular atualização do mesmo rascunho (PUT) - Novo item ou nova quantidade
    pending_update = PendingRomaneioUpdate(
        customer_name="Cliente Teste Manual Atualizado",
        empenhar_estoque=True,
        items=[PendingItem(product_id=product.id, name=product.name, quantity=15.0, unit="UN", price=10.0)]
    )
    db_updated = crud_pending.update_pending_romaneio(db_session, db_pending.id, pending_update, test_user.id)
    
    assert db_updated.id == db_pending.id
    assert db_updated.customer_name == "Cliente Teste Manual Atualizado"
    
    # Verificar que o empenho foi ajustado corretamente (saída de 10 -> saída de 15)
    db_session.refresh(product)
    assert product.stock_quantity == 85.0

    # 4. Verificar se NÃO há duplicados para o usuário
    pendings = crud_pending.get_pending_romaneios(db_session, test_user.id)
    assert len(pendings) == 1

def test_manual_delete_restores_stock(db_session, test_user):
    """Garante que deletar o rascunho restaura o estoque empenhado."""
    product = db_session.query(Product).filter(Product.user_id == test_user.id).first()
    pendings = crud_pending.get_pending_romaneios(db_session, test_user.id)
    pending_id = pendings[0].id
    
    initial_stock = product.stock_quantity # Deve ser 85.0
    
    crud_pending.delete_pending_romaneio(db_session, pending_id, test_user.id)
    db_session.refresh(product)
    
    assert product.stock_quantity == initial_stock + 15.0
    assert product.stock_quantity == 100.0
