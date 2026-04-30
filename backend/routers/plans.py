import os
import stripe
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.routers.auth import get_current_user
from backend.models.users import User
from backend.models.products import Product
from backend.models.categories import Category
from backend.core.config import settings
from backend.core.plans_config import PLANS_CONFIG, STRIPE_PRICE_MAP, PRICE_TO_PLAN_MAP
from backend.schemas.plans import SubscribeRequest, CheckoutResponse, PortalResponse, SessionStatusResponse
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("plans")

router = APIRouter(prefix="/plans")


def _get_stripe():
    """Inicializa Stripe com a chave secreta."""
    if not settings.STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY não definida — verifique o .env no servidor de produção")
        raise HTTPException(status_code=503, detail="Pagamentos temporariamente indisponíveis. Contate o suporte.")
    stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_or_create_customer(user: User, db: Session) -> str:
    """Retorna stripe_customer_id existente ou cria um novo customer."""
    if user.stripe_customer_id:
        try:
            stripe.Customer.retrieve(user.stripe_customer_id)
            return user.stripe_customer_id
        except stripe.error.InvalidRequestError as e:
            if e.code == "resource_missing":
                logger.warning(
                    f"stripe_customer_id inválido para usuário {user.id}: {user.stripe_customer_id}. Recriando customer."
                )
                try:
                    user.stripe_customer_id = None
                    db.commit()
                except Exception:
                    db.rollback()
                    logger.exception(f"Erro ao limpar stripe_customer_id inválido para o usuário {user.id}")
                    raise HTTPException(status_code=500, detail="Erro ao processar dados de pagamento")
            else:
                logger.exception(f"Erro ao validar customer Stripe para o usuário {user.id}")
                raise HTTPException(status_code=502, detail="Erro ao validar cliente de pagamento")
        except stripe.error.StripeError:
            logger.exception(f"Erro ao validar customer Stripe para o usuário {user.id}")
            raise HTTPException(status_code=502, detail="Erro ao validar cliente de pagamento")

    try:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name,
            metadata={"user_id": str(user.id)},
        )
        user.stripe_customer_id = customer.id
        db.commit()
        return customer.id
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao criar customer no Stripe para o usuário {user.id}")
        raise HTTPException(status_code=500, detail="Erro ao processar dados de pagamento")


@router.get("/usage")
def get_usage(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product_count = db.query(Product).filter(Product.user_id == current_user.id, Product.is_active == True).count()
    category_count = db.query(Category).filter(Category.user_id == current_user.id).count()

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

    try:
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.FRONTEND_URL}/perfil?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/perfil?checkout=cancel",
            metadata={"user_id": str(current_user.id), "plan_id": request.plan_id},
            subscription_data={
                "metadata": {"user_id": str(current_user.id), "plan_id": request.plan_id},
            },
        )
    except stripe.error.StripeError as e:
        logger.exception(f"Erro ao criar sessão de checkout Stripe para o usuário {current_user.id}")
        raise HTTPException(status_code=502, detail=f"Erro ao iniciar checkout: {e.user_message or str(e)}")

    return CheckoutResponse(checkout_url=checkout_session.url)


