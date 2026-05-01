import pytest
from fastapi.testclient import TestClient
from backend.server import app

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_client():
    yield
    client.close()
    engine.dispose()


def test_health():
    """Verifica se a API está online respondendo no endpoint de healthcheck"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "RomaneioRapido API"}

def test_products_route():
    """Verifica o estado da rota de produtos (deve retornar 401 sem token)"""
    response = client.get("/products/")
    assert response.status_code == 401

def test_categories_route():
    """Verifica o estado da rota de categorias (deve retornar 401 sem token)"""
    response = client.get("/categories/")
    assert response.status_code == 401

def test_users_route():
    """Verifica o estado da rota de usuários (deve retornar 401 sem token)"""
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_inventory_route():
    """Verifica o estado da rota de inventário/estoque (deve retornar 401 sem token)"""
    response = client.get("/inventory/movements")
    assert response.status_code == 401
