import { useState, useEffect } from 'react';

const DATE_PRESET_LABELS = {
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  last90: 'Last 90 Days',
  last365: 'Last 365 Days',
  thisYear: 'This Year',
  thisMonth: 'This Month',
  custom: 'Custom Range'
};

const SaveViewModal = ({
  isOpen,
  onClose,
  onSave,
  currentFilters,
  existingView = null, // null for new, view object for edit
  loading = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingView) {
        setName(existingView.name || '');
        setDescription(existingView.description || '');
        setIsShared(existingView.is_shared || false);
        setIsDefault(existingView.is_default || false);
      } else {
        setName('');
        setDescription('');
        setIsShared(false);
        setIsDefault(false);
      }
      setError('');
    }
  }, [isOpen, existingView]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('View name is required');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        isShared,
        isDefault
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save view');
    }
  };

  const formatFiltersSummary = () => {
    const parts = [];

    if (currentFilters?.dateRange) {
      if (currentFilters.dateRange.preset) {
        parts.push(`Date Range: ${DATE_PRESET_LABELS[currentFilters.dateRange.preset] || currentFilters.dateRange.preset}`);
      } else if (currentFilters.dateRange.startDate && currentFilters.dateRange.endDate) {
        parts.push(`Date Range: ${currentFilters.dateRange.startDate} to ${currentFilters.dateRange.endDate}`);
      }
    }

    if (currentFilters?.siteIds?.length > 0) {
      parts.push(`Sites: ${currentFilters.siteIds.length} selected`);
    } else {
      parts.push('Sites: All');
    }

    if (currentFilters?.incidentTypeIds?.length > 0) {
      parts.push(`Types: ${currentFilters.incidentTypeIds.length} selected`);
    } else {
      parts.push('Types: All');
    }

    if (currentFilters?.severities?.length > 0) {
      parts.push(`Severity: ${currentFilters.severities.join(', ')}`);
    } else {
      parts.push('Severity: All');
    }

    return parts;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content save-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {existingView ? 'Edit Analytics View' : 'Save Analytics View'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="view-name">
                View Name <span className="required">*</span>
              </label>
              <input
                id="view-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Monthly Board Review"
                maxLength={100}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="view-description">
                Description
              </label>
              <textarea
                id="view-description"
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this view"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  disabled={loading}
                />
                <span>Share with organisation</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  disabled={loading}
                />
                <span>Set as my default view</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Current Filters:</label>
              <ul className="filter-summary-list">
                {formatFiltersSummary().map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Saving...' : existingView ? 'Update View' : 'Save View'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveViewModal;
