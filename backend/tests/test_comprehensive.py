import pytest
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.models.users import User
from backend.models.products import Product
from backend.models.clients import Client
from backend.models.categories import Category
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.inventory import InventoryMovement, MovementType
from backend.crud import pending_romaneio as crud_pending
from backend.crud import inventory as crud_inventory
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingItem
from backend.schemas.inventory import InventoryMovementCreate

@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="module")
def shared_user(db_session):
    email = "comprehensive_test@logicai.com.br"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="pw", full_name="Comprehensive Tester", is_active=True)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    yield user
    # Cleanup logic
    try:
        db_session.query(InventoryMovement).filter(InventoryMovement.created_by == user.id).delete()
        db_session.query(PendingRomaneio).filter(PendingRomaneio.user_id == user.id).delete()
        db_session.query(Product).filter(Product.user_id == user.id).delete()
        db_session.query(Category).filter(Category.user_id == user.id).delete()
        db_session.query(Client).filter(Client.user_id == user.id).delete()
        db_session.delete(user)
        db_session.commit()
    except Exception:
        db_session.rollback()

class TestAppFeatures:
    
    def test_product_and_inventory_flow(self, db_session, shared_user):
        """Testa o fluxo de criação de produto e movimentação básica"""
        product = Product(name="Produto Teste Geral", sku="SKU-GEN-1", stock_quantity=50.0, price=20.0, unit="UN", user_id=shared_user.id)
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)
        
        # Teste de Entrada (IN)
        mv_in = InventoryMovementCreate(product_id=product.id, quantity=10.0, movement_type=MovementType.IN, notes="Entrada Teste")
        crud_inventory.create_movement(db_session, mv_in, user_id=shared_user.id)
        db_session.refresh(product)
        assert product.stock_quantity == 60.0
        
        # Teste de Saída (OUT)
        mv_out = InventoryMovementCreate(product_id=product.id, quantity=5.0, movement_type=MovementType.OUT, notes="Saída Teste")
        crud_inventory.create_movement(db_session, mv_out, user_id=shared_user.id)
        db_session.refresh(product)
        assert product.stock_quantity == 55.0

    def test_pending_romaneio_lifecycle_and_finalization_bug_fix(self, db_session, shared_user):
        """Testa o ciclo de vida da separação e verifica se a correção da duplicação está segura no backend"""
        product = Product(name="Produto Separação", sku="SKU-SEP-1", stock_quantity=100.0, price=100.0, unit="UN", user_id=shared_user.id)
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)
        
        # 1. Criação com Empenho
        pending_data = PendingRomaneioCreate(
            customer_name="Cliente Bug Fix",
            empenhar_estoque=True,
            items=[PendingItem(product_id=product.id, name=product.name, quantity=20.0, unit="UN", price=100.0)]
        )
        db_pending = crud_pending.create_pending_romaneio(db_session, pending_data, shared_user.id)
        db_session.refresh(product)
        assert product.stock_quantity == 80.0
        
        # 2. Simulação de Finalização: Delete rascunho (deve restaurar estoque)
        success = crud_pending.delete_pending_romaneio(db_session, db_pending.id, shared_user.id)
        assert success is True
        db_session.refresh(product)
        assert product.stock_quantity == 100.0 # Restaurado
        
        # 3. Finalização Real: Movimentação OUT
        mv_final = InventoryMovementCreate(
            product_id=product.id, quantity=20.0, movement_type=MovementType.OUT, 
            notes="Romaneio Finalizado", romaneio_id="ROM-FIX-TEST"
        )
        crud_inventory.create_movement(db_session, mv_final, user_id=shared_user.id)
        db_session.refresh(product)
        assert product.stock_quantity == 80.0 # Deduzido definitivamente
        
        # 4. Garantir que não há mais rascunho
        assert db_session.query(PendingRomaneio).filter(PendingRomaneio.id == db_pending.id).first() is None

    def test_clients_and_categories_crud(self, db_session, shared_user):
        """Testa o CRUD básico de clientes e categorias"""
        category = Category(name="Categoria Teste", user_id=shared_user.id)
        db_session.add(category)
        db_session.commit()
        db_session.refresh(category)
        assert category.id is not None
        
        client = Client(name="Cliente Teste", email="cliente@teste.com", phone="11999999999", user_id=shared_user.id)
        db_session.add(client)
        db_session.commit()
        db_session.refresh(client)
        assert client.id is not None
