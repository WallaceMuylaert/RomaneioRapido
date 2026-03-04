# Configuração de Planos - Replicado para validação backend
PLANS_CONFIG = {
    "trial": {"limit_products": 10, "limit_categories": 3, "limit_api_keys": 0, "api_rate_limit": "0/minute", "trial_days": 7},
    "basic": {"limit_products": 100, "limit_categories": 10, "limit_api_keys": 0, "api_rate_limit": "0/minute"},
    "plus": {"limit_products": 200, "limit_categories": 20, "limit_api_keys": 2, "api_rate_limit": "60/minute"},
    "pro": {"limit_products": 999999, "limit_categories": 999999, "limit_api_keys": 5, "api_rate_limit": "120/minute"},
    "enterprise": {"limit_products": 999999, "limit_categories": 999999, "limit_api_keys": 20, "api_rate_limit": "300/minute"},
}

PLANS_WITH_API_ACCESS = {"plus", "pro", "enterprise"}
