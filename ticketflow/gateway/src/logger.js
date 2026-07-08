// Logger JSON minimale condiviso dal gateway.
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const current = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
function log(level, message, meta = {}) {
  if (LEVELS[level] > current) return;
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, service: 'gateway', message, ...meta }) + '\n');
}
export const logger = {
  error: (m, meta) => log('error', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  info: (m, meta) => log('info', m, meta),
  debug: (m, meta) => log('debug', m, meta),
};
