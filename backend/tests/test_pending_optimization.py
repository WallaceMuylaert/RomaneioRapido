"""
Testes de regressão para a refatoração batch do `sync_pending_romaneio_stock`.

Cobre cenários que a otimização N+1 → IN(...) pode quebrar:
- Carrinho com muitos itens (correção em escala).
- Produto desativado entre empenho e remoção (Bug #1 corrigido).
- Item duplicado de mesmo product_id (agrupamento de quantidades).
- Remover item específico (deleção do movement certo).
- Estoque insuficiente em delta positivo.
- Mistura de operações (adicionar/aumentar/reduzir/remover) no mesmo PUT.
- Validação de query batch (uma única SELECT IN ao invés de N).
"""
import pytest
from sqlalchemy import event
from backend.core.database import SessionLocal, engine
from backend.models.users import User
from backend.models.products import Product
from backend.models.clients import Client
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.inventory import InventoryMovement, MovementType
from backend.crud import pending_romaneio as crud_pending
from backend.schemas.pending_romaneio import (
    PendingRomaneioCreate,
    PendingRomaneioUpdate,
    PendingItem,
)
from fastapi import HTTPException


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="module")
def test_user(db_session):
    email = "pending_opt_test@logicai.com.br"
    user = db_session.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password="test_hash",
            full_name="Pending Optimization Tester",
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    yield user
    try:
        db_session.query(InventoryMovement).filter(
            InventoryMovement.created_by == user.id
        ).delete()
        db_session.query(PendingRomaneio).filter(
            PendingRomaneio.user_id == user.id
        ).delete()
        db_session.query(Product).filter(Product.user_id == user.id).delete()
        db_session.query(Client).filter(Client.user_id == user.id).delete()
        db_session.delete(user)
        db_session.commit()
    except Exception:
        db_session.rollback()


