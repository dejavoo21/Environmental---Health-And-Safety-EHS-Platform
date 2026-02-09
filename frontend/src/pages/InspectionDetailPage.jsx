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
// Phase 11: Safety Advisor API
import { getTaskSafetySummary } from '../api/safetyAdvisor';

// P2-J2, P2-J6, P2-J9: Inspection detail with attachments, actions, activity log
// Phase 11: High-risk workflow enforcement (TC-276-1, TC-276-2)
const InspectionDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState(null);
  const [actionsKey, setActionsKey] = useState(0);
  // Phase 11: Safety Advisor state
  const [safetySummary, setSafetySummary] = useState(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [requiresSafetyAck, setRequiresSafetyAck] = useState(false);

  const canCreateAction = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/inspections/${id}`);
        setInspection(res.data);
        // Phase 11: Check if high-risk (critical finding or template flag)
        const hasFailedItems = res.data.responses?.some(r => r.result === 'fail');
        const isHighRisk = res.data.overallResult === 'fail' ||
                          hasFailedItems ||
                          res.data.template?.requiresSafetyAcknowledgement;
        setRequiresSafetyAck(isHighRisk);
      } catch (err) {
        setError('Unable to load inspection detail.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Phase 11: Fetch Safety Summary for this inspection
  useEffect(() => {
    let active = true;
    const loadSafety = async () => {
      try {
        const data = await getTaskSafetySummary('inspection', id);
        if (active) {
          setSafetySummary(data);
          setSafetyAcknowledged(data.hasAcknowledged || false);
        }
      } catch (err) {
        // Fallback to old endpoint
        try {
          const res = await api.get(`/my/safety-overview?siteId=${inspection?.site?.id}`);
          if (active) setSafetySummary(res.data);
        } catch {}
      }
    };
    if (inspection?.site?.id) loadSafety();
    return () => { active = false; };
  }, [inspection?.site?.id, id]);

  // Phase 11: Handle safety acknowledgement callback
  const handleSafetyAcknowledge = ({ acknowledgedAt }) => {
    setSafetyAcknowledged(true);
  };

  const handleCreateActionFromResponse = (responseId) => {
    setSelectedResponseId(responseId);
    setShowCreateAction(true);
  };

  const handleActionCreated = () => {
    setShowCreateAction(false);
    setSelectedResponseId(null);
    setActionsKey((k) => k + 1);
  };

  if (loading) return <LoadingState message="Loading inspection..." />;
  if (error) return <ErrorState message={error} />;
  if (!inspection) return null;

  return (
    <div className="page inspection-detail-page">
      {/* Phase 11: Safety Advisor on mobile - shown at top */}
      <div className="mobile-safety-advisor">
        <SafetyAdvisorPanel
          siteId={inspection?.site?.id}
          entityType="inspection"
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
                <h2>{inspection.template?.name}</h2>
                <div className="muted">{inspection.site?.name}</div>
              </div>
              <div className="badge">{inspection.overallResult}</div>
            </div>

            <div className="detail-grid">
              <div>
                <div className="detail-label">Performed By</div>
                <div>{inspection.performedBy?.name}</div>
              </div>
              <div>
                <div className="detail-label">Performed At</div>
                <div>{new Date(inspection.performedAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-label">Notes</div>
              <p>{inspection.notes || 'No notes provided.'}</p>
            </div>

            {/* Phase 11: Show safety acknowledgement status for high-risk */}
            {requiresSafetyAck && (
              <div className="detail-section">
                <div className="detail-label">Safety Status</div>
                {safetyAcknowledged ? (
                  <div className="safety-ack-success">
                    <span>✓</span> Safety Advisor acknowledged
                  </div>
                ) : (
                  <div className="safety-ack-warning">
                    <span>⚠️</span> Safety Advisor acknowledgement required for this inspection with findings
                  </div>
                )}
              </div>
            )}

            <div className="detail-section">
              <h4>Responses</h4>
              {inspection.responses?.map((response) => (
                <div key={response.id} className="checklist-item">
                  <div>
                    <div className="item-label">{response.templateItem?.label}</div>
                    <div className="muted">{response.templateItem?.category || 'General'}</div>
                  </div>
                  <div className="item-actions">
                    <span className="badge small">{response.result}</span>
                    <span className="muted">{response.comment || 'No comment'}</span>
                    {canCreateAction && response.result === 'fail' && (
                      <button
                        className="btn ghost small"
                        onClick={() => handleCreateActionFromResponse(response.id)}
                      >
                        Create Action
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-panels">
            <ActionsPanel
              key={actionsKey}
              sourceType="inspection"
              sourceId={id}
              onCreateAction={() => setShowCreateAction(true)}
            />
            <AttachmentsPanel entityType="inspection" entityId={id} />
            <ActivityLogPanel entityType="inspection" entityId={id} />
          </div>
        </div>

        {/* Phase 11: Safety Advisor on desktop - shown in right column */}
        <div className="detail-sidebar desktop-safety-advisor">
          <SafetyAdvisorPanel
            siteId={inspection?.site?.id}
            entityType="inspection"
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
          sourceType="inspection"
          sourceId={id}
          linkedResponseId={selectedResponseId}
          onClose={() => {
            setShowCreateAction(false);
            setSelectedResponseId(null);
          }}
          onCreated={handleActionCreated}
        />
      )}
    </div>
  );
};

export default InspectionDetailPage;
