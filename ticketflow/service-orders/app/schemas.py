"""Modelli Pydantic per gli ordini."""
from datetime import datetime

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    event_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0, le=20)


class OrderOut(BaseModel):
    id: int
    user_id: int
    user_email: str
    event_id: int
    event_title: str
    quantity: int
    unit_price_cents: int
    total_cents: int
    status: str
    created_at: datetime
