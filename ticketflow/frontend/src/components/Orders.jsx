import { euro, formatDate } from '../lib/api.js';

export default function Orders({ orders }) {
  return (
    <section>
      <div className="section__head"><h2>I miei ordini</h2></div>
      {orders.length === 0 ? (
        <p className="empty">Non hai ancora effettuato ordini.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>#</th><th>Evento</th><th>Q.tà</th><th>Totale</th><th>Stato</th><th>Data</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.event_title}</td>
                <td>{o.quantity}</td>
                <td>{euro(o.total_cents)}</td>
                <td><span className="pill pill--ok">{o.status}</span></td>
                <td>{formatDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
