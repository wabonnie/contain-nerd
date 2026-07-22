# 🎟️ TicketFlow — Sistema di Ticketing per Eventi (Microservizi)

> Applicazione a **microservizi** completamente dockerizzata: prenotazione di
> biglietti per eventi con autenticazione, catalogo eventi, ordini e notifiche
> asincrone tramite message broker.

Progetto realizzato come consegna d'esame. Lo stack è avviabile con un solo
comando:

```bash
docker compose up --build
```

Lo stesso stack è anche **portato su Kubernetes** (Rancher Desktop) — vedi la
sezione [☸️ Deploy su Kubernetes](#-deploy-su-kubernetes-rancher-desktop) più sotto.

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
18. [☸️ Deploy su Kubernetes (Rancher Desktop)](#-deploy-su-kubernetes-rancher-desktop)
19. [Deploy via Portainer](#deploy-via-portainer)

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
- Disponibile anche come **deploy Kubernetes** (Deployment, StatefulSet,
  ConfigMap/Secret, Ingress) eseguibile su Rancher Desktop.

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
- **Kubernetes** (Rancher Desktop / k3s) — Deployment, StatefulSet, ConfigMap,
  Secret, Ingress (Traefik)
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
├── k8s/                        # Manifest Kubernetes (deploy su Rancher Desktop)
│   ├── 00-base/                # Namespace, ConfigMap, Secret
│   ├── 10-databases/           # RabbitMQ, 3× PostgreSQL, MongoDB (StatefulSet)
│   ├── 20-services/            # I 4 microservizi (Deployment + Service)
│   ├── 30-edge/                # gateway, frontend, Ingress (Traefik)
│   └── README.md               # Istruzioni dettagliate di deploy
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
- (Solo per il deploy Kubernetes) **Rancher Desktop** con Kubernetes abilitato

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
|---------------------|-----------------------------------|
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

> Lo stesso concetto si applica su Kubernetes tramite
> `kubectl scale deploy/service-events --replicas=3` — vedi la sezione
> [Scaling su Kubernetes](#scaling-su-kubernetes).

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
| (K8s) `ErrImagePull` / `ImagePullBackOff` | Le immagini non esistono nello store del cluster (es. dopo un riavvio del cluster) | Ricostruisci con `nerdctl --namespace k8s.io build ...` (vedi sezione Kubernetes) |
| (K8s) Tutte le richieste API danno `401` | Token JWT firmato con un `JWT_SECRET` non più valido (cambiato tra deploy) | Fai logout/login per ottenere un nuovo token |
| (K8s) Pod bloccati in `Terminating`/`Pending` | Il nodo del cluster è `NotReady` (VM in crash o senza risorse) | Riavvia Kubernetes da Rancher Desktop, poi verifica con `kubectl get nodes` |
| (K8s) `kubectl` non risponde / host non trovato | Contesto kubectl punta a un cluster remoto non più esistente | `kubectl config use-context rancher-desktop` |

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

## ☸️ Deploy su Kubernetes (Rancher Desktop)

In alternativa a Docker Compose, l'intero stack è stato **migrato su
Kubernetes** e può essere eseguito localmente tramite il cluster k3s integrato
in **Rancher Desktop**. I manifest si trovano in [`k8s/`](k8s/README.md).

### Mappatura Compose → Kubernetes

| Docker Compose | Kubernetes | Perché |
|---|---|---|
| `services:` (stateless: gateway, frontend, service-*) | **Deployment** + **Service** | Pod intercambiabili, senza stato proprio |
| `services:` (database, RabbitMQ) | **StatefulSet** + **Service** | Identità e storage stabili, sopravvivono ai riavvii |
| `volumes:` nominati | **PersistentVolumeClaim** | Storage dei dati provisionato dal cluster (`local-path` di Rancher Desktop) |
| `.env` | **ConfigMap** (config non sensibile) + **Secret** (password, JWT) | Iniezione delle variabili d'ambiente |
| `healthcheck:` | **readiness/liveness probe** | Stesso concetto, sintassi Kubernetes |
| `ports:` su gateway/frontend | **Ingress** (Traefik, incluso in Rancher Desktop) | Routing per hostname (`ticketflow.localhost`) invece di porte pubblicate |
| `depends_on:` | *(nessun equivalente diretto)* | I pod che partono prima del loro DB falliscono il probe e vengono riavviati finché il DB non è pronto — nessuna configurazione necessaria |
| script di init bind-mountati | **ConfigMap** montate su `/docker-entrypoint-initdb.d` | Stesso path di montaggio usato da Compose |
| registry Docker locale (già usato da Compose) | Stesso registry, referenziato direttamente in `image:` | Distribuzione immagini indipendente dal runtime (Docker, containerd, ecc.) |

Struttura dei manifest (applicati in ordine):

```
k8s/
├── 00-base/        namespace, ConfigMap, Secret
├── 10-databases/   RabbitMQ, 3× PostgreSQL, MongoDB (StatefulSet + PVC)
├── 20-services/    service-auth, service-events, service-orders, service-notifications
└── 30-edge/        gateway, frontend, Ingress (Traefik)
```

### 1. Build e push delle immagini sul registry locale

Le immagini vengono distribuite tramite il **registry Docker locale** già
usato dalla parte Compose del progetto (`registry:2`), invece di un trucco
specifico del runtime del cluster. Questo rende il deployment **portabile su
qualunque runtime** (Docker Desktop, Rancher Desktop con dockerd o
containerd, un cluster remoto): qualsiasi runtime in grado di raggiungere il
registry via HTTP può scaricare le immagini, senza flag di build specifici.

> **Nota per macOS:** la porta **5000** è spesso occupata dal servizio di
> sistema **AirPlay Receiver** (attivo di default su macOS Monterey e
> successivi), che risponde su quella porta prima ancora che il registry
> possa avviarsi, causando errori silenziosi o risposte `403 Forbidden`
> inattese. Per questo motivo il registry qui è esposto sulla porta **5050**
> sull'host (`-p 5050:5000`) invece della porta 5000 predefinita. In
> alternativa, disattiva AirPlay Receiver da *Impostazioni di Sistema →
> Generali → AirDrop e Handoff* e usa la porta 5000 ovunque.

```bash
cd ticketflow

# Assicurati che il registry sia attivo (già incluso nello stack Compose;
# in alternativa avvialo a parte):
docker run -d -p 5050:5000 --restart unless-stopped --name registry registry:2

# Build, tag e push di ogni immagine
docker build -t localhost:5050/ticketflow/service-auth:1.0 ./service-auth
docker build -t localhost:5050/ticketflow/service-events:1.0 ./service-events
docker build -t localhost:5050/ticketflow/service-orders:1.0 ./service-orders
docker build -t localhost:5050/ticketflow/service-notifications:1.0 ./service-notifications
docker build -t localhost:5050/ticketflow/gateway:1.0 ./gateway
docker build -t localhost:5050/ticketflow/frontend:1.0 --build-arg VITE_API_BASE_URL=/api ./frontend

docker push localhost:5050/ticketflow/service-auth:1.0
docker push localhost:5050/ticketflow/service-events:1.0
docker push localhost:5050/ticketflow/service-orders:1.0
docker push localhost:5050/ticketflow/service-notifications:1.0
docker push localhost:5050/ticketflow/gateway:1.0
docker push localhost:5050/ticketflow/frontend:1.0

# In alternativa, tutto in un colpo:
bash scripts/build-and-push.sh
```

I manifest referenziano `image: localhost:5050/ticketflow/<servizio>:1.0` con
`imagePullPolicy: Always`, così il cluster scarica sempre la versione
corrente dal registry, invece di affidarsi a una cache di build locale.

> **Nota sul registry non sicuro:** `localhost:5050` serve in HTTP, non
> HTTPS. La maggior parte dei runtime container rifiuta di scaricare da un
> registry non-TLS a meno che non sia dichiarato come fidato. Su Rancher
> Desktop (k3s/containerd), aggiungi questo contenuto a
> `/etc/rancher/k3s/registries.yaml` (crealo se non esiste), poi
> **Troubleshooting → Restart Kubernetes**:
> ```yaml
> mirrors:
>   "localhost:5050":
>     endpoint:
>       - "http://localhost:5050"
> ```
> Su Docker Desktop / dockerd puro, aggiungi invece `localhost:5050` tra gli
> **"insecure-registries"** nelle impostazioni del motore Docker, e riavvia
> Docker. Questo passaggio è specifico del runtime, ma va fatto **una sola
> volta per ambiente** — dopodiché gli stessi manifest e gli stessi
> riferimenti `image:` funzionano invariati su qualsiasi runtime.

### 2. ConfigMap per gli script di init dei database

```bash
kubectl create namespace ticketflow

kubectl -n ticketflow create configmap auth-init-sql   --from-file=databases/auth-init.sql
kubectl -n ticketflow create configmap events-init-sql --from-file=databases/events-init.sql
kubectl -n ticketflow create configmap orders-init-sql --from-file=databases/orders-init.sql
kubectl -n ticketflow create configmap mongo-init-js   --from-file=databases/mongo-init.js
```

(Gli script vengono eseguiti solo al **primo** avvio, quando il volume dati è
vuoto — stesso comportamento di Compose.)

### 3. Deploy dei manifest

```bash
kubectl apply -f k8s/00-base/ -f k8s/10-databases/ -f k8s/20-services/ -f k8s/30-edge/

kubectl -n ticketflow get pods -w   # attendi che tutto sia Running/Ready
```

### 4. Accesso all'applicazione

L'Ingress instrada sull'host `ticketflow.localhost` (Traefik ascolta sulla
porta 80 di Rancher Desktop):

- Frontend: http://ticketflow.localhost/
- API: http://ticketflow.localhost/api

Se l'hostname non si risolve o la porta 80 è occupata, usa il port-forward:

```bash
kubectl -n ticketflow port-forward svc/frontend 8080:80
# poi apri http://localhost:8080

kubectl -n ticketflow port-forward svc/rabbitmq 15672:15672
# poi apri http://localhost:15672  (guest/guest)
```

### Self-healing

Kubernetes mantiene sempre vero lo **stato desiderato** dichiarato nei
manifest. Se un pod viene eliminato, il controller (Deployment o StatefulSet)
lo ricrea automaticamente, senza alcun intervento manuale:

```bash
kubectl -n ticketflow get pods
kubectl -n ticketflow delete pod <nome-pod>
kubectl -n ticketflow get pods
# → nuovo pod, nome diverso (Deployment) o stesso nome (StatefulSet), età azzerata
```

I pod delle **StatefulSet** (i database) rinascono con lo **stesso nome** e
riagganciano lo stesso `PersistentVolumeClaim`: i dati sopravvivono al
riavvio, a differenza dei pod dei **Deployment** (i servizi applicativi), che
ricevono un nome nuovo casuale ad ogni ricreazione.

### Scaling su Kubernetes

```bash
kubectl -n ticketflow scale deploy/service-events --replicas=3
kubectl -n ticketflow get pods -l app=service-events
```

Il **Service** `service-events` bilancia automaticamente le richieste tra
tutte le repliche attive, tramite il selettore di label `app: service-events`
— nessuna configurazione aggiuntiva richiesta, e nessun cambiamento percepibile
lato client (gateway/orders continuano a chiamare `http://service-events:8000`).

Per tornare a 1 replica:

```bash
kubectl -n ticketflow scale deploy/service-events --replicas=1
```

> Nota: solo i servizi **stateless** (gateway, frontend, service-*) vengono
> scalati in questo modo. I database (StatefulSet) restano a 1 replica, perché
> la replicazione di un database richiede meccanismi aggiuntivi (elezione del
> leader, sincronizzazione) non gestiti automaticamente da un semplice scale.

### Pulizia

```bash
kubectl delete namespace ticketflow     # rimuove tutto, inclusi i PVC (reset dati)
```

Per rimuovere anche le immagini locali dal cluster:

```bash
nerdctl --namespace k8s.io images | grep ticketflow
nerdctl --namespace k8s.io rmi <nome-immagine>:1.0
```

Istruzioni dettagliate, incluse le variabili d'ambiente/segreti di default e
le note su `depends_on`/probe, sono in [`k8s/README.md`](k8s/README.md).

### Extra: dashboard di Traefik (debug)

Il Traefik incluso in Rancher Desktop ha la dashboard **abilitata ma non
instradata** di default (`--api.dashboard=true` senza `--api.insecure=true`),
quindi `/dashboard/` restituisce 404 finché non si aggiunge la regola di
routing mancante. Il file `k8s/extras/traefik-dashboard.yaml` la aggiunge,
esponendola solo sull'entrypoint interno `traefik` (porta 8080) — mai
sull'entrypoint web pubblico, quindi non influisce in alcun modo
sull'applicazione TicketFlow:

```bash
kubectl apply -f k8s/extras/traefik-dashboard.yaml

kubectl -n kube-system port-forward deploy/traefik 9000:8080
# poi apri http://localhost:9000/dashboard/
```

Per rimuoverla: `kubectl delete -f k8s/extras/traefik-dashboard.yaml`.

---

## Deploy via Portainer

In addition to the standard `make up` / `docker compose up` local workflow, this project can be deployed and managed entirely through [Portainer](https://www.portainer.io/) (Community Edition), using a Git-based stack.

### Prerequisites

- Portainer running locally (see `docker run` command in project notes, or your own Portainer setup)
- All service images built and pushed to the local registry (`make push`)
- This repository pushed to GitHub

### Why a separate compose file?

`docker-compose.yml` builds images locally from source (`build:` blocks) and bind-mounts database init scripts (`./databases/*.sql`, `./databases/mongo-init.js`). Portainer, when deploying from a Git repository, runs inside its own container and cannot:

- Access build contexts outside what's cloned (fixed by pre-building and pushing images instead)
- Bind-mount host paths from Portainer's internal storage (Docker Desktop blocks this by default)

To solve this, `portainers-compose.yml` is a Portainer-specific variant that:

1. Uses only `image:` references (no `build:` blocks) — all 10 images (6 app services + 4 database images) are pre-built and pushed to the local registry via `make push`.
2. Uses **custom database images** (`postgres-auth`, `postgres-events`, `postgres-orders`, `mongo-notifications`) with init scripts baked in at build time via `COPY`, instead of bind-mounting them at runtime. See `databases/postgres-auth/Dockerfile` etc.

### Deploying

1. Build and push all images to the local registry:
```bash
   make push
```
2. Commit and push this repo to GitHub.
3. In Portainer: **Stacks → Add stack**
   - **Build method:** Repository
   - **Repository URL:** this repo's GitHub URL
   - **Repository reference:** `refs/heads/main`
   - **Compose path:** `ticketflow/portainers-compose.yml`
   - **Environment variables:** paste the contents of your `.env` file (Advanced mode)
4. Click **Deploy the stack**.

### Known quirks

- **Registry healthcheck must use the container's internal port, not the host-mapped port.** E.g. if `services-compose.yml` maps `5001:5000`, the healthcheck must target `localhost:5000` (internal), not `5001`.
- **The frontend (nginx) healthcheck must use `127.0.0.1`, not `localhost`.** On Alpine-based images, `localhost` can resolve to `::1` (IPv6) before `127.0.0.1`, and if nginx isn't bound to an IPv6 socket, `wget`/`curl` healthchecks against `localhost` fail with a misleading "connection refused" even though the app is running

---

_TicketFlow — progetto d'esame a microservizi. Codice pulito, variabili
d'ambiente per la configurazione, nessuna password nel codice sorgente._
