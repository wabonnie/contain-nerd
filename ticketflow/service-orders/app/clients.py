"""Client HTTP verso service-events (comunicazione sincrona inter-servizio)."""
import os

import httpx

from .logger import get_logger

logger = get_logger("service-orders")
EVENTS_URL = os.getenv("EVENTS_SERVICE_URL", "http://service-events:8000")


class EventsError(Exception):
    def __init__(self, status: int, detail: str) -> None:
        self.status = status
        self.detail = detail
        super().__init__(detail)


def reserve_event_tickets(event_id: int, quantity: int) -> dict:
    """Riserva biglietti presso service-events. Solleva EventsError su problemi."""
    try:
        resp = httpx.post(
            f"{EVENTS_URL}/{event_id}/reserve",
            json={"quantity": quantity},
            timeout=5.0,
        )
    except httpx.RequestError as exc:
        logger.error(f"service-events irraggiungibile: {exc}")
        raise EventsError(503, "Servizio eventi non disponibile") from exc

    if resp.status_code == 200:
        return resp.json()
    if resp.status_code == 404:
        raise EventsError(404, "Evento non trovato")
    if resp.status_code == 409:
        raise EventsError(409, "Biglietti insufficienti")
    raise EventsError(502, "Errore dal servizio eventi")
