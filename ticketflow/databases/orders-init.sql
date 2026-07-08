-- ============================================================
-- TicketFlow · service-orders · schema
-- Ordini/prenotazioni. Conserva uno snapshot dell'evento per
-- disaccoppiamento dal service-events.
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER     NOT NULL,
    user_email    VARCHAR(255) NOT NULL,
    event_id      INTEGER     NOT NULL,
    event_title   VARCHAR(255) NOT NULL,     -- snapshot
    quantity      INTEGER     NOT NULL CHECK (quantity > 0),
    unit_price_cents  INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    total_cents   INTEGER     NOT NULL CHECK (total_cents >= 0),
    status        VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- confirmed | cancelled
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user  ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);
