import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { getPermitTypes } from '../api/permits';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import AppIcon from '../components/AppIcon';
import './PermitTypesPage.css';

/**
 * Permit Types Page
 * Admin configuration page for permit types
 * SCR-P7-PERM-08
 */

const ICON_OPTIONS = [
  'clipboard',
  'flame',
  'zap',
  'hardhat',
  'flask',
  'alert',
  'lock',
  'wrench',
  'warning',
  'leaf'
];

const PermitTypesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [permitTypes, setPermitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [editModal, setEditModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: ICON_OPTIONS[0],
    validityHours: 8,
    requiresApproval: true,
    requiredControls: []
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    loadPermitTypes();
  }, [isAdmin, navigate]);

  const loadPermitTypes = async () => {
    try {
      const data = await getPermitTypes();
      setPermitTypes(data.permitTypes || []);
      setError('');
    } catch (err) {
      setError('Failed to load permit types.');
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      description: '',
      icon: ICON_OPTIONS[0],
      validityHours: 8,
      requiresApproval: true,
      requiredControls: []
    });
    setEditModal(true);
  };

  const openEditModal = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name || '',
      description: type.description || '',
      icon: type.icon || ICON_OPTIONS[0],
      validityHours: type.validityHours || 8,
      requiresApproval: type.requiresApproval !== false,
      requiredControls: type.requiredControls || []
    });
    setEditModal(true);
  };

  const closeModal = () => {
    setEditModal(false);
    setEditingType(null);
    setFormData({
      name: '',
      description: '',
      icon: ICON_OPTIONS[0],
      validityHours: 8,
      requiresApproval: true,
      requiredControls: []
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addControl = () => {
    setFormData((prev) => ({
      ...prev,
      requiredControls: [
        ...prev.requiredControls,
        { id: Date.now(), description: '', phase: 'pre_work', required: true }
      ]
    }));
  };

  const updateControl = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      requiredControls: prev.requiredControls.map((c, i) => 
        i === index ? { ...c, [field]: value } : c
      )
    }));
  };

  const removeControl = (index) => {
    setFormData((prev) => ({
      ...prev,
      requiredControls: prev.requiredControls.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingType) {
        await api.put(`/permit-types/${editingType.id}`, formData);
      } else {
        await api.post('/permit-types', formData);
      }
      closeModal();
      await loadPermitTypes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save permit type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this permit type?')) return;
    
    try {
      await api.delete(`/permit-types/${typeId}`);
      await loadPermitTypes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete permit type.');
    }
  };

  if (loading) return <LoadingState message="Loading permit types..." />;

  return (
    <div className="page permit-types-page">
      <div className="page-header">
        <h2>Permit Types Configuration</h2>
        <button className="btn primary" onClick={openNewModal}>
          + New Type
        </button>
      </div>

      {error && <ErrorState message={error} />}

      {permitTypes.length === 0 && !error && (
        <EmptyState message="No permit types configured. Create one to get started." />
      )}

      {permitTypes.length > 0 && (
        <div className="types-grid">
          {permitTypes.map((type) => (
            <div key={type.id} className="type-card">
              <div className="type-header">
                <span className="type-icon">
                  <AppIcon name={type.icon || 'clipboard'} size={16} />
                </span>
                <h3>{type.name}</h3>
              </div>
              <p className="type-description">{type.description || 'No description'}</p>
              
              <div className="type-meta">
                <span className="meta-item">
                  <span className="inline-icon"><AppIcon name="clock" size={14} />{type.validityHours || 8}h validity</span>
                </span>
                <span className="meta-item">
                  {type.requiresApproval !== false ? (
                    <span className="inline-icon"><AppIcon name="check" size={14} />Requires approval</span>
                  ) : (
                    <span className="inline-icon"><AppIcon name="zap" size={14} />Auto-approve</span>
                  )}
                </span>
                <span className="meta-item">
                  <span className="inline-icon"><AppIcon name="clipboard" size={14} />{type.requiredControls?.length || 0} controls</span>
                </span>
              </div>
              
              {type.requiredControls?.length > 0 && (
                <div className="controls-preview">
                  <h4>Controls:</h4>
                  <ul>
                    {type.requiredControls.slice(0, 3).map((c, idx) => (
                      <li key={idx}>
                        <span className={`phase-badge ${c.phase}`}>{c.phase.replace('_', ' ')}</span>
                        {c.description}
                        {c.required && <span className="required">*</span>}
                      </li>
                    ))}
                    {type.requiredControls.length > 3 && (
                      <li className="more">+{type.requiredControls.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              
              <div className="type-actions">
                <button className="btn ghost" onClick={() => openEditModal(type)}>
                  <span className="inline-icon"><Pencil size={14} />Edit</span>
                </button>
                <button className="btn ghost danger-text" onClick={() => handleDelete(type.id)}>
                  <span className="inline-icon"><Trash2 size={14} />Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingType ? 'Edit Permit Type' : 'New Permit Type'}</h3>
              <button className="modal-close" onClick={closeModal} aria-label="Close">X</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group icon-group">
                  <label>Icon</label>
                  <div className="icon-selector">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                        onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                      >
                        <AppIcon name={icon} size={16} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group flex-grow">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Hot Work"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of this permit type"
                  rows={2}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="validityHours">Validity (hours)</label>
                  <input
                    type="number"
                    id="validityHours"
                    name="validityHours"
                    value={formData.validityHours}
                    onChange={handleChange}
                    min={1}
                    max={72}
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="requiresApproval"
                      checked={formData.requiresApproval}
                      onChange={handleChange}
                    />
                    Requires approval
                  </label>
                </div>
              </div>
              
              <div className="controls-section">
                <div className="controls-header">
                  <h4>Required Controls</h4>
                  <button className="btn ghost small" onClick={addControl} type="button">
                    + Add Control
                  </button>
                </div>
                {formData.requiredControls.length === 0 ? (
                  <p className="muted">No required controls added yet.</p>
                ) : (
                  <div className="controls-list">
                    {formData.requiredControls.map((control, idx) => (
                      <div key={control.id} className="control-row">
                        <input
                          type="text"
                          placeholder="Control description"
                          value={control.description}
                          onChange={(e) => updateControl(idx, 'description', e.target.value)}
                        />
                        <select
                          value={control.phase}
                          onChange={(e) => updateControl(idx, 'phase', e.target.value)}
                        >
                          <option value="pre_work">Pre-work</option>
                          <option value="during_work">During work</option>
                          <option value="close_out">Close-out</option>
                        </select>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={control.required}
                            onChange={(e) => updateControl(idx, 'required', e.target.checked)}
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() => removeControl(idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={closeModal}>Cancel</button>
              <button className="btn primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermitTypesPage;
