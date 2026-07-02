// ============================================================
// TicketFlow · service-notifications · init MongoDB
// Crea la collection e un indice per query per utente.
// ============================================================
db = db.getSiblingDB('notifications_db');
db.createCollection('notifications');
db.notifications.createIndex({ user_id: 1, created_at: -1 });
print('notifications_db pronto');
