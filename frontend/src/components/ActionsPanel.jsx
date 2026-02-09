import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState } from './States';

// P2-J1, P2-J2: Actions linked to incidents/inspections
const ActionsPanel = ({ sourceType, sourceId, onCreateAction }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreateAction = user?.role === 'manager' || user?.role === 'admin';
  const sourceLabel = sourceType === 'incident' ? 'incident' : 'inspection';

  useEffect(() => {
    const loadActions = async () => {
      setLoading(true);
      setError('');
      try {
        const endpoint = sourceType === 'incident'
          ? `/incidents/${sourceId}/actions`
          : `/inspections/${sourceId}/actions`;

        const res = await api.get(endpoint);
        setActions(res.data.actions || []);
      } catch (err) {
        if (err.response?.status === 403) {
          setError('You do not have permission to view actions.');
        } else {
          setError('Unable to load actions.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (sourceType && sourceId) {
      loadActions();
    }
  }, [sourceType, sourceId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'badge status-open';
      case 'in_progress': return 'badge status-progress';
      case 'done': return 'badge status-done';
      case 'overdue': return 'badge status-overdue';
      default: return 'badge';
    }
  };

  return (
    <div className="card panel actions-panel">
      <div className="panel-header">
        <h3>Actions</h3>
        {canCreateAction && onCreateAction && (
          <button className="btn primary add-action-btn" onClick={onCreateAction}>
            + Add Action
          </button>
        )}
      </div>

      <div className="panel-content">
        {loading && <LoadingState message="Loading actions..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && actions.length === 0 && (
          <div className="empty-panel-state">
            <p>No actions linked to this {sourceLabel} yet.</p>
            {canCreateAction && onCreateAction ? (
              <p className="muted">
                Click <strong>+ Add Action</strong> above to create a corrective action and assign it to a team member.
              </p>
            ) : (
              <p className="muted">
                Only managers and admins can create actions.
              </p>
            )}
          </div>
        )}
        {!loading && !error && actions.length > 0 && (
          <div className="actions-list">
            {actions.map((action) => (
              <div
                key={action.id}
                className="action-item"
                onClick={() => navigate(`/actions/${action.id}`)}
              >
                <div className="action-info">
                  <div className="action-title">{action.title}</div>
                  <div className="action-meta">
                    Assigned to: {action.assignedTo?.firstName} {action.assignedTo?.lastName}
                    {action.dueDate && ` | Due: ${formatDate(action.dueDate)}`}
                  </div>
                </div>
                <span className={getStatusBadgeClass(action.status)}>
                  {action.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionsPanel;
