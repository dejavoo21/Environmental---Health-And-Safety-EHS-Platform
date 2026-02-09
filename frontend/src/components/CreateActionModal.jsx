import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

// Modal for creating actions from incident/inspection detail
const CreateActionModal = ({ sourceType, sourceId, linkedResponseId, onClose, onCreated }) => {
  const { user: currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        // Get users for assignee selection
        const res = await api.get('/users');
        const loadedUsers = res.data.users || [];
        setUsers(loadedUsers);

        // Default assignee to current user if they exist in the list
        if (currentUser && loadedUsers.some(u => u.id === currentUser.id)) {
          setAssignedToId(currentUser.id);
        }
      } catch (err) {
        // Users might not be available, use empty list
        setUsers([]);
        setError('Unable to load users for assignment.');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!assignedToId) {
      setError('Please select an assignee.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        sourceType,
        sourceId,
        linkedResponseId: linkedResponseId || null,
        assignedToId,
        dueDate: dueDate || null
      };

      const res = await api.post('/actions', payload);
      onCreated(res.data);
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data?.error || 'Invalid input.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create actions.');
      } else {
        setError('Failed to create action.');
      }
    } finally {
      setSaving(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Action</h3>
          <button className="btn ghost" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <label>
              Title *
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter action title"
                maxLength={255}
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done"
                rows={3}
              />
            </label>

            <label>
              Assign To *
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                disabled={usersLoading}
              >
                {usersLoading ? (
                  <option value="">Loading users...</option>
                ) : users.length === 0 ? (
                  <option value="">No users available</option>
                ) : (
                  <>
                    <option value="">Select user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || `${u.firstName} ${u.lastName}`} ({u.role})
                        {u.id === currentUser?.id ? ' - You' : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!usersLoading && assignedToId === currentUser?.id && (
                <span className="field-hint">Assigning to yourself</span>
              )}
            </label>

            <label>
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={getTomorrowDate()}
              />
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateActionModal;
