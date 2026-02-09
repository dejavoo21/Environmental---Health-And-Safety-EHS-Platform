import React, { useState } from 'react';
import PropTypes from 'prop-types';

const PPERuleModal = ({ open, onClose, onSave, rule }) => {
  const [site, setSite] = useState(rule?.site || '');
  const [taskType, setTaskType] = useState(rule?.taskType || '');
  const [permitType, setPermitType] = useState(rule?.permitType || '');
  const [weatherCategory, setWeatherCategory] = useState(rule?.weatherCategory || 'any');
  const [recommendation, setRecommendation] = useState(rule?.recommendation || '');
  const [active, setActive] = useState(rule?.active ?? true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validate = () => {
    if (!site.trim()) return 'Site is required.';
    if (!taskType.trim()) return 'Task type is required.';
    if (!recommendation.trim()) return 'Recommendation is required.';
    return '';
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      setError(err);
      setSuccess('');
      return;
    }
    setError('');
    setSuccess('Saved successfully!');
    onSave({ site, taskType, permitType, weatherCategory, recommendation, active });
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{rule ? 'Edit PPE Rule' : 'Add PPE Rule'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {success && <div className="modal-success">{success}</div>}
          <div className="form-group">
            <label>Site *</label>
            <input value={site} onChange={e => setSite(e.target.value)} required aria-label="Site" />
          </div>
          <div className="form-group">
            <label>Task type *</label>
            <input value={taskType} onChange={e => setTaskType(e.target.value)} required aria-label="Task type" />
          </div>
          <div className="form-group">
            <label>Permit type</label>
            <input value={permitType} onChange={e => setPermitType(e.target.value)} aria-label="Permit type" />
          </div>
          <div className="form-group">
            <label>Weather category</label>
            <select value={weatherCategory} onChange={e => setWeatherCategory(e.target.value)} aria-label="Weather category">
              <option value="any">Any</option>
              <option value="hot">Hot</option>
              <option value="cold">Cold</option>
              <option value="wet">Wet</option>
              <option value="windy">Windy</option>
            </select>
          </div>
          <div className="form-group">
            <label>Recommendation *</label>
            <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} rows={3} required aria-label="Recommendation" />
          </div>
          <div className="form-group">
            <label>Active</label>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} aria-label="Active" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

PPERuleModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  rule: PropTypes.object,
};

export default PPERuleModal;
