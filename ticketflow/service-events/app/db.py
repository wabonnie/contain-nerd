"""Connection pool PostgreSQL con attesa della disponibilità del DB."""
import os
import time

from psycopg_pool import ConnectionPool

from .logger import get_logger

logger = get_logger("service-events")

_conninfo = (
    f"host={os.getenv('DB_HOST')} port={os.getenv('DB_PORT', '5432')} "
    f"dbname={os.getenv('DB_NAME')} user={os.getenv('DB_USER')} "
    f"password={os.getenv('DB_PASSWORD')}"
)

# open=False: apriamo esplicitamente dopo aver atteso il DB.
pool = ConnectionPool(conninfo=_conninfo, min_size=1, max_size=10, open=False)


def wait_for_db(retries: int = 20, delay: float = 2.0) -> None:
    for attempt in range(1, retries + 1):
        try:
            with pool.connection() as conn:
                conn.execute("SELECT 1")
            logger.info("Connessione al database stabilita")
            return
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"DB non pronto (tentativo {attempt}): {exc}")
            time.sleep(delay)
    raise RuntimeError("Impossibile connettersi al database")
