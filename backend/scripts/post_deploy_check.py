"""
Smoke-test pós-deploy para validar a refatoração de performance do romaneio.

Executa apenas queries READ-ONLY (seguro em produção). Verifica:
  1. Extensão pg_trgm instalada.
  2. Os 6 índices GIN trigram esperados existem.
  3. ILIKE '%termo%' em clients/products usa o índice trigram (não seq scan).

Uso:
    python -m backend.scripts.post_deploy_check

Sai com código 0 se tudo passou, 1 se algum check falhou.
"""
import os
import sys

# Permite rodar fora do package (`python backend/scripts/post_deploy_check.py`)
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "db")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "romaneio_rapido")
    DATABASE_URL = (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
        f"@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

EXPECTED_INDEXES = [
    "ix_clients_name_trgm",
    "ix_clients_phone_trgm",
    "ix_clients_document_trgm",
    "ix_products_name_trgm",
    "ix_products_barcode_trgm",
    "ix_products_sku_trgm",
]


def ok(msg):
    print(f"  {GREEN}[OK]{RESET}    {msg}")


def fail(msg):
    print(f"  {RED}[FAIL]{RESET}  {msg}")


def warn(msg):
    print(f"  {YELLOW}[WARN]{RESET}  {msg}")


def check_pg_trgm_extension(conn):
    """Verifica se pg_trgm está instalado."""
    print("\n[1/3] Verificando extensão pg_trgm...")
    row = conn.execute(
        text(
            "SELECT extversion FROM pg_extension WHERE extname='pg_trgm';"
        )
    ).fetchone()
    if row:
        ok(f"pg_trgm instalado (versão {row[0]})")
        return True
    fail(
        "pg_trgm NÃO instalado. Conecte como superuser e rode: "
        "CREATE EXTENSION pg_trgm;"
    )
    return False


def check_trigram_indexes(conn):
    """Verifica se os 6 índices GIN trigram existem."""
    print("\n[2/3] Verificando índices GIN trigram...")
    rows = conn.execute(
        text(
            "SELECT indexname FROM pg_indexes "
            "WHERE indexname = ANY(:names);"
        ),
        {"names": EXPECTED_INDEXES},
    ).fetchall()
    found = {r[0] for r in rows}
    missing = [name for name in EXPECTED_INDEXES if name not in found]

    for name in EXPECTED_INDEXES:
        if name in found:
            ok(name)
        else:
            fail(f"{name} ausente")

    if missing:
        print(
            f"\n  {YELLOW}→ Re-rode a migração:{RESET} "
            "python -m backend.database.migrate"
        )
    return not missing


def check_index_actually_used(conn):
    """
    EXPLAIN um ILIKE em clients e products para confirmar que o planner
    está realmente usando os índices trigram (não Seq Scan).

    Tabelas vazias caem para Seq Scan independente do índice — nesse caso
    emitimos warning, não fail.
    """
    print("\n[3/3] Verificando uso efetivo dos índices em ILIKE...")
    all_ok = True
    targets = [
        ("clients", "name", "ix_clients_name_trgm"),
        ("products", "name", "ix_products_name_trgm"),
    ]
    for table, column, idx_name in targets:
        count = conn.execute(
            text(f"SELECT count(*) FROM {table};")
        ).scalar()
        if count is None or count < 100:
            warn(
                f"{table}: apenas {count} linhas — planner usa Seq Scan "
                f"(o índice {idx_name} ainda funcionará quando crescer)"
            )
            continue

        plan_rows = conn.execute(
            text(f"EXPLAIN SELECT id FROM {table} WHERE {column} ILIKE :q"),
            {"q": "%test%"},
        ).fetchall()
        plan_text = "\n".join(r[0] for r in plan_rows)

        if "Bitmap Index Scan" in plan_text and idx_name in plan_text:
            ok(f"{table}.{column} usa {idx_name}")
        elif "Seq Scan" in plan_text:
            fail(
                f"{table}.{column} ainda faz Seq Scan — índice não está "
                f"sendo usado. Rode: ANALYZE {table};"
            )
            all_ok = False
        else:
            warn(
                f"{table}.{column}: planner não escolheu {idx_name} "
                "(plano alternativo). Plano:\n" + plan_text
            )
    return all_ok


def main():
    print(f"Conectando em: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL)
    results = []
    try:
        with engine.connect() as conn:
            results.append(check_pg_trgm_extension(conn))
            results.append(check_trigram_indexes(conn))
            results.append(check_index_actually_used(conn))
    except Exception as e:
        print(f"\n{RED}ERRO DE CONEXAO:{RESET} {e}")
        return 1

    print("\n" + "=" * 50)
    if all(results):
        print(f"{GREEN}TODOS OS CHECKS PASSARAM. Backend otimizado.{RESET}")
        return 0
    print(f"{RED}ALGUM CHECK FALHOU - veja mensagens acima.{RESET}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
