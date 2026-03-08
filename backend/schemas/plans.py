from pydantic import BaseModel
from typing import Optional


class SubscribeRequest(BaseModel):
    plan_id: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionStatus(BaseModel):
    plan_id: str
    stripe_subscription_id: Optional[str] = None
    status: Optional[str] = None
