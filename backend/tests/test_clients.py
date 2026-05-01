import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.server import app
from backend.core.database import Base, get_db
from backend.core.security import create_access_token
from backend.models.users import User
from backend.models.categories import Category
from backend.models.products import Product
from backend.models.inventory import InventoryMovement
from backend.models.clients import Client

# Setup SQLite for testing - Using a file to avoid in-memory database loss between connections
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_db.sqlite"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Import all models to ensure they are registered with Base metadata
    from backend.models.users import User
    from backend.models.categories import Category
    from backend.models.products import Product
    from backend.models.inventory import InventoryMovement
    from backend.models.clients import Client
    
    # Clean start
    if os.path.exists("./test_db.sqlite"):
        os.remove("./test_db.sqlite")
        
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    # Cleanup after session
    client.close()
    engine.dispose()
    app.dependency_overrides.pop(get_db, None)
    if os.path.exists("./test_db.sqlite"):
        os.remove("./test_db.sqlite")

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture
def test_user_token():
    db = TestingSessionLocal()
    # Create a test user
    user = User(
        email="test@user.com",
        hashed_password="hashed_password",
        full_name="Test User",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": user.email})
    db.close()
    return f"Bearer {token}"

def test_clients_crud(test_user_token):
    # 1. List clients (empty)
    response = client.get("/clients/", headers={"Authorization": test_user_token})
    assert response.status_code == 200
    assert len(response.json()["items"]) == 0

    # 2. Create client
    client_data = {
        "name": "Cliente de Teste",
        "phone": "11999999999",
        "email": "cliente@teste.com",
        "document": "123.456.789-00",
        "notes": "Observação de teste"
    }
    response = client.post("/clients/", json=client_data, headers={"Authorization": test_user_token})
    assert response.status_code == 200
    created_client = response.json()
    assert created_client["name"] == "Cliente de Teste"
    client_id = created_client["id"]

    # 3. List clients (now with 1)
    response = client.get("/clients/", headers={"Authorization": test_user_token})
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1

    # 4. Update client
    update_data = {"name": "Cliente Alterado"}
    response = client.put(f"/clients/{client_id}", json=update_data, headers={"Authorization": test_user_token})
    assert response.status_code == 200
    assert response.json()["name"] == "Cliente Alterado"

    # 5. Delete client
    response = client.delete(f"/clients/{client_id}", headers={"Authorization": test_user_token})
    assert response.status_code == 200

    # 6. Verify deleted
    response = client.get("/clients/", headers={"Authorization": test_user_token})
    assert len(response.json()["items"]) == 0
