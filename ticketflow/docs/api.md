# API di TicketFlow (via Gateway)

Base URL pubblica: `http://localhost:8000`

Documentazione interattiva:
- Gateway (panoramica): `http://localhost:8000/docs`
- service-auth: `http://localhost:8000/api/auth/docs`
- service-events: Swagger FastAPI (interno) — schema OpenAPI generato in automatico

## Autenticazione

| Metodo | Endpoint             | Auth | Body |
|--------|----------------------|------|------|
| POST   | `/api/auth/register` | no   | `{email, password, full_name}` |
| POST   | `/api/auth/login`    | no   | `{email, password}` → `{token, user}` |

Includere poi l'header `Authorization: Bearer <token>` sulle rotte protette.

## Eventi

| Metodo | Endpoint            | Auth  |
|--------|---------------------|-------|
| GET    | `/api/events/`      | no    |
| POST   | `/api/events/`      | JWT   |
| GET    | `/api/events/{id}`  | no    |
| PUT    | `/api/events/{id}`  | JWT   |
| DELETE | `/api/events/{id}`  | JWT   |

## Ordini

| Metodo | Endpoint            | Auth |
|--------|---------------------|------|
| GET    | `/api/orders/`      | JWT  |
| POST   | `/api/orders/`      | JWT  · Body `{event_id, quantity}` |
| GET    | `/api/orders/{id}`  | JWT  |

## Notifiche

| Metodo | Endpoint                 | Auth |
|--------|--------------------------|------|
| GET    | `/api/notifications/`    | JWT  |

## Esempi cURL

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ticketflow.dev","password":"admin123"}'

# Lista eventi
curl http://localhost:8000/api/events/

# Crea ordine
curl -X POST http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"event_id":1,"quantity":2}'
```
