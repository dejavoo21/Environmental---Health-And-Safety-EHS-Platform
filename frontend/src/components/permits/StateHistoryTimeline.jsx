import AppIcon from '../AppIcon';
import './StateHistoryTimeline.css';

/**
 * State History Timeline Component
 * Vertical timeline showing permit state changes
 */

const StateHistoryTimeline = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="state-history-timeline">
        <h4>State History</h4>
        <p className="muted">No history available.</p>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStateIcon = (toState) => {
    const icons = {
      draft: 'document',
      submitted: 'upload',
      approved: 'check',
      rejected: 'error',
      active: 'check',
      suspended: 'warning',
      closed: 'lock',
      expired: 'clock',
      cancelled: 'ban'
    };
    return icons[toState] || 'document';
  };

  const getStateLabel = (toState) => {
    const labels = {
      draft: 'Created as Draft',
      submitted: 'Submitted for Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      active: 'Activated',
      suspended: 'Suspended',
      closed: 'Closed',
      expired: 'Expired',
      cancelled: 'Cancelled'
    };
    return labels[toState] || toState;
  };

  // Sort by date descending (most recent first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
  );

  return (
    <div className="state-history-timeline">
      <h4>State History</h4>
      <div className="timeline">
        {sortedHistory.map((entry, index) => (
          <div key={entry.id || index} className="timeline-item">
            <div className="timeline-icon">
              <AppIcon name={getStateIcon(entry.toState)} size={16} />
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-state">{getStateLabel(entry.toState)}</span>
                <span className="timeline-time">{formatDate(entry.changedAt)}</span>
              </div>
              <div className="timeline-user">
                by {entry.changedBy?.firstName || entry.changedBy?.name || 'System'}
              </div>
              {entry.notes && (
                <div className="timeline-notes">{entry.notes}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StateHistoryTimeline;
