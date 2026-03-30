"""
Script de migração dinâmico que sincroniza as colunas do banco de dados
com os modelos SQLAlchemy automaticamente.
"""
from sqlalchemy import create_engine, text, inspect
import os
import sys

# Adiciona a raiz do projeto ao sys.path para permitir imports do pacote 'backend'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "db")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "romaneio_rapido")
    DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"

print(f"Connecting to database...")

engine = create_engine(DATABASE_URL)

TYPE_MAP = {
    'INTEGER': 'INTEGER',
    'BIGINT': 'BIGINT',
    'SMALLINT': 'SMALLINT',
    'VARCHAR': 'VARCHAR',
    'STRING': 'VARCHAR',
    'TEXT': 'TEXT',
    'BOOLEAN': 'BOOLEAN',
    'DATE': 'DATE',
    'DATETIME': 'TIMESTAMP',
    'TIMESTAMP': 'TIMESTAMP',
    'FLOAT': 'FLOAT',
    'NUMERIC': 'NUMERIC',
    'JSON': 'JSON',
    'JSONB': 'JSONB',
    'ENUM': 'VARCHAR',  # Fallback para VARCHAR no sistema dinâmico
}

def get_pg_type(sa_type):
    """Convert SQLAlchemy type to PostgreSQL type string"""
    type_name = type(sa_type).__name__.upper()
    return TYPE_MAP.get(type_name, 'VARCHAR')

def get_existing_columns(table_name):
    """Get list of existing columns in a table from public schema"""
    with engine.connect() as conn:
        query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = :table_name AND table_schema = 'public';
        """)
        result = conn.execute(query, {"table_name": table_name})
        return {row[0] for row in result}

def get_first_admin_id():
    """Get the ID of the first admin user to use as default for multi-tenancy columns"""
    with engine.connect() as conn:
        try:
            query = text("SELECT id FROM users WHERE is_admin = True ORDER BY id ASC LIMIT 1;")
            result = conn.execute(query).fetchone()
            return result[0] if result else None
        except Exception:
            return None

def add_column_if_not_exists(table_name, column_name, column_type, nullable=True):
    """Add a column to a table if it doesn't exist, handling NOT NULL constraints safely"""
    with engine.connect() as conn:
        existing = get_existing_columns(table_name)
        
        if column_name not in existing:
            # Se for NOT NULL, adicionamos como NULLABLE primeiro para evitar erro no Postgres com tabelas existentes
            actual_nullable = True if nullable else True
            null_clause = "" # Default para nullable
            
            print(f"  [+] Adding column '{column_name}' ({column_type}) to '{table_name}'...")
            alter_query = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};")
            conn.execute(alter_query)
            conn.commit()

            # Se a coluna era pra ser NOT NULL, precisamos preencher dados antes de aplicar a constraint
            if not nullable:
                default_val = None
                if column_name in ['user_id', 'created_by']:
                    default_val = get_first_admin_id()
                
                if default_val is not None:
                    print(f"  [⚡] Filling existing rows for '{column_name}' with admin ID {default_val}...")
                    update_query = text(f"UPDATE {table_name} SET {column_name} = :val WHERE {column_name} IS NULL;")
                    conn.execute(update_query, {"val": default_val})
                    conn.commit()
                
                print(f"  [🔒] Applying NOT NULL constraint to '{column_name}'...")
                # Tenta aplicar NOT NULL, mas só se tivermos certeza que não há nulos
                try:
                    conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {column_name} SET NOT NULL;"))
                    conn.commit()
                except Exception as e:
                    print(f"  ⚠️ Could not set NOT NULL for {column_name}: {e}")
            
            # Preenchimento de defaults para colunas específicas mesmo que sejam NULLABLE
            if column_name == 'trial_days':
                print(f"  [⚡] Filling existing rows for 'trial_days' with default (7)...")
                conn.execute(text(f"UPDATE {table_name} SET trial_days = 7 WHERE trial_days IS NULL;"))
                conn.commit()
            elif column_name == 'discount_snapshot':
                print(f"  [⚡] Filling existing rows for 'discount_snapshot' with default (0)...")
                conn.execute(text(f"UPDATE {table_name} SET discount_snapshot = 0 WHERE discount_snapshot IS NULL;"))
                conn.commit()
            elif column_name == 'is_cancelled':
                print(f"  [⚡] Filling existing rows for 'is_cancelled' with default (False)...")
                conn.execute(text(f"UPDATE {table_name} SET is_cancelled = False WHERE is_cancelled IS NULL;"))
                conn.commit()
            
            return True
        return False

