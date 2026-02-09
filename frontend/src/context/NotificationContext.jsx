import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../api/client';

const NotificationContext = createContext({
  unreadCount: 0,
  notifications: [],
  loading: false,
  error: null,
  markAsRead: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  refreshCount: () => {},
  refreshNotifications: () => {}
});

const POLL_INTERVAL = 30000; // 30 seconds

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  // Fetch unread count
  const refreshCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to fetch unread count:', err.message);
    }
  }, [user]);

  // Fetch recent notifications (for dropdown)
  const refreshNotifications = useCallback(async (limit = 10) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/notifications', {
        params: { limit, page: 1 }
      });
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to fetch notifications:', err.message);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        // Decrement unread count if it was unread
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to mark as read:', err.message);
    }
    return false;
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      if (response.data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        return response.data.data.updated;
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all as read:', err.message);
    }
    return 0;
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      const response = await api.delete(`/notifications/${notificationId}`);
      if (response.data.success) {
        // Update local state
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Decrement unread count if it was unread
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return true;
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to delete notification:', err.message);
    }
    return false;
  }, [notifications]);

  // Start polling when user is logged in
  useEffect(() => {
    if (user) {
      // Fetch immediately
      refreshCount();

      // Start polling
      pollIntervalRef.current = setInterval(refreshCount, POLL_INTERVAL);
    } else {
      // Clear state when logged out
      setUnreadCount(0);
      setNotifications([]);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [user, refreshCount]);

  const value = {
    unreadCount,
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshCount,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
