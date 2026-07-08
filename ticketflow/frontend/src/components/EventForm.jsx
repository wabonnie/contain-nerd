import { useState } from 'react';

// Modale per creare/modificare un evento (solo admin).
const empty = {
  title: '', description: '', venue: '', city: '', category: 'concerto',
  event_date: '', price_cents: 1000, total_tickets: 100,
};

export default function EventForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, event_date: initial.event_date?.slice(0, 16) }
      : empty
  );
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function submit() {
    const payload = {
      ...form,
      price_cents: Number(form.price_cents),
      total_tickets: Number(form.total_tickets),
      event_date: new Date(form.event_date).toISOString(),
    };
    onSave(payload);
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? 'Modifica evento' : 'Nuovo evento'}</h3>
        <input className="input" placeholder="Titolo" value={form.title} onChange={update('title')} />
        <textarea className="input" placeholder="Descrizione" value={form.description} onChange={update('description')} />
        <div className="grid-2">
          <input className="input" placeholder="Luogo" value={form.venue} onChange={update('venue')} />
          <input className="input" placeholder="Città" value={form.city} onChange={update('city')} />
        </div>
        <div className="grid-2">
          <select className="input" value={form.category} onChange={update('category')}>
            {['concerto', 'sport', 'teatro', 'conferenza', 'food', 'generico'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input className="input" type="datetime-local" value={form.event_date} onChange={update('event_date')} />
        </div>
        <div className="grid-2">
          <label className="field">
            Prezzo (centesimi)
            <input className="input" type="number" min="0" value={form.price_cents} onChange={update('price_cents')} />
          </label>
          <label className="field">
            Biglietti totali
            <input className="input" type="number" min="0" value={form.total_tickets} onChange={update('total_tickets')} />
          </label>
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn--primary" onClick={submit}>Salva</button>
        </div>
      </div>
    </div>
  );
}
