import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPermits, linkPermitToIncident, PERMIT_STATUSES } from '../../api/permits';
import api from '../../api/client';
import { PermitStatusBadge, CountdownBadge } from '../permits';
import AppIcon from '../AppIcon';
import './LinkedPermitsPanel.css';

/**
 * LinkedPermitsPanel
 * Display and manage permits linked to an incident
 * Used in IncidentDetailPage
 */

const LinkedPermitsPanel = ({ incidentId, linkedPermits = [], onUpdate, readOnly = false }) => {
  const navigate = useNavigate();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkNotes, setLinkNotes] = useState('');
  const [selectedPermit, setSelectedPermit] = useState(null);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getPermits({ search: query, limit: 10 });
      // Filter out already linked permits
      const linkedIds = linkedPermits.map((p) => p.id);
      const filtered = (data.permits || []).filter((p) => !linkedIds.includes(p.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error('Failed to search permits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedPermit) return;

    setLoading(true);
    try {
      await linkPermitToIncident(selectedPermit.id, incidentId, linkNotes);
      setShowLinkModal(false);
      setSelectedPermit(null);
      setSearchQuery('');
      setLinkNotes('');
      onUpdate?.();
    } catch (err) {
      console.error('Failed to link permit:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (permitId) => {
    if (!window.confirm('Remove this permit from the incident?')) return;

    try {
      await api.delete(`/permits/${permitId}/incidents/${incidentId}`);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to unlink permit:', err);
    }
  };

  const viewPermit = (permitId) => {
    navigate(`/permits/${permitId}`);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="linked-permits-panel">
      <div className="panel-header">
        <h4>
          <span className="inline-icon">
            <AppIcon name="clipboard" size={16} />
            Linked Permits ({linkedPermits.length})
          </span>
        </h4>
        {!readOnly && (
          <button className="btn ghost small" onClick={() => setShowLinkModal(true)}>
            + Link Permit
          </button>
        )}
      </div>

      {linkedPermits.length === 0 ? (
        <p className="empty-message">No permits linked to this incident.</p>
      ) : (
        <div className="permits-list">
          {linkedPermits.map((permit) => (
            <div key={permit.id} className="permit-item">
              <div className="permit-info" onClick={() => viewPermit(permit.id)}>
                <div className="permit-header">
                  <span className="permit-number">
                    <AppIcon name={permit.permitType?.icon || 'clipboard'} size={16} /> {permit.permitNumber}
                  </span>
                  <PermitStatusBadge status={permit.status} size="small" />
                </div>
                <div className="permit-meta">
                  <span className="permit-type">{permit.permitType?.name || 'Permit'}</span>
                  {permit.status === 'active' && permit.endTime && (
                    <CountdownBadge targetDate={permit.endTime} />
                  )}
                </div>
                <div className="permit-schedule">
                  {formatDateTime(permit.startTime)} - {formatDateTime(permit.endTime)}
                </div>
              </div>
              {!readOnly && (
                <button
                  className="unlink-btn"
                  onClick={(e) => { e.stopPropagation(); handleUnlink(permit.id); }}
                  title="Remove link"
                  aria-label="Remove link"
                >
                  X
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Link Permit to Incident</h3>
              <button className="modal-close" onClick={() => setShowLinkModal(false)} aria-label="Close">
                X
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="permit-search">Search Permits</label>
                <input
                  type="text"
                  id="permit-search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by permit number..."
                />
              </div>

              {loading && <p className="searching">Searching...</p>}

              {searchResults.length > 0 && !selectedPermit && (
                <div className="search-results">
                  {searchResults.map((permit) => (
                    <div
                      key={permit.id}
                      className="search-result-item"
                      onClick={() => setSelectedPermit(permit)}
                    >
                      <div className="result-header">
                        <span>
                          <AppIcon name={permit.permitType?.icon || 'clipboard'} size={16} /> {permit.permitNumber}
                        </span>
                        <PermitStatusBadge status={permit.status} size="small" />
                      </div>
                      <div className="result-meta">
                        {permit.permitType?.name} - {permit.site?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPermit && (
                <div className="selected-permit">
                  <div className="selected-header">
                    <span>Selected:</span>
                    <button className="change-btn" onClick={() => setSelectedPermit(null)}>
                      Change
                    </button>
                  </div>
                  <div className="selected-info">
                    <strong>
                      <AppIcon name={selectedPermit.permitType?.icon || 'clipboard'} size={16} /> {selectedPermit.permitNumber}
                    </strong>
                    <span> - {selectedPermit.permitType?.name}</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="link-notes">Notes (Optional)</label>
                    <textarea
                      id="link-notes"
                      value={linkNotes}
                      onChange={(e) => setLinkNotes(e.target.value)}
                      placeholder="How was this permit related to the incident?"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button
                className="btn primary"
                onClick={handleLink}
                disabled={!selectedPermit || loading}
              >
                {loading ? 'Linking...' : 'Link Permit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedPermitsPanel;
