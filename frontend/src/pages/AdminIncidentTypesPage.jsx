import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const AdminIncidentTypesPage = () => {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/incident-types');
      setTypes(res.data.incidentTypes || []);
    } catch (err) {
      setError('Unable to load incident types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/incident-types/${form.id}`, { name: form.name, description: form.description });
      } else {
        await api.post('/incident-types', { name: form.name, description: form.description });
      }
      setForm({ id: null, name: '', description: '' });
      await loadTypes();
    } catch (err) {
      setError('Unable to save incident type.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.patch(`/incident-types/${id}`, { isActive: false });
      await loadTypes();
    } catch (err) {
      setError('Unable to deactivate incident type.');
    }
  };

  if (loading) return <LoadingState message="Loading incident types..." />;
  if (error && !types.length) return <ErrorState message={error} />;

  return (
    <div className="page">
      <form className="admin-form-card admin-form-card--inline" onSubmit={handleSubmit}>
        <h3>{form.id ? 'Edit Incident Type' : 'Add Incident Type'}</h3>
        {error && <div className="error-text">{error}</div>}
        <div className="admin-form-card__inline-row">
          <label className="field">
            <span>Name *</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Near Miss" />
          </label>
          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional description" />
          </label>
          {form.id && <button className="btn ghost" type="button" onClick={() => setForm({ id: null, name: '', description: '' })}>Cancel</button>}
          <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Type'}</button>
        </div>
      </form>

      {types.length === 0 ? (
        <EmptyState message="No incident types available." />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>{type.description || '?'}</td>
                  <td>
                    <button className="btn ghost" onClick={() => setForm({ id: type.id, name: type.name, description: type.description || '' })}>Edit</button>
                    <button className="btn danger" onClick={() => handleDeactivate(type.id)}>Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted small">Deactivated types disappear from the list (API returns only active types).</div>
        </div>
      )}
    </div>
  );
};

export default AdminIncidentTypesPage;