def sync_model_to_db(model_class):
    """Sync a SQLAlchemy model class with the database table"""
    table_name = model_class.__tablename__
    print(f"\n📋 Checking table: {table_name}")
    
    with engine.connect() as conn:
        query = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = :table_name AND table_schema = 'public'
            );
        """)
        result = conn.execute(query, {"table_name": table_name}).fetchone()
        if not result[0]:
            print(f"  ⚠️  Table '{table_name}' does not exist, skipping...")
            return
    
    existing_columns = get_existing_columns(table_name)
    added_count = 0
    
    mapper = inspect(model_class)
    for column in mapper.columns:
        col_name = column.name
        col_type = get_pg_type(column.type)
        nullable = column.nullable
        
        if col_name not in existing_columns:
            if add_column_if_not_exists(table_name, col_name, col_type, nullable):
                added_count += 1
        else:
            print(f"  [✓] Column '{col_name}' already exists")
    
    if added_count == 0:
        print(f"  ✅ Table '{table_name}' is up to date!")
    else:
        print(f"  🔧 Added {added_count} new column(s) to '{table_name}'")

def run_migrations():
    """Run all migrations by syncing all models"""
    print("=" * 50)
    print("🚀 Starting Dynamic Migration")
    print("=" * 50)

    from backend.core import database
    from backend.models.users import User
    from backend.models.products import Product
    from backend.models.categories import Category
    from backend.models.inventory import InventoryMovement, MovementType as _MT
    from backend.models.clients import Client
    from backend.models.api_keys import ApiKey
    from backend.models.pending_romaneio import PendingRomaneio
    from sqlalchemy import Enum as _SAEnum

    # Cria todas as tabelas (DDL principal) - Base para novas instalações
    print("\n📦 Ensuring all tables exist (Metadata.create_all)...")
    database.Base.metadata.create_all(bind=database.engine, checkfirst=True)
    print("  ✅ Tables checked/created")

    # Cria enums manualmente se necessário
    try:
        print("\n🔧 Checking/Creating Enums...")
        _mt_enum = _SAEnum(_MT, name="movementtype")
        _mt_enum.create(bind=database.engine, checkfirst=True)
        print("  ✅ Enums checked/created")
    except Exception as e:
        print(f"  ⚠️ Warning creating enum (may already exist): {e}")

    models = [
        User,
        Category,
        Product,
        PendingRomaneio,
        InventoryMovement,
        Client,
        ApiKey
    ]

    for model in models:
        try:
            sync_model_to_db(model)
        except Exception as e:
            print(f"  ❌ Error syncing {model.__tablename__}: {e}")
            raise  # Halt migration if a critical error occurs

    # Inicializa o Admin se necessário
    try:
        print("\n👤 Checking/Initializing Admin User...")
        from backend.core.init_db import init_db
        init_db()
        print("  ✅ Admin initialization finished")
    except Exception as e:
        print(f"  ❌ Error initializing admin: {e}")
        # Not raising here as admin init often depends on fully migrated DB

    # Fix para is_cancelled em movimentações existentes
    with database.engine.connect() as conn:
        try:
            print("\n🔧 Fixing NULL values for 'is_cancelled' in inventory_movements...")
            conn.execute(text("UPDATE inventory_movements SET is_cancelled = False WHERE is_cancelled IS NULL;"))
            conn.commit()
            print("  ✅ is_cancelled NULL fix completed")
        except Exception as e:
            print(f"  ⚠️ Warning fixing is_cancelled: {e}")

    print("\n" + "=" * 50)
    print("✅ Migration completed!")
    print("=" * 50)

if __name__ == "__main__":
    try:
        run_migrations()
    except Exception as e:
        import traceback
        print(f"\n❌ FATAL: Error during migration: {e}")
        traceback.print_exc()
        sys.exit(1)
