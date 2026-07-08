# service-orders

Microservizio **ordini/prenotazioni** di TicketFlow.

- **Stack:** Python 3.12 + FastAPI + PostgreSQL + RabbitMQ (producer)
- **Responsabilità:** creazione ordini, verifica disponibilità presso `service-events`,
  pubblicazione dell'evento `order.created` sul message broker.

## Flusso di creazione ordine

1. Il gateway valida il JWT e inietta `X-User-Id` / `X-User-Email`.
2. `service-orders` chiama `service-events` per **riservare** i biglietti (decremento atomico).
3. Salva l'ordine nel proprio database PostgreSQL.
4. Pubblica l'evento **`order.created`** sull'exchange RabbitMQ `ticketflow.events`.
5. `service-notifications` consuma l'evento in modo asincrono.

## Endpoint (dietro il gateway: `/api/orders/...`, protetti da JWT)

| Metodo | Path       | Descrizione                    |
|--------|------------|--------------------------------|
| GET    | `/health`  | Healthcheck                    |
| POST   | `/`        | Crea un ordine                 |
| GET    | `/`        | Ordini dell'utente corrente    |
| GET    | `/{id}`    | Dettaglio ordine               |