def _make_product(db_session, user_id, name, stock=100.0, price=10.0, sku=None):
    product = Product(
        name=name,
        sku=sku or f"SKU-{name.replace(' ', '_')}",
        stock_quantity=stock,
        price=price,
        unit="UN",
        user_id=user_id,
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def _item_for(product, qty):
    return PendingItem(
        product_id=product.id,
        name=product.name,
        quantity=qty,
        unit=product.unit,
        price=product.price,
    )


class TestBatchSyncCorrectness:
    """Garante que o batch retorna o mesmo resultado do N+1 original."""

    def test_carrinho_grande_empenha_estoque_corretamente(self, db_session, test_user):
        """30 produtos diferentes empenhados num único rascunho."""
        produtos = [
            _make_product(db_session, test_user.id, f"Bulk Prod {i}", stock=50.0)
            for i in range(30)
        ]
        estoques_iniciais = {p.id: p.stock_quantity for p in produtos}

        items = [_item_for(p, 4.0) for p in produtos]
        data = PendingRomaneioCreate(
            customer_name="Carrinho Grande",
            empenhar_estoque=True,
            items=items,
        )
        draft = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        for p in produtos:
            db_session.refresh(p)
            assert p.stock_quantity == estoques_iniciais[p.id] - 4.0, (
                f"Estoque incorreto para {p.name}"
            )

        # Cada produto deve ter exatamente 1 movement OUT criado
        movements = db_session.query(InventoryMovement).filter(
            InventoryMovement.pending_romaneio_id == draft.id
        ).all()
        assert len(movements) == 30
        for m in movements:
            assert m.movement_type == MovementType.OUT
            assert m.quantity == 4.0

        # Cleanup: delete devolve todo o estoque
        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)
        for p in produtos:
            db_session.refresh(p)
            assert p.stock_quantity == estoques_iniciais[p.id]

    def test_item_duplicado_agrupa_quantidades(self, db_session, test_user):
        """
        Mesmo product_id aparecendo duas vezes no payload deve ser somado.
        Frontend pode duplicar acidentalmente — a soma evita movement duplicado.
        """
        prod = _make_product(db_session, test_user.id, "Dup Group", stock=100.0)
        estoque_inicial = prod.stock_quantity

        data = PendingRomaneioCreate(
            customer_name="Cliente Dup",
            empenhar_estoque=True,
            items=[
                _item_for(prod, 3.0),
                _item_for(prod, 5.0),  # mesmo product_id
            ],
        )
        draft = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        db_session.refresh(prod)
        # Deve ter empenhado 3+5 = 8
        assert prod.stock_quantity == estoque_inicial - 8.0

        movements = db_session.query(InventoryMovement).filter(
            InventoryMovement.pending_romaneio_id == draft.id
        ).all()
        # Apenas 1 movement, com a soma como quantidade
        assert len(movements) == 1
        assert movements[0].quantity == 8.0

        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)
        db_session.refresh(prod)
        assert prod.stock_quantity == estoque_inicial

    def test_remover_item_intermediario_deleta_movement_correto(
        self, db_session, test_user
    ):
        """
        Carrinho com 3 produtos. Remove o do meio.
        Apenas o movement do produto removido deve ser deletado;
        os demais permanecem com a mesma quantidade.
        """
        prod_a = _make_product(db_session, test_user.id, "Mid Test A", stock=50.0)
        prod_b = _make_product(db_session, test_user.id, "Mid Test B", stock=50.0)
        prod_c = _make_product(db_session, test_user.id, "Mid Test C", stock=50.0)

        data = PendingRomaneioCreate(
            customer_name="Cliente Mid",
            empenhar_estoque=True,
            items=[
                _item_for(prod_a, 2.0),
                _item_for(prod_b, 5.0),
                _item_for(prod_c, 7.0),
            ],
        )
        draft = crud_pending.create_pending_romaneio(db_session, data, test_user.id)

        for p in (prod_a, prod_b, prod_c):
            db_session.refresh(p)
        assert prod_a.stock_quantity == 48.0
        assert prod_b.stock_quantity == 45.0
        assert prod_c.stock_quantity == 43.0

        # Remover B
        update = PendingRomaneioUpdate(
            customer_name="Cliente Mid",
            empenhar_estoque=True,
            items=[_item_for(prod_a, 2.0), _item_for(prod_c, 7.0)],
        )
        crud_pending.update_pending_romaneio(
            db_session, draft.id, update, test_user.id
        )

        for p in (prod_a, prod_b, prod_c):
            db_session.refresh(p)
        assert prod_a.stock_quantity == 48.0  # inalterado
        assert prod_b.stock_quantity == 50.0  # devolvido
        assert prod_c.stock_quantity == 43.0  # inalterado

        movements = db_session.query(InventoryMovement).filter(
            InventoryMovement.pending_romaneio_id == draft.id
        ).all()
        prod_ids_remaining = {m.product_id for m in movements}
        assert prod_ids_remaining == {prod_a.id, prod_c.id}

        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)

    def test_estoque_insuficiente_em_delta_positivo(self, db_session, test_user):
        """Aumentar quantidade além do estoque disponível deve falhar com 400."""
        prod = _make_product(db_session, test_user.id, "Low Stock", stock=10.0)

        data = PendingRomaneioCreate(
            customer_name="Cliente Lim",
            empenhar_estoque=True,
            items=[_item_for(prod, 8.0)],
        )
        draft = crud_pending.create_pending_romaneio(db_session, data, test_user.id)
        db_session.refresh(prod)
        assert prod.stock_quantity == 2.0  # 10 - 8

        # Pedir mais 5 unidades (delta=+5) — só temos 2 disponíveis
        update = PendingRomaneioUpdate(
            customer_name="Cliente Lim",
            empenhar_estoque=True,
            items=[_item_for(prod, 13.0)],
        )
        with pytest.raises(HTTPException) as exc:
            crud_pending.update_pending_romaneio(
                db_session, draft.id, update, test_user.id
            )
        assert exc.value.status_code == 400
        assert "insuficiente" in exc.value.detail.lower()

        # Estoque deve permanecer inalterado após o erro
        db_session.refresh(prod)
        assert prod.stock_quantity == 2.0

        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)

    def test_operacoes_mistas_no_mesmo_put(self, db_session, test_user):
        """
        Um PUT que ao mesmo tempo: adiciona produto novo, aumenta um existente,
        reduz outro existente, e remove um. Cada delta deve ser aplicado correto.
        """
        a = _make_product(db_session, test_user.id, "Mix A", stock=100.0)
        b = _make_product(db_session, test_user.id, "Mix B", stock=100.0)
        c = _make_product(db_session, test_user.id, "Mix C", stock=100.0)
        d = _make_product(db_session, test_user.id, "Mix D", stock=100.0)

        # Estado inicial: A=10, B=10, C=10
        data = PendingRomaneioCreate(
            customer_name="Cliente Mix",
            empenhar_estoque=True,
            items=[_item_for(a, 10.0), _item_for(b, 10.0), _item_for(c, 10.0)],
        )
        draft = crud_pending.create_pending_romaneio(
            db_session, data, test_user.id
        )

        # PUT: A=20 (aumenta +10), B=4 (reduz -6), remove C, adiciona D=7
        update = PendingRomaneioUpdate(
            customer_name="Cliente Mix",
            empenhar_estoque=True,
            items=[
                _item_for(a, 20.0),
                _item_for(b, 4.0),
                _item_for(d, 7.0),
            ],
        )
        crud_pending.update_pending_romaneio(
            db_session, draft.id, update, test_user.id
        )

        for p in (a, b, c, d):
            db_session.refresh(p)
        assert a.stock_quantity == 80.0  # 100 - 20
        assert b.stock_quantity == 96.0  # 100 - 4
        assert c.stock_quantity == 100.0  # devolvido
        assert d.stock_quantity == 93.0  # 100 - 7

        movements = db_session.query(InventoryMovement).filter(
            InventoryMovement.pending_romaneio_id == draft.id
        ).all()
        movement_qtys = {m.product_id: m.quantity for m in movements}
        assert movement_qtys == {a.id: 20.0, b.id: 4.0, d.id: 7.0}

        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)


