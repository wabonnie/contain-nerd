# gateway

**API Gateway** di TicketFlow (Node.js 20 + Express).

Punto d'ingresso unico per il frontend. Instrada le richieste `/api/*` verso il
microservizio corretto e **verifica il JWT** sulle rotte protette, inoltrando
l'identità dell'utente ai servizi a valle tramite gli header `X-User-Id` /
`X-User-Email`.

## Routing

| Prefisso pubblico        | Servizio di destinazione   | Protetto da JWT |
|--------------------------|----------------------------|-----------------|
| `/api/auth/*`            | service-auth               | no              |
| `/api/events/*`          | service-events             | solo scrittura* |
| `/api/orders/*`          | service-orders             | sì              |
| `/api/notifications/*`   | service-notifications      | sì              |

\* Le `GET` sugli eventi sono pubbliche; `POST/PUT/DELETE` richiedono un token.

Swagger aggregato disponibile su `/docs`.
