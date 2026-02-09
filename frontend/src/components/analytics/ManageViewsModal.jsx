import { useState } from 'react';

const ManageViewsModal = ({
  isOpen,
  onClose,
  views = [],
  onUpdateView,
  onDeleteView,
  loading = false
}) => {
  const [editingViewId, setEditingViewId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const myViews = views.filter(v => v.is_owner);

  const handleStartEdit = (view) => {
    setEditingViewId(view.id);
    setEditName(view.name);
  };

  const handleCancelEdit = () => {
    setEditingViewId(null);
    setEditName('');
  };

  const handleSaveEdit = async (viewId) => {
    if (!editName.trim()) return;

    setActionLoading(true);
    try {
      await onUpdateView(viewId, { name: editName.trim() });
      setEditingViewId(null);
      setEditName('');
    } catch (err) {
      console.error('Failed to update view:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (viewId) => {
    setActionLoading(true);
    try {
      await onDeleteView(viewId);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete view:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleShared = async (view) => {
    setActionLoading(true);
    try {
      await onUpdateView(view.id, { is_shared: !view.is_shared });
    } catch (err) {
      console.error('Failed to update view sharing:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDefault = async (view) => {
    setActionLoading(true);
    try {
      await onUpdateView(view.id, { is_default: !view.is_default });
    } catch (err) {
      console.error('Failed to update view default:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manage-views-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Manage Saved Views</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {myViews.length === 0 ? (
            <div className="manage-views-empty">
              You don't have any saved views yet.
            </div>
          ) : (
            <div className="manage-views-list">
              {myViews.map(view => (
                <div key={view.id} className="manage-view-item">
                  {editingViewId === view.id ? (
                    <div className="manage-view-edit">
                      <input
                        type="text"
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={actionLoading}
                        autoFocus
                      />
                      <div className="manage-view-edit-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSaveEdit(view.id)}
                          disabled={actionLoading || !editName.trim()}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={handleCancelEdit}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : deleteConfirmId === view.id ? (
                    <div className="manage-view-delete-confirm">
                      <span>Delete "{view.name}"?</span>
                      <div className="manage-view-delete-actions">
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(view.id)}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="manage-view-info">
                        <span className="manage-view-name">
                          {view.is_default && <span className="view-default-star">&#9733;</span>}
                          {view.name}
                        </span>
                        <div className="manage-view-badges">
                          {view.is_shared && (
                            <span className="badge badge-shared">Shared</span>
                          )}
                          {view.is_default && (
                            <span className="badge badge-default">Default</span>
                          )}
                        </div>
                      </div>
                      <div className="manage-view-actions">
                        <button
                          className="btn btn-icon"
                          onClick={() => handleStartEdit(view)}
                          title="Rename"
                          disabled={actionLoading}
                        >
                          &#9998;
                        </button>
                        <button
                          className={`btn btn-icon ${view.is_shared ? 'active' : ''}`}
                          onClick={() => handleToggleShared(view)}
                          title={view.is_shared ? 'Unshare' : 'Share'}
                          disabled={actionLoading}
                        >
                          &#128279;
                        </button>
                        <button
                          className={`btn btn-icon ${view.is_default ? 'active' : ''}`}
                          onClick={() => handleToggleDefault(view)}
                          title={view.is_default ? 'Remove default' : 'Set as default'}
                          disabled={actionLoading}
                        >
                          &#9733;
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          onClick={() => setDeleteConfirmId(view.id)}
                          title="Delete"
                          disabled={actionLoading}
                        >
                          &#128465;
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageViewsModal;
