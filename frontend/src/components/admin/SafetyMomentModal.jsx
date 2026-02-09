import React, { useState } from 'react';
import PropTypes from 'prop-types';

const SafetyMomentModal = ({ open, onClose, onSave, moment }) => {
  const [title, setTitle] = useState(moment?.title || '');
  const [body, setBody] = useState(moment?.body || '');
  const [category, setCategory] = useState(moment?.category || '');
  const [sites, setSites] = useState(moment?.sites || []);
  const [roles, setRoles] = useState(moment?.roles || []);
  const [startDate, setStartDate] = useState(moment?.startDate || '');
  const [endDate, setEndDate] = useState(moment?.endDate || '');
  const [active, setActive] = useState(moment?.active ?? true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validate = () => {
    if (!title.trim()) return 'Title is required.';
    if (!body.trim()) return 'Body is required.';
    if (!startDate) return 'Start date is required.';
    if (!endDate) return 'End date is required.';
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
    onSave({ title, body, category, sites, roles, startDate, endDate, active });
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{moment ? 'Edit Safety Moment' : 'Create Safety Moment'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {success && <div className="modal-success">{success}</div>}
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required aria-label="Title" />
          </div>
          <div className="form-group">
            <label>Body *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} required aria-label="Body" />
          </div>
          <div className="form-group">
            <label>Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} aria-label="Category" />
          </div>
          <div className="form-group">
            <label>Sites</label>
            <input value={sites} onChange={e => setSites(e.target.value.split(','))} placeholder="Comma separated" aria-label="Sites" />
          </div>
          <div className="form-group">
            <label>Roles</label>
            <input value={roles} onChange={e => setRoles(e.target.value.split(','))} placeholder="Comma separated" aria-label="Roles" />
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required aria-label="Start Date" />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required aria-label="End Date" />
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

SafetyMomentModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  moment: PropTypes.object,
};

export default SafetyMomentModal;
