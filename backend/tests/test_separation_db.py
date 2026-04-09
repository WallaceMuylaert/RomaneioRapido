"""
Testes dinâmicos para validar o fluxo de separação persistida no banco de dados.
Cobre: CRUD completo, discount_percentage, empenho de estoque, auto-save e lifecycle completo.
"""
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
    """Cria um usuário de teste exclusivo para este módulo"""
    email = "separation_db_test@logicai.com.br"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, hashed_password="test_hash", full_name="Separation DB Tester", is_active=True)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    yield user
    # Cleanup
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


@pytest.fixture(scope="module")
def test_product(db_session, test_user):
    """Cria um produto de teste"""
    product = Product(
        name="Produto Separação DB",
        sku="SKU-SEPDB-001",
        stock_quantity=200.0,
        price=50.0,
        unit="UN",
        user_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    yield product


@pytest.fixture(scope="module")
def test_product_2(db_session, test_user):
    """Cria um segundo produto de teste"""
    product = Product(
        name="Produto Separação DB 2",
        sku="SKU-SEPDB-002",
        stock_quantity=150.0,
        price=30.0,
        unit="KG",
        user_id=test_user.id
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    yield product


def _make_pending_items(product, qty=10.0):
    """Helper para criar items de separação"""
    return [PendingItem(
        product_id=product.id,
        name=product.name,
        quantity=qty,
        unit=product.unit,
        price=product.price
    )]


class TestSeparacaoDB:
    """Testes completos do fluxo de separação persistida no banco de dados"""

    def test_criar_separacao_basica(self, db_session, test_user, test_product):
        """Teste 1: Criação básica de separação no BD"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Auto-Save Test",
            empenhar_estoque=False,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 5.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        assert result.id is not None
        assert result.user_id == test_user.id
        assert result.customer_name == "Cliente Auto-Save Test"
        assert result.discount_percentage == 0.0
        assert len(result.items) == 1
        assert result.items[0]["product_id"] == test_product.id
        assert result.items[0]["quantity"] == 5.0

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)

    def test_criar_separacao_com_desconto(self, db_session, test_user, test_product):
        """Teste 2: Criação de separação com discount_percentage persistido"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Desconto",
            empenhar_estoque=False,
            discount_percentage=15.5,
            items=_make_pending_items(test_product, 3.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        assert result.discount_percentage == 15.5

        # Verificar que persista no BD via query direta
        db_check = db_session.query(PendingRomaneio).filter(PendingRomaneio.id == result.id).first()
        assert db_check is not None
        assert db_check.discount_percentage == 15.5

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)

    def test_atualizar_separacao(self, db_session, test_user, test_product, test_product_2):
        """Teste 3: Atualização de separação (simula auto-save)"""
        # Criar
        data = PendingRomaneioCreate(
            customer_name="Rascunho Auto-Save",
            empenhar_estoque=False,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 2.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        original_id = result.id

        # Simular auto-save: atualizar itens, nome e desconto
        update_data = PendingRomaneioUpdate(
            customer_name="Cliente Atualizado via Auto-Save",
            empenhar_estoque=False,
            discount_percentage=10.0,
            items=[
                PendingItem(product_id=test_product.id, name=test_product.name, quantity=5.0, unit="UN", price=50.0),
                PendingItem(product_id=test_product_2.id, name=test_product_2.name, quantity=3.0, unit="KG", price=30.0),
            ]
        )
        updated = crud_pending.update_pending_romaneio(db_session, original_id, update_data, test_user.id)

        assert updated is not None
        assert updated.id == original_id  # Mesmo registro atualizado
        assert updated.customer_name == "Cliente Atualizado via Auto-Save"
        assert updated.discount_percentage == 10.0
        assert len(updated.items) == 2

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, original_id, test_user.id)

    def test_listar_separacoes_por_usuario(self, db_session, test_user, test_product):
        """Teste 4: Listagem de separações filtra corretamente por user_id"""
        # Criar 3 rascunhos
        ids = []
        for i in range(3):
            data = PendingRomaneioCreate(
                customer_name=f"Cliente Listagem {i+1}",
                empenhar_estoque=False,
                discount_percentage=float(i * 5),
                items=_make_pending_items(test_product, float(i+1))
            )
            result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
            ids.append(result.id)

        # Listar
        pendings = crud_pending.get_pending_romaneios(db_session, test_user.id)
        assert len(pendings) >= 3

        # Verificar que cada um tem discount_percentage correto
        for i, pid in enumerate(ids):
            p = next((x for x in pendings if x.id == pid), None)
            assert p is not None
            assert p.discount_percentage == float(i * 5)

        # Cleanup
        for pid in ids:
            crud_pending.delete_pending_romaneio(db_session, pid, test_user.id)

    def test_obter_separacao_individual(self, db_session, test_user, test_product):
        """Teste 5: Obter separação individual por ID"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Individual",
            empenhar_estoque=False,
            discount_percentage=7.25,
            items=_make_pending_items(test_product, 8.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        # Obter por ID
        fetched = crud_pending.get_pending_romaneio(db_session, result.id, test_user.id)
        assert fetched is not None
        assert fetched.customer_name == "Cliente Individual"
        assert fetched.discount_percentage == 7.25

        # Tentar obter com user_id errado: deve retornar None
        wrong = crud_pending.get_pending_romaneio(db_session, result.id, user_id=999999)
        assert wrong is None

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)

    def test_excluir_separacao(self, db_session, test_user, test_product):
        """Teste 6: Exclusão de separação"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Para Excluir",
            empenhar_estoque=False,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 1.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        pid = result.id

        # Excluir
        success = crud_pending.delete_pending_romaneio(db_session, pid, test_user.id)
        assert success is True

        # Verificar que não existe mais
        check = db_session.query(PendingRomaneio).filter(PendingRomaneio.id == pid).first()
        assert check is None

        # Excluir inexistente
        success2 = crud_pending.delete_pending_romaneio(db_session, pid, test_user.id)
        assert success2 is False

    def test_excluir_separacao_usuario_errado(self, db_session, test_user, test_product):
        """Teste 7: Tentativa de excluir separação de outro usuário"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Isolamento",
            empenhar_estoque=False,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 1.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        # Tentar excluir com user_id diferente
        success = crud_pending.delete_pending_romaneio(db_session, result.id, user_id=999999)
        assert success is False

        # Verificar que ainda existe
        check = db_session.query(PendingRomaneio).filter(PendingRomaneio.id == result.id).first()
        assert check is not None

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)


class TestSeparacaoComEmpenho:
    """Testes do fluxo de separação com empenho de estoque"""

    def test_empenho_ao_criar(self, db_session, test_user, test_product):
        """Teste 8: Criar separação com empenho deve reduzir estoque"""
        db_session.refresh(test_product)
        estoque_inicial = test_product.stock_quantity

        data = PendingRomaneioCreate(
            customer_name="Cliente Empenho",
            empenhar_estoque=True,
            discount_percentage=5.0,
            items=_make_pending_items(test_product, 10.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        db_session.refresh(test_product)

        assert test_product.stock_quantity == estoque_inicial - 10.0

        # Cleanup: delete deve restaurar estoque
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial

    def test_atualizar_quantidade_empenho(self, db_session, test_user, test_product):
        """Teste 9: Atualizar quantidade com empenho deve ajustar estoque"""
        db_session.refresh(test_product)
        estoque_inicial = test_product.stock_quantity

        # Criar com 10 unidades empenhadas
        data = PendingRomaneioCreate(
            customer_name="Cliente Empenho Update",
            empenhar_estoque=True,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 10.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 10.0

        # Atualizar para 15 unidades — deve reduzir mais 5
        update = PendingRomaneioUpdate(
            customer_name="Cliente Empenho Update",
            empenhar_estoque=True,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 15.0)
        )
        crud_pending.update_pending_romaneio(db_session, result.id, update, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 15.0

        # Atualizar para 8 unidades — deve devolver 7
        update2 = PendingRomaneioUpdate(
            customer_name="Cliente Empenho Update",
            empenhar_estoque=True,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 8.0)
        )
        crud_pending.update_pending_romaneio(db_session, result.id, update2, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 8.0

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial

    def test_desativar_empenho_devolve_estoque(self, db_session, test_user, test_product):
        """Teste 10: Desativar empenho ao atualizar deve devolver todo estoque"""
        db_session.refresh(test_product)
        estoque_inicial = test_product.stock_quantity

        data = PendingRomaneioCreate(
            customer_name="Cliente Toggle Empenho",
            empenhar_estoque=True,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 20.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 20.0

        # Desativar empenho
        update = PendingRomaneioUpdate(
            customer_name="Cliente Toggle Empenho",
            empenhar_estoque=False,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 20.0)
        )
        crud_pending.update_pending_romaneio(db_session, result.id, update, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial  # Estoque restaurado

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)


class TestSeparacaoLifecycle:
    """Testes do ciclo de vida completo: auto-save → retomar → finalizar"""

    def test_ciclo_completo_autosave_retomar_finalizar(self, db_session, test_user, test_product):
        """Teste 11: Simula o ciclo completo do frontend sem localStorage"""
        db_session.refresh(test_product)
        estoque_inicial = test_product.stock_quantity

        # Passo 1: Auto-save inicial (POST /pending/)
        data = PendingRomaneioCreate(
            customer_name="Rascunho Auto-Save",
            empenhar_estoque=True,
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 5.0)
        )
        draft = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        draft_id = draft.id
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 5.0

        # Passo 2: Auto-save atualiza o mesmo rascunho (PUT /pending/{id})
        update = PendingRomaneioUpdate(
            customer_name="Cliente Auto-Save Atualizado",
            empenhar_estoque=True,
            discount_percentage=12.5,
            items=_make_pending_items(test_product, 8.0)
        )
        crud_pending.update_pending_romaneio(db_session, draft_id, update, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 8.0

        # Passo 3: Simular refresh de página — buscar rascunhos (GET /pending/)
        pendings = crud_pending.get_pending_romaneios(db_session, test_user.id)
        my_draft = next((p for p in pendings if p.id == draft_id), None)
        assert my_draft is not None
        assert my_draft.customer_name == "Cliente Auto-Save Atualizado"
        assert my_draft.discount_percentage == 12.5
        assert len(my_draft.items) == 1
        assert my_draft.items[0]["quantity"] == 8.0

        # Passo 4: Finalizar — deletar rascunho primeiro (libera estoque)
        crud_pending.delete_pending_romaneio(db_session, draft_id, test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial

        # Passo 5: Movimentação final de saída
        from backend.schemas.inventory import InventoryMovementCreate
        mv = InventoryMovementCreate(
            product_id=test_product.id,
            quantity=8.0,
            movement_type=MovementType.OUT,
            notes="Romaneio: Cliente Auto-Save Atualizado",
            romaneio_id="ROM-AUTOSAVE-TEST"
        )
        crud_inventory.create_movement(db_session, mv, user_id=test_user.id)
        db_session.refresh(test_product)
        assert test_product.stock_quantity == estoque_inicial - 8.0

    def test_multiplos_rascunhos_simultaneos(self, db_session, test_user, test_product, test_product_2):
        """Teste 12: Múltiplos rascunhos simultâneos com produtos diferentes"""
        db_session.refresh(test_product)
        db_session.refresh(test_product_2)

        # Rascunho 1
        draft1 = crud_pending.create_pending_romaneio(db_session, PendingRomaneioCreate(
            customer_name="Cliente A",
            empenhar_estoque=False,
            discount_percentage=5.0,
            items=_make_pending_items(test_product, 3.0)
        ), test_user.id)

        # Rascunho 2
        draft2 = crud_pending.create_pending_romaneio(db_session, PendingRomaneioCreate(
            customer_name="Cliente B",
            empenhar_estoque=False,
            discount_percentage=10.0,
            items=_make_pending_items(test_product_2, 7.0)
        ), test_user.id)

        # Listar — deve ter ambos
        pendings = crud_pending.get_pending_romaneios(db_session, test_user.id)
        draft_ids = [p.id for p in pendings]
        assert draft1.id in draft_ids
        assert draft2.id in draft_ids

        # Verificar isolamento de dados
        d1 = crud_pending.get_pending_romaneio(db_session, draft1.id, test_user.id)
        d2 = crud_pending.get_pending_romaneio(db_session, draft2.id, test_user.id)
        assert d1.discount_percentage == 5.0
        assert d2.discount_percentage == 10.0

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, draft1.id, test_user.id)
        crud_pending.delete_pending_romaneio(db_session, draft2.id, test_user.id)

    def test_discount_percentage_zero_default(self, db_session, test_user, test_product):
        """Teste 13: discount_percentage default é 0.0 quando não informado"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Sem Desconto",
            items=_make_pending_items(test_product, 1.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        assert result.discount_percentage == 0.0

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)

    def test_discount_percentage_atualiza_para_zero(self, db_session, test_user, test_product):
        """Teste 14: Pode atualizar discount_percentage de volta para 0"""
        data = PendingRomaneioCreate(
            customer_name="Cliente Desconto Reset",
            discount_percentage=25.0,
            items=_make_pending_items(test_product, 1.0)
        )
        result = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        assert result.discount_percentage == 25.0

        # Remover desconto
        update = PendingRomaneioUpdate(
            customer_name="Cliente Desconto Reset",
            discount_percentage=0.0,
            items=_make_pending_items(test_product, 1.0)
        )
        updated = crud_pending.update_pending_romaneio(db_session, result.id, update, test_user.id)
        assert updated.discount_percentage == 0.0

        # Cleanup
        crud_pending.delete_pending_romaneio(db_session, result.id, test_user.id)
