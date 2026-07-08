# =============================================================================
# service-events · FastAPI app
# CRUD eventi + endpoint interno di prenotazione biglietti.
# =============================================================================
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Response

from . import repository as repo
from .db import pool, wait_for_db
from .logger import get_logger
from .schemas import EventCreate, EventOut, EventUpdate, ReserveRequest

logger = get_logger("service-events")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    wait_for_db()
    pool.open()
    logger.info("service-events avviato")
    yield
    pool.close()


app = FastAPI(title="TicketFlow · service-events", version="1.0.0", lifespan=lifespan)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "service": "service-events"}


@app.get("/", response_model=list[EventOut], tags=["events"])
def list_events(
    city: str | None = Query(default=None),
    category: str | None = Query(default=None),
):
    return repo.list_events(city, category)


@app.post("/", response_model=EventOut, status_code=201, tags=["events"])
def create_event(payload: EventCreate):
    created = repo.create_event(payload.model_dump())
    logger.info(f"Evento creato id={created['id']}")
    return created


@app.get("/{event_id}", response_model=EventOut, tags=["events"])
def get_event(event_id: int):
    event = repo.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    return event


@app.put("/{event_id}", response_model=EventOut, tags=["events"])
def update_event(event_id: int, payload: EventUpdate):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = repo.update_event(event_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    logger.info(f"Evento aggiornato id={event_id}")
    return updated


@app.delete("/{event_id}", status_code=204, tags=["events"])
def delete_event(event_id: int):
    if not repo.delete_event(event_id):
        raise HTTPException(status_code=404, detail="Evento non trovato")
    logger.info(f"Evento eliminato id={event_id}")
    return Response(status_code=204)


@app.post("/{event_id}/reserve", response_model=EventOut, tags=["internal"])
def reserve(event_id: int, payload: ReserveRequest):
    """Uso interno (service-orders): decremento atomico della disponibilità."""
    result = repo.reserve_tickets(event_id, payload.quantity)
    if result is None:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    if result.get("error") == "sold_out":
        raise HTTPException(status_code=409, detail="Biglietti insufficienti")
    logger.info(f"Riservati {payload.quantity} biglietti per evento id={event_id}")
    return result
