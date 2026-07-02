# 🎟️ TicketFlow — Sistema di Ticketing per Eventi (Microservizi)

> Applicazione a **microservizi** completamente dockerizzata: prenotazione di
> biglietti per eventi con autenticazione, catalogo eventi, ordini e notifiche
> asincrone tramite message broker.

Progetto realizzato come consegna d'esame. Lo stack è avviabile con un solo
comando:

```bash
docker compose up --build
```

---

## 📑 Indice

1. [Introduzione](#-introduzione)
2. [Architettura](#-architettura)
3. [Tecnologie utilizzate](#-tecnologie-utilizzate)
4. [Diagramma dell'architettura](#-diagramma-dellarchitettura)
5. [Struttura delle cartelle](#-struttura-delle-cartelle)
6. [Prerequisiti](#-prerequisiti)
7. [Installazione passo passo](#-installazione-passo-passo)
8. [Build, registry, push e pull delle immagini](#-build-registry-push-e-pull-delle-immagini)
9. [Avvio tramite Docker Compose](#-avvio-tramite-docker-compose)
10. [Configurazione Portainer](#-configurazione-portainer)
11. [Test delle API](#-test-delle-api)
12. [Come effettuare lo scaling](#-come-effettuare-lo-scaling)
13. [Screenshot attesi](#-screenshot-attesi)
14. [Problemi comuni e soluzioni](#-problemi-comuni-e-soluzioni)
15. [Comandi utili](#-comandi-utili)
16. [Pulizia del progetto](#-pulizia-del-progetto)
17. [Creazione dello ZIP di consegna](#-creazione-dello-zip-di-consegna)

---

## 🎯 Introduzione

**TicketFlow** permette agli utenti di registrarsi, sfogliare gli eventi
disponibili, prenotare biglietti e ricevere una **notifica** di conferma
generata in modo **asincrono**. Gli amministratori possono gestire il catalogo
eventi (CRUD completo).

Lo scenario è stato scelto perché consente una **buona separazione dei
microservizi**: identità, catalogo, ordini e notifiche sono domini distinti,
ciascuno con il proprio database e la propria tecnologia.

Caratteristiche principali:

- **API Gateway** unico punto d'ingresso, con verifica JWT centralizzata.
- **Database per servizio** (3× PostgreSQL + 1× MongoDB).
- **Message broker RabbitMQ** per la comunicazione asincrona ordine → notifica.
- **Registry Docker locale** con build/tag/push/pull delle immagini.
- **Portainer** per il monitoraggio dell'intero stack.
- **Scalabilità orizzontale** dimostrata sul servizio notifiche.
- Frontend **React** moderno che consuma esclusivamente le API.

---

## 🏛 Architettura

| Servizio                 | Linguaggio / Framework | Database             | Responsabilità |
|--------------------------|------------------------|----------------------|----------------|
| `gateway`                | Node.js + Express      | —                    | Routing verso i servizi, verifica JWT, propagazione identità |
| `service-auth`           | Node.js + Express      | PostgreSQL           | Registrazione, login, emissione JWT |
| `service-events`         | Python + FastAPI       | PostgreSQL           | CRUD eventi, disponibilità biglietti |
| `service-orders`         | Python + FastAPI       | PostgreSQL           | Creazione ordini, **producer** RabbitMQ |
| `service-notifications`  | Python + FastAPI       | MongoDB              | **Consumer** RabbitMQ, generazione notifiche |
| `frontend`               | React + Vite + Nginx   | —                    | Interfaccia utente (solo API) |

Infrastruttura di supporto: **RabbitMQ**, **Registry Docker**, **Portainer**.

Ogni microservizio espone: **Dockerfile**, **API REST**, **healthcheck** (`/health`)
e **logging** strutturato in JSON su stdout.

Dettagli completi con diagrammi di sequenza in [`docs/architecture.md`](docs/architecture.md).

---

## 🧰 Tecnologie utilizzate

- **Docker** & **Docker Compose** (orchestrazione, reti, volumi, healthcheck)
- **Node.js 20** / Express (gateway, auth)
- **Python 3.12** / FastAPI + Uvicorn (events, orders, notifications)
- **PostgreSQL 16** (auth, events, orders)
- **MongoDB 7** (notifications)
- **RabbitMQ 3.13** (exchange topic, code durevoli)
- **React 18** + **Vite** + **Nginx**
- **JWT** (autenticazione stateless), **bcrypt** (hashing password)
- **Registry Docker** (`registry:2`) + **Portainer CE**

---

## 🗺 Diagramma dell'architettura

```
                         ┌───────────────────────────┐
                         │        Frontend           │
                         │   React + Vite + Nginx     │  :8080
                         └─────────────┬─────────────┘
                                       │ /api/*
                                       ▼
                         ┌───────────────────────────┐
                         │        API Gateway         │  :8000
                         │  Express · JWT · routing   │
                         └───┬─────────┬─────────┬────┘
             ┌───────────────┘         │         └───────────────┐
             ▼                         ▼                         ▼
    ┌────────────────┐        ┌────────────────┐        ┌────────────────────┐
    │  service-auth  │        │ service-events │        │   service-orders   │
    │ Node · Express │        │ Python·FastAPI │◄───────┤  Python · FastAPI  │
    └───────┬────────┘        └───────┬────────┘  HTTP  └─────────┬──────────┘
            │                         │            reserve         │ publish
            ▼                         ▼                            ▼  order.created
   ┌────────────────┐        ┌────────────────┐          ┌──────────────────┐
   │ PostgreSQL auth│        │PostgreSQL event│          │     RabbitMQ     │
   └────────────────┘        └────────────────┘          │  ticketflow.events│
                                                          └────────┬─────────┘
                              ┌────────────────┐  consume          │
                              │PostgreSQL order│◄───────┐          ▼
                              └────────────────┘        │ ┌────────────────────────┐
                                                        └─┤ service-notifications  │
                                                          │   Python · FastAPI     │
                                                          └───────────┬────────────┘
                                                                      ▼
                                                            ┌──────────────────┐
                                                            │  MongoDB notif.  │
                                                            └──────────────────┘

    Supporto:  Registry Docker :5000   ·   Portainer :9000   ·   RabbitMQ UI :15672
```

Versione **Mermaid** (renderizzata su GitHub/GitLab) in [`docs/architecture.md`](docs/architecture.md).

---

## 📁 Struttura delle cartelle

```
ticketflow/
├── docker-compose.yml          # Orchestrazione completa dello stack
├── .env.example                # Variabili d'ambiente di esempio
├── Makefile                    # Scorciatoie (make up/down/push/scale/zip...)
├── README.md
├── databases/                  # Script di init dei database (montati nei container)
│   ├── auth-init.sql
│   ├── events-init.sql
│   ├── orders-init.sql
│   └── mongo-init.js
├── frontend/                   # React + Vite (servito da Nginx)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/...
├── gateway/                    # API Gateway (Express)
│   ├── Dockerfile
│   ├── package.json
│   └── src/index.js
├── service-auth/               # Autenticazione (Express + PostgreSQL)
│   ├── Dockerfile
│   ├── package.json
│   └── src/...
├── service-events/             # Catalogo eventi (FastAPI + PostgreSQL)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/...
├── service-orders/             # Ordini (FastAPI + PostgreSQL + producer RabbitMQ)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/...
├── service-notifications/      # Notifiche (FastAPI + MongoDB + consumer RabbitMQ)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/...
├── scripts/                    # Automazioni
│   ├── build-and-push.sh
│   ├── pull-images.sh
│   ├── smoke-test.sh
│   └── create-zip.sh
└── docs/                       # Documentazione aggiuntiva
    ├── architecture.md
    └── api.md
```

Ogni servizio contiene il proprio `Dockerfile`, il file delle dipendenze
(`package.json` / `requirements.txt`) e un `README` interno.

---

## ✅ Prerequisiti

- **Docker Engine** ≥ 24
- **Docker Compose** v2 (comando `docker compose`)
- Porte libere sull'host: `8080`, `8000`, `9000`, `5672`, `15672`, `5000`
- (Solo per sviluppo frontend fuori da Docker) Node.js ≥ 20

Verifica:

```bash
docker --version
docker compose version
```

---

## 🚀 Installazione passo passo

```bash
# 1) Estrai lo ZIP ed entra nella cartella
cd ticketflow

# 2) Prepara le variabili d'ambiente
cp .env.example .env
#   (opzionale) modifica JWT_SECRET e le password nel file .env

# 3) Avvia tutto (build incluso)
docker compose up --build
```

Al primo avvio Compose costruisce le immagini, crea reti e volumi, applica gli
script di init dei database e popola alcuni **eventi di esempio**.

Servizi raggiungibili:

| Componente          | URL                              |
|---------------------|----------------------------------|
| Frontend            | http://localhost:8080            |
| API Gateway         | http://localhost:8000            |
| Gateway Swagger     | http://localhost:8000/docs       |
| RabbitMQ Management  | http://localhost:15672 (guest/guest) |
| Portainer           | http://localhost:9000            |
| Registry catalog    | http://localhost:5000/v2/_catalog |

**Credenziali admin di esempio:** `admin@ticketflow.dev` / `admin123`

---

## 📦 Build, registry, push e pull delle immagini

Lo stack include un **registry Docker locale** (`registry:2`, porta 5000).
Le immagini di tutti i servizi sono nominate come
`localhost:5000/ticketflow/<servizio>:1.0`.

Script automatico (build → tag → push):

```bash
bash scripts/build-and-push.sh
# oppure:  make push
```

Verifica del contenuto del registry:

```bash
curl http://localhost:5000/v2/_catalog
```

Pull di verifica dal registry (round-trip):

```bash
bash scripts/pull-images.sh
# oppure:  make pull
```

> Le immagini vengono **buildate**, **taggate** con `localhost:5000/...`,
> **pushate** e **pullate** dal registry locale. Poiché l'host è `localhost`,
> Docker lo tratta come registry *insecure* senza configurazioni aggiuntive.

---

## ▶️ Avvio tramite Docker Compose

```bash
# Avvio in foreground (log a schermo)
docker compose up --build

# Avvio in background
docker compose up --build -d

# Stato dei container e healthcheck
docker compose ps

# Log in tempo reale
docker compose logs -f
```

`depends_on` con `condition: service_healthy` garantisce l'ordine di avvio
(database e broker pronti prima dei servizi). Le `restart: unless-stopped`
policy rendono lo stack resiliente ai riavvii.

---

## 🖥 Configurazione Portainer

1. Apri http://localhost:9000
2. Al primo accesso crea l'utente amministratore (password ≥ 12 caratteri).
3. Seleziona l'ambiente **"local"** (Docker socket già montato via
   `/var/run/docker.sock`).
4. Da **Containers** monitori stato, log e statistiche di ogni servizio.
5. Da **Stacks** puoi ridistribuire lo stack `ticketflow` o modificarne le
   variabili; da lì è possibile anche avviare/fermare i container e scalare i
   servizi tramite l'interfaccia grafica.

---

## 🧪 Test delle API

Script end-to-end (login → lista eventi → ordine → notifica):

```bash
bash scripts/smoke-test.sh
```

Manualmente con cURL:

```bash
# Login (admin)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ticketflow.dev","password":"admin123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Lista eventi (pubblica)
curl http://localhost:8000/api/events/

# Crea un ordine (protetto)
curl -X POST http://localhost:8000/api/orders/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"event_id":1,"quantity":2}'

# Notifiche dell'utente (generate dal consumer)
curl http://localhost:8000/api/notifications/ \
  -H "Authorization: Bearer $TOKEN"
```

Documentazione completa degli endpoint in [`docs/api.md`](docs/api.md).

---

## 📈 Come effettuare lo scaling

Il `service-notifications` è un **competing consumer** su una coda durevole
condivisa. Per scalarlo:

```bash
docker compose up -d --scale service-notifications=3
# oppure:  make scale
```

**Come RabbitMQ distribuisce i messaggi:** le tre repliche si collegano alla
stessa coda `notifications.order-created`. RabbitMQ consegna ogni messaggio a
**una sola** replica seguendo una politica **round-robin**; con
`prefetch_count=1` (fair dispatch) un consumer non riceve un nuovo messaggio
finché non ha confermato (`ack`) il precedente. Risultato: il carico di
notifiche viene ripartito tra le repliche senza duplicati e senza perdite (i
messaggi non confermati vengono ri-accodati).

Puoi osservare la distribuzione creando più ordini e guardando i log:

```bash
docker compose logs -f service-notifications
```

---

## 🖼 Screenshot attesi

Durante la valutazione ci si aspetta di vedere:

1. **Frontend** (http://localhost:8080) — schermata di login, catalogo eventi a
   card, creazione ordine, elenco ordini e pannello notifiche aggiornato.
2. **`docker compose ps`** — tutti i container in stato `running`/`healthy`.
3. **RabbitMQ Management** (http://localhost:15672) — l'exchange
   `ticketflow.events` e la coda `notifications.order-created` con i messaggi
   che transitano.
4. **Portainer** (http://localhost:9000) — lista dei container dello stack.
5. **Registry catalog** (http://localhost:5000/v2/_catalog) — le 6 immagini
   `ticketflow/*` pushate.
6. **Scaling** — output di `docker compose ps` con 3 repliche di
   `service-notifications`.

---

## 🛠 Problemi comuni e soluzioni

| Problema | Causa probabile | Soluzione |
|----------|-----------------|-----------|
| `port is already allocated` | Porta host occupata | Cambia la porta nel file `.env` (es. `FRONTEND_PORT=8081`) |
| Un servizio riparte in loop all'avvio | DB/broker non ancora pronti | Normale nei primi secondi: gli healthcheck e i retry integrati risolvono da soli |
| `502 Servizio non disponibile` dal gateway | Servizio a valle non ancora up | Attendi che `docker compose ps` mostri i servizi `healthy` |
| Login fallisce con `admin123` | Volume DB vecchio senza seed | `docker compose down -v` e riavvia per rieseguire gli init |
| `push` fallisce sul registry | Registry non avviato | `docker compose up -d registry` prima dello script di push |
| Le notifiche non compaiono | Consumer non connesso al broker | Controlla `docker compose logs service-notifications`; il consumer riprova ogni 5s |
| Modifiche al codice non visibili | Immagine in cache | Ricostruisci con `docker compose up --build` |

---

## 🧾 Comandi utili

```bash
docker compose up --build -d          # avvia lo stack in background
docker compose ps                     # stato e salute dei container
docker compose logs -f gateway        # log di un servizio specifico
docker compose exec service-events sh # shell dentro un container
docker compose restart service-orders # riavvia un singolo servizio
docker compose up -d --scale service-notifications=3   # scaling
docker compose down                   # ferma e rimuove i container
docker compose down -v                # + rimuove i volumi (reset dati)
curl http://localhost:5000/v2/_catalog # immagini nel registry
```

Oppure tramite `make`: `make up`, `make down`, `make logs`, `make ps`,
`make push`, `make pull`, `make scale`, `make clean`, `make zip`.

---

## 🧹 Pulizia del progetto

```bash
# Ferma i container mantenendo i dati
docker compose down

# Ferma e rimuove anche volumi e reti (reset completo)
docker compose down -v --remove-orphans

# Rimuove le immagini locali del progetto (opzionale)
docker images "localhost:5000/ticketflow/*" -q | xargs -r docker rmi

# Pulizia generale del sistema Docker (attenzione!)
docker system prune -f
```

---

## 🗜 Creazione dello ZIP di consegna

Lo script esclude automaticamente `node_modules`, `dist`, `venv`,
`__pycache__`, cache, log, `.env` e altri file rigenerabili/temporanei:

```bash
bash scripts/create-zip.sh
# oppure:  make zip
```

Genera `../ticketflow-<data>.zip` pronto per la consegna. Il progetto estratto
si avvia con:

```bash
cp .env.example .env
docker compose up --build
```

senza alcuna modifica manuale.

---

_TicketFlow — progetto d'esame a microservizi. Codice pulito, variabili
d'ambiente per la configurazione, nessuna password nel codice sorgente._
