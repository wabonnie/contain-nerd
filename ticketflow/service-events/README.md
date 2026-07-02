# service-events

Microservizio **catalogo eventi** di TicketFlow.

- **Stack:** Python 3.12 + FastAPI + PostgreSQL (psycopg 3)
- **Responsabilità:** CRUD degli eventi e gestione della disponibilità biglietti.

## Endpoint (visti dietro il gateway come `/api/events/...`)

| Metodo | Path             | Descrizione                          |
|--------|------------------|--------------------------------------|
| GET    | `/health`        | Healthcheck                          |
| GET    | `/`              | Lista eventi (filtri: `city`,`category`) |
| POST   | `/`              | Crea evento                          |
| GET    | `/{id}`          | Dettaglio evento                     |
| PUT    | `/{id}`          | Aggiorna evento                      |
| DELETE | `/{id}`          | Elimina evento                       |
| POST   | `/{id}/reserve`  | Riserva N biglietti (uso interno da service-orders) |

Documentazione interattiva Swagger su `/docs` (fornita da FastAPI).
