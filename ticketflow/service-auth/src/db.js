// Pool di connessioni PostgreSQL. Le credenziali arrivano solo da env.
import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => logger.error('Errore pool PG', { err: err.message }));

// Attende che il DB sia raggiungibile (retry) prima di avviare il server.
export async function waitForDb(retries = 15, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      logger.info('Connessione al database stabilita');
      return;
    } catch (err) {
      logger.warn('DB non pronto, riprovo', { attempt: i, err: err.message });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Impossibile connettersi al database');
}
