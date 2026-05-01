import pytest
import uuid
from sqlalchemy.orm import Session
from backend.core.database import SessionLocal
from backend.models.users import User
from backend.models.categories import Category
from backend.models.clients import Client
from backend.models.products import Product
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.inventory import InventoryMovement, MovementType
from backend.crud.pending_romaneio import create_pending_romaneio, delete_pending_romaneio
from backend.crud.inventory import create_movement, finalize_romaneio, get_daily_reports, get_movements
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingItem
from backend.schemas.inventory import InventoryMovementCreate, RomaneioFinalizeItem, RomaneioFinalizeRequest
from fastapi import HTTPException

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


@pytest.fixture(autouse=True)
def clean_test_user_data(db, test_user):
    db.query(InventoryMovement).filter(InventoryMovement.created_by == test_user.id).delete()
    db.query(PendingRomaneio).filter(PendingRomaneio.user_id == test_user.id).delete()
    db.query(Product).filter(Product.user_id == test_user.id).delete()
    db.commit()
    yield
    db.query(InventoryMovement).filter(InventoryMovement.created_by == test_user.id).delete()
    db.query(PendingRomaneio).filter(PendingRomaneio.user_id == test_user.id).delete()
    db.query(Product).filter(Product.user_id == test_user.id).delete()
    db.commit()


@pytest.fixture
def test_product(db, test_user):
    product = Product(
        name="Produto Teste Finalizacao",
        sku=f"SKU_FIN_{uuid.uuid4().hex[:8]}",
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


def _create_product(db, test_user, name, stock=100.0, price=50.0):
    product = Product(
        name=name,
        sku=f"SKU_{uuid.uuid4().hex[:10]}",
        stock_quantity=stock,
        price=price,
        unit="UN",
        user_id=test_user.id,
        is_active=True,
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


def test_pending_commitment_is_not_reported_as_final_movement(db, test_user, test_product):
    pending_create = PendingRomaneioCreate(
        customer_name="Cliente Em Separacao",
        empenhar_estoque=True,
        items=[
            PendingItem(product_id=test_product.id, name=test_product.name, quantity=10.0, unit="UN", price=50.0)
        ],
    )
    db_pending = create_pending_romaneio(db, pending_create, test_user.id)

    pending_movement = db.query(InventoryMovement).filter(
        InventoryMovement.pending_romaneio_id == db_pending.id
    ).first()
    assert pending_movement is not None

    movements, _ = get_movements(db, user_id=test_user.id, limit=100)
    assert pending_movement.id not in [movement.id for movement in movements]

    report = get_daily_reports(db, user_id=test_user.id)
    assert report["total_romaneios"] == 0
    assert report["total_value"] == 0


def test_finalize_romaneio_is_atomic_and_reports_net_discount(db, test_user):
    product_a = _create_product(db, test_user, "Produto A Finalizacao", stock=100.0, price=50.0)
    product_b = _create_product(db, test_user, "Produto B Finalizacao", stock=100.0, price=100.0)

    pending = create_pending_romaneio(
        db,
        PendingRomaneioCreate(
            customer_name="Cliente Liquido",
            empenhar_estoque=True,
            items=[
                PendingItem(product_id=product_a.id, name=product_a.name, quantity=2.0, unit="UN", price=50.0)
            ],
        ),
        test_user.id,
    )
    db.refresh(product_a)
    assert product_a.stock_quantity == 98.0

    result = finalize_romaneio(
        db,
        RomaneioFinalizeRequest(
            customer_name="Cliente Liquido",
            pending_romaneio_id=pending.id,
            discount_percentage=10.0,
            items=[
                RomaneioFinalizeItem(product_id=product_a.id, quantity=2.0, unit_price_snapshot=50.0),
                RomaneioFinalizeItem(product_id=product_b.id, quantity=4.0, unit_price_snapshot=100.0),
            ],
        ),
        test_user.id,
    )

    db.refresh(product_a)
    db.refresh(product_b)
    assert product_a.stock_quantity == 98.0
    assert product_b.stock_quantity == 96.0
    assert db.query(PendingRomaneio).filter(PendingRomaneio.id == pending.id).first() is None
    assert result["subtotal"] == 500.0
    assert result["discount_amount"] == 50.0
    assert result["total_value"] == 450.0

    report = get_daily_reports(db, user_id=test_user.id)
    assert report["total_romaneios"] == 1
    assert report["total_value"] == 450.0


def test_finalize_romaneio_rolls_back_when_any_item_has_insufficient_stock(db, test_user):
    product_ok = _create_product(db, test_user, "Produto OK Atomicidade", stock=10.0, price=10.0)
    product_fail = _create_product(db, test_user, "Produto Falha Atomicidade", stock=1.0, price=10.0)

    request = RomaneioFinalizeRequest(
        customer_name="Cliente Atomicidade",
        items=[
            RomaneioFinalizeItem(product_id=product_ok.id, quantity=5.0, unit_price_snapshot=10.0),
            RomaneioFinalizeItem(product_id=product_fail.id, quantity=2.0, unit_price_snapshot=10.0),
        ],
    )

    with pytest.raises(HTTPException):
        finalize_romaneio(db, request, test_user.id)

    db.refresh(product_ok)
    db.refresh(product_fail)
    assert product_ok.stock_quantity == 10.0
    assert product_fail.stock_quantity == 1.0
    assert db.query(InventoryMovement).filter(
        InventoryMovement.created_by == test_user.id,
        InventoryMovement.product_id.in_([product_ok.id, product_fail.id]),
    ).count() == 0
