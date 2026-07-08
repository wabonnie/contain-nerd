"""Accesso ai dati per gli ordini."""
from .db import pool

_COLS = (
    "id, user_id, user_email, event_id, event_title, quantity, "
    "unit_price_cents, total_cents, status, created_at"
)


def create_order(data: dict) -> dict:
    with pool.connection() as conn:
        cur = conn.execute(
            """INSERT INTO orders
               (user_id, user_email, event_id, event_title, quantity,
                unit_price_cents, total_cents)
               VALUES (%(user_id)s,%(user_email)s,%(event_id)s,%(event_title)s,
                       %(quantity)s,%(unit_price_cents)s,%(total_cents)s)
               RETURNING """ + _COLS,
            data,
        )
        return _row(cur, cur.fetchone())


def list_orders(user_id: int) -> list[dict]:
    with pool.connection() as conn:
        cur = conn.execute(
            f"SELECT {_COLS} FROM orders WHERE user_id = %s ORDER BY created_at DESC",
            [user_id],
        )
        return [_row(cur, r) for r in cur.fetchall()]


def get_order(order_id: int, user_id: int) -> dict | None:
    with pool.connection() as conn:
        cur = conn.execute(
            f"SELECT {_COLS} FROM orders WHERE id = %s AND user_id = %s",
            [order_id, user_id],
        )
        row = cur.fetchone()
        return _row(cur, row) if row else None


def _row(cur, row) -> dict:
    return dict(zip([d.name for d in cur.description], row))
