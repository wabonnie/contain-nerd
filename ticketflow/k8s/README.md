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
| local registry (`registry:2`, already used by Compose) | Same registry, referenced directly in `image:` — runtime-agnostic image distribution |

## 1. Build and push the images to the local registry

Images are distributed through the project's existing **local Docker registry**
(`registry:2`, exposed on host port **5050**  — the same one used by
`docker-compose.yml` / `scripts/build-and-push.sh`), instead of a
runtime-specific image store. This makes the deployment **portable across
container runtimes** (Docker Desktop, Rancher Desktop with dockerd or
containerd, a remote cluster, ...): any runtime that can reach the registry
over HTTP can pull the images, with no runtime-specific build flags.

> **Note for macOS:** port **5000** is frequently occupied by the system's
> **AirPlay Receiver** service (enabled by default on macOS Monterey and
> later), which answers on that port before the registry container can bind
> to it — causing silent failures or an unexpected `403 Forbidden` response.
> For this reason the registry here is exposed on host port **5050**
> (`-p 5050:5000`) instead of the default 5000. Alternatively, disable
> AirPlay Receiver under *System Settings → General → AirDrop & Handoff* and
> use port 5000 instead throughout.

```bash
cd contain-nerd-main   # your project root

# Make sure the registry is running (already part of the Compose stack;
# start it on its own if needed):
docker run -d -p 5050:5000 --restart unless-stopped --name registry registry:2

# Build, tag, and push each image
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

# Or in one go: bash scripts/build-and-push.sh
```

The manifests reference `image: localhost:5050/ticketflow/<service>:1.0` with
`imagePullPolicy: Always`, so the cluster always pulls the current image from
the registry rather than relying on a local build cache.

> **Insecure registry note:** `localhost:5050` serves plain HTTP, not HTTPS.
> Most container runtimes refuse to pull from a non-TLS registry unless told
> it's trusted. On Rancher Desktop (k3s/containerd), add this to
> `/etc/rancher/k3s/registries.yaml` (create it if missing), then
> **Troubleshooting → Restart Kubernetes**:
> ```yaml
> mirrors:
>   "localhost:5050":
>     endpoint:
>       - "http://localhost:5050"
> ```
> On plain Docker Desktop / dockerd, add `localhost:5050` under
> `"insecure-registries"` in the Docker Engine daemon settings instead, and
> restart Docker. This step is runtime-specific, but it only needs to be done
> **once per environment** — after that, the same manifests and `image:`
> references work unchanged on any runtime.

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
- **Runtime portability**: images are pulled from the local registry
  (`localhost:5050`) rather than built directly into a runtime-specific image
  store (e.g. `nerdctl --namespace k8s.io`). This means the exact same
  manifests work whether the cluster is backed by containerd, dockerd
  (moby), or a different machine entirely — only the one-time insecure
  registry trust setting (see step 1) differs per runtime.

## Teardown

```bash
kubectl delete namespace ticketflow     # removes everything incl. PVCs
```

## Optional: Traefik dashboard (debugging)

Rancher Desktop's bundled Traefik has its dashboard **enabled but not routed**
by default (`--api.dashboard=true` without `--api.insecure=true`), so hitting
`/dashboard/` directly returns a 404. `k8s/extras/traefik-dashboard.yaml`
adds the missing route, exposed only on Traefik's internal `traefik`
entrypoint (port 8080) — not on the public web entrypoint, so it never
affects or exposes the TicketFlow app itself.

```bash
kubectl apply -f k8s/extras/traefik-dashboard.yaml

kubectl -n kube-system port-forward deploy/traefik 9000:8080
# then open http://localhost:9000/dashboard/
```

Remove it with `kubectl delete -f k8s/extras/traefik-dashboard.yaml`.

