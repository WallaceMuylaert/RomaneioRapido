import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.routers.auth import get_current_user
from backend.models.users import User
from backend.models.products import Product
from backend.models.categories import Category
from backend.core.config import settings
from backend.core.plans_config import PLANS_CONFIG, STRIPE_PRICE_MAP, PRICE_TO_PLAN_MAP
from backend.schemas.plans import SubscribeRequest, CheckoutResponse, PortalResponse
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("plans")

router = APIRouter(prefix="/plans")


def _get_stripe():
    """Inicializa Stripe com a chave secreta."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe não configurado")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_or_create_customer(user: User, db: Session) -> str:
    """Retorna stripe_customer_id existente ou cria um novo customer."""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    if not settings.STRIPE_ENABLED:
        return f"cus_dev_{user.id}"

    customer = stripe.Customer.create(
        email=user.email,
        name=user.full_name,
        metadata={"user_id": str(user.id)},
    )
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


@router.get("/usage")
def get_usage(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product_count = db.query(Product).count()
    category_count = db.query(Category).count()

    plan = PLANS_CONFIG.get(current_user.plan_id, PLANS_CONFIG["trial"])

    return {
        "products": {
            "used": product_count,
            "limit": plan["limit_products"]
        },
        "categories": {
            "used": category_count,
            "limit": plan["limit_categories"]
        },
        "plan_id": current_user.plan_id,
    }


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    request: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria sessão do Stripe Checkout para assinatura mensal."""
    # Se Stripe estiver desativado (modo dev), atualizar plano diretamente e simular sucesso
    if not settings.STRIPE_ENABLED:
        logger.info(f"Bypass de Stripe detectado para usuário {current_user.email}. Atualizando para {request.plan_id}")
        current_user.plan_id = request.plan_id
        db.commit()
        # Retorna uma URL de sucesso simulada para o frontend tratar
        return CheckoutResponse(checkout_url=f"{settings.FRONTEND_URL}/perfil?session_id=cs_dev_{current_user.id}")

    _get_stripe()

    price_id = STRIPE_PRICE_MAP.get(request.plan_id)
    if not price_id:
        raise HTTPException(status_code=400, detail="Plano inválido ou não disponível para compra")

    customer_id = _get_or_create_customer(current_user, db)

    # Se já tem assinatura ativa, redirecionar para o portal
    if current_user.stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail="Você já possui uma assinatura ativa. Use o portal para alterar seu plano.",
        )

    checkout_session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/perfil?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/perfil?checkout=cancel",
        metadata={"user_id": str(current_user.id), "plan_id": request.plan_id},
        subscription_data={
            "metadata": {"user_id": str(current_user.id), "plan_id": request.plan_id},
        },
    )

    return CheckoutResponse(checkout_url=checkout_session.url)


@router.post("/portal", response_model=PortalResponse)
def create_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria sessão do Stripe Customer Portal para gerenciar assinatura."""
    if not settings.STRIPE_ENABLED:
        return PortalResponse(portal_url=f"{settings.FRONTEND_URL}/perfil")

    _get_stripe()

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Nenhuma assinatura encontrada")

    portal_session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/perfil",
    )

    return PortalResponse(portal_url=portal_session.url)


@router.get("/session-status/{session_id}")
def get_session_status(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifica o status de uma sessão do Stripe e se o plano já foi atualizado."""
    if not settings.STRIPE_ENABLED or session_id.startswith("cs_dev_"):
        # Em modo dev, simulamos que o plano já foi atualizado (pois fazemos no checkout post)
        return {
            "status": "complete",
            "payment_status": "paid",
            "plan_updated": True,
            "plan_id": current_user.plan_id
        }

    _get_stripe()
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Verificamos se o plano do usuário no DB já corresponde ao plano da metadata da sessão
        # Isso garante que o webhook já processou a atualização
        target_plan = session.metadata.get("plan_id")
        plan_updated = current_user.plan_id == target_plan

        return {
            "status": session.status, # 'open', 'complete', 'expired'
            "payment_status": session.payment_status, # 'paid', 'unpaid', 'no_payment_required'
            "plan_updated": plan_updated,
            "plan_id": current_user.plan_id if plan_updated else None
        }
    except Exception as e:
        logger.error(f"Erro ao buscar sessão {session_id}: {str(e)}")
        raise HTTPException(status_code=400, detail="Sessão não encontrada")


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Webhook da Stripe para processar eventos de assinatura."""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe não configurado")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload inválido")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Assinatura inválida")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe webhook recebido: {event_type}")

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data, db)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data, db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data, db)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data, db)

    return {"status": "ok"}


def _handle_checkout_completed(session: dict, db: Session):
    """Atualiza usuário após checkout bem-sucedido."""
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        logger.warning(f"Usuário não encontrado para customer {customer_id}")
        return

    # Buscar a subscription para obter o price_id
    subscription = stripe.Subscription.retrieve(subscription_id)
    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan_id = PRICE_TO_PLAN_MAP.get(price_id)

    if plan_id:
        user.plan_id = plan_id
        user.stripe_subscription_id = subscription_id
        db.commit()
        logger.info(f"Usuário {user.id} atualizado para plano {plan_id}")
    else:
        logger.warning(f"Price ID {price_id} não mapeado para nenhum plano")


def _handle_subscription_updated(subscription: dict, db: Session):
    """Atualiza plano quando assinatura muda (upgrade/downgrade)."""
    customer_id = subscription.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        logger.warning(f"Usuário não encontrado para customer {customer_id}")
        return

    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan_id = PRICE_TO_PLAN_MAP.get(price_id)
    status = subscription.get("status")

    if plan_id and status == "active":
        user.plan_id = plan_id
        user.stripe_subscription_id = subscription["id"]
        db.commit()
        logger.info(f"Assinatura de {user.id} atualizada para {plan_id}")
    elif status in ("past_due", "unpaid"):
        logger.warning(f"Assinatura de {user.id} com status {status}")


def _handle_subscription_deleted(subscription: dict, db: Session):
    """Downgrade para trial quando assinatura é cancelada."""
    customer_id = subscription.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    user.plan_id = "trial"
    user.stripe_subscription_id = None
    db.commit()
    logger.info(f"Assinatura de {user.id} cancelada, revertido para trial")


def _handle_payment_failed(invoice: dict, db: Session):
    """Log quando pagamento falha."""
    customer_id = invoice.get("customer")
    logger.warning(f"Pagamento falhou para customer {customer_id}")


# Mantém endpoint legado para compatibilidade (apenas leitura de uso)
@router.patch("/subscribe")
def subscribe_legacy(
    request: SubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Endpoint legado — redireciona para checkout Stripe."""
    if request.plan_id not in PLANS_CONFIG:
        raise HTTPException(status_code=400, detail="Plano inválido")

    if request.plan_id in ("trial", "enterprise"):
        raise HTTPException(status_code=400, detail="Use o checkout para planos pagos")

    # Se stripe está configurado, requer checkout
    if settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=400,
            detail="Use POST /plans/checkout para assinar planos pagos",
        )

    # Fallback sem Stripe (ambiente dev sem configuração)
    current_user.plan_id = request.plan_id
    db.commit()
    return {"message": f"Assinatura atualizada para {request.plan_id}", "plan_id": request.plan_id}
