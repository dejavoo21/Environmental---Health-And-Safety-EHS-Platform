import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState } from '../components/States';
import AttachmentsPanel from '../components/AttachmentsPanel';
import ActivityLogPanel from '../components/ActivityLogPanel';
import SafetyAdvisorPanel from '../components/safety/SafetyAdvisorPanel';
// Phase 11: Safety Advisor API
import { getTaskSafetySummary } from '../api/safetyAdvisor';

// P2-J3: Action Detail, P2-J7: Attachments, P2-J10: Activity Log
// Phase 11: High-risk workflow enforcement (TC-276-1, TC-276-2)
const ActionDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [action, setAction] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Phase 11: Safety Advisor state
  const [safetySummary, setSafetySummary] = useState(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [requiresSafetyAck, setRequiresSafetyAck] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/actions/${id}`);
        setAction(res.data);
        setStatus(res.data.status);
        // Phase 11: Check if high-risk (high priority or critical action type)
        const isHighRisk = ['high', 'critical'].includes(res.data.priority?.toLowerCase()) ||
                          res.data.actionType?.requiresSafetyAcknowledgement ||
                          res.data.isSafetyCritical;
        setRequiresSafetyAck(isHighRisk);
      } catch (err) {
        if (err.response?.status === 403) {
          setError('You do not have permission to view this action.');
        } else if (err.response?.status === 404) {
          setError('Action not found.');
        } else {
          setError('Unable to load action detail.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Phase 11: Fetch Safety Summary for this action
  useEffect(() => {
    let active = true;
    const loadSafety = async () => {
      try {
        const data = await getTaskSafetySummary('action', id);
        if (active) {
          setSafetySummary(data);
          setSafetyAcknowledged(data.hasAcknowledged || false);
        }
      } catch (err) {
        // Fallback to old endpoint
        try {
          const res = await api.get(`/my/safety-overview?siteId=${action?.siteId}`);
          if (active) setSafetySummary(res.data);
        } catch {}
      }
    };
    if (action?.siteId) loadSafety();
    return () => { active = false; };
  }, [action?.siteId, id]);

  // Phase 11: Handle safety acknowledgement callback
  const handleSafetyAcknowledge = ({ acknowledgedAt }) => {
    setSafetyAcknowledged(true);
  };

  const isAssignee = action?.assignedTo?.id === user?.id;
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  const canUpdateStatus = isAssignee || isManagerOrAdmin;

  // Phase 11: Check if marking as done is blocked
  const isDoneBlocked = requiresSafetyAck && status === 'done' && !safetyAcknowledged;

  const handleStatusSave = async () => {
    // Phase 11: Block marking done without safety ack
    if (isDoneBlocked) {
      setError('Safety acknowledgement required before marking high-priority actions as done.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/actions/${id}`, { status });
      setAction((prev) => ({ ...prev, status: res.data.status }));
    } catch (err) {
      // Phase 11: Handle SAFETY_ACK_REQUIRED error from backend
      if (err.response?.data?.code === 'SAFETY_ACK_REQUIRED') {
        setError('You must acknowledge the Safety Advisor before completing this action.');
      } else {
        setError('Unable to update status.');
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadgeClass = (s) => {
    switch (s) {
      case 'open': return 'badge status-open';
      case 'in_progress': return 'badge status-progress';
      case 'done': return 'badge status-done';
      case 'overdue': return 'badge status-overdue';
      default: return 'badge';
    }
  };

  const getSourceLink = () => {
    if (!action) return null;
    if (action.sourceType === 'incident') {
      return <Link to={`/incidents/${action.sourceId}`}>View Incident</Link>;
    }
    if (action.sourceType === 'inspection') {
      return <Link to={`/inspections/${action.sourceId}`}>View Inspection</Link>;
    }
    return null;
  };

  if (loading) return <LoadingState message="Loading action..." />;
  if (error && !action) return <ErrorState message={error} />;
  if (!action) return null;

  return (
    <div className="page action-detail-page">
      {/* Phase 11: Safety Advisor on mobile - shown at top */}
      <div className="mobile-safety-advisor">
        <SafetyAdvisorPanel
          siteId={action?.siteId}
          entityType="action"
          entityId={id}
          safetySummary={safetySummary}
          requiresAcknowledgement={requiresSafetyAck}
          hasAcknowledged={safetyAcknowledged}
          onAcknowledge={handleSafetyAcknowledge}
        />
      </div>

      <div className="detail-content-grid">
        <div className="detail-main">
          <div className="card detail-card">
            <div className="detail-header">
              <div>
                <h2>{action.title}</h2>
                <div className="muted">
                  {action.sourceType === 'incident' ? 'From Incident' : 'From Inspection'}
                </div>
              </div>
              <span className={getStatusBadgeClass(action.status)}>
                {action.status.replace('_', ' ')}
              </span>
            </div>

            <div className="detail-grid">
              <div>
                <div className="detail-label">Assigned To</div>
                <div>
                  {action.assignedTo
                    ? `${action.assignedTo.firstName} ${action.assignedTo.lastName}`
                    : '-'}
                </div>
              </div>
              <div>
                <div className="detail-label">Created By</div>
                <div>
                  {action.createdBy
                    ? `${action.createdBy.firstName} ${action.createdBy.lastName}`
                    : '-'}
                </div>
              </div>
              <div>
                <div className="detail-label">Due Date</div>
                <div>{formatDate(action.dueDate)}</div>
              </div>
              <div>
                <div className="detail-label">Source</div>
                <div>{getSourceLink()}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Description</div>
              <p>{action.description || 'No description provided.'}</p>
            </div>

            {/* Phase 11: Show safety acknowledgement status for high-priority */}
            {requiresSafetyAck && (
              <div className="detail-section">
                <div className="detail-label">Safety Status</div>
                {safetyAcknowledged ? (
                  <div className="safety-ack-success">
                    <span>✓</span> Safety Advisor acknowledged
                  </div>
                ) : (
                  <div className="safety-ack-warning">
                    <span>⚠️</span> Safety Advisor acknowledgement required for this high-priority action
                  </div>
                )}
              </div>
            )}

            <div className="detail-section">
              <div className="detail-label">Update Status</div>
              {/* Phase 11: Show warning if trying to mark done without ack */}
              {requiresSafetyAck && status === 'done' && !safetyAcknowledged && (
                <div className="safety-ack-warning">
                  <span>⚠️</span> You must acknowledge the Safety Advisor before marking this as done.
                </div>
              )}
              {error && <div className="error-text">{error}</div>}
              <div className="status-row">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={!canUpdateStatus}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="overdue">Overdue</option>
                </select>
                <button
                  className="btn primary"
                  onClick={handleStatusSave}
                  disabled={!canUpdateStatus || saving || isDoneBlocked}
                  title={isDoneBlocked ? 'Acknowledge Safety Advisor first' : ''}
                >
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
              {!canUpdateStatus && (
                <div className="muted">Only assignee or managers can update status.</div>
              )}
            </div>
          </div>

          <div className="detail-panels">
            <AttachmentsPanel entityType="action" entityId={id} />
            <ActivityLogPanel entityType="action" entityId={id} />
          </div>
        </div>

        {/* Phase 11: Safety Advisor on desktop - shown in right column */}
        <div className="detail-sidebar desktop-safety-advisor">
          <SafetyAdvisorPanel
            siteId={action?.siteId}
            entityType="action"
            entityId={id}
            safetySummary={safetySummary}
            requiresAcknowledgement={requiresSafetyAck}
            hasAcknowledged={safetyAcknowledged}
            onAcknowledge={handleSafetyAcknowledge}
          />
        </div>
      </div>
    </div>
  );
};

export default ActionDetailPage;