class TestProdutoDesativado:
    """Cenários onde o produto fica inativo durante o ciclo do rascunho."""

    def test_produto_desativado_apos_empenho_devolve_estoque_ao_remover(
        self, db_session, test_user
    ):
        """
        Bug #1 corrigido: se um produto for desativado depois de empenhado e
        depois removido do carrinho, o estoque deve ser devolvido (não ficar preso).
        """
        prod = _make_product(db_session, test_user.id, "Desativ Test", stock=50.0)
        outro = _make_product(db_session, test_user.id, "Desativ Outro", stock=50.0)

        data = PendingRomaneioCreate(
            customer_name="Cliente Desativ",
            empenhar_estoque=True,
            items=[_item_for(prod, 8.0), _item_for(outro, 3.0)],
        )
        draft = crud_pending.create_pending_romaneio(
            db_session, data, test_user.id
        )
        db_session.refresh(prod)
        assert prod.stock_quantity == 42.0

        # Admin desativa o produto após empenho
        prod.is_active = False
        db_session.commit()
        db_session.refresh(prod)

        # User remove o produto desativado do rascunho (mantém o outro)
        update = PendingRomaneioUpdate(
            customer_name="Cliente Desativ",
            empenhar_estoque=True,
            items=[_item_for(outro, 3.0)],
        )
        crud_pending.update_pending_romaneio(
            db_session, draft.id, update, test_user.id
        )

        # Estoque do produto desativado deve ter sido devolvido
        db_session.refresh(prod)
        assert prod.stock_quantity == 50.0, (
            "Bug #1: estoque ficou preso para produto desativado"
        )

        # Movement do produto desativado deve ter sido deletado
        movements = db_session.query(InventoryMovement).filter(
            InventoryMovement.pending_romaneio_id == draft.id
        ).all()
        assert prod.id not in {m.product_id for m in movements}
        assert outro.id in {m.product_id for m in movements}

        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)

    def test_delete_rascunho_devolve_estoque_de_produto_inativo(
        self, db_session, test_user
    ):
        """
        Cenário real: produto desativado depois de empenhado. Quando o user
        deleta o rascunho (DELETE /pending/{id}), o backend força
        empenhar_estoque=False e chama sync — esse caminho carrega produtos
        com only_active=False, devolvendo estoque mesmo para inativos.
        """
        prod = _make_product(
            db_session, test_user.id, "Off Empenho Inactive", stock=30.0
        )
        data = PendingRomaneioCreate(
            customer_name="Cliente Off",
            empenhar_estoque=True,
            items=[_item_for(prod, 12.0)],
        )
        draft = crud_pending.create_pending_romaneio(
            db_session, data, test_user.id
        )
        db_session.refresh(prod)
        assert prod.stock_quantity == 18.0

        # Admin desativa o produto após empenho
        prod.is_active = False
        db_session.commit()

        # User cancela o rascunho — deve devolver estoque mesmo do produto inativo
        crud_pending.delete_pending_romaneio(db_session, draft.id, test_user.id)

        db_session.refresh(prod)
        assert prod.stock_quantity == 30.0, (
            "Estoque deveria ter sido devolvido mesmo para produto inativo"
        )


