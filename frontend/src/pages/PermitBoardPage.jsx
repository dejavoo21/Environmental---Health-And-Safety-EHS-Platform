import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPermitBoard, getPermitTypes, approvePermit, rejectPermit, 
         activatePermit, suspendPermit, closePermit } from '../api/permits';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PermitCard } from '../components/permits';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { Calendar, RefreshCcw } from 'lucide-react';
import './PermitBoardPage.css';

/**
 * Permit Board Page
 * Real-time permit board with active and pending permits
 * SCR-P7-PERM-01
 */

const PermitBoardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [permits, setPermits] = useState({ active: [], pending: [], approved: [] });
  const [sites, setSites] = useState([]);
  const [permitTypes, setPermitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [siteFilter, setSiteFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Modal states
  const [actionModal, setActionModal] = useState(null);
  const [actionPermit, setActionPermit] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  const canManage = user?.role === 'manager' || user?.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (siteFilter) params.siteId = siteFilter;
      if (typeFilter) params.permitTypeId = typeFilter;
      
      const data = await getPermitBoard(params);
      
      // Group permits by status
      const active = (data.permits || []).filter((p) => p.status === 'active');
      const pending = (data.permits || []).filter((p) => p.status === 'submitted');
      const approved = (data.permits || []).filter((p) => p.status === 'approved');
      
      setPermits({ active, pending, approved });
      setError('');
    } catch (err) {
      setError('Unable to load permit board.');
    }
  }, [siteFilter, typeFilter]);

  const loadFilters = async () => {
    try {
      const [sitesRes, typesRes] = await Promise.all([
        api.get('/sites'),
        getPermitTypes()
      ]);
      setSites(sitesRes.data.sites || []);
      setPermitTypes(typesRes.permitTypes || []);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    load();
  }, [loadData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleView = (permit) => {
    navigate(`/permits/${permit.id}`);
  };

  const openActionModal = (action, permit) => {
    setActionModal(action);
    setActionPermit(permit);
    setActionNotes('');
  };

  const closeActionModal = () => {
    setActionModal(null);
    setActionPermit(null);
    setActionNotes('');
  };

  const handleAction = async () => {
    if (!actionPermit) return;
    
    setActionProcessing(true);
    try {
      switch (actionModal) {
        case 'approve':
          await approvePermit(actionPermit.id, actionNotes);
          break;
        case 'reject':
          await rejectPermit(actionPermit.id, actionNotes);
          break;
        case 'activate':
          await activatePermit(actionPermit.id, new Date().toISOString());
          break;
        case 'suspend':
          await suspendPermit(actionPermit.id, actionNotes);
          break;
        case 'close':
          await closePermit(actionPermit.id, actionNotes, new Date().toISOString());
          break;
        default:
          break;
      }
      closeActionModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${actionModal} permit.`);
    } finally {
      setActionProcessing(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="page permit-board-page">
      <div className="page-header">
        <div className="header-left">
          <h2>Permit Board</h2>
          <span className="board-date">
            <Calendar size={16} />
            {today}
          </span>
        </div>
        <button className="btn primary" onClick={() => navigate('/permits/new')}>
          + New Permit
        </button>
      </div>

      <div className="filter-bar-v2">
        <div className="filter-group">
          <label>Site</label>
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {permitTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="auto-refresh-label">
              <RefreshCcw size={16} />
              Auto-refresh
            </span>
            <span className="auto-refresh-status">{autoRefresh ? 'On' : 'Off'}</span>
          </label>
        </div>
      </div>

      {loading && <LoadingState message="Loading permit board..." />}
      {error && <ErrorState message={error} />}
      
      {!loading && !error && (
        <div className="board-sections">
          {/* Active Permits */}
          <div className="board-section">
            <h3 className="section-title">
              <span className="status-dot active" />
              ACTIVE PERMITS ({permits.active.length})
            </h3>
            {permits.active.length === 0 ? (
              <p className="muted">No active permits.</p>
            ) : (
              <div className="permit-grid">
                {permits.active.map((permit) => (
                  <PermitCard
                    key={permit.id}
                    permit={permit}
                    onView={handleView}
                    onSuspend={(p) => openActionModal('suspend', p)}
                    onClose={(p) => openActionModal('close', p)}
                    canManage={canManage}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Approved Permits (Ready to Activate) */}
          {permits.approved.length > 0 && (
            <div className="board-section">
              <h3 className="section-title">
                <span className="status-dot approved" />
                READY TO ACTIVATE ({permits.approved.length})
              </h3>
              <div className="permit-grid">
                {permits.approved.map((permit) => (
                  <PermitCard
                    key={permit.id}
                    permit={permit}
                    onView={handleView}
                    onActivate={(p) => openActionModal('activate', p)}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending Approval */}
          {permits.pending.length > 0 && (
            <div className="board-section">
              <h3 className="section-title">
                <span className="status-dot pending" />
                PENDING APPROVAL ({permits.pending.length})
              </h3>
              <div className="permit-grid">
                {permits.pending.map((permit) => (
                  <PermitCard
                    key={permit.id}
                    permit={permit}
                    onView={handleView}
                    onApprove={(p) => openActionModal('approve', p)}
                    onReject={(p) => openActionModal('reject', p)}
                    canManage={canManage}
                  />
                ))}
              </div>
            </div>
          )}

          {permits.active.length === 0 && permits.approved.length === 0 && permits.pending.length === 0 && (
            <EmptyState message="No permits to display. Create a new permit to get started." />
          )}
        </div>
      )}

      {/* Action Modals */}
      {actionModal && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{actionModal.charAt(0).toUpperCase() + actionModal.slice(1)} Permit</h3>
              <button className="modal-close" onClick={closeActionModal} aria-label="Close">X</button>
            </div>
            <div className="modal-body">
              <p>
                You are {actionModal === 'approve' ? 'approving' : 
                         actionModal === 'reject' ? 'rejecting' :
                         actionModal === 'activate' ? 'activating' :
                         actionModal === 'suspend' ? 'suspending' :
                         'closing'}:
              </p>
              <p className="permit-summary">
                <strong>{actionPermit?.permitType?.name}</strong> - {actionPermit?.permitNumber}
              </p>
              
              {(actionModal === 'approve' || actionModal === 'reject' || 
                actionModal === 'suspend' || actionModal === 'close') && (
                <div className="form-group">
                  <label htmlFor="action-notes">
                    {actionModal === 'reject' ? 'Reason for Rejection *' : 'Notes'}
                  </label>
                  <textarea
                    id="action-notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                    placeholder={actionModal === 'reject' ? 'Provide reason...' : 'Optional notes...'}
                    required={actionModal === 'reject'}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeActionModal}>Cancel</button>
              <button 
                className={`btn ${actionModal === 'reject' ? 'danger' : 'primary'}`}
                onClick={handleAction}
                disabled={actionProcessing || (actionModal === 'reject' && !actionNotes.trim())}
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

export default PermitBoardPage;



