import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def prepare_sqlite_test_database():
    database_url = os.getenv("DATABASE_URL", "")
    if os.getenv("TESTING") != "1" or not database_url.startswith("sqlite"):
        yield
        return

    from backend.core.database import Base, engine
    from backend.models.api_keys import ApiKey
    from backend.models.categories import Category
    from backend.models.clients import Client
    from backend.models.inventory import InventoryMovement
    from backend.models.pending_romaneio import PendingRomaneio
    from backend.models.products import Product
    from backend.models.users import User

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