class TestBatchScalability:
    """
    Valida que o número de queries em Product NÃO escala linearmente com
    o tamanho do carrinho. Antes da otimização, cada item disparava 2-3
    queries individuais (N+1). Agora deveria ser ~constante (IN batch).
    """

    def _count_product_selects(self, sql_log):
        return sum(
            1
            for s in sql_log
            if "FROM products" in s and "SELECT" in s.upper()
        )

    def _measure_sync_queries(self, db_session, user_id, n_products):
        produtos = [
            _make_product(
                db_session, user_id, f"Scale {n_products}_{i}", stock=100.0
            )
            for i in range(n_products)
        ]
        sql_log = []

        def listener(conn, cursor, statement, parameters, context, em):
            sql_log.append(statement)

        event.listen(engine, "before_cursor_execute", listener)
        try:
            sql_log.clear()
            data = PendingRomaneioCreate(
                customer_name="Scale Test",
                empenhar_estoque=True,
                items=[_item_for(p, 2.0) for p in produtos],
            )
            draft = crud_pending.create_pending_romaneio(
                db_session, data, user_id
            )
            create_q = self._count_product_selects(sql_log)

            sql_log.clear()
            update = PendingRomaneioUpdate(
                customer_name="Scale Test",
                empenhar_estoque=True,
                items=[_item_for(p, 3.0) for p in produtos],
            )
            crud_pending.update_pending_romaneio(
                db_session, draft.id, update, user_id
            )
            update_q = self._count_product_selects(sql_log)
        finally:
            event.remove(engine, "before_cursor_execute", listener)

        crud_pending.delete_pending_romaneio(db_session, draft.id, user_id)
        return create_q, update_q

    def test_queries_em_product_nao_escalam_linearmente(
        self, db_session, test_user
    ):
        """
        Comparar 5 vs 30 produtos. A versão antiga (N+1 explícito) fazia
        2 a 3 queries individuais por item. A versão batch deveria fazer
        ~1 ou menos por item (com lazy-loads residuais do ORM).
        """
        small_create, small_update = self._measure_sync_queries(
            db_session, test_user.id, n_products=5
        )
        large_create, large_update = self._measure_sync_queries(
            db_session, test_user.id, n_products=30
        )

        delta_create = large_create - small_create
        delta_update = large_update - small_update
        delta_items = 30 - 5

        ratio_create = delta_create / delta_items
        ratio_update = delta_update / delta_items

        print(
            f"\n[scale] create: small={small_create}, large={large_create}, "
            f"delta={delta_create} ({ratio_create:.2f} q/item)"
        )
        print(
            f"[scale] update: small={small_update}, large={large_update}, "
            f"delta={delta_update} ({ratio_update:.2f} q/item)"
        )

        # Antes da otimização: 2-3 q/item. Threshold em 1.5 detecta regressão
        # ao N+1 explícito, ainda tolerando o lazy-load residual de 1 q/item
        # do back_populates ao deletar movements.
        assert ratio_create < 1.5, (
            f"Create escalou ({ratio_create:.2f} q/item) — possível regressão N+1"
        )
        assert ratio_update < 1.5, (
            f"Update escalou ({ratio_update:.2f} q/item) — possível regressão N+1"
        )
