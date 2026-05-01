import pytest
from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_client():
    yield
    client.close()


def test_health_check():
    """Valida se o servidor está ativo"""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()

def test_products_list_unauthorized():
    """Valida proteção da rota de produtos"""
    response = client.get("/products/")
    assert response.status_code == 401

def test_categories_list_unauthorized():
    """Valida proteção da rota de categorias"""
    response = client.get("/categories/")
    assert response.status_code == 401
