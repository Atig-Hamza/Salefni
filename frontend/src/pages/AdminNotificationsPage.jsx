import { useNotifications } from '../context/NotificationContext.jsx';
import { formatDate } from '../utils/formatters.js';

function AdminNotificationsPage() {
  const { notifications, markAsSeen, refresh } = useNotifications();

  return (
    <div className="page shell">
      <section className="card">
        <header className="card-header">
          <h1>Notifications</h1>
          <button type="button" className="button" onClick={refresh}>Actualiser</button>
        </header>

        {notifications.length === 0 && <p className="text-muted">Aucune notification disponible.</p>}

        <ul className="notifications-list">
          {notifications.map((notification) => (
            <li key={notification.id} className={notification.seen ? 'seen' : 'unseen'}>
              <div className="notification-content">
                <h3>{notification.title}</h3>
                <p className="text-muted">{formatDate(notification.createdAt)}</p>
              </div>
              {!notification.seen && (
                <button type="button" className="button" onClick={() => markAsSeen(notification.id)}>
                  Marquer comme lue
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default AdminNotificationsPage;
