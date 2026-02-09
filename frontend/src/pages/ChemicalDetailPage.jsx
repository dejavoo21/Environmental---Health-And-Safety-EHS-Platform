import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getChemical, updateChemical, getChemicalLocations, addChemicalLocation, 
         deleteChemicalLocation, updateChemicalInventory, downloadSDS, uploadSDS,
         getChemicalIncidents, getChemicalActions } from '../api/chemicals';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GHSHazardPanel, SDSStatusBadge, SDSDocumentCard, ChemicalStatusBadge } from '../components/chemicals';
import { ErrorState, LoadingState } from '../components/States';
import AppIcon from '../components/AppIcon';
import './ChemicalDetailPage.css';

/**
 * Chemical Detail Page
 * View chemical details, SDS, locations, linked entities
 * SCR-P7-CHEM-02
 */

const ChemicalDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [chemical, setChemical] = useState(null);
  const [locations, setLocations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [actions, setActions] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('locations');
  const [showSDSUpload, setShowSDSUpload] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const canEdit = user?.role === 'manager' || user?.role === 'admin';

  const loadChemical = async () => {
    try {
      const data = await getChemical(id);
      setChemical(data);
    } catch (err) {
      setError('Unable to load chemical details.');
    }
  };

  const loadLocations = async () => {
    try {
      const data = await getChemicalLocations(id);
      setLocations(data.locations || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const loadIncidents = async () => {
    try {
      const data = await getChemicalIncidents(id);
      setIncidents(data.incidents || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    }
  };

  const loadActions = async () => {
    try {
      const data = await getChemicalActions(id);
      setActions(data.actions || []);
    } catch (err) {
      console.error('Failed to load actions:', err);
    }
  };

  const loadSites = async () => {
    try {
      const res = await api.get('/sites');
      setSites(res.data.sites || []);
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        loadChemical(),
        loadLocations(),
        loadIncidents(),
        loadActions(),
        loadSites()
      ]);
      setLoading(false);
    };
    loadAll();
  }, [id]);

  const handleSDSDownload = async (sdsDoc) => {
    try {
      const blob = await downloadSDS(id, sdsDoc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', sdsDoc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Unable to download SDS.');
    }
  };

  const handleLocationDelete = async (locationId) => {
    if (!window.confirm('Are you sure you want to remove this storage location?')) return;
    try {
      await deleteChemicalLocation(id, locationId);
      await loadLocations();
    } catch (err) {
      setError('Failed to remove location.');
    }
  };

  if (loading) return <LoadingState message="Loading chemical..." />;
  if (error) return <ErrorState message={error} />;
  if (!chemical) return <ErrorState message="Chemical not found." />;

  return (
    <div className="page chemical-detail-page">
      <div className="page-back">
        <button className="btn ghost" onClick={() => navigate('/chemicals')}>
          ← Back to Register
        </button>
      </div>

      <div className="card detail-card">
        <div className="detail-header">
          <div className="detail-header-main">
            <h2>{chemical.name}</h2>
            <div className="detail-meta">
              {chemical.internalCode && <span>{chemical.internalCode}</span>}
              {chemical.casNumber && <span>CAS: {chemical.casNumber}</span>}
              {chemical.supplier && <span>{chemical.supplier}</span>}
            </div>
          </div>
          <div className="detail-header-actions">
            <ChemicalStatusBadge status={chemical.status} />
            {canEdit && (
              <button className="btn ghost" onClick={() => navigate(`/chemicals/${id}/edit`)}>
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="detail-content-grid">
          <GHSHazardPanel hazardClasses={chemical.ghsHazardClasses} />
          
          <div className="sds-panel">
            <div className="panel-header">
              <h4>SDS Documents</h4>
              {canEdit && (
                <button className="btn primary small" onClick={() => setShowSDSUpload(true)}>
                  + Upload New SDS
                </button>
              )}
            </div>
            <div className="sds-status-row">
              <SDSStatusBadge 
                expiryDate={chemical.sdsExpiryDate} 
                hasDocument={chemical.sdsDocuments?.length > 0} 
              />
            </div>
            <div className="sds-documents">
              {chemical.sdsDocuments?.length === 0 && (
                <p className="muted">No SDS documents uploaded.</p>
              )}
              {chemical.sdsDocuments?.map((sds) => (
                <SDSDocumentCard
                  key={sds.id}
                  fileName={sds.fileName}
                  version={sds.version}
                  isCurrent={sds.isCurrent}
                  expiryDate={chemical.sdsExpiryDate}
                  onDownload={() => handleSDSDownload(sds)}
                />
              ))}
            </div>
          </div>
        </div>

        {(chemical.ppeRequirements || chemical.handlingNotes) && (
          <div className="requirements-section">
            {chemical.ppeRequirements && (
              <div className="requirement-card">
                <h4>PPE Requirements</h4>
                <p>{chemical.ppeRequirements}</p>
              </div>
            )}
            {chemical.handlingNotes && (
              <div className="requirement-card">
                <h4>Handling Notes</h4>
                <p>{chemical.handlingNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="detail-tabs">
        <div className="tabs-header">
          <button 
            className={`tab-button ${activeTab === 'locations' ? 'active' : ''}`}
            onClick={() => setActiveTab('locations')}
          >
            Storage Locations ({locations.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            Related Incidents ({incidents.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Related Actions ({actions.length})
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === 'locations' && (
            <LocationsTab 
              locations={locations}
              sites={sites}
              chemicalId={id}
              canEdit={canEdit}
              onRefresh={loadLocations}
              showAddModal={showAddLocation}
              setShowAddModal={setShowAddLocation}
              onDelete={handleLocationDelete}
            />
          )}
          {activeTab === 'incidents' && (
            <IncidentsTab incidents={incidents} />
          )}
          {activeTab === 'actions' && (
            <ActionsTab actions={actions} />
          )}
        </div>
      </div>

      {showSDSUpload && (
        <SDSUploadModal
          chemicalId={id}
          chemicalName={chemical.name}
          onClose={() => setShowSDSUpload(false)}
          onUploaded={() => {
            setShowSDSUpload(false);
            loadChemical();
          }}
        />
      )}
    </div>
  );
};

// Storage Locations Tab
const LocationsTab = ({ locations, sites, chemicalId, canEdit, onRefresh, showAddModal, setShowAddModal, onDelete }) => {
  return (
    <div className="locations-tab">
      <div className="tab-header">
        <h4>Storage Locations</h4>
        {canEdit && (
          <button className="btn primary small" onClick={() => setShowAddModal(true)}>
            + Add Location
          </button>
        )}
      </div>
      
      {locations.length === 0 ? (
        <p className="muted">No storage locations configured.</p>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Location</th>
                <th>Max Qty</th>
                <th>Current Qty</th>
                <th>Unit</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id}>
                  <td>{loc.site?.name || loc.siteName}</td>
                  <td>{loc.locationName}</td>
                  <td>{loc.maxStorageAmount || '-'}</td>
                  <td>{loc.currentQuantity || '-'}</td>
                  <td>{loc.unit || '-'}</td>
                  {canEdit && (
                    <td>
                      <button className="btn ghost small" onClick={() => onDelete(loc.id)}>
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <AddLocationModal
          chemicalId={chemicalId}
          sites={sites}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// Related Incidents Tab
const IncidentsTab = ({ incidents }) => {
  const navigate = useNavigate();
  
  if (incidents.length === 0) {
    return <p className="muted">No related incidents.</p>;
  }
  
  return (
    <div className="card table-card">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr 
              key={inc.id} 
              className="clickable-row" 
              onClick={() => navigate(`/incidents/${inc.incidentId || inc.id}`)}
            >
              <td>{new Date(inc.occurredAt || inc.createdAt).toLocaleDateString()}</td>
              <td>{inc.title || inc.incident?.title}</td>
              <td>{inc.status || inc.incident?.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Related Actions Tab
const ActionsTab = ({ actions }) => {
  const navigate = useNavigate();
  
  if (actions.length === 0) {
    return <p className="muted">No related actions.</p>;
  }
  
  return (
    <div className="card table-card">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((act) => (
            <tr 
              key={act.id} 
              className="clickable-row" 
              onClick={() => navigate(`/actions/${act.actionId || act.id}`)}
            >
              <td>{act.title || act.action?.title}</td>
              <td>{act.dueDate ? new Date(act.dueDate).toLocaleDateString() : '-'}</td>
              <td>{act.status || act.action?.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// SDS Upload Modal
const SDSUploadModal = ({ chemicalId, chemicalName, onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [setAsCurrent, setSetAsCurrent] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !version || !expiryDate) {
      setError('All fields are required.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      await uploadSDS(chemicalId, file, version, expiryDate, setAsCurrent);
      onUploaded();
    } catch (err) {
      setError('Failed to upload SDS.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload Safety Data Sheet</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="muted">Uploading SDS for: {chemicalName}</p>
            
            <div className="form-group">
              <label>SDS Document (PDF) *</label>
              <div 
                className="file-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                                {file ? (
                  <span className="inline-icon"><AppIcon name="file" size={14} />{file.name}</span>
                ) : (
                  <span className="inline-icon"><AppIcon name="folder" size={14} />Click to select PDF (max 10MB)</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sds-version">SDS Version *</label>
                <input
                  id="sds-version"
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 2.1"
                />
              </div>
              <div className="form-group">
                <label htmlFor="sds-expiry">Expiry Date *</label>
                <input
                  id="sds-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
            
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={setAsCurrent}
                onChange={(e) => setSetAsCurrent(e.target.checked)}
              />
              Set as current SDS (replaces existing)
            </label>
            
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Add Location Modal
const AddLocationModal = ({ chemicalId, sites, onClose, onAdded }) => {
  const [siteId, setSiteId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [maxStorage, setMaxStorage] = useState('');
  const [unit, setUnit] = useState('L');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!siteId || !locationName) {
      setError('Site and location name are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addChemicalLocation(chemicalId, {
        siteId,
        locationName,
        maxStorageAmount: maxStorage ? parseFloat(maxStorage) : null,
        unit
      });
      onAdded();
    } catch (err) {
      setError('Failed to add location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Storage Location</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="loc-site">Site *</label>
              <select
                id="loc-site"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">Select site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="loc-name">Location Name *</label>
              <input
                id="loc-name"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Flammables Cabinet 1"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="loc-max">Max Storage Amount</label>
                <input
                  id="loc-max"
                  type="number"
                  value={maxStorage}
                  onChange={(e) => setMaxStorage(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="form-group">
                <label htmlFor="loc-unit">Unit</label>
                <select
                  id="loc-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="L">Liters (L)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="mL">Milliliters (mL)</option>
                  <option value="g">Grams (g)</option>
                  <option value="units">Units</option>
                </select>
              </div>
            </div>
            
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChemicalDetailPage;




