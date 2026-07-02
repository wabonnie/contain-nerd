import { useState } from 'react';
import { api, auth, euro, formatDate } from '../lib/api.js';
import EventForm from './EventForm.jsx';

export default function Events({ events, reload, notify }) {
  const user = auth.user;
  const isAdmin = user?.role === 'admin';
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  async function order(ev) {
    try {
      await api.createOrder({ event_id: ev.id, quantity: 1 });
      notify('success', `Ordine confermato per "${ev.title}"`);
      reload();
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function save(payload) {
    try {
      if (editing) await api.updateEvent(editing.id, payload);
      else await api.createEvent(payload);
      notify('success', 'Evento salvato');
      setEditing(null);
      setCreating(false);
      reload();
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function remove(ev) {
    if (!confirm(`Eliminare "${ev.title}"?`)) return;
    try {
      await api.deleteEvent(ev.id);
      notify('success', 'Evento eliminato');
      reload();
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <section>
      <div className="section__head">
        <h2>Eventi in programma</h2>
        {isAdmin && <button className="btn btn--primary" onClick={() => setCreating(true)}>+ Nuovo evento</button>}
      </div>

      <div className="cards">
        {events.map((ev) => (
          <article key={ev.id} className="card">
            <div className="card__cat">{ev.category}</div>
            <h3 className="card__title">{ev.title}</h3>
            <p className="card__desc">{ev.description}</p>
            <ul className="card__meta">
              <li>📍 {ev.venue}, {ev.city}</li>
              <li>🗓️ {formatDate(ev.event_date)}</li>
              <li>🎫 {ev.available_tickets} / {ev.total_tickets} disponibili</li>
            </ul>
            <div className="card__foot">
              <span className="card__price">{euro(ev.price_cents)}</span>
              <button
                className="btn btn--primary"
                disabled={ev.available_tickets < 1}
                onClick={() => order(ev)}
              >
                {ev.available_tickets < 1 ? 'Esaurito' : 'Prenota'}
              </button>
            </div>
            {isAdmin && (
              <div className="card__admin">
                <button className="btn btn--ghost" onClick={() => setEditing(ev)}>Modifica</button>
                <button className="btn btn--danger" onClick={() => remove(ev)}>Elimina</button>
              </div>
            )}
          </article>
        ))}
        {events.length === 0 && <p className="empty">Nessun evento disponibile.</p>}
      </div>

      {(creating || editing) && (
        <EventForm
          initial={editing}
          onSave={save}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </section>
  );
}
