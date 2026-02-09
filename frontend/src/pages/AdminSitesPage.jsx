import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const AdminSitesPage = () => {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', code: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sites');
      setSites(res.data.sites || []);
    } catch (err) {
      setError('Unable to load sites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name || !form.code) {
      setError('Name and code are required.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/sites/${form.id}`, { name: form.name, code: form.code });
      } else {
        await api.post('/sites', { name: form.name, code: form.code });
      }
      setForm({ id: null, name: '', code: '' });
      await loadSites();
    } catch (err) {
      setError('Unable to save site.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading sites..." />;
  if (error && !sites.length) return <ErrorState message={error} />;

  return (
    <div className="page">
      <form className="admin-form-card" onSubmit={handleSubmit}>
        <h3>{form.id ? 'Edit Site' : 'Add Site'}</h3>
        {error && <div className="error-text">{error}</div>}
        <div className="admin-form-card__fields">
          <label className="field">
            <span>Name *</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Main Warehouse" />
          </label>
          <label className="field">
            <span>Code *</span>
            <input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="e.g. MWH" />
          </label>
        </div>
        <div className="admin-form-card__actions">
          {form.id && <button className="btn ghost" type="button" onClick={() => setForm({ id: null, name: '', code: '' })}>Cancel</button>}
          <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Site'}</button>
        </div>
      </form>

      {sites.length === 0 ? (
        <EmptyState message="No sites available." />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id}>
                  <td>{site.name}</td>
                  <td>{site.code}</td>
                  <td>
                    <button className="btn ghost" onClick={() => setForm({ id: site.id, name: site.name, code: site.code })}>Edit</button>
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

export default AdminSitesPage;
