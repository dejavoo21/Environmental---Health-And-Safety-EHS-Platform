import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPermit, getPermitControls, completeControl, approvePermit,
         rejectPermit, activatePermit, suspendPermit, resumePermit,
         closePermit, cancelPermit, getPermitHistory } from '../api/permits';
import { useAuth } from '../auth/AuthContext';
import { PermitStatusBadge, CountdownBadge, ControlChecklistTabs,
         StateHistoryTimeline } from '../components/permits';
import { LoadingState, ErrorState } from '../components/States';
import AppIcon from '../components/AppIcon';
import './PermitDetailPage.css';
import SafetyAdvisorPanel from '../components/safety/SafetyAdvisorPanel';
// Phase 11: Safety Advisor API
import { getTaskSafetySummary } from '../api/safetyAdvisor';
import api from '../api/client';

/**
 * Permit Detail Page
 * View permit details with controls, workers, and history
 * SCR-P7-PERM-03
 * Phase 11: High-risk workflow enforcement (TC-276-1, TC-276-2)
 */

const PermitDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [permit, setPermit] = useState(null);
  const [controls, setControls] = useState([]);
  const [stateHistory, setStateHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('controls');

  // Action modal
  const [actionModal, setActionModal] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Phase 11: Safety Advisor state
  const [safetySummary, setSafetySummary] = useState(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [requiresSafetyAck, setRequiresSafetyAck] = useState(false);

  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const isAuthor = permit?.requestedById === user?.id;

  useEffect(() => {
    loadPermit();
  }, [id]);

  const loadPermit = async () => {
    setLoading(true);
    try {
      const [permitData, controlsData, historyData] = await Promise.all([
        getPermit(id),
        getPermitControls(id),
        getPermitHistory(id)
      ]);
      setPermit(permitData.permit);
      setControls(controlsData.controls || []);
      setStateHistory(historyData.history || []);
      setError('');

      // Phase 11: Check if high-risk (hot work, confined space, or permit type flag)
      const isHighRiskType = ['hot_work', 'confined_space', 'electrical', 'excavation']
        .includes(permitData.permit?.permitType?.code?.toLowerCase());
      const isHighRisk = isHighRiskType || permitData.permit?.permitType?.requiresSafetyAcknowledgement;
      setRequiresSafetyAck(isHighRisk);
    } catch (err) {
      setError('Unable to load permit details.');
    } finally {
      setLoading(false);
    }
  };

  // Phase 11: Fetch Safety Summary for this permit
  useEffect(() => {
    let active = true;
    const loadSafety = async () => {
      try {
        const data = await getTaskSafetySummary('permit', id);
        if (active) {
          setSafetySummary(data);
          setSafetyAcknowledged(data.hasAcknowledged || false);
        }
      } catch (err) {
        // Fallback to old endpoint
        try {
          const res = await api.get(`/my/safety-overview?siteId=${permit?.site?.id}`);
          if (active) setSafetySummary(res.data);
        } catch {}
      }
    };
    if (permit?.site?.id) loadSafety();
    return () => { active = false; };
  }, [permit?.site?.id, id]);

  // Phase 11: Handle safety acknowledgement callback
  const handleSafetyAcknowledge = ({ acknowledgedAt }) => {
    setSafetyAcknowledged(true);
  };

  const handleControlComplete = async (controlId, completed, notes) => {
    try {
      await completeControl(id, controlId, completed, notes);
      await loadPermit();
    } catch (err) {
      setError('Failed to update control.');
    }
  };

  const openActionModal = (action) => {
    setActionModal(action);
    setActionNotes('');
  };

  const closeActionModal = () => {
    setActionModal(null);
    setActionNotes('');
  };

  // Phase 11: Check if action is blocked by missing safety ack
  const isActionBlocked = (action) => {
    // Block close and activate for high-risk permits without ack
    return requiresSafetyAck &&
           !safetyAcknowledged &&
           ['close', 'activate'].includes(action);
  };

  const handleAction = async () => {
    // Phase 11: Block actions without safety ack
    if (isActionBlocked(actionModal)) {
      setError('Safety acknowledgement required before proceeding with high-risk permits.');
      return;
    }

    setActionProcessing(true);
    try {
      switch (actionModal) {
        case 'approve':
          await approvePermit(id, actionNotes);
          break;
        case 'reject':
          await rejectPermit(id, actionNotes);
          break;
        case 'activate':
          await activatePermit(id, new Date().toISOString());
          break;
        case 'suspend':
          await suspendPermit(id, actionNotes);
          break;
        case 'resume':
          await resumePermit(id, actionNotes);
          break;
        case 'close':
          await closePermit(id, actionNotes, new Date().toISOString());
          break;
        case 'cancel':
          await cancelPermit(id, actionNotes);
          break;
        default:
          break;
      }
      closeActionModal();
      await loadPermit();
    } catch (err) {
      // Phase 11: Handle SAFETY_ACK_REQUIRED error from backend
      if (err.response?.data?.code === 'SAFETY_ACK_REQUIRED') {
        setError('You must acknowledge the Safety Advisor before proceeding.');
      } else {
        setError(err.response?.data?.message || `Failed to ${actionModal} permit.`);
      }
    } finally {
      setActionProcessing(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvailableActions = () => {
    if (!permit) return [];
    const actions = [];

    switch (permit.status) {
      case 'draft':
        if (isAuthor) actions.push({ key: 'submit', label: 'Submit for Approval', type: 'primary' });
        if (isAuthor) actions.push({ key: 'cancel', label: 'Cancel', type: 'danger' });
        break;
      case 'submitted':
        if (canManage) actions.push({ key: 'approve', label: 'Approve', type: 'success' });
        if (canManage) actions.push({ key: 'reject', label: 'Reject', type: 'danger' });
        if (isAuthor) actions.push({ key: 'cancel', label: 'Cancel', type: 'ghost' });
        break;
      case 'approved':
        if (canManage) actions.push({ key: 'activate', label: 'Activate Now', type: 'primary' });
        if (canManage) actions.push({ key: 'cancel', label: 'Cancel', type: 'danger' });
        break;
      case 'active':
        if (canManage) actions.push({ key: 'suspend', label: 'Suspend', type: 'warning' });
        if (canManage) actions.push({ key: 'close', label: 'Close Permit', type: 'success' });
        break;
      case 'suspended':
        if (canManage) actions.push({ key: 'resume', label: 'Resume', type: 'primary' });
        if (canManage) actions.push({ key: 'cancel', label: 'Cancel', type: 'danger' });
        break;
      default:
        break;
    }

    return actions;
  };

  if (loading) return <LoadingState message="Loading permit..." />;
  if (error && !permit) return <ErrorState message={error} />;

  const availableActions = getAvailableActions();
  const preWorkControls = controls.filter((c) => c.phase === 'pre_work');
  const duringWorkControls = controls.filter((c) => c.phase === 'during_work');
  const closeOutControls = controls.filter((c) => c.phase === 'close_out');

  return (
    <div className="page permit-detail-page">
      {/* Phase 11: Safety Advisor on mobile - shown at top */}
      <div className="mobile-safety-advisor">
        <SafetyAdvisorPanel
          siteId={permit?.site?.id}
          entityType="permit"
          entityId={id}
          safetySummary={safetySummary}
          requiresAcknowledgement={requiresSafetyAck}
          hasAcknowledged={safetyAcknowledged}
          onAcknowledge={handleSafetyAcknowledge}
        />
      </div>

      <div className="detail-content-grid">
        <div className="detail-main">
          {/* Header */}
          <div className="page-header">
            <div className="header-left">
              <button className="btn ghost" onClick={() => navigate(-1)}>← Back</button>
              <div className="permit-title">
                <h2>
                  <AppIcon name={permit?.permitType?.icon || 'clipboard'} size={16} /> {permit?.permitNumber}
                </h2>
                <span className="permit-type-name">{permit?.permitType?.name}</span>
              </div>
            </div>
            <div className="header-right">
              <PermitStatusBadge status={permit?.status} size="large" />
              {(permit?.status === 'active' || permit?.status === 'approved') && permit?.endTime && (
                <CountdownBadge targetDate={permit.endTime} label="Expires" />
              )}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* Phase 11: Safety acknowledgement warning for high-risk permits */}
          {requiresSafetyAck && !safetyAcknowledged && (
            <div className="safety-ack-warning-banner">
              <span>⚠️</span> This is a high-risk permit. Safety Advisor acknowledgement is required before activation or closure.
            </div>
          )}

          {/* Action Buttons */}
          {availableActions.length > 0 && (
            <div className="actions-bar">
              {availableActions.map((action) => (
                <button
                  key={action.key}
                  className={`btn ${action.type}`}
                  onClick={() => openActionModal(action.key)}
                  disabled={isActionBlocked(action.key)}
                  title={isActionBlocked(action.key) ? 'Acknowledge Safety Advisor first' : ''}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Info Cards */}
          <div className="info-grid">
            <div className="info-card">
              <h4><span className="inline-icon"><AppIcon name="mappin" size={16} />Location</span></h4>
              <p className="site-name">{permit?.site?.name || '-'}</p>
              <p className="location-detail">{permit?.location || '-'}</p>
            </div>

            <div className="info-card">
              <h4><span className="inline-icon"><AppIcon name="document" size={16} />Work Description</span></h4>
              <p>{permit?.workDescription || '-'}</p>
            </div>

            <div className="info-card">
              <h4>Schedule</h4>
              <p><strong>Start:</strong> {formatDateTime(permit?.startTime)}</p>
              <p><strong>End:</strong> {formatDateTime(permit?.endTime)}</p>
              {permit?.actualStartTime && (
                <p><strong>Actual Start:</strong> {formatDateTime(permit?.actualStartTime)}</p>
              )}
              {permit?.actualEndTime && (
                <p><strong>Actual End:</strong> {formatDateTime(permit?.actualEndTime)}</p>
              )}
            </div>

            <div className="info-card">
              <h4><span className="inline-icon"><AppIcon name="user" size={16} />Requested By</span></h4>
              <p className="requester-name">{permit?.requestedBy?.fullName || '-'}</p>
              <p className="requester-email">{permit?.requestedBy?.email}</p>
              <p className="request-date">on {formatDateTime(permit?.createdAt)}</p>
            </div>
          </div>

          {/* Workers */}
          {permit?.workers && permit.workers.length > 0 && (
            <div className="section-card">
              <h3><span className="inline-icon"><AppIcon name="users" size={16} />Authorized Workers ({permit.workers.length})</span></h3>
              <div className="workers-list">
                {permit.workers.map((worker, idx) => (
                  <div key={idx} className="worker-badge">
                    <span className="worker-name">{worker.name || worker.fullName}</span>
                    {worker.role && <span className="worker-role">{worker.role}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
                onClick={() => setActiveTab('controls')}
              >
                <span className="inline-icon"><AppIcon name="check" size={16} />Controls</span> ({controls.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="inline-icon"><AppIcon name="document" size={16} />History</span> ({stateHistory.length})
              </button>
              {permit?.hazards && (
                <button
                  className={`tab-btn ${activeTab === 'hazards' ? 'active' : ''}`}
                  onClick={() => setActiveTab('hazards')}
                >
                  <span className="inline-icon"><AppIcon name="warning" size={16} />Hazards</span>
                </button>
              )}
            </div>

            <div className="tab-content">
              {activeTab === 'controls' && (
                <ControlChecklistTabs
                  preWorkControls={preWorkControls}
                  duringWorkControls={duringWorkControls}
                  closeOutControls={closeOutControls}
                  onControlComplete={handleControlComplete}
                  readOnly={permit?.status === 'closed' || permit?.status === 'cancelled' || permit?.status === 'expired'}
                />
              )}

              {activeTab === 'history' && (
                <StateHistoryTimeline history={stateHistory} />
              )}

              {activeTab === 'hazards' && (
                <div className="hazards-content">
                  <pre>{JSON.stringify(permit?.hazards, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Linked Entities */}
          {(permit?.linkedIncidentId || permit?.linkedChemicalIds?.length > 0) && (
            <div className="section-card">
              <h3><span className="inline-icon"><AppIcon name="link" size={16} />Linked Entities</span></h3>
              <div className="linked-list">
                {permit?.linkedIncidentId && (
                  <button
                    className="linked-item"
                    onClick={() => navigate(`/incidents/${permit.linkedIncidentId}`)}
                  >
                    <span className="inline-icon"><AppIcon name="clipboard" size={16} />Linked Incident</span>
                  </button>
                )}
                {permit?.linkedChemicalIds?.map((chemId) => (
                  <button
                    key={chemId}
                    className="linked-item"
                    onClick={() => navigate(`/chemicals/${chemId}`)}
                  >
                    <span className="inline-icon"><AppIcon name="flask" size={16} />Linked Chemical</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phase 11: Safety Advisor on desktop - shown in right column */}
        <div className="detail-sidebar desktop-safety-advisor">
          <SafetyAdvisorPanel
            siteId={permit?.site?.id}
            entityType="permit"
            entityId={id}
            safetySummary={safetySummary}
            requiresAcknowledgement={requiresSafetyAck}
            hasAcknowledged={safetyAcknowledged}
            onAcknowledge={handleSafetyAcknowledge}
          />
        </div>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionModal.charAt(0).toUpperCase() + actionModal.slice(1)} Permit</h3>
              <button className="modal-close" onClick={closeActionModal} aria-label="Close">X</button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to {actionModal} this permit?
              </p>
              <p className="permit-summary">
                <strong>{permit?.permitType?.name}</strong> - {permit?.permitNumber}
              </p>

              {/* Phase 11: Show warning in modal for high-risk permits */}
              {requiresSafetyAck && !safetyAcknowledged && ['close', 'activate'].includes(actionModal) && (
                <div className="safety-ack-warning">
                  <span>⚠️</span> You must acknowledge the Safety Advisor before proceeding.
                </div>
              )}

              {['approve', 'reject', 'suspend', 'resume', 'close', 'cancel'].includes(actionModal) && (
                <div className="form-group">
                  <label htmlFor="action-notes">
                    {actionModal === 'reject' || actionModal === 'cancel' ? 'Reason *' : 'Notes'}
                  </label>
                  <textarea
                    id="action-notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                    placeholder={actionModal === 'reject' || actionModal === 'cancel' ? 'Provide reason...' : 'Optional notes...'}
                    required={actionModal === 'reject' || actionModal === 'cancel'}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeActionModal}>Cancel</button>
              <button
                className={`btn ${actionModal === 'reject' || actionModal === 'cancel' ? 'danger' : 'primary'}`}
                onClick={handleAction}
                disabled={actionProcessing ||
                         ((actionModal === 'reject' || actionModal === 'cancel') && !actionNotes.trim()) ||
                         isActionBlocked(actionModal)}
              >
                {actionProcessing ? 'Processing...' : actionModal.charAt(0).toUpperCase() + actionModal.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitDetailPage;
