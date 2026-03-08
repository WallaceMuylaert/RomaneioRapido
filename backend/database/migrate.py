"""
Script de migração dinâmico que sincroniza as colunas do banco de dados
com os modelos SQLAlchemy automaticamente.
"""
from sqlalchemy import create_engine, text, inspect
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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
    'TEXT': 'TEXT',
    'BOOLEAN': 'BOOLEAN',
    'DATE': 'DATE',
    'DATETIME': 'TIMESTAMP',
    'TIMESTAMP': 'TIMESTAMP',
    'FLOAT': 'FLOAT',
    'NUMERIC': 'NUMERIC',
    'JSON': 'JSON',
    'JSONB': 'JSONB',
}

def get_pg_type(sa_type):
    """Convert SQLAlchemy type to PostgreSQL type string"""
    type_name = type(sa_type).__name__.upper()
    return TYPE_MAP.get(type_name, 'VARCHAR')

def get_existing_columns(table_name):
    """Get list of existing columns in a table"""
    with engine.connect() as conn:
        query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = :table_name;
        """)
        result = conn.execute(query, {"table_name": table_name})
        return {row[0] for row in result}

def add_column_if_not_exists(table_name, column_name, column_type, nullable=True):
    """Add a column to a table if it doesn't exist"""
    with engine.connect() as conn:
        existing = get_existing_columns(table_name)
        
        if column_name not in existing:
            null_clause = "" if nullable else " NOT NULL"
            print(f"  [+] Adding column '{column_name}' ({column_type}) to '{table_name}'...")
            alter_query = text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}{null_clause};")
            conn.execute(alter_query)
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
                WHERE table_name = :table_name
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
    
    from backend.models.users import User
    from backend.models.products import Product
    from backend.models.categories import Category
    from backend.models.inventory import InventoryMovement
    from backend.models.clients import Client
    
    models = [
        User,
        Category,
        Product,
        InventoryMovement,
        Client,
    ]
    
    for model in models:
        try:
            sync_model_to_db(model)
        except Exception as e:
            print(f"  ❌ Error syncing {model.__tablename__}: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Migration completed!")
    print("=" * 50)

if __name__ == "__main__":
    try:
        run_migrations()
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        sys.exit(1)
