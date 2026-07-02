"""Client MongoDB per le notifiche."""
import os
import time

from pymongo import MongoClient

from .logger import get_logger

logger = get_logger("service-notifications")

_client: MongoClient | None = None


def get_collection():
    global _client
    if _client is None:
        _client = MongoClient(os.getenv("MONGO_URL", "mongodb://mongo-notifications:27017"))
    db = _client[os.getenv("MONGO_DB", "notifications_db")]
    return db["notifications"]


def wait_for_db(retries: int = 20, delay: float = 2.0) -> None:
    for attempt in range(1, retries + 1):
        try:
            get_collection().database.client.admin.command("ping")
            logger.info("Connessione a MongoDB stabilita")
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"MongoDB non pronto (tentativo {attempt}): {exc}")
            time.sleep(delay)
    raise RuntimeError("Impossibile connettersi a MongoDB")
