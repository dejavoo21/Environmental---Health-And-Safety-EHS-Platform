import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState } from '../components/States';
import AttachmentsPanel from '../components/AttachmentsPanel';
import ActivityLogPanel from '../components/ActivityLogPanel';
import ActionsPanel from '../components/ActionsPanel';
import CreateActionModal from '../components/CreateActionModal';
import SafetyAdvisorPanel from '../components/safety/SafetyAdvisorPanel';
// Phase 7: Chemical & Permit Integration
import { LinkedChemicalsPanel, LinkedPermitsPanel } from '../components/incidents';
// Phase 11: Safety Advisor API
import { getTaskSafetySummary } from '../api/safetyAdvisor';

// P2-J1, P2-J5, P2-J8: Incident detail with attachments, actions, activity log
// Phase 11: High-risk workflow enforcement (TC-276-1, TC-276-2)
const IncidentDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [actionsKey, setActionsKey] = useState(0);
  // Phase 7: Linked entities
  const [linkedChemicals, setLinkedChemicals] = useState([]);
  const [linkedPermits, setLinkedPermits] = useState([]);
  // Phase 11: Safety Advisor state
  const [safetySummary, setSafetySummary] = useState(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [requiresSafetyAck, setRequiresSafetyAck] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/incidents/${id}`);
        setIncident(res.data);
        setStatus(res.data.status);
        // Phase 11: Check if high-risk (high/critical severity or type flag)
        const isHighRisk = ['high', 'critical'].includes(res.data.severity?.toLowerCase()) ||
                          res.data.incidentType?.requiresSafetyAcknowledgement;
        setRequiresSafetyAck(isHighRisk);
        // Phase 7: Load linked entities
        loadLinkedEntities();
      } catch (err) {
        setError('Unable to load incident detail.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Phase 7: Load linked chemicals and permits
  const loadLinkedEntities = async () => {
    try {
      const [chemRes, permitRes] = await Promise.all([
        api.get(`/incidents/${id}/chemicals`).catch(() => ({ data: { chemicals: [] } })),
        api.get(`/incidents/${id}/permits`).catch(() => ({ data: { permits: [] } }))
      ]);
      setLinkedChemicals(chemRes.data?.chemicals || []);
      setLinkedPermits(permitRes.data?.permits || []);
    } catch (err) {
      console.error('Failed to load linked entities:', err);
    }
  };

  // Phase 11: Fetch Safety Summary for this incident
  useEffect(() => {
    let active = true;
    const loadSafety = async () => {
      try {
        const data = await getTaskSafetySummary('incident', id);
        if (active) {
          setSafetySummary(data);
          setSafetyAcknowledged(data.hasAcknowledged || false);
        }
      } catch (err) {
        // Fallback to old endpoint
        try {
          const res = await api.get(`/my/safety-overview?siteId=${incident?.site?.id}`);
          if (active) setSafetySummary(res.data);
        } catch {}
      }
    };
    if (incident?.site?.id) loadSafety();
    return () => { active = false; };
  }, [incident?.site?.id, id]);

  const canUpdateStatus = user?.role === 'manager' || user?.role === 'admin';

  // Phase 11: Handle safety acknowledgement callback
  const handleSafetyAcknowledge = ({ acknowledgedAt }) => {
    setSafetyAcknowledged(true);
  };

  // Phase 11: Check if closing is blocked by missing safety ack
  const isCloseBlocked = requiresSafetyAck && status === 'closed' && !safetyAcknowledged;

  const handleStatusSave = async () => {
    // Phase 11: Block closing high-severity incidents without ack
    if (isCloseBlocked) {
      setError('Safety acknowledgement required before closing high-severity incidents.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/incidents/${id}`, { status });
      setIncident((prev) => ({ ...prev, status: res.data.status }));
    } catch (err) {
      // Phase 11: Handle SAFETY_ACK_REQUIRED error from backend
      if (err.response?.data?.code === 'SAFETY_ACK_REQUIRED') {
        setError('You must acknowledge the Safety Advisor before closing this incident.');
      } else {
        setError('Unable to update status.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleActionCreated = () => {
    setShowCreateAction(false);
    setActionsKey((k) => k + 1);
  };

  if (loading) return <LoadingState message="Loading incident..." />;
  if (error && !incident) return <ErrorState message={error} />;
  if (!incident) return null;

  return (
    <div className="page incident-detail-page">
      {/* Phase 11: Safety Advisor on mobile - shown at top */}
      <div className="mobile-safety-advisor">
        <SafetyAdvisorPanel
          siteId={incident?.site?.id}
          entityType="incident"
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
                <h2>{incident.title}</h2>
                <div className="muted">{incident.site?.name} - {incident.incidentType?.name}</div>
              </div>
              <div className="badge">{incident.severity}</div>
            </div>

            <div className="detail-grid">
              <div>
                <div className="detail-label">Occurred</div>
                <div>{new Date(incident.occurredAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="detail-label">Reported By</div>
                <div>{incident.reportedBy?.name}</div>
              </div>
              <div>
                <div className="detail-label">Status</div>
                <div>{incident.status}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Description</div>
              <p>{incident.description || 'No description provided.'}</p>
            </div>

            <div className="detail-section">
              <div className="detail-label">Update Status</div>
              {/* Phase 11: Show warning if trying to close without ack */}
              {requiresSafetyAck && status === 'closed' && !safetyAcknowledged && (
                <div className="safety-ack-warning">
                  <span>⚠️</span> You must acknowledge the Safety Advisor before closing this high-severity incident.
                </div>
              )}
              {error && <div className="error-text">{error}</div>}
              <div className="status-row">
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canUpdateStatus}>
                  <option value="open">Open</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  className="btn primary"
                  onClick={handleStatusSave}
                  disabled={!canUpdateStatus || saving || isCloseBlocked}
                  title={isCloseBlocked ? 'Acknowledge Safety Advisor first' : ''}
                >
                  {saving ? 'Saving...' : 'Update'}
                </button>
              </div>
              {!canUpdateStatus && <div className="muted">Only managers or admins can update status.</div>}
            </div>
          </div>

          <div className="detail-panels">
            <ActionsPanel
              key={actionsKey}
              sourceType="incident"
              sourceId={id}
              onCreateAction={() => setShowCreateAction(true)}
            />
            {/* Phase 7: Linked Chemicals and Permits */}
            <LinkedChemicalsPanel
              incidentId={id}
              linkedChemicals={linkedChemicals}
              onUpdate={loadLinkedEntities}
              readOnly={incident?.status === 'closed'}
            />
            <LinkedPermitsPanel
              incidentId={id}
              linkedPermits={linkedPermits}
              onUpdate={loadLinkedEntities}
              readOnly={incident?.status === 'closed'}
            />
            <AttachmentsPanel entityType="incident" entityId={id} />
            <ActivityLogPanel entityType="incident" entityId={id} />
          </div>
        </div>

        {/* Phase 11: Safety Advisor on desktop - shown in right column */}
        <div className="detail-sidebar desktop-safety-advisor">
          <SafetyAdvisorPanel
            siteId={incident?.site?.id}
            entityType="incident"
            entityId={id}
            safetySummary={safetySummary}
            requiresAcknowledgement={requiresSafetyAck}
            hasAcknowledged={safetyAcknowledged}
            onAcknowledge={handleSafetyAcknowledge}
          />
        </div>
      </div>

      {showCreateAction && (
        <CreateActionModal
          sourceType="incident"
          sourceId={id}
          onClose={() => setShowCreateAction(false)}
          onCreated={handleActionCreated}
        />
      )}
    </div>
  );
};

export default IncidentDetailPage;
