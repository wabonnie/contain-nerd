# =============================================================================
# service-notifications · FastAPI app
# Avvia il consumer RabbitMQ in background ed espone le notifiche in lettura.
# =============================================================================
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException

from .consumer import start_consumer
from .db import get_collection, wait_for_db
from .logger import get_logger

logger = get_logger("service-notifications")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    wait_for_db()
    start_consumer()
    logger.info("service-notifications avviato")
    yield


app = FastAPI(title="TicketFlow · service-notifications", version="1.0.0", lifespan=lifespan)


@app.get("/health", tags=["infra"])
def health():
    return {"status": "ok", "service": "service-notifications"}


@app.get("/", tags=["notifications"])
def list_notifications(x_user_id: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Identità utente mancante")
    docs = (
        get_collection()
        .find({"user_id": int(x_user_id)})
        .sort("created_at", -1)
        .limit(100)
    )
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()
        result.append(d)
    return result
