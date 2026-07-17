# TicketFlow — Kubernetes (Rancher Desktop)

Migration of the Docker Compose stack to Kubernetes manifests, organized in apply order:

```
k8s/
├── 00-base/        namespace, ConfigMap, Secrets
├── 10-databases/   RabbitMQ, 3x PostgreSQL, MongoDB (StatefulSets + PVCs)
├── 20-services/    service-auth, service-events, service-orders, service-notifications
└── 30-edge/        gateway, frontend, Ingress (Traefik)
```

## Compose → Kubernetes mapping

| Docker Compose | Kubernetes |
|---|---|
| `services:` (stateless) | Deployment + Service |
| `services:` (databases/broker) | StatefulSet + Service |
| named `volumes:` | PersistentVolumeClaim (via volumeClaimTemplates, Rancher Desktop's `local-path` provisioner) |
| `environment:` / `.env` | ConfigMap (non-sensitive) + Secret (credentials) |
| `healthcheck:` | readiness/liveness probes |
| `depends_on:` | not needed — probes + restarts make services wait naturally |
| `networks:` | flat cluster network + DNS (`postgres-auth`, `rabbitmq`, ...) — same hostnames as Compose |
| `ports:` on gateway/frontend | Ingress (Traefik, built into Rancher Desktop) |
| bind-mounted init scripts | ConfigMaps mounted at `/docker-entrypoint-initdb.d` |

## 1. Build the images into Rancher Desktop

Rancher Desktop shares its image store with the cluster when you use `nerdctl` with the
`k8s.io` namespace (containerd runtime) — no registry needed:

```bash
cd contain-nerd-main   # your project root

nerdctl --namespace k8s.io build -t ticketflow/service-auth:1.0 ./service-auth
nerdctl --namespace k8s.io build -t ticketflow/service-events:1.0 ./service-events
nerdctl --namespace k8s.io build -t ticketflow/service-orders:1.0 ./service-orders
nerdctl --namespace k8s.io build -t ticketflow/service-notifications:1.0 ./service-notifications
nerdctl --namespace k8s.io build -t ticketflow/gateway:1.0 ./gateway
nerdctl --namespace k8s.io build -t ticketflow/frontend:1.0 --build-arg VITE_API_BASE_URL=/api ./frontend
```

> If Rancher Desktop is set to **dockerd (moby)** instead of containerd, use plain
> `docker build` with the same tags — the images are visible to the cluster the same way.
> The manifests use `imagePullPolicy: IfNotPresent` so local images are used directly.

## 2. Create the DB init-script ConfigMaps

The Compose file bind-mounts SQL/JS init scripts. In Kubernetes these become ConfigMaps
created from your local files:

```bash
kubectl create namespace ticketflow --dry-run=client -o yaml | kubectl apply -f -

kubectl -n ticketflow create configmap auth-init-sql   --from-file=databases/auth-init.sql
kubectl -n ticketflow create configmap events-init-sql --from-file=databases/events-init.sql
kubectl -n ticketflow create configmap orders-init-sql --from-file=databases/orders-init.sql
kubectl -n ticketflow create configmap mongo-init-js   --from-file=databases/mongo-init.js
```

(Init scripts only run on **first** startup, when the data volume is empty — same as Docker.)

## 3. Apply the manifests

```bash
kubectl apply -f k8s/00-base/
kubectl apply -f k8s/10-databases/
kubectl apply -f k8s/20-services/
kubectl apply -f k8s/30-edge/

kubectl -n ticketflow get pods -w   # wait until everything is Running/Ready
```

## 4. Access the app

The Ingress routes on host `ticketflow.localhost` (resolves to 127.0.0.1 automatically
on most systems; Traefik listens on localhost:80 in Rancher Desktop):

- Frontend: http://ticketflow.localhost/
- API:      http://ticketflow.localhost/api

If port 80 is busy or the host doesn't resolve, use port-forwarding instead:

```bash
kubectl -n ticketflow port-forward svc/frontend 8080:80
kubectl -n ticketflow port-forward svc/gateway 8000:8000
# RabbitMQ management UI:
kubectl -n ticketflow port-forward svc/rabbitmq 15672:15672
```

## Notes & differences vs Compose

- **Secrets**: `00-base/base.yaml` contains the dev defaults from `.env.example`
  (guest/guest, auth_pass, etc.). Change `JWT_SECRET` and the passwords before any
  non-local use — or better, create the Secret out-of-band and remove it from the file.
- **depends_on / startup order**: Kubernetes has no startup ordering; pods that start
  before their DB simply fail their probes and restart until the DB is ready. If a
  service crashes hard on missing DB, you'll see a few restarts at first boot — normal.
- **Storage**: PVCs use Rancher Desktop's default `local-path` StorageClass. Data
  survives pod restarts; delete PVCs to reset the databases.
- **Scaling**: stateless services can be scaled
  (`kubectl -n ticketflow scale deploy/service-events --replicas=3`);
  keep the StatefulSets at 1 replica.

## Teardown

```bash
kubectl delete namespace ticketflow     # removes everything incl. PVCs
```
