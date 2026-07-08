# service-notifications

Microservizio **notifiche** di TicketFlow.

- **Stack:** Python 3.12 + FastAPI + MongoDB + RabbitMQ (consumer)
- **Responsabilità:** consumare gli eventi `order.created` dal broker e generare
  una notifica per l'utente. Espone in lettura le notifiche via API.

## Scalabilità (punto chiave dell'esame)

Il consumer si collega a una **coda durevole condivisa**
(`notifications.order-created`) legata all'exchange `ticketflow.events`.
Avviando più repliche:

```bash
docker compose up -d --scale service-notifications=3
```

RabbitMQ distribuisce i messaggi **round-robin** tra le repliche (competing
consumers / work queue) con `prefetch_count=1` per una ripartizione equa.
Ogni messaggio viene consegnato a **una sola** replica → nessun duplicato.

## Endpoint (dietro il gateway: `/api/notifications/...`, JWT)

| Metodo | Path       | Descrizione                       |
|--------|------------|-----------------------------------|
| GET    | `/health`  | Healthcheck                       |
| GET    | `/`        | Notifiche dell'utente corrente    |
