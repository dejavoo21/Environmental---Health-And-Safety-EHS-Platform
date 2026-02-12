import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import {
  getSafetyMoments,
  createSafetyMoment,
  updateSafetyMoment,
  archiveSafetyMoment,
  getSafetyMomentAnalytics
} from '../api/safetyAdvisor';
import './AdminSafetyPages.css';

/**
 * Admin Safety Moments Page - Phase 11
 *
 * Manage Safety Moments for daily safety messaging.
 * Allows creating, editing, scheduling, and archiving safety moments.
 *
 * Test Cases: TC-270-1
 */
const AdminSafetyMomentsPage = () => {
  const [moments, setMoments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingMoment, setEditingMoment] = useState(null);
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: '',
    scheduledDate: '',
    isActive: true
  });

  const categories = [
    'General Safety',
    'PPE',
    'Fire Safety',
    'Electrical Safety',
    'Working at Heights',
    'Chemical Safety',
    'Manual Handling',
    'Housekeeping',
    'First Aid',
    'Emergency Procedures'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [momentsRes, analyticsRes] = await Promise.all([
        getSafetyMoments({ status: filter }),
        getSafetyMomentAnalytics().catch(() => null)
      ]);
      setMoments(momentsRes.moments || momentsRes || []);
      setAnalytics(analyticsRes);
    } catch (err) {
      setError('Unable to load safety moments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const resetForm = () => {
    setForm({
      title: '',
      body: '',
      category: '',
      scheduledDate: '',
      isActive: true
    });
    setEditingMoment(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (moment) => {
    setForm({
      title: moment.title,
      body: moment.body,
      category: moment.category || '',
      scheduledDate: moment.scheduledDate?.split('T')[0] || '',
      isActive: moment.isActive !== false
    });
    setEditingMoment(moment);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingMoment) {
        await updateSafetyMoment(editingMoment.id, form);
      } else {
        await createSafetyMoment(form);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save safety moment.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (moment) => {
    if (!window.confirm(`Are you sure you want to archive "${moment.title}"?`)) {
      return;
    }

    try {
      await archiveSafetyMoment(moment.id);
      await loadData();
    } catch (err) {
      setError('Unable to archive safety moment.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) return <LoadingState message="Loading safety moments..." />;
  if (error && !moments.length && !showForm) return <ErrorState message={error} />;

  return (
    <div className="page admin-safety-page">
      <div className="page-header">
        <div>
          <h2>Safety Moments</h2>
          <p className="muted">Manage daily safety messages for your organization</p>
        </div>
        {!showForm && (
          <button className="btn success" onClick={() => setShowForm(true)}>
            + Add Safety Moment
          </button>
        )}
      </div>

      {/* Analytics summary */}
      {analytics && (
        <div className="analytics-summary">
          <div className="analytics-card">
            <span className="analytics-value">{analytics.totalMoments || 0}</span>
            <span className="analytics-label">Total Moments</span>
          </div>
          <div className="analytics-card">
            <span className="analytics-value">{analytics.totalAcknowledgements || 0}</span>
            <span className="analytics-label">Acknowledgements</span>
          </div>
          <div className="analytics-card">
            <span className="analytics-value">{analytics.avgAckRate || 0}%</span>
            <span className="analytics-label">Avg. Acknowledgement Rate</span>
          </div>
          <div className="analytics-card">
            <span className="analytics-value">{analytics.scheduledCount || 0}</span>
            <span className="analytics-label">Scheduled</span>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingMoment ? 'Edit Safety Moment' : 'New Safety Moment'}</h3>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="admin-form-card__fields">
            <label className="field field-full">
              <span>Title *</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a concise title for the safety moment"
                maxLength={200}
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Scheduled Date</span>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </label>
            <label className="field field-full">
              <span>Body *</span>
              <textarea
                value={form.body}
                onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write the safety moment content. Include key points, statistics, or reminders."
                rows={5}
              />
            </label>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <span>Active (available for display)</span>
            </label>
          </div>
          <div className="admin-form-card__actions">
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingMoment ? 'Update Moment' : 'Create Moment'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-tab ${filter === 'scheduled' ? 'active' : ''}`}
            onClick={() => setFilter('scheduled')}
          >
            Scheduled
          </button>
          <button
            className={`filter-tab ${filter === 'archived' ? 'active' : ''}`}
            onClick={() => setFilter('archived')}
          >
            Archived
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>
      </div>

      {/* List */}
      {moments.length === 0 ? (
        <EmptyState message={`No ${filter} safety moments found.`} />
      ) : (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Scheduled</th>
                <th>Acknowledgements</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {moments.map((moment) => (
                <tr key={moment.id}>
                  <td>
                    <div className="moment-title-cell">
                      <span className="moment-title">{moment.title}</span>
                      <span className="moment-preview">
                        {moment.body?.slice(0, 80)}{moment.body?.length > 80 ? '...' : ''}
                      </span>
                    </div>
                  </td>
                  <td>
                    {moment.category && (
                      <span className="category-badge">{moment.category}</span>
                    )}
                  </td>
                  <td>{formatDate(moment.scheduledDate)}</td>
                  <td>
                    <span className="ack-count">{moment.acknowledgementCount || 0}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${moment.isActive ? 'active' : 'inactive'}`}>
                      {moment.isActive ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn ghost small" onClick={() => handleEdit(moment)}>
                      Edit
                    </button>
                    {moment.isActive && (
                      <button
                        className="btn ghost small danger"
                        onClick={() => handleArchive(moment)}
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSafetyMomentsPage;
