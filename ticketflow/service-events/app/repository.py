"""Accesso ai dati per gli eventi (separato dalla logica HTTP: SRP)."""
from .db import pool

_COLS = (
    "id, title, description, venue, city, category, event_date, "
    "price_cents, total_tickets, available_tickets, created_at"
)


def list_events(city: str | None, category: str | None) -> list[dict]:
    query = f"SELECT {_COLS} FROM events"
    conds, params = [], []
    if city:
        conds.append("city ILIKE %s")
        params.append(city)
    if category:
        conds.append("category = %s")
        params.append(category)
    if conds:
        query += " WHERE " + " AND ".join(conds)
    query += " ORDER BY event_date ASC"
    with pool.connection() as conn:
        cur = conn.execute(query, params)
        return [_row(cur, r) for r in cur.fetchall()]


def get_event(event_id: int) -> dict | None:
    with pool.connection() as conn:
        cur = conn.execute(f"SELECT {_COLS} FROM events WHERE id = %s", [event_id])
        row = cur.fetchone()
        return _row(cur, row) if row else None


def create_event(data: dict) -> dict:
    with pool.connection() as conn:
        cur = conn.execute(
            """INSERT INTO events
               (title, description, venue, city, category, event_date,
                price_cents, total_tickets, available_tickets)
               VALUES (%(title)s,%(description)s,%(venue)s,%(city)s,%(category)s,
                       %(event_date)s,%(price_cents)s,%(total_tickets)s,%(total_tickets)s)
               RETURNING """ + _COLS,
            data,
        )
        return _row(cur, cur.fetchone())


def update_event(event_id: int, data: dict) -> dict | None:
    if not data:
        return get_event(event_id)
    sets = ", ".join(f"{k} = %({k})s" for k in data)
    data["id"] = event_id
    with pool.connection() as conn:
        cur = conn.execute(
            f"UPDATE events SET {sets} WHERE id = %(id)s RETURNING {_COLS}", data
        )
        row = cur.fetchone()
        return _row(cur, row) if row else None


def delete_event(event_id: int) -> bool:
    with pool.connection() as conn:
        cur = conn.execute("DELETE FROM events WHERE id = %s", [event_id])
        return cur.rowcount > 0


def reserve_tickets(event_id: int, quantity: int) -> dict | None:
    """Decrementa in modo atomico la disponibilità se sufficiente.

    Ritorna: l'evento aggiornato, None se evento assente,
             {"error": "sold_out"} se biglietti insufficienti.
    """
    with pool.connection() as conn:
        cur = conn.execute(
            f"""UPDATE events
                SET available_tickets = available_tickets - %s
                WHERE id = %s AND available_tickets >= %s
                RETURNING {_COLS}""",
            [quantity, event_id, quantity],
        )
        row = cur.fetchone()
        if row:
            return _row(cur, row)
        # Distinguiamo "non esiste" da "sold out".
        exists = conn.execute("SELECT 1 FROM events WHERE id = %s", [event_id]).fetchone()
        return None if not exists else {"error": "sold_out"}


def _row(cur, row) -> dict:
    return dict(zip([d.name for d in cur.description], row))