@router.get("/session-status/{session_id}", response_model=SessionStatusResponse)
def get_session_status(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verifica o status de uma sessão de checkout Stripe (polling pós-checkout)."""
    _get_stripe()

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Garantir que a sessão pertence ao customer do usuário atual
    customer_id = session.get("customer")
    if customer_id and current_user.stripe_customer_id and customer_id != current_user.stripe_customer_id:
        raise HTTPException(status_code=403, detail="Acesso negado")

    session_status = session.get("status")
    payment_status = session.get("payment_status")
    subscription_id = session.get("subscription")

    # Verificar se o webhook já atualizou o plano no banco
    db.refresh(current_user)
    plan_updated = bool(
        subscription_id and current_user.stripe_subscription_id == subscription_id
    )

    # Fallback: se o pagamento foi confirmado mas o webhook ainda não atualizou,
    # atualizar o plano diretamente (essencial para dev local e webhooks atrasados)
    if session_status == "complete" and payment_status == "paid" and not plan_updated and subscription_id:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            price_id = subscription["items"]["data"][0]["price"]["id"]
            plan_id = PRICE_TO_PLAN_MAP.get(price_id)
            if plan_id:
                current_user.plan_id = plan_id
                current_user.stripe_subscription_id = subscription_id
                if not current_user.stripe_customer_id:
                    current_user.stripe_customer_id = customer_id
                db.commit()
                plan_updated = True
                logger.info(f"Plano de {current_user.id} atualizado via polling (fallback): {plan_id}")
            else:
                logger.warning(f"Price ID {price_id} não mapeado para nenhum plano (polling fallback)")
        except Exception as e:
            db.rollback()
            logger.exception("Erro crítico no fallback de atualização de plano")

    return SessionStatusResponse(
        status=session_status,
        payment_status=payment_status,
        plan_updated=plan_updated,
    )


@router.post("/portal", response_model=PortalResponse)
def create_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria sessão do Stripe Customer Portal para gerenciar assinatura."""

    _get_stripe()

    if not current_user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Nenhuma assinatura encontrada")

    portal_session = stripe.billing_portal.Session.create(
        customer=current_user.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/perfil",
    )

    return PortalResponse(portal_url=portal_session.url)

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
    elif event_type == "invoice.payment_succeeded":
        _handle_payment_succeeded(data, db)

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
        try:
            user.plan_id = plan_id
            user.stripe_subscription_id = subscription_id
            user.subscription_status = "active"
            user.payment_failed_at = None
            db.commit()
            logger.info(f"Usuário {user.id} atualizado para plano {plan_id}")
        except Exception as e:
            db.rollback()
            logger.exception(f"Erro ao processar checkout.session.completed para o usuário {user.id}")
    else:
        logger.warning(f"Price ID {price_id} não mapeado para nenhum plano")


def _handle_subscription_updated(subscription: dict, db: Session):
    """Atualiza plano e status quando assinatura muda (upgrade/downgrade/inadimplência)."""
    customer_id = subscription.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        logger.warning(f"Usuário não encontrado para customer {customer_id}")
        return

    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan_id = PRICE_TO_PLAN_MAP.get(price_id)
    status = subscription.get("status")

    try:
        if status == "active":
            # Pagamento regularizado ou upgrade/downgrade
            if plan_id:
                user.plan_id = plan_id
            user.stripe_subscription_id = subscription["id"]
            user.subscription_status = "active"
            user.payment_failed_at = None
            db.commit()
            logger.info(f"Assinatura de {user.id} ativa — plano {plan_id or user.plan_id}")

        elif status == "past_due":
            # Pagamento falhou, Stripe ainda retentando
            user.subscription_status = "past_due"
            if not user.payment_failed_at:
                user.payment_failed_at = datetime.now(timezone.utc)
            db.commit()
            logger.warning(f"Assinatura de {user.id} com pagamento pendente (past_due)")

        elif status == "unpaid":
            # Todas as tentativas falharam — bloquear acesso
            user.subscription_status = "unpaid"
            db.commit()
            logger.warning(f"Assinatura de {user.id} não paga (unpaid) — acesso bloqueado")

        elif status in ("canceled", "incomplete_expired"):
            # Assinatura cancelada pela Stripe
            user.subscription_status = "canceled"
            user.plan_id = "trial"
            user.stripe_subscription_id = None
            user.payment_failed_at = None
            db.commit()
            logger.info(f"Assinatura de {user.id} cancelada via subscription.updated, revertido para trial")
        else:
            logger.info(f"Assinatura de {user.id} com status não tratado: {status}")

    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao atualizar assinatura para o usuário {user.id}")


def _handle_subscription_deleted(subscription: dict, db: Session):
    """Downgrade para trial quando assinatura é cancelada."""
    customer_id = subscription.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    try:
        user.plan_id = "trial"
        user.stripe_subscription_id = None
        user.subscription_status = "canceled"
        user.payment_failed_at = None
        db.commit()
        logger.info(f"Assinatura de {user.id} cancelada, revertido para trial")
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao processar cancelamento de assinatura para o usuário {user.id}")


def _handle_payment_failed(invoice: dict, db: Session):
    """Marca usuário como inadimplente quando pagamento falha."""
    customer_id = invoice.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        logger.warning(f"Usuário não encontrado para customer {customer_id} (payment_failed)")
        return

    try:
        # Marcar como past_due se ainda não estiver em estado pior
        if user.subscription_status not in ("unpaid", "canceled"):
            user.subscription_status = "past_due"
        if not user.payment_failed_at:
            user.payment_failed_at = datetime.now(timezone.utc)
        db.commit()

        attempt_number = invoice.get("attempt_count", "?")
        failure_message = invoice.get("last_finalization_error", {})
        if isinstance(failure_message, dict):
            failure_message = failure_message.get("message", "Motivo não informado")
        else:
            failure_message = "Motivo não informado"

        logger.warning(
            f"Pagamento falhou para usuário {user.id} (customer {customer_id}) "
            f"| Tentativa: {attempt_number} | Motivo: {failure_message}"
        )
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao processar payment_failed para customer {customer_id}")


def _handle_payment_succeeded(invoice: dict, db: Session):
    """Limpa estado de inadimplência quando pagamento é confirmado."""
    customer_id = invoice.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    try:
        # Só reseta se o status anterior era de falha
        if user.subscription_status in ("past_due", "unpaid"):
            user.subscription_status = "active"
            user.payment_failed_at = None
            db.commit()
            logger.info(f"Pagamento regularizado para usuário {user.id} — status restaurado para active")
        else:
            logger.info(f"Pagamento confirmado para usuário {user.id} (já estava ativo)")
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao processar payment_succeeded para customer {customer_id}")


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

    if os.getenv("ENVIRONMENT", "development").lower() != "development":
        raise HTTPException(
            status_code=503,
            detail="Pagamentos temporariamente indisponíveis. Contate o suporte.",
        )

    try:
        # Fallback sem Stripe (ambiente dev sem configuração)
        current_user.plan_id = request.plan_id
        db.commit()
        return {"message": f"Assinatura atualizada para {request.plan_id}", "plan_id": request.plan_id}
    except Exception as e:
        db.rollback()
        logger.exception("Erro crítico no fallback de assinatura legado")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")
