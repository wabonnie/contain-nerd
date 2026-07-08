-- ============================================================
-- TicketFlow · service-events · schema + seed
-- Catalogo eventi con disponibilità biglietti.
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    description       TEXT         NOT NULL DEFAULT '',
    venue             VARCHAR(255) NOT NULL,
    city              VARCHAR(120) NOT NULL,
    category          VARCHAR(80)  NOT NULL DEFAULT 'generico',
    event_date        TIMESTAMPTZ  NOT NULL,
    price_cents       INTEGER      NOT NULL CHECK (price_cents >= 0),
    total_tickets     INTEGER      NOT NULL CHECK (total_tickets >= 0),
    available_tickets INTEGER      NOT NULL CHECK (available_tickets >= 0),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_date     ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

INSERT INTO events (title, description, venue, city, category, event_date, price_cents, total_tickets, available_tickets) VALUES
 ('Jazz sotto le stelle', 'Serata di jazz dal vivo con quartetto internazionale.', 'Arena del Parco',       'Torino',  'concerto',  now() + interval '20 days', 3500, 300, 300),
 ('Derby della Mole',     'La grande sfida cittadina di calcio.',                    'Stadio Comunale',      'Torino',  'sport',     now() + interval '12 days', 4200, 500, 500),
 ('Tech Conf 2026',       'Conferenza su cloud, DevOps e microservizi.',             'Centro Congressi',     'Milano',  'conferenza',now() + interval '35 days', 9900, 200, 200),
 ('Notte del Teatro',     'Prima assoluta di uno spettacolo contemporaneo.',         'Teatro Regio',         'Torino',  'teatro',    now() + interval '8 days',  2800, 150, 150),
 ('Festival del Gusto',   'Degustazioni e show cooking con chef stellati.',          'Piazza Centrale',      'Bologna', 'food',      now() + interval '18 days', 1500, 400, 400)
ON CONFLICT DO NOTHING;
