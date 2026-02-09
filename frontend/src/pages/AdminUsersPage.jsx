import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

// User Form Modal Component
const UserFormModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({
    email: user?.email || '',
    name: user?.name || '',
    password: '',
    role: user?.role || 'worker'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!user;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.name || !form.role) {
      setError('Email, name, and role are required.');
      return;
    }
    if (!isEdit && (!form.password || form.password.length < 8)) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = { email: form.email, name: form.name, role: form.role };
        await api.put(`/org-users/${user.id}`, payload);
      } else {
        await api.post('/org-users', {
          email: form.email,
          name: form.name,
          password: form.password,
          role: form.role
        });
      }
      onSave();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save user';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit User' : 'Add New User'}</h3>
          <button className="btn ghost small" onClick={onClose}>X</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <label>
              Name *
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            </label>
            <label>
              Email *
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </label>
            <label>
              Role *
              <select
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="worker">Worker</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {!isEdit && (
              <label>
                Password *
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                />
              </label>
            )}
            {isEdit && (
              <p className="muted small">Use "Reset Password" action to change password.</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reset Password Modal Component
const ResetPasswordModal = ({ user, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/org-users/${user.id}/reset-password`, { newPassword });
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reset password';
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Reset Password for {user.name}</h3>
          <button className="btn ghost small" onClick={onClose}>X</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <label>
              New Password *
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </label>
            <label>
              Confirm Password *
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </label>
            <div className="confirm-warning">
              The user will need to use this password on their next login.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Disable User Confirmation Modal
const DisableUserModal = ({ user, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/org-users/${user.id}/disable`);
      onConfirm();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to disable user';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Disable User</h3>
          <button className="btn ghost small" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <div className="confirm-modal-content">
            <p>Are you sure you want to disable <strong>{user.name}</strong>?</p>
            <div className="confirm-warning">
              <p>This will:</p>
              <ul>
                <li>Prevent the user from logging in</li>
                <li>Retain all their historical data</li>
              </ul>
              <p>You can re-enable this account at any time.</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn danger" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Disabling...' : 'Disable User'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Actions Menu Component
const ActionsMenu = ({ user, currentUser, onEdit, onResetPassword, onDisable, onEnable }) => {
  const [open, setOpen] = useState(false);

  const handleAction = (action) => {
    setOpen(false);
    action();
  };

  const isSelf = user.id === currentUser?.id;

  return (
    <div className="actions-menu">
      <button
        className="actions-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Actions menu"
      >
        ...
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div className="actions-menu-dropdown">
            <button onClick={() => handleAction(onEdit)}>Edit User</button>
            <button onClick={() => handleAction(onResetPassword)}>Reset Password</button>
            {user.isActive ? (
              <button
                className="danger-action"
                onClick={() => handleAction(onDisable)}
                disabled={isSelf}
                title={isSelf ? 'Cannot disable your own account' : ''}
              >
                Disable User
              </button>
            ) : (
              <button className="success-action" onClick={() => handleAction(onEnable)}>
                Enable User
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Main Page Component
const AdminUsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableUser, setDisableUser] = useState(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      const res = await api.get(`/org-users?${params.toString()}`);
      setUsers(res.data.data?.users || []);
    } catch (err) {
      setError('Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users by search term
  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  const handleAddUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleUserSaved = async () => {
    setShowUserModal(false);
    setEditingUser(null);
    await loadUsers();
    showToast(editingUser ? 'User updated successfully' : 'User created successfully');
  };

  const handleResetPassword = (user) => {
    setResetUser(user);
    setShowResetModal(true);
  };

  const handlePasswordResetSuccess = async () => {
    setShowResetModal(false);
    setResetUser(null);
    showToast('Password reset successfully');
  };

  const handleDisableUser = (user) => {
    setDisableUser(user);
    setShowDisableModal(true);
  };

  const handleDisableConfirmed = async () => {
    setShowDisableModal(false);
    setDisableUser(null);
    await loadUsers();
    showToast('User disabled');
  };

  const handleEnableUser = async (user) => {
    try {
      await api.post(`/org-users/${user.id}/enable`);
      await loadUsers();
      showToast('User enabled');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to enable user';
      showToast(msg, 'error');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'badge role-admin';
      case 'manager': return 'badge role-manager';
      case 'worker': return 'badge role-worker';
      default: return 'badge';
    }
  };

  if (loading && !users.length) return <LoadingState message="Loading users..." />;
  if (error && !users.length) return <ErrorState message={error} />;

  return (
    <div className="page">
      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="page-header">
        <div className="filters compact sticky">
          <label className="field">
            <span>Role</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label className="field">
            <span>Search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
        <button className="btn primary" onClick={handleAddUser}>+ Add User</button>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={!user.isActive ? 'row-inactive' : ''}>
                  <td>
                    {user.name}
                    {user.id === currentUser?.id && <span className="muted small"> (you)</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={getRoleBadgeClass(user.role)}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.isActive ? 'status-active-user' : 'status-disabled'}`}>
                      {user.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <ActionsMenu
                      user={user}
                      currentUser={currentUser}
                      onEdit={() => handleEditUser(user)}
                      onResetPassword={() => handleResetPassword(user)}
                      onDisable={() => handleDisableUser(user)}
                      onEnable={() => handleEnableUser(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted small" style={{ padding: '0.5rem' }}>
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>
      )}

      {/* Modals */}
      {showUserModal && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSave={handleUserSaved}
        />
      )}

      {showResetModal && resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => { setShowResetModal(false); setResetUser(null); }}
          onSuccess={handlePasswordResetSuccess}
        />
      )}

      {showDisableModal && disableUser && (
        <DisableUserModal
          user={disableUser}
          onClose={() => { setShowDisableModal(false); setDisableUser(null); }}
          onConfirm={handleDisableConfirmed}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;
