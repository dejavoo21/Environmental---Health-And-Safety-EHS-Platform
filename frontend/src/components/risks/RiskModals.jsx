/**
 * Risk Modals - Phase 9
 * Modal components for Risk Register
 */

import { useState, useEffect } from 'react';
import { ScoringSelector } from './RiskComponents';
import './RiskModals.css';

// ==================== REVIEW MODAL ====================

/**
 * ReviewModal - Record a risk review
 */
export const ReviewModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  risk, 
  controls = [],
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    review_date: new Date().toISOString().split('T')[0],
    outcome: '',
    residual_likelihood: risk?.residual_likelihood || 3,
    residual_impact: risk?.residual_impact || 3,
    controls_reviewed: [],
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (risk) {
      setFormData(prev => ({
        ...prev,
        residual_likelihood: risk.residual_likelihood || 3,
        residual_impact: risk.residual_impact || 3
      }));
    }
  }, [risk]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleControlToggle = (controlId) => {
    setFormData(prev => {
      const current = prev.controls_reviewed || [];
      if (current.includes(controlId)) {
        return { ...prev, controls_reviewed: current.filter(id => id !== controlId) };
      }
      return { ...prev, controls_reviewed: [...current, controlId] };
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.outcome) newErrors.outcome = 'Outcome is required';
    if (!formData.residual_likelihood) newErrors.residual_likelihood = 'Likelihood is required';
    if (!formData.residual_impact) newErrors.residual_impact = 'Impact is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        residual_score: formData.residual_likelihood * formData.residual_impact
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Record Risk Review</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="modal__section">
              <h3>Review Details</h3>
              
              <label className="form-field">
                Review Date
                <input
                  type="date"
                  value={formData.review_date}
                  onChange={(e) => handleChange('review_date', e.target.value)}
                />
              </label>
              
              <label className={`form-field ${errors.outcome ? 'form-field--error' : ''}`}>
                Outcome <span className="required">*</span>
                <select
                  value={formData.outcome}
                  onChange={(e) => handleChange('outcome', e.target.value)}
                >
                  <option value="">Select outcome...</option>
                  <option value="confirmed">Confirmed - Risk validated as current</option>
                  <option value="updated">Updated - Risk score or details changed</option>
                  <option value="escalated">Escalated - Risk requires attention</option>
                  <option value="closed">Closed - Risk no longer applicable</option>
                </select>
                {errors.outcome && <span className="form-error">{errors.outcome}</span>}
              </label>
            </div>
            
            <div className="modal__section">
              <h3>Updated Residual Scoring</h3>
              <p className="modal__hint">
                Re-assess the residual risk score based on current controls
              </p>
              
              <ScoringSelector
                type="likelihood"
                value={formData.residual_likelihood}
                onChange={(val) => handleChange('residual_likelihood', val)}
                error={errors.residual_likelihood}
                required
              />
              
              <ScoringSelector
                type="impact"
                value={formData.residual_impact}
                onChange={(val) => handleChange('residual_impact', val)}
                error={errors.residual_impact}
                required
              />
              
              <div className="score-preview">
                <strong>New Residual Score: </strong>
                {formData.residual_likelihood * formData.residual_impact}
              </div>
            </div>
            
            {controls.length > 0 && (
              <div className="modal__section">
                <h3>Controls Reviewed</h3>
                <p className="modal__hint">
                  Select the controls that were reviewed as part of this assessment
                </p>
                
                <div className="controls-checklist">
                  {controls.map((control) => (
                    <label key={control.id} className="control-check">
                      <input
                        type="checkbox"
                        checked={formData.controls_reviewed.includes(control.id)}
                        onChange={() => handleControlToggle(control.id)}
                      />
                      <span>{control.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal__section">
              <label className="form-field">
                Notes
                <textarea
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add any additional notes about this review..."
                />
              </label>
            </div>
          </div>
          
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Record Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== LINK ENTITY MODAL ====================

/**
 * LinkEntityModal - Link an entity to a risk
 */
export const LinkEntityModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  availableEntities = [],
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    entity_type: '',
    entity_id: '',
    link_reason: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (formData.entity_type && availableEntities[formData.entity_type]) {
      setSearchResults(availableEntities[formData.entity_type]);
    } else {
      setSearchResults([]);
    }
    setFormData(prev => ({ ...prev, entity_id: '' }));
  }, [formData.entity_type, availableEntities]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.entity_type) newErrors.entity_type = 'Entity type is required';
    if (!formData.entity_id) newErrors.entity_id = 'Please select an entity';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const entityTypes = [
    { value: 'incident', label: 'Incident' },
    { value: 'action', label: 'Action' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'training', label: 'Training Course' },
    { value: 'chemical', label: 'Chemical' },
    { value: 'permit', label: 'Permit' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Link Entity to Risk</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <label className={`form-field ${errors.entity_type ? 'form-field--error' : ''}`}>
              Entity Type <span className="required">*</span>
              <select
                value={formData.entity_type}
                onChange={(e) => handleChange('entity_type', e.target.value)}
              >
                <option value="">Select type...</option>
                {entityTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.entity_type && <span className="form-error">{errors.entity_type}</span>}
            </label>
            
            <label className={`form-field ${errors.entity_id ? 'form-field--error' : ''}`}>
              Select Entity <span className="required">*</span>
              <select
                value={formData.entity_id}
                onChange={(e) => handleChange('entity_id', e.target.value)}
                disabled={!formData.entity_type || searchResults.length === 0}
              >
                <option value="">
                  {!formData.entity_type 
                    ? 'Select entity type first...' 
                    : searchResults.length === 0 
                      ? 'No entities available' 
                      : 'Select entity...'}
                </option>
                {searchResults.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.reference || entity.id}: {entity.title || entity.name || 'Untitled'}
                  </option>
                ))}
              </select>
              {errors.entity_id && <span className="form-error">{errors.entity_id}</span>}
            </label>
            
            <label className="form-field">
              Link Reason
              <textarea
                rows={3}
                value={formData.link_reason}
                onChange={(e) => handleChange('link_reason', e.target.value)}
                placeholder="Why is this entity being linked to the risk?"
              />
            </label>
          </div>
          
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Linking...' : 'Link Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== ADD CONTROL MODAL ====================

/**
 * AddControlModal - Add or edit a control
 */
export const AddControlModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  control = null, // If provided, we're editing
  users = [],
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    description: '',
    type: 'prevention',
    hierarchy: 'engineering',
    effectiveness: 'unknown',
    owner_id: '',
    implemented_date: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (control) {
      setFormData({
        description: control.description || '',
        type: control.type || 'prevention',
        hierarchy: control.hierarchy || 'engineering',
        effectiveness: control.effectiveness || 'unknown',
        owner_id: control.owner_id || '',
        implemented_date: control.implemented_date?.split('T')[0] || '',
        notes: control.notes || ''
      });
    } else {
      setFormData({
        description: '',
        type: 'prevention',
        hierarchy: 'engineering',
        effectiveness: 'unknown',
        owner_id: '',
        implemented_date: '',
        notes: ''
      });
    }
  }, [control, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.hierarchy) newErrors.hierarchy = 'Hierarchy is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{control ? 'Edit Control' : 'Add Control'}</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <label className={`form-field ${errors.description ? 'form-field--error' : ''}`}>
              Description <span className="required">*</span>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe the control measure..."
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </label>
            
            <div className="form-row">
              <label className={`form-field ${errors.type ? 'form-field--error' : ''}`}>
                Type <span className="required">*</span>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <option value="prevention">Prevention - Reduces likelihood</option>
                  <option value="mitigation">Mitigation - Reduces impact</option>
                </select>
                {errors.type && <span className="form-error">{errors.type}</span>}
              </label>
              
              <label className={`form-field ${errors.hierarchy ? 'form-field--error' : ''}`}>
                Hierarchy <span className="required">*</span>
                <select
                  value={formData.hierarchy}
                  onChange={(e) => handleChange('hierarchy', e.target.value)}
                >
                  <option value="elimination">Elimination - Remove hazard</option>
                  <option value="substitution">Substitution - Replace with safer</option>
                  <option value="engineering">Engineering - Isolate from hazard</option>
                  <option value="administrative">Administrative - Change work practices</option>
                  <option value="ppe">PPE - Personal protection</option>
                </select>
                {errors.hierarchy && <span className="form-error">{errors.hierarchy}</span>}
              </label>
            </div>
            
            <div className="form-row">
              <label className="form-field">
                Effectiveness
                <select
                  value={formData.effectiveness}
                  onChange={(e) => handleChange('effectiveness', e.target.value)}
                >
                  <option value="unknown">Not Evaluated</option>
                  <option value="effective">Effective</option>
                  <option value="partially_effective">Partially Effective</option>
                  <option value="ineffective">Ineffective</option>
                </select>
              </label>
              
              <label className="form-field">
                Owner
                <select
                  value={formData.owner_id}
                  onChange={(e) => handleChange('owner_id', e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            
            <div className="form-row">
              <label className="form-field">
                Implementation Date
                <input
                  type="date"
                  value={formData.implemented_date}
                  onChange={(e) => handleChange('implemented_date', e.target.value)}
                />
              </label>
            </div>
            
            <label className="form-field">
              Notes
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this control..."
              />
            </label>
          </div>
          
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : (control ? 'Update Control' : 'Add Control')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== VERIFY CONTROL MODAL ====================

/**
 * VerifyControlModal - Verify a control's effectiveness
 */
export const VerifyControlModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  control,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    effectiveness: control?.effectiveness || 'effective',
    notes: ''
  });

  useEffect(() => {
    if (control) {
      setFormData({
        effectiveness: control.effectiveness || 'effective',
        notes: ''
      });
    }
  }, [control]);

  if (!isOpen || !control) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      control_id: control.id
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Verify Control</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="control-summary">
              <strong>Control:</strong> {control.description}
            </div>
            
            <label className="form-field">
              Effectiveness Assessment <span className="required">*</span>
              <select
                value={formData.effectiveness}
                onChange={(e) => handleChange('effectiveness', e.target.value)}
              >
                <option value="effective">Effective - Control is working as intended</option>
                <option value="partially_effective">Partially Effective - Some gaps identified</option>
                <option value="ineffective">Ineffective - Control is not working</option>
              </select>
            </label>
            
            <label className="form-field">
              Verification Notes
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Document your verification findings..."
              />
            </label>
          </div>
          
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Verify Control'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== CHANGE STATUS MODAL ====================

/**
 * ChangeStatusModal - Change risk status
 */
export const ChangeStatusModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentStatus,
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    status: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({ status: '', reason: '' });
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.status) newErrors.status = 'Status is required';
    if (!formData.reason?.trim()) newErrors.reason = 'Reason is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const statusOptions = [
    { value: 'emerging', label: 'Emerging', desc: 'Newly identified, under assessment' },
    { value: 'active', label: 'Active', desc: 'Being actively managed' },
    { value: 'under_review', label: 'Under Review', desc: 'Due for periodic review' },
    { value: 'closed', label: 'Closed', desc: 'Risk no longer exists' },
    { value: 'accepted', label: 'Accepted', desc: 'Risk accepted at current level' }
  ].filter(opt => opt.value !== currentStatus);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Change Risk Status</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <p>
              Current status: <strong style={{ textTransform: 'capitalize' }}>
                {currentStatus?.replace('_', ' ')}
              </strong>
            </p>
            
            <label className={`form-field ${errors.status ? 'form-field--error' : ''}`}>
              New Status <span className="required">*</span>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="">Select new status...</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.desc}
                  </option>
                ))}
              </select>
              {errors.status && <span className="form-error">{errors.status}</span>}
            </label>
            
            <label className={`form-field ${errors.reason ? 'form-field--error' : ''}`}>
              Reason for Change <span className="required">*</span>
              <textarea
                rows={4}
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Explain why the status is being changed..."
              />
              {errors.reason && <span className="form-error">{errors.reason}</span>}
            </label>
          </div>
          
          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Change Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== DELETE CONFIRM MODAL ====================

/**
 * DeleteConfirmModal - Confirm deletion
 */
export const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item?',
  itemName = '',
  isLoading = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header modal__header--danger">
          <h2>{title}</h2>
          <button className="modal__close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal__body">
          <p>{message}</p>
          {itemName && <p><strong>{itemName}</strong></p>}
          <p className="warning-text">This action cannot be undone.</p>
        </div>
        
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn--danger" 
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
