import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChemicals, linkChemicalToIncident, GHS_HAZARD_CLASSES } from '../../api/chemicals';
import api from '../../api/client';
import { GHSHazardIcons, ChemicalStatusBadge } from '../chemicals';
import AppIcon from '../AppIcon';
import './LinkedChemicalsPanel.css';

/**
 * LinkedChemicalsPanel
 * Display and manage chemicals linked to an incident
 * Used in IncidentDetailPage
 */

const LinkedChemicalsPanel = ({ incidentId, linkedChemicals = [], onUpdate, readOnly = false }) => {
  const navigate = useNavigate();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkNotes, setLinkNotes] = useState('');
  const [selectedChemical, setSelectedChemical] = useState(null);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getChemicals({ search: query, limit: 10 });
      // Filter out already linked chemicals
      const linkedIds = linkedChemicals.map((c) => c.id);
      const filtered = (data.chemicals || []).filter((c) => !linkedIds.includes(c.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error('Failed to search chemicals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedChemical) return;

    setLoading(true);
    try {
      await linkChemicalToIncident(selectedChemical.id, incidentId, linkNotes);
      setShowLinkModal(false);
      setSelectedChemical(null);
      setSearchQuery('');
      setLinkNotes('');
      onUpdate?.();
    } catch (err) {
      console.error('Failed to link chemical:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (chemicalId) => {
    if (!window.confirm('Remove this chemical from the incident?')) return;

    try {
      await api.delete(`/chemicals/${chemicalId}/incidents/${incidentId}`);
      onUpdate?.();
    } catch (err) {
      console.error('Failed to unlink chemical:', err);
    }
  };

  const viewChemical = (chemicalId) => {
    navigate(`/chemicals/${chemicalId}`);
  };

  return (
    <div className="linked-chemicals-panel">
      <div className="panel-header">
        <h4>
          <span className="inline-icon">
            <AppIcon name="flask" size={16} />
            Linked Chemicals ({linkedChemicals.length})
          </span>
        </h4>
        {!readOnly && (
          <button className="btn ghost small" onClick={() => setShowLinkModal(true)}>
            + Link Chemical
          </button>
        )}
      </div>

      {linkedChemicals.length === 0 ? (
        <p className="empty-message">No chemicals linked to this incident.</p>
      ) : (
        <div className="chemicals-list">
          {linkedChemicals.map((chemical) => (
            <div key={chemical.id} className="chemical-item">
              <div className="chemical-info" onClick={() => viewChemical(chemical.id)}>
                <div className="chemical-name">{chemical.productName}</div>
                <div className="chemical-meta">
                  <span className="cas-number">{chemical.casNumber || 'No CAS'}</span>
                  <ChemicalStatusBadge status={chemical.status} />
                </div>
                {chemical.ghsHazardClasses?.length > 0 && (
                  <GHSHazardIcons 
                    hazardClasses={chemical.ghsHazardClasses} 
                    size="small" 
                    maxDisplay={4}
                  />
                )}
              </div>
              {!readOnly && (
                <button 
                  className="unlink-btn"
                  onClick={(e) => { e.stopPropagation(); handleUnlink(chemical.id); }}
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
              <h3>Link Chemical to Incident</h3>
              <button className="modal-close" onClick={() => setShowLinkModal(false)} aria-label="Close">
                X
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="chemical-search">Search Chemicals</label>
                <input
                  type="text"
                  id="chemical-search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name or CAS number..."
                />
              </div>

              {loading && <p className="searching">Searching...</p>}

              {searchResults.length > 0 && !selectedChemical && (
                <div className="search-results">
                  {searchResults.map((chem) => (
                    <div 
                      key={chem.id} 
                      className="search-result-item"
                      onClick={() => setSelectedChemical(chem)}
                    >
                      <div className="result-name">{chem.productName}</div>
                      <div className="result-meta">
                        {chem.casNumber && <span>{chem.casNumber}</span>}
                        {chem.manufacturer && <span>- {chem.manufacturer}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedChemical && (
                <div className="selected-chemical">
                  <div className="selected-header">
                    <span>Selected:</span>
                    <button className="change-btn" onClick={() => setSelectedChemical(null)}>
                      Change
                    </button>
                  </div>
                  <div className="selected-info">
                    <strong>{selectedChemical.productName}</strong>
                    {selectedChemical.casNumber && ` (${selectedChemical.casNumber})`}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="link-notes">Notes (Optional)</label>
                    <textarea
                      id="link-notes"
                      value={linkNotes}
                      onChange={(e) => setLinkNotes(e.target.value)}
                      placeholder="How was this chemical involved?"
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
                disabled={!selectedChemical || loading}
              >
                {loading ? 'Linking...' : 'Link Chemical'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkedChemicalsPanel;
