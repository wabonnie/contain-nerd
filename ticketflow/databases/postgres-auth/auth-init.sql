-- ============================================================
-- TicketFlow · service-auth · schema + seed
-- Database dedicato al microservizio di autenticazione.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- hash bcrypt, mai in chiaro
    full_name   VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'customer', -- customer | admin
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Utente admin di esempio.
-- Password in chiaro: "admin123"  (hash bcrypt, cost 10)
INSERT INTO users (email, password, full_name, role)
VALUES (
    'admin@ticketflow.dev',
    '$2b$10$QAn6Rb57rRlVu077Xzw2geyUIZLo2A6EQKMA8g6J9hWLwjEysBJRG',
    'TicketFlow Admin',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
