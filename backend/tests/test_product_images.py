import base64
from io import BytesIO

from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core.database import Base
from backend.crud.products import delete_product
from backend.models.categories import Category
from backend.models.products import Product
from backend.models.users import User
from backend.utils.images import compress_image_base64


def _png_data_uri(size=(900, 700), color=(20, 120, 220, 255)):
    image = Image.new("RGBA", size, color)
    output = BytesIO()
    image.save(output, format="PNG")
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def test_compress_image_base64_converts_to_smaller_jpeg():
    original = _png_data_uri()

    compressed = compress_image_base64(original)

    assert compressed.startswith("data:image/jpeg;base64,")
    assert len(compressed) < len(original)

    _, encoded = compressed.split(",", 1)
    with Image.open(BytesIO(base64.b64decode(encoded))) as img:
        assert img.format == "JPEG"
        assert max(img.size) <= 600


def test_delete_product_clears_image_base64():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        product = Product(
            user_id=1,
            name="Produto com imagem",
            price=10,
            stock_quantity=0,
            unit="UN",
            image_base64=_png_data_uri(size=(20, 20)),
        )
        db.add(product)
        db.commit()
        db.refresh(product)

        deleted = delete_product(db, product.id, user_id=1)

        assert deleted is not None
        assert deleted.is_active is False
        assert deleted.image_base64 is None
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
