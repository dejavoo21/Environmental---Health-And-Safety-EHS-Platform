import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const AdminTemplatesPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inspection-templates');
      setTemplates(res.data.templates || []);
    } catch (err) {
      setError('Unable to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
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
      const res = await api.post('/inspection-templates', {
        name: form.name,
        description: form.description,
        items: []
      });
      setForm({ name: '', description: '' });
      await loadTemplates();
      navigate(`/admin/templates/${res.data.id}`);
    } catch (err) {
      setError('Unable to create template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading templates..." />;
  if (error && !templates.length) return <ErrorState message={error} />;

  return (
    <div className="page">
      <form className="admin-form-card admin-form-card--inline" onSubmit={handleSubmit}>
        <h3>Create Template</h3>
        {error && <div className="error-text">{error}</div>}
        <div className="admin-form-card__inline-row">
          <label className="field">
            <span>Name *</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Daily Site Inspection" />
          </label>
          <label className="field">
            <span>Description</span>
            <input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional description" />
          </label>
          <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Template'}</button>
        </div>
      </form>

      {templates.length === 0 ? (
        <EmptyState message="No templates yet." />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>{template.description || '?'}</td>
                  <td>{template.itemCount}</td>
                  <td>
                    <button className="btn primary" onClick={() => navigate(`/admin/templates/${template.id}`)}>Manage</button>
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

export default AdminTemplatesPage;
