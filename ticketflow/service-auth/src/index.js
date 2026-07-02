// =============================================================================
// service-auth · entrypoint
// Espone registrazione, login e verifica JWT. Single Responsibility: identità.
// =============================================================================
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';

import { pool, waitForDb } from './db.js';
import { logger } from './logger.js';
import { openapiSpec } from './openapi.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

app.use(cors());
app.use(express.json());
app.use(morgan('tiny', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ---- Healthcheck ------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'service-auth' }));

// ---- Swagger ----------------------------------------------------------------
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ---- Middleware di autenticazione ------------------------------------------
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token mancante' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token non valido' });
  }
}

// ---- Registrazione ----------------------------------------------------------
app.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body || {};
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password e full_name sono obbligatori' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, role, created_at`,
      [email.toLowerCase(), hash, full_name]
    );
    logger.info('Nuovo utente registrato', { userId: rows[0].id });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email già registrata' });
    logger.error('Errore in registrazione', { err: err.message });
    res.status(500).json({ error: 'Errore interno' });
  }
});

// ---- Login ------------------------------------------------------------------
app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Credenziali mancanti' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email o password non validi' });
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, name: user.full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    logger.info('Login riuscito', { userId: user.id });
    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    logger.error('Errore in login', { err: err.message });
    res.status(500).json({ error: 'Errore interno' });
  }
});

// ---- Profilo corrente -------------------------------------------------------
app.get('/me', authRequired, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
    [req.user.sub]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utente non trovato' });
  res.json(rows[0]);
});

// ---- Avvio ------------------------------------------------------------------
waitForDb()
  .then(() => {
    app.listen(PORT, () => logger.info(`service-auth in ascolto sulla porta ${PORT}`));
  })
  .catch((err) => {
    logger.error('Avvio fallito', { err: err.message });
    process.exit(1);
  });
