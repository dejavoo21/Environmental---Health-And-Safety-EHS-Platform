import React, { useState } from 'react';
import PropTypes from 'prop-types';

const SiteLegislationModal = ({ open, onClose, onSave, legislation }) => {
  const [site, setSite] = useState(legislation?.site || '');
  const [title, setTitle] = useState(legislation?.title || '');
  const [jurisdiction, setJurisdiction] = useState(legislation?.jurisdiction || '');
  const [category, setCategory] = useState(legislation?.category || '');
  const [summary, setSummary] = useState(legislation?.summary || '');
  const [referenceUrl, setReferenceUrl] = useState(legislation?.referenceUrl || '');
  const [isPrimary, setIsPrimary] = useState(legislation?.isPrimary ?? false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validate = () => {
    if (!title.trim()) return 'Title is required.';
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
    onSave({ site, title, jurisdiction, category, summary, referenceUrl, isPrimary });
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{legislation ? 'Edit Legislation' : 'Add Legislation'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}
          {success && <div className="modal-success">{success}</div>}
          <div className="form-group">
            <label>Site</label>
            <input value={site} onChange={e => setSite(e.target.value)} aria-label="Site" />
          </div>
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required aria-label="Title" />
          </div>
          <div className="form-group">
            <label>Jurisdiction</label>
            <input value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} aria-label="Jurisdiction" />
          </div>
          <div className="form-group">
            <label>Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} aria-label="Category" />
          </div>
          <div className="form-group">
            <label>Summary</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} aria-label="Summary" />
          </div>
          <div className="form-group">
            <label>Reference URL</label>
            <input value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} aria-label="Reference URL" />
          </div>
          <div className="form-group">
            <label>Mark as primary</label>
            <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} aria-label="Mark as primary" />
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

SiteLegislationModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onSave: PropTypes.func,
  legislation: PropTypes.object,
};

export default SiteLegislationModal;
