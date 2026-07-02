import { formatDate } from '../lib/api.js';

export default function Notifications({ notifications }) {
  return (
    <section>
      <div className="section__head"><h2>Notifiche</h2></div>
      {notifications.length === 0 ? (
        <p className="empty">Nessuna notifica. Prenota un evento per riceverne una!</p>
      ) : (
        <ul className="notif-list">
          {notifications.map((n) => (
            <li key={n.id} className="notif">
              <div className="notif__icon">🔔</div>
              <div>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <small>{formatDate(n.created_at)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
