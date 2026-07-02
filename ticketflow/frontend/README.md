# frontend

Interfaccia web di TicketFlow (**React 18 + Vite**, servita da **Nginx**).

- Comunica **solo via API** attraverso il gateway (`/api/...`).
- Mostra dati reali dai microservizi.
- CRUD completo degli **eventi** (per admin) e creazione **ordini**; visualizza
  **notifiche** generate in modo asincrono.

## Sviluppo locale
```bash
npm install
npm run dev   # http://localhost:5173  (proxy /api -> http://localhost:8000)
```

## Build di produzione
Il `Dockerfile` esegue una build multi-stage e serve i file statici con Nginx,
che fa anche da reverse proxy verso il gateway.
