# service-auth

Microservizio di **autenticazione** di TicketFlow.

- **Stack:** Node.js 20 + Express + PostgreSQL
- **Responsabilità:** registrazione utenti, login, emissione e verifica di token JWT.

## Endpoint

| Metodo | Path             | Descrizione                         | Auth |
|--------|------------------|-------------------------------------|------|
| GET    | `/health`        | Healthcheck                         | no   |
| POST   | `/register`      | Crea un nuovo utente                | no   |
| POST   | `/login`         | Login, restituisce un JWT           | no   |
| GET    | `/me`            | Dati dell'utente dal token          | JWT  |
| GET    | `/docs`          | Documentazione Swagger              | no   |

## Variabili d'ambiente

`PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRES_IN, LOG_LEVEL`

Le password sono salvate come hash **bcrypt**, mai in chiaro.
