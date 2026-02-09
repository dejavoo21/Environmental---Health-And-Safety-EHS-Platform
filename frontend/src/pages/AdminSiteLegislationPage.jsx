import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import {
  getLegislationRefs,
  createLegislationRef,
  updateLegislationRef,
  deleteLegislationRef
} from '../api/safetyAdvisor';
import './AdminSafetyPages.css';

/**
 * Admin Site Legislation Page - Phase 11
 *
 * Manage legislation references that appear in the Safety Advisor.
 * Links regulations to sites for contextual safety guidance.
 *
 * Test Cases: TC-272-1, TC-272-2
 */
const AdminSiteLegislationPage = () => {
  const [legislation, setLegislation] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLeg, setEditingLeg] = useState(null);
  const [form, setForm] = useState({
    title: '',
    refCode: '',
    category: '',
    description: '',
    linkUrl: '',
    siteIds: [],
    isActive: true
  });

  const categories = [
    'Health & Safety',
    'Environmental',
    'Fire Safety',
    'Working at Heights',
    'Electrical',
    'Chemical',
    'PPE',
    'Training',
    'Emergency',
    'General'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [legRes, sitesRes] = await Promise.all([
        getLegislationRefs({ category: filter !== 'all' ? filter : undefined }),
        api.get('/sites')
      ]);
      setLegislation(legRes.legislation || legRes || []);
      setSites(sitesRes.data?.sites || []);
    } catch (err) {
      setError('Unable to load legislation references.');
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
      refCode: '',
      category: '',
      description: '',
      linkUrl: '',
      siteIds: [],
      isActive: true
    });
    setEditingLeg(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (leg) => {
    setForm({
      title: leg.title,
      refCode: leg.refCode || '',
      category: leg.category || '',
      description: leg.description || '',
      linkUrl: leg.linkUrl || '',
      siteIds: leg.siteIds || [],
      isActive: leg.isActive !== false
    });
    setEditingLeg(leg);
    setShowForm(true);
  };

  const handleSiteToggle = (siteId) => {
    setForm(prev => ({
      ...prev,
      siteIds: prev.siteIds.includes(siteId)
        ? prev.siteIds.filter(id => id !== siteId)
        : [...prev.siteIds, siteId]
    }));
  };

  const handleSelectAllSites = () => {
    if (form.siteIds.length === sites.length) {
      setForm(prev => ({ ...prev, siteIds: [] }));
    } else {
      setForm(prev => ({ ...prev, siteIds: sites.map(s => s.id) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingLeg) {
        await updateLegislationRef(editingLeg.id, form);
      } else {
        await createLegislationRef(form);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save legislation reference.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (leg) => {
    if (!window.confirm(`Are you sure you want to delete "${leg.title}"?`)) {
      return;
    }

    try {
      await deleteLegislationRef(leg.id);
      await loadData();
    } catch (err) {
      setError('Unable to delete legislation reference.');
    }
  };

  if (loading) return <LoadingState message="Loading legislation references..." />;
  if (error && !legislation.length && !showForm) return <ErrorState message={error} />;

  return (
    <div className="page admin-safety-page">
      <div className="page-header">
        <div>
          <h2>Site Legislation</h2>
          <p className="muted">Manage legislation and regulatory references for sites</p>
        </div>
        {!showForm && (
          <button className="btn primary" onClick={() => setShowForm(true)}>
            + Add Legislation
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingLeg ? 'Edit Legislation' : 'New Legislation Reference'}</h3>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
          {error && <div className="error-text">{error}</div>}
          <div className="admin-form-card__fields">
            <label className="field">
              <span>Title *</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Working at Heights Regulations 2005"
              />
            </label>
            <label className="field">
              <span>Reference Code</span>
              <input
                type="text"
                value={form.refCode}
                onChange={(e) => setForm(prev => ({ ...prev, refCode: e.target.value }))}
                placeholder="e.g., SI 2005/735"
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
              <span>Link URL</span>
              <input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm(prev => ({ ...prev, linkUrl: e.target.value }))}
                placeholder="https://..."
              />
            </label>
            <label className="field field-full">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this legislation and its relevance..."
                rows={3}
              />
            </label>
            <div className="field field-full">
              <span>Applicable Sites</span>
              <div className="sites-select">
                <label className="site-option select-all">
                  <input
                    type="checkbox"
                    checked={form.siteIds.length === sites.length && sites.length > 0}
                    onChange={handleSelectAllSites}
                  />
                  <span>Select All Sites</span>
                </label>
                <div className="sites-grid">
                  {sites.map(site => (
                    <label key={site.id} className="site-option">
                      <input
                        type="checkbox"
                        checked={form.siteIds.includes(site.id)}
                        onChange={() => handleSiteToggle(site.id)}
                      />
                      <span>{site.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <span>Active (visible in Safety Advisor)</span>
            </label>
          </div>
          <div className="admin-form-card__actions">
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingLeg ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              className={`filter-tab ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {legislation.length === 0 ? (
        <EmptyState message="No legislation references found." />
      ) : (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Reference</th>
                <th>Category</th>
                <th>Sites</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {legislation.map((leg) => (
                <tr key={leg.id}>
                  <td>
                    <div className="leg-title-cell">
                      <span className="leg-title">{leg.title}</span>
                      {leg.linkUrl && (
                        <a
                          href={leg.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="leg-link"
                        >
                          View source →
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    {leg.refCode && (
                      <span className="ref-code">{leg.refCode}</span>
                    )}
                  </td>
                  <td>
                    {leg.category && (
                      <span className="category-badge">{leg.category}</span>
                    )}
                  </td>
                  <td>
                    <span className="sites-count">
                      {leg.siteIds?.length || 0} site{(leg.siteIds?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${leg.isActive ? 'active' : 'inactive'}`}>
                      {leg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn ghost small" onClick={() => handleEdit(leg)}>
                      Edit
                    </button>
                    <button
                      className="btn ghost small danger"
                      onClick={() => handleDelete(leg)}
                    >
                      Delete
                    </button>
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

export default AdminSiteLegislationPage;
