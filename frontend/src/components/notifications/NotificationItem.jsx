import { useNotifications } from '../../context/NotificationContext';
import AppIcon from '../AppIcon';

// Icon mapping for notification types
const getNotificationIcon = (type, priority) => {
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

// Color class for notification types
const getTypeColorClass = (type, priority) => {
  if (priority === 'high') return 'priority-high';

  const classes = {
    action_assigned: 'type-action',
    action_status_changed: 'type-action',
    action_overdue: 'type-warning',
    action_escalated: 'type-danger',
    incident_created: 'type-incident',
    incident_high_severity: 'type-danger',
    inspection_failed: 'type-warning',
    system: 'type-system'
  };
  return classes[type] || 'type-system';
};

// Format relative time
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

const NotificationItem = ({ notification, onClick, compact = false, showDelete = false }) => {
  const { markAsRead, deleteNotification } = useNotifications();

  const handleClick = async () => {
    // Mark as read when clicked
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteNotification(notification.id);
  };

  const icon = getNotificationIcon(notification.type, notification.priority);
  const colorClass = getTypeColorClass(notification.type, notification.priority);
  const timeAgo = formatRelativeTime(notification.createdAt);

  return (
    <div
      className={`notification-item ${!notification.isRead ? 'unread' : ''} ${colorClass} ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="notification-item-icon">
        {!notification.isRead && <span className="unread-dot" />}
        <span className="type-icon">
          <AppIcon name={icon} size={16} />
        </span>
      </div>

      <div className="notification-item-content">
        <div className="notification-item-title">{notification.title}</div>
        <div className="notification-item-message">
          {compact
            ? (notification.message?.length > 60
                ? notification.message.substring(0, 60) + '...'
                : notification.message)
            : notification.message
          }
        </div>
        {!compact && notification.metadata && (
          <div className="notification-item-meta">
            {notification.metadata.actionTitle && (
              <span>Action: {notification.metadata.actionTitle}</span>
            )}
            {notification.metadata.sourceType && (
              <span>Source: {notification.metadata.sourceType}</span>
            )}
          </div>
        )}
        <div className="notification-item-time">{timeAgo}</div>
      </div>

      {showDelete && (
        <button
          className="notification-item-delete"
          onClick={handleDelete}
          title="Delete notification"
          aria-label="Delete notification"
        >
          X
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
