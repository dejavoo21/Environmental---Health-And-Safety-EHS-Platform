import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, LoadingState } from '../components/States';

const InspectionNewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState({ siteId: '', templateId: '', performedAt: '', notes: '' });
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [sitesRes, templateRes] = await Promise.all([
          api.get('/sites'),
          api.get('/inspection-templates')
        ]);
        setSites(sitesRes.data.sites || []);
        setTemplates(templateRes.data.templates || []);
      } catch (err) {
        setError('Unable to load inspection form data.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadTemplate = async () => {
      if (!form.templateId) {
        setTemplate(null);
        return;
      }

      try {
        const res = await api.get(`/inspection-templates/${form.templateId}`);
        setTemplate(res.data);
        const initialResponses = {};
        res.data.items.forEach((item) => {
          initialResponses[item.id] = { result: 'ok', comment: '' };
        });
        setResponses(initialResponses);
      } catch (err) {
        setError('Unable to load template details.');
      }
    };

    loadTemplate();
  }, [form.templateId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.siteId || !form.templateId || !form.performedAt) {
      setError('Site, template, and date/time are required.');
      return;
    }

    if (!template || !template.items?.length) {
      setError('Template has no checklist items.');
      return;
    }

    const responsePayload = template.items.map((item) => ({
      templateItemId: item.id,
      result: responses[item.id]?.result || 'ok',
      comment: responses[item.id]?.comment || null
    }));

    // Convert datetime-local value to ISO string with timezone
    const performedAtISO = new Date(form.performedAt).toISOString();

    setSaving(true);
    try {
      const res = await api.post('/inspections', {
        templateId: form.templateId,
        siteId: form.siteId,
        performedAt: performedAtISO,
        notes: form.notes || undefined,
        responses: responsePayload
      });
      navigate(`/inspections/${res.data.id}`);
    } catch (err) {
      // Show server error message if available
      const serverMessage = err.response?.data?.error;
      setError(serverMessage || 'Failed to create inspection.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading inspection form..." />;
  if (error && !sites.length) return <ErrorState message={error} />;

  // Improved empty state with specific messages
  const isAdmin = user?.role === 'admin';
  if (!sites.length && !templates.length) {
    return (
      <div className="card form-card">
        <h3>New Inspection</h3>
        <div className="empty-setup-message">
          <p>Cannot create an inspection: no sites or templates have been configured.</p>
          {isAdmin ? (
            <p>
              Please set up <Link to="/admin/sites">Sites</Link> and{' '}
              <Link to="/admin/templates">Inspection Templates</Link> first.
            </p>
          ) : (
            <p>Please contact an administrator to set up sites and templates.</p>
          )}
        </div>
      </div>
    );
  }
  if (!sites.length) {
    return (
      <div className="card form-card">
        <h3>New Inspection</h3>
        <div className="empty-setup-message">
          <p>Cannot create an inspection: no sites have been configured.</p>
          {isAdmin ? (
            <p>Please set up <Link to="/admin/sites">Sites</Link> first.</p>
          ) : (
            <p>Please contact an administrator to set up sites.</p>
          )}
        </div>
      </div>
    );
  }
  if (!templates.length) {
    return (
      <div className="card form-card">
        <h3>New Inspection</h3>
        <div className="empty-setup-message">
          <p>Cannot create an inspection: no inspection templates have been configured.</p>
          {isAdmin ? (
            <p>Please set up <Link to="/admin/templates">Inspection Templates</Link> first.</p>
          ) : (
            <p>Please contact an administrator to set up inspection templates.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h3>New Inspection</h3>
      {error && <div className="error-text">{error}</div>}

      <div className="form-grid">
        <label className="field">
          <span>Site *</span>
          <select value={form.siteId} onChange={(e) => setForm((prev) => ({ ...prev, siteId: e.target.value }))}>
            <option value="">Select site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Template *</span>
          <select value={form.templateId} onChange={(e) => setForm((prev) => ({ ...prev, templateId: e.target.value }))}>
            <option value="">Select template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Performed At *</span>
          <input type="datetime-local" value={form.performedAt} onChange={(e) => setForm((prev) => ({ ...prev, performedAt: e.target.value }))} />
        </label>
      </div>

      {template && (
        <div className="checklist">
          <h4>Checklist Items</h4>
          {template.items.map((item) => (
            <div key={item.id} className="checklist-item">
              <div>
                <div className="item-label">{item.label}</div>
                <div className="muted">{item.category || 'General'}</div>
              </div>
              <div className="item-actions">
                <select
                  value={responses[item.id]?.result || 'ok'}
                  onChange={(e) => setResponses((prev) => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], result: e.target.value }
                  }))}
                >
                  <option value="ok">OK</option>
                  <option value="not_ok">Not OK</option>
                  <option value="na">N/A</option>
                </select>
                <input
                  placeholder="Comment"
                  value={responses[item.id]?.comment || ''}
                  onChange={(e) => setResponses((prev) => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], comment: e.target.value }
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="field">
        <span>Notes</span>
        <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={3} />
      </label>

      <div className="form-actions">
        <button className="btn ghost" type="button" onClick={() => navigate('/inspections')}>Cancel</button>
        <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Submit Inspection'}</button>
      </div>
    </form>
  );
};

export default InspectionNewPage;
