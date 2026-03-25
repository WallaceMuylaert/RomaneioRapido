import os
import sys
# Adicionar /app ao path para os imports funcionarem
sys.path.insert(0, '/app')

from backend.core.database import SessionLocal
from backend.models.users import User
from backend.models.products import Product
from backend.models.categories import Category
from backend.models.clients import Client
from backend.models.pending_romaneio import PendingRomaneio
from backend.models.inventory import InventoryMovement, MovementType
from backend.crud.pending_romaneio import create_pending_romaneio, update_pending_romaneio, delete_pending_romaneio
from backend.schemas.pending_romaneio import PendingRomaneioCreate, PendingRomaneioUpdate, PendingItem

def verify():
    db = SessionLocal()
    email = "test_verify@logicai.com.br"
    
    # 0. Cleanup de execuções anteriores
    print("Efetuando cleanup inicial...")
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            db.query(InventoryMovement).filter(InventoryMovement.created_by == u.id).delete()
            db.query(PendingRomaneio).filter(PendingRomaneio.user_id == u.id).delete()
            db.query(Product).filter(Product.user_id == u.id).delete()
            db.delete(u)
            db.commit()
    except Exception as e:
        print(f"Erro no cleanup: {e}")
        db.rollback()

    print("--- Iniciando Verificação ---")
    
    try:
        # 1. Setup
        user = User(email=email, hashed_password="pw", full_name="Verifier", is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        
        product = Product(
            name="Produto Teste",
            sku="TEST-SKU",
            stock_quantity=100.0,
            price=10.0,
            unit="UN",
            user_id=user.id
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        print(f"Produto criado. Estoque inicial: {product.stock_quantity}")

        # 2. Criar rascunho com empenho
        pending_create = PendingRomaneioCreate(
            customer_name="Cliente Verificação",
            empenhar_estoque=True,
            items=[
                PendingItem(product_id=product.id, name=product.name, quantity=10.0, unit="UN", price=10.0)
            ]
        )
        db_pending = create_pending_romaneio(db, pending_create, user.id)
        db.refresh(product)
        print(f"Rascunho criado com empenho (10). Estoque atual: {product.stock_quantity}")
        if product.stock_quantity != 90.0:
            raise Exception(f"Erro: Esperado 90.0, obtido {product.stock_quantity}")
        
        # 3. Atualizar quantidade
        pending_update = PendingRomaneioUpdate(
            items=[
                PendingItem(product_id=product.id, name=product.name, quantity=25.0, unit="UN", price=10.0)
            ],
            empenhar_estoque=True
        )
        update_pending_romaneio(db, db_pending.id, pending_update, user.id)
        db.refresh(product)
        print(f"Rascunho atualizado para 25. Estoque atual: {product.stock_quantity}")
        if product.stock_quantity != 75.0:
            raise Exception(f"Erro: Esperado 75.0, obtido {product.stock_quantity}")

        # 4. Desativar empenho
        pending_update.empenhar_estoque = False
        update_pending_romaneio(db, db_pending.id, pending_update, user.id)
        db.refresh(product)
        print(f"Empenho desativado no rascunho. Estoque atual (deve ser 100): {product.stock_quantity}")
        if product.stock_quantity != 100.0:
            raise Exception(f"Erro: Esperado 100.0, obtido {product.stock_quantity}")

        # 5. Deletar rascunho (reativando empenho primeiro para testar restauração no delete)
        pending_update.empenhar_estoque = True
        update_pending_romaneio(db, db_pending.id, pending_update, user.id)
        db.refresh(product)
        print(f"Empenho reativado (25). Estoque atual: {product.stock_quantity}")
        
        delete_pending_romaneio(db, db_pending.id, user.id)
        db.refresh(product)
        print(f"Rascunho deletado. Estoque final: {product.stock_quantity}")
        if product.stock_quantity != 100.0:
            raise Exception(f"Erro: Esperado 100.0, obtido {product.stock_quantity}")

        print("--- Verificação Concluída com Sucesso! ---")
    
    except Exception as e:
        print(f"❌ FALHA na verificação: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup final
        print("Efetuando cleanup final...")
        try:
            db.query(InventoryMovement).filter(InventoryMovement.pending_romaneio_id == db_pending.id).delete()
            db.query(PendingRomaneio).filter(PendingRomaneio.user_id == user.id).delete()
            db.query(Product).filter(Product.user_id == user.id).delete()
            db.delete(user)
            db.commit()
        except:
            db.rollback()
        db.close()

if __name__ == "__main__":
    verify()
