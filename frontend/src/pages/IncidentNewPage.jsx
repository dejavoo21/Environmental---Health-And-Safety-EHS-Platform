import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const IncidentNewPage = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    incidentTypeId: '',
    siteId: '',
    severity: 'medium',
    occurredAt: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [sitesRes, typesRes] = await Promise.all([
          api.get('/sites'),
          api.get('/incident-types')
        ]);
        setSites(sitesRes.data.sites || []);
        setTypes(typesRes.data.incidentTypes || []);
      } catch (err) {
        setError('Unable to load form data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title || !form.incidentTypeId || !form.siteId || !form.severity || !form.occurredAt) {
      setError('All required fields must be filled.');
      return;
    }

    // Convert datetime-local value to ISO string with timezone
    const occurredAtISO = new Date(form.occurredAt).toISOString();

    setSaving(true);
    try {
      const res = await api.post('/incidents', {
        title: form.title,
        description: form.description || undefined,
        incidentTypeId: form.incidentTypeId,
        siteId: form.siteId,
        severity: form.severity,
        occurredAt: occurredAtISO
      });
      navigate(`/incidents/${res.data.id}`);
    } catch (err) {
      // Show server error message if available
      const serverMessage = err.response?.data?.error;
      setError(serverMessage || 'Failed to create incident.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading incident form..." />;
  if (error && !sites.length) return <ErrorState message={error} />;
  if (!sites.length || !types.length) return <EmptyState message="No sites or incident types available." />;

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h3>New Incident</h3>
      {error && <div className="error-text">{error}</div>}

      <label className="field">
        <span>Title *</span>
        <input value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
      </label>

      <label className="field">
        <span>Incident Type *</span>
        <select value={form.incidentTypeId} onChange={(e) => handleChange('incidentTypeId', e.target.value)}>
          <option value="">Select type</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Site *</span>
        <select value={form.siteId} onChange={(e) => handleChange('siteId', e.target.value)}>
          <option value="">Select site</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Severity *</span>
        <select value={form.severity} onChange={(e) => handleChange('severity', e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </label>

      <label className="field">
        <span>Date & Time *</span>
        <input type="datetime-local" value={form.occurredAt} onChange={(e) => handleChange('occurredAt', e.target.value)} />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} />
      </label>

      <div className="form-actions">
        <button className="btn ghost" type="button" onClick={() => navigate('/incidents')}>Cancel</button>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Incident'}</button>
      </div>
    </form>
  );
};

export default IncidentNewPage;
