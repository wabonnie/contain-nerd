# =============================================================================
# service-orders · FastAPI app
# Crea ordini, riserva biglietti su service-events, pubblica order.created.
# L'identità arriva dagli header iniettati dal gateway (già validati via JWT).
# =============================================================================
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException

from . import repository as repo
from .broker import publisher
from .clients import EventsError, reserve_event_tickets
from .db import pool, wait_for_db
from .logger import get_logger
from .schemas import OrderCreate, OrderOut

logger = get_logger("service-orders")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    wait_for_db()
    pool.open()
    logger.info("service-orders avviato")
    yield
    pool.close()
    publisher.close()


app = FastAPI(title="TicketFlow · service-orders", version="1.0.0", lifespan=lifespan)


def current_user(
    x_user_id: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None),
) -> dict:
    """Estrae l'utente dagli header propagati dal gateway."""
    if not x_user_id or not x_user_email:
        raise HTTPException(status_code=401, detail="Identità utente mancante")
    return {"id": int(x_user_id), "email": x_user_email}


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "service": "service-orders"}


@app.post("/", response_model=OrderOut, status_code=201, tags=["orders"])
def create_order(
    payload: OrderCreate,
    x_user_id: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None),
):
    user = current_user(x_user_id, x_user_email)

    # 1) Riserva i biglietti presso service-events (decremento atomico).
    try:
        event = reserve_event_tickets(payload.event_id, payload.quantity)
    except EventsError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail)

    # 2) Persistenza dell'ordine.
    unit_price = event["price_cents"]
    order = repo.create_order(
        {
            "user_id": user["id"],
            "user_email": user["email"],
            "event_id": payload.event_id,
            "event_title": event["title"],
            "quantity": payload.quantity,
            "unit_price_cents": unit_price,
            "total_cents": unit_price * payload.quantity,
        }
    )

    # 3) Evento asincrono verso il broker → service-notifications.
    publisher.publish(
        "order.created",
        {
            "order_id": order["id"],
            "user_id": user["id"],
            "user_email": user["email"],
            "event_id": payload.event_id,
            "event_title": event["title"],
            "quantity": payload.quantity,
            "total_cents": order["total_cents"],
        },
    )
    logger.info(f"Ordine creato id={order['id']} utente={user['id']}")
    return order


@app.get("/", response_model=list[OrderOut], tags=["orders"])
def list_orders(
    x_user_id: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None),
):
    user = current_user(x_user_id, x_user_email)
    return repo.list_orders(user["id"])


@app.get("/{order_id}", response_model=OrderOut, tags=["orders"])
def get_order(
    order_id: int,
    x_user_id: str | None = Header(default=None),
    x_user_email: str | None = Header(default=None),
):
    user = current_user(x_user_id, x_user_email)
    order = repo.get_order(order_id, user["id"])
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return order
