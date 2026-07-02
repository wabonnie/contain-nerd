# Architettura di TicketFlow

## Vista d'insieme

TicketFlow è un sistema di **ticketing per eventi** costruito con
un'architettura a **microservizi**. Ogni servizio ha una singola responsabilità
e possiede il **proprio database** (pattern *database per servizio*). La
comunicazione è sia **sincrona** (HTTP tramite gateway e tra orders→events) sia
**asincrona** (eventi su RabbitMQ verso le notifiche).

```mermaid
flowchart TB
    subgraph client[Client]
        FE[Frontend React + Nginx]
    end

    GW[API Gateway - Express\nJWT + routing]

    subgraph services[Microservizi]
        AUTH[service-auth\nNode + Express]
        EVENTS[service-events\nPython + FastAPI]
        ORDERS[service-orders\nPython + FastAPI]
        NOTIF[service-notifications\nPython + FastAPI]
    end

    subgraph data[Database - uno per servizio]
        PGA[(PostgreSQL auth)]
        PGE[(PostgreSQL events)]
        PGO[(PostgreSQL orders)]
        MGO[(MongoDB notifications)]
    end

    MQ{{RabbitMQ\nexchange topic\nticketflow.events}}

    FE -->|/api| GW
    GW --> AUTH
    GW --> EVENTS
    GW --> ORDERS
    GW --> NOTIF

    AUTH --- PGA
    EVENTS --- PGE
    ORDERS --- PGO
    NOTIF --- MGO

    ORDERS -->|HTTP reserve| EVENTS
    ORDERS -->|publish order.created| MQ
    MQ -->|consume| NOTIF
```

## Flusso "creazione ordine" (sincrono + asincrono)

```mermaid
sequenceDiagram
    participant U as Utente (Frontend)
    participant G as Gateway
    participant O as service-orders
    participant E as service-events
    participant Q as RabbitMQ
    participant N as service-notifications
    participant M as MongoDB

    U->>G: POST /api/orders (JWT)
    G->>G: verifica JWT, aggiunge X-User-Id
    G->>O: POST / (X-User-Id)
    O->>E: POST /{id}/reserve (decremento atomico)
    E-->>O: evento aggiornato
    O->>O: salva ordine in PostgreSQL
    O->>Q: publish "order.created"
    O-->>G: 201 ordine
    G-->>U: 201 ordine
    Q-->>N: consegna messaggio
    N->>M: inserisce notifica
    U->>G: GET /api/notifications (polling)
    G->>N: GET /
    N-->>U: notifica "Ordine confermato"
```

## Scalabilità

`service-notifications` è progettato come **competing consumer**: più repliche
condividono la stessa coda durevole `notifications.order-created`. RabbitMQ
distribuisce i messaggi in **round-robin** (`prefetch_count=1`), quindi ogni
evento è elaborato da **una sola** replica.

```bash
docker compose up -d --scale service-notifications=3
```

## Reti e volumi

- **frontend-net**: frontend ↔ gateway.
- **backend-net**: gateway ↔ microservizi ↔ database ↔ broker ↔ registry ↔ portainer.
- Volumi persistenti per ogni database, per RabbitMQ, per il registry e per Portainer.
