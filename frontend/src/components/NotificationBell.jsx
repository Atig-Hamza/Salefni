import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationContext.jsx';
import { formatDate } from '../utils/formatters.js';

function NotificationBell() {
  const { notifications, unreadCount, markAllAsSeen } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open && unreadCount) {
      markAllAsSeen();
    }
  }, [open, unreadCount, markAllAsSeen]);

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        aria-label="Afficher les notifications"
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24">
          <path d="M12 2a6 6 0 0 0-6 6v3.09c0 .63-.25 1.24-.69 1.69L3.7 14.39A1 1 0 0 0 4.41 16h15.18a1 1 0 0 0 .71-1.71l-1.61-1.61a2.4 2.4 0 0 1-.69-1.69V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Z" fill="currentColor" />
        </svg>
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-bell__dropdown">
          <h4>Notifications</h4>
          {notifications.length === 0 && <p className="text-muted">Aucune notification</p>}
          <ul>
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.seen ? 'seen' : 'unseen'}>
                <p className="notification-title">{notification.title}</p>
                <p className="notification-date">{formatDate(notification.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
