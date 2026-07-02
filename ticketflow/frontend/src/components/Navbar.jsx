export default function Navbar({ user, tab, setTab, onLogout }) {
  const tabs = [
    { id: 'events', label: 'Eventi' },
    { id: 'orders', label: 'I miei ordini' },
    { id: 'notifications', label: 'Notifiche' },
  ];
  return (
    <header className="navbar">
      <div className="navbar__brand">
        <span className="navbar__logo">🎟️</span> TicketFlow
      </div>
      <nav className="navbar__tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`navbar__tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="navbar__user">
        <span className="navbar__badge">{user.role}</span>
        <span>{user.full_name}</span>
        <button className="btn btn--ghost" onClick={onLogout}>Esci</button>
      </div>
    </header>
  );
}
