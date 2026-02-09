import { useState, useEffect } from 'react';
import './CountdownTimer.css';

/**
 * Countdown Timer Component
 * Real-time countdown to permit expiry
 */

const CountdownTimer = ({ validUntil, showDate = false }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    if (!validUntil) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiry = new Date(validUntil);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining({ expired: true });
        setUrgency('expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });

      // Set urgency level
      if (diff <= 30 * 60 * 1000) { // 30 minutes
        setUrgency('critical');
      } else if (diff <= 2 * 60 * 60 * 1000) { // 2 hours
        setUrgency('warning');
      } else {
        setUrgency('normal');
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [validUntil]);

  if (!validUntil) {
    return <span className="countdown-timer countdown-unknown">No expiry set</span>;
  }

  if (!timeRemaining) {
    return <span className="countdown-timer countdown-loading">...</span>;
  }

  if (timeRemaining.expired) {
    return <span className="countdown-timer countdown-expired">⏱️ Expired</span>;
  }

  const { hours, minutes } = timeRemaining;
  const formattedTime = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes}m`;

  const expiryDate = new Date(validUntil);
  const timeStr = expiryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`countdown-timer countdown-${urgency}`}>
      <div className="countdown-main">
        <span className="countdown-icon">⏱️</span>
        {showDate && <span className="countdown-until">Valid until {timeStr}</span>}
        <span className="countdown-remaining">{formattedTime} remaining</span>
      </div>
    </div>
  );
};

export const CountdownBadge = ({ validUntil }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [urgency, setUrgency] = useState('normal');

  useEffect(() => {
    if (!validUntil) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiry = new Date(validUntil);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setUrgency('expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);

      if (diff <= 30 * 60 * 1000) {
        setUrgency('critical');
      } else if (diff <= 2 * 60 * 60 * 1000) {
        setUrgency('warning');
      } else {
        setUrgency('normal');
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [validUntil]);

  if (!timeRemaining) return null;

  return (
    <span className={`countdown-badge countdown-${urgency}`}>
      ⏱️ {timeRemaining}
    </span>
  );
};

export default CountdownTimer;
