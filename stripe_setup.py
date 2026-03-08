"""
Script para cadastrar produtos e preços na Stripe.
Uso: python stripe_setup.py

Requer: pip install stripe
Defina STRIPE_SECRET_KEY no .env ou como variável de ambiente.
"""

import os
import sys

try:
    import stripe
except ImportError:
    print("❌ Pacote 'stripe' não encontrado. Instale com: pip install stripe")
    sys.exit(1)

from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

if not stripe.api_key:
    print("❌ STRIPE_SECRET_KEY não definida no .env")
    sys.exit(1)

# Planos a cadastrar (trial e enterprise não entram na Stripe)
PLANS = [
    {
        "id": "basic",
        "name": "Essencial",
        "description": "Até 100 produtos, 10 categorias, suporte via email, romaneios ilimitados.",
        "price_brl": 9900,  # R$ 99,00 em centavos
    },
    {
        "id": "plus",
        "name": "Profissional",
        "description": "Até 200 produtos, 20 categorias, suporte prioritário, API (2 chaves, 60 req/min).",
        "price_brl": 19900,  # R$ 199,00 em centavos
    },
    {
        "id": "pro",
        "name": "Premium",
        "description": "Produtos e categorias ilimitados, suporte VIP 24/7, API avançada (5 chaves, 120 req/min).",
        "price_brl": 29900,  # R$ 299,00 em centavos
    },
]


def main():
    print("=" * 60)
    print("  Romaneio Rápido — Configuração de Produtos na Stripe")
    print("=" * 60)
    print()

    results = {}

    for plan in PLANS:
        print(f"📦 Criando produto: {plan['name']} ({plan['id']})...")

        # Criar produto
        product = stripe.Product.create(
            name=f"Romaneio Rápido — {plan['name']}",
            description=plan["description"],
            metadata={"plan_id": plan["id"]},
        )
        print(f"   ✅ Produto criado: {product.id}")

        # Criar preço com recorrência mensal
        price = stripe.Price.create(
            product=product.id,
            unit_amount=plan["price_brl"],
            currency="brl",
            recurring={"interval": "month"},
            metadata={"plan_id": plan["id"]},
        )
        print(f"   ✅ Preço criado: {price.id} (R$ {plan['price_brl'] / 100:.2f}/mês)")
        print()

        results[plan["id"]] = {
            "product_id": product.id,
            "price_id": price.id,
        }

    # Resumo final
    print("=" * 60)
    print("  RESUMO — Copie os Price IDs para o .env")
    print("=" * 60)
    print()
    print("Adicione estas linhas ao seu arquivo .env:")
    print()
    for plan_id, info in results.items():
        env_key = f"STRIPE_PRICE_{plan_id.upper()}"
        print(f"{env_key}={info['price_id']}")
    print()
    print("Também confirme que você já tem no .env:")
    print("STRIPE_SECRET_KEY=sk_live_xxx ou sk_test_xxx")
    print("STRIPE_PUBLISHABLE_KEY=pk_live_xxx ou pk_test_xxx")
    print("STRIPE_WEBHOOK_SECRET=whsec_xxx")
    print()
    print("✅ Configuração finalizada com sucesso!")


if __name__ == "__main__":
    main()
