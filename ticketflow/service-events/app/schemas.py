"""Modelli Pydantic per input/output del service-events."""
from datetime import datetime

from pydantic import BaseModel, Field


class EventBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = ""
    venue: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=120)
    category: str = "generico"
    event_date: datetime
    price_cents: int = Field(..., ge=0)
    total_tickets: int = Field(..., ge=0)


class EventCreate(EventBase):
    """In creazione la disponibilità parte pari al totale."""


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    venue: str | None = None
    city: str | None = None
    category: str | None = None
    event_date: datetime | None = None
    price_cents: int | None = Field(default=None, ge=0)
    total_tickets: int | None = Field(default=None, ge=0)


class EventOut(EventBase):
    id: int
    available_tickets: int
    created_at: datetime


class ReserveRequest(BaseModel):
    quantity: int = Field(..., gt=0)
