import os
import time
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, message="'crypt' is deprecated")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.config.logger import get_dynamic_logger
from backend.core.limiter import limiter
from backend.core import database
from backend.models.users import User
from backend.models.categories import Category
from backend.models.products import Product
from backend.models.inventory import InventoryMovement
from backend.models.clients import Client
from backend.models.api_keys import ApiKey
from sqlalchemy.orm import configure_mappers

logger = get_dynamic_logger("server")
configure_mappers()

from backend.core.router_loader import include_routers

if not os.getenv("TESTING"):
    database.Base.metadata.create_all(bind=database.engine)
    from backend.core.init_db import init_db
    init_db()

app = FastAPI(
    title="RomaneioRapido API",
    description="API para gestão de estoque e inventário",
    version="1.0.0"
)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.4f}s")
    return response

@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint para verificação de saúde da API"""
    return {"status": "healthy", "service": "RomaneioRapido API"}

from fastapi.staticfiles import StaticFiles

# Servir arquivos de upload
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

include_routers(app)
