import os
import time
import warnings
from contextlib import asynccontextmanager

warnings.filterwarnings("ignore", category=DeprecationWarning, message="'crypt' is deprecated")

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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
from backend.core.router_loader import include_routers

logger = get_dynamic_logger("server")
configure_mappers()

# Em produção (ENVIRONMENT=production) desativa /docs, /redoc e /openapi.json
_is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
_docs_url     = None if _is_production else "/docs"
_redoc_url    = None if _is_production else "/redoc"
_openapi_url  = None if _is_production else "/openapi.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Executa migrações e init do banco antes de aceitar requisições."""
    try:
        logger.info("Running startup migrations...")
        from backend.database.migrate import run_migrations
        run_migrations()
        logger.info("Migrations completed successfully.")
    except Exception as e:
        logger.error(f"Migration failed on startup: {e}")
        raise
    yield


app = FastAPI(
    title="RomaneioRapido API",
    description="API para gestão de estoque e inventário",
    version="1.0.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
    lifespan=lifespan,
)

_MAX_BODY_SIZE = int(os.getenv("MAX_BODY_SIZE_BYTES", 10 * 1024 * 1024))  # 10 MB

class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > _MAX_BODY_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Payload excede o limite máximo permitido.",
            )
        return await call_next(request)

app.add_middleware(MaxBodySizeMiddleware)

_allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "")
if _allowed_hosts_env:
    _allowed_hosts = [h.strip() for h in _allowed_hosts_env.split(",")]
elif _is_production:
    # Em produção, permitimos os domínios oficiais e o nome do serviço interno
    _allowed_hosts = ["romaneiorapido.com.br", "www.romaneiorapido.com.br", "backend", "localhost", "127.0.0.1"]
else:
    _allowed_hosts = ["localhost", "127.0.0.1", "backend"]

if os.getenv("TESTING") == "1" and "testserver" not in _allowed_hosts:
    _allowed_hosts.append("testserver")

app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    # Domínios oficiais e locais para garantir compatibilidade
    origins = [
        "https://romaneiorapido.com.br",
        "https://www.romaneiorapido.com.br",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "Accept"],
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
