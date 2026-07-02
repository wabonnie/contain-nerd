import { useCallback, useEffect, useState } from 'react';
import { api, auth } from './lib/api.js';
import Navbar from './components/Navbar.jsx';
import Auth from './components/Auth.jsx';
import Events from './components/Events.jsx';
import Orders from './components/Orders.jsx';
import Notifications from './components/Notifications.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const [user, setUser] = useState(auth.user);
  const [tab, setTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = useCallback((type, message) => setToast({ type, message }), []);

  const loadEvents = useCallback(async () => {
    try { setEvents(await api.listEvents()); } catch (e) { notify('error', e.message); }
  }, [notify]);

  const loadOrders = useCallback(async () => {
    if (!auth.token) return;
    try { setOrders(await api.listOrders()); } catch (e) { notify('error', e.message); }
  }, [notify]);

  const loadNotifications = useCallback(async () => {
    if (!auth.token) return;
    try { setNotifications(await api.listNotifications()); } catch (e) { notify('error', e.message); }
  }, [notify]);

  const reloadAll = useCallback(() => {
    loadEvents(); loadOrders(); loadNotifications();
  }, [loadEvents, loadOrders, loadNotifications]);

  useEffect(() => { if (user) reloadAll(); }, [user, reloadAll]);

  // Aggiorna le notifiche periodicamente (arrivano in modo asincrono dal broker).
  useEffect(() => {
    if (!user) return;
    const t = setInterval(loadNotifications, 5000);
    return () => clearInterval(t);
  }, [user, loadNotifications]);

  function logout() {
    auth.clear();
    setUser(null);
  }

  if (!user) return (
    <>
      <Auth onAuth={setUser} notify={notify} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );

  return (
    <div className="app">
      <Navbar user={user} tab={tab} setTab={setTab} onLogout={logout} />
      <main className="content">
        {tab === 'events' && <Events events={events} reload={reloadAll} notify={notify} />}
        {tab === 'orders' && <Orders orders={orders} />}
        {tab === 'notifications' && <Notifications notifications={notifications} />}
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
