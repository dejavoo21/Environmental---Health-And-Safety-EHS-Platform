import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';
import AppIcon from '../AppIcon';

const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    error,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();

  // Fetch notifications when dropdown opens
  useEffect(() => {
    refreshNotifications(10);
  }, [refreshNotifications]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    onClose();
    navigate('/notifications');
  };

  const handleNotificationClick = (notification) => {
    onClose();
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
          navigate('/notifications');
      }
    } else {
      navigate('/notifications');
    }
  };

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="notification-dropdown" role="menu">
      <div className="notification-dropdown-header">
        <h3>Notifications</h3>
        {hasUnread && (
          <button
            className="mark-all-read-btn"
            onClick={handleMarkAllRead}
            title="Mark all as read"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-dropdown-content">
        {loading && (
          <div className="notification-loading">
            <div className="skeleton-item" />
            <div className="skeleton-item" />
            <div className="skeleton-item" />
          </div>
        )}

        {error && !loading && (
          <div className="notification-error">
            <span>Failed to load notifications</span>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="notification-empty">
            <div className="empty-icon">
              <AppIcon name="mail" size={20} />
            </div>
            <div className="empty-text">No notifications yet</div>
            <div className="empty-subtext">You're all caught up!</div>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="notification-list">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                compact
              />
            ))}
          </div>
        )}
      </div>

      <div className="notification-dropdown-footer">
        <button className="view-all-btn" onClick={handleViewAll}>
          View all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;


