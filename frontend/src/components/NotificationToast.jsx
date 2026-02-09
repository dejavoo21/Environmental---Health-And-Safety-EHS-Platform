import React, { useEffect } from 'react';
import './NotificationToast.css';

const NotificationToast = ({ message, type = 'info', onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`notification-toast notification-toast-${type}`} role="status" aria-live="polite">
      {message}
      <button className="notification-toast-close" onClick={onClose} aria-label="Close notification">×</button>
    </div>
  );
};

export default NotificationToast;
