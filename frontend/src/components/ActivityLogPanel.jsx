import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from './States';

// P2-J8, P2-J9, P2-J10: Activity logs for incidents, inspections, actions
const ActivityLogPanel = ({ entityType, entityId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAuditLog = async () => {
      setLoading(true);
      setError('');
      try {
        // Build the endpoint based on entity type
        let endpoint;
        if (entityType === 'incident') {
          endpoint = `/incidents/${entityId}/audit-log`;
        } else if (entityType === 'inspection') {
          endpoint = `/inspections/${entityId}/audit-log`;
        } else if (entityType === 'action') {
          endpoint = `/actions/${entityId}/audit-log`;
        } else {
          setError('Invalid entity type.');
          setLoading(false);
          return;
        }

        const res = await api.get(endpoint);
        setEvents(res.data.events || []);
      } catch (err) {
        if (err.response?.status === 403) {
          setError('You do not have permission to view activity log.');
        } else {
          setError('Unable to load activity log.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (entityType && entityId) {
      loadAuditLog();
    }
  }, [entityType, entityId]);

  const formatEventType = (eventType) => {
    const labels = {
      created: 'Created',
      updated: 'Updated',
      status_changed: 'Status Changed',
      severity_changed: 'Severity Changed',
      attachment_added: 'Attachment Added',
      attachment_removed: 'Attachment Removed',
      assigned: 'Assigned'
    };
    return labels[eventType] || eventType;
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getEventDetails = (event) => {
    if (event.eventType === 'status_changed') {
      const oldStatus = event.oldValue?.status || '-';
      const newStatus = event.newValue?.status || '-';
      return `${oldStatus} -> ${newStatus}`;
    }
    if (event.eventType === 'severity_changed') {
      const oldSev = event.oldValue?.severity || '-';
      const newSev = event.newValue?.severity || '-';
      return `${oldSev} -> ${newSev}`;
    }
    if (event.eventType === 'created' && event.newValue) {
      const status = event.newValue.status || '';
      return status ? `Status: ${status}` : '';
    }
    if (event.eventType === 'attachment_added' && event.newValue) {
      return event.newValue.filename || '';
    }
    return '';
  };

  return (
    <div className="card panel">
      <div className="panel-header">
        <h3>Activity Log</h3>
      </div>

      <div className="panel-content">
        {loading && <LoadingState message="Loading activity..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && events.length === 0 && (
          <EmptyState message="No activity recorded yet." />
        )}
        {!loading && !error && events.length > 0 && (
          <div className="activity-list">
            {events.map((event) => (
              <div key={event.id} className="activity-item">
                <div className="activity-icon">
                  <span className={`event-dot event-${event.eventType}`}></span>
                </div>
                <div className="activity-content">
                  <div className="activity-event">
                    <strong>{formatEventType(event.eventType)}</strong>
                    {getEventDetails(event) && (
                      <span className="event-details"> - {getEventDetails(event)}</span>
                    )}
                  </div>
                  <div className="activity-meta">
                    {formatTimestamp(event.occurredAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPanel;
