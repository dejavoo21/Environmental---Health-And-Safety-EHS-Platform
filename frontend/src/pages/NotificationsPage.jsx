import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import AppIcon from '../components/AppIcon';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'action_assigned', label: 'Action Assigned' },
  { value: 'action_status_changed', label: 'Action Status Changed' },
  { value: 'action_overdue', label: 'Action Overdue' },
  { value: 'action_escalated', label: 'Action Escalated' },
  { value: 'incident_created', label: 'Incident Created' },
  { value: 'incident_high_severity', label: 'High-Severity Incident' },
  { value: 'inspection_failed', label: 'Inspection Failed' },
  { value: 'system', label: 'System' }
];

const READ_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'false', label: 'Unread' },
  { value: 'true', label: 'Read' }
];

const DATE_RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' }
];

const getNotificationIcon = (type) => {
  const icons = {
    action_assigned: 'clipboard',
    action_status_changed: 'check',
    action_overdue: 'clock',
    action_escalated: 'alert',
    incident_created: 'document',
    incident_high_severity: 'alert',
    inspection_failed: 'error',
    digest_sent: 'mail',
    system: 'info'
  };
  return icons[type] || 'info';
};

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { markAsRead, markAllAsRead, deleteNotification, refreshCount } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');

  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchNotifications = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = { page, limit: 20 };

      if (typeFilter) params.type = typeFilter;
      if (readFilter) params.is_read = readFilter;
      if (dateRangeFilter) {
        const days = parseInt(dateRangeFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.startDate = startDate.toISOString();
      }

      const response = await api.get('/notifications', { params });

      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('[NotificationsPage] Fetch error:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, readFilter, dateRangeFilter]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notification) => {
    if (!notification.isRead) {
      const success = await markAsRead(notification.id);
      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      }
    }
  };

  const handleMarkAllRead = async () => {
    const updated = await markAllAsRead();
    if (updated > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast(`${updated} notifications marked as read`);
    }
  };

  const handleDelete = async (notificationId) => {
    const success = await deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      showToast('Notification deleted');
    }
  };

  const handleNotificationClick = async (notification) => {
    await handleMarkAsRead(notification);

    // Navigate to related entity
    if (notification.relatedType && notification.relatedId) {
      switch (notification.relatedType) {
        case 'action':
          navigate(`/actions/${notification.relatedId}`);
          break;
        case 'incident':
          navigate(`/incidents/${notification.relatedId}`);
          break;
        case 'inspection':
          navigate(`/inspections/${notification.relatedId}`);
          break;
        default:
          break;
      }
    }
  };

  const handlePageChange = (newPage) => {
    fetchNotifications(newPage);
  };

  const hasUnread = notifications.some(n => !n.isRead);

  if (loading && notifications.length === 0) {
    return <LoadingState message="Loading notifications..." />;
  }

  if (error && notifications.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchNotifications(1)} />;
  }

  return (
    <div className="page notifications-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <h2>Notifications</h2>
        {hasUnread && (
          <button className="btn secondary" onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label htmlFor="type-filter">Type</label>
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {NOTIFICATION_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="read-filter">Status</label>
          <select
            id="read-filter"
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
          >
            {READ_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="date-filter">Date Range</label>
          <select
            id="date-filter"
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
          >
            {DATE_RANGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon="mail"
          title="No notifications"
          message={typeFilter || readFilter || dateRangeFilter
            ? "No notifications match your filters. Try adjusting your filters or check back later."
            : "You're all caught up! No notifications yet."
          }
        />
      ) : (
        <>
          <div className="notification-cards">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-card-header">
                  <div className="notification-card-icon">
                    {!notification.isRead && <span className="unread-dot" />}
                    <span className="type-icon"><AppIcon name={getNotificationIcon(notification.type)} size={16} /></span>
                  </div>
                  <div className="notification-card-title">
                    <span className="title-text">{notification.title}</span>
                    {notification.priority === 'high' && (
                      <span className="priority-badge high">High Priority</span>
                    )}
                  </div>
                  <div className="notification-card-time">
                    {formatRelativeTime(notification.createdAt)}
                  </div>
                </div>

                <div className="notification-card-body">
                  <p className="notification-card-message">{notification.message}</p>

                  {notification.metadata && (
                    <div className="notification-card-meta">
                      {notification.metadata.actionTitle && (
                        <span className="meta-item">
                          Action: {notification.metadata.actionTitle}
                        </span>
                      )}
                      {notification.metadata.dueDate && (
                        <span className="meta-item">
                          Due: {new Date(notification.metadata.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {notification.metadata.sourceType && notification.metadata.sourceId && (
                        <span className="meta-item">
                          Source: {notification.metadata.sourceType}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="notification-card-actions">
                  {!notification.isRead && (
                    <button
                      className="btn small secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification);
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    className="btn small ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn small"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn small"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;








