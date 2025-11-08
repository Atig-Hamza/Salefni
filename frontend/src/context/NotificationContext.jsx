import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, patch } from '../api/client.js';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get('/notifications', {
        _sort: 'createdAt',
        _order: 'desc',
      });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsSeen = useCallback(async (notificationId) => {
    try {
      await patch(`/notifications/${notificationId}`, { seen: true });
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId ? { ...notification, seen: true } : notification
      )));
    } catch (err) {
      setError(err);
    }
  }, []);

  const markAllAsSeen = useCallback(async () => {
    try {
      const unseen = notifications.filter((notification) => !notification.seen);
      await Promise.all(unseen.map((notification) => patch(`/notifications/${notification.id}`, { seen: true })));
      setNotifications((current) => current.map((notification) => ({ ...notification, seen: true })));
    } catch (err) {
      setError(err);
    }
  }, [notifications]);

  const value = useMemo(() => ({
    notifications,
    loading,
    error,
    refresh: fetchNotifications,
    markAsSeen,
    markAllAsSeen,
    unreadCount: notifications.reduce((total, notification) => (notification.seen ? total : total + 1), 0),
  }), [notifications, loading, error, fetchNotifications, markAsSeen, markAllAsSeen]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans un NotificationsProvider');
  }
  return context;
}
