// =============================================================================
// gateway · entrypoint
// Reverse proxy verso i microservizi + verifica JWT sulle rotte protette.
// NB: non usiamo express.json() perché il body deve essere inoltrato "grezzo"
//     ai servizi a valle senza essere consumato.
// =============================================================================
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from './logger.js';

const app = express();
const PORT = Number(process.env.PORT || 8000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const TARGETS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://service-auth:3001',
  events: process.env.EVENTS_SERVICE_URL || 'http://service-events:8000',
  orders: process.env.ORDERS_SERVICE_URL || 'http://service-orders:8000',
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://service-notifications:8000',
};

app.use(cors());
app.use(morgan('tiny', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ---- Healthcheck ------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));

// ---- Swagger di orientamento ------------------------------------------------
const openapiSpec = {
  openapi: '3.0.3',
  info: { title: 'TicketFlow · API Gateway', version: '1.0.0' },
  paths: {
    '/api/auth/login': { post: { summary: 'Login (proxy → service-auth)' } },
    '/api/auth/register': { post: { summary: 'Registrazione (proxy → service-auth)' } },
    '/api/events': { get: { summary: 'Lista eventi (proxy → service-events)' } },
    '/api/orders': { post: { summary: 'Crea ordine (proxy → service-orders, JWT)' } },
    '/api/notifications': { get: { summary: 'Notifiche utente (proxy → service-notifications, JWT)' } },
  },
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ---- Verifica JWT: valida il token e inietta l'identità negli header --------
function verifyJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticazione richiesta' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Header propagati ai servizi a valle (identità già verificata dal gateway).
    req.headers['x-user-id'] = String(payload.sub);
    req.headers['x-user-email'] = payload.email;
    req.headers['x-user-name'] = payload.name || '';
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

// Protegge gli eventi solo in scrittura (le GET restano pubbliche).
function protectWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  return verifyJwt(req, res, next);
}

// ---- Factory di un proxy con pathRewrite e logging degli errori ------------
function proxy(target, rewritePrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${rewritePrefix}`]: '' },
    on: {
      error: (err, _req, res) => {
        logger.error('Errore di proxy', { target, err: err.message });
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Servizio non disponibile' }));
        }
      },
    },
  });
}

// ---- Instradamento ----------------------------------------------------------
app.use('/api/auth', proxy(TARGETS.auth, '/api/auth'));
app.use('/api/events', protectWrites, proxy(TARGETS.events, '/api/events'));
app.use('/api/orders', verifyJwt, proxy(TARGETS.orders, '/api/orders'));
app.use('/api/notifications', verifyJwt, proxy(TARGETS.notifications, '/api/notifications'));

app.use((_req, res) => res.status(404).json({ error: 'Rotta non trovata' }));

app.listen(PORT, () => logger.info(`gateway in ascolto sulla porta ${PORT}`));
