import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'ZA', name: 'South Africa' }
];

const TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Africa/Johannesburg',
  'Australia/Sydney'
];

const getTimezonesForCountry = (countryCode) => {
  const countryTimezones = {
    'GB': ['Europe/London'],
    'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    'CA': ['America/Toronto', 'America/Vancouver'],
    'ZA': ['Africa/Johannesburg']
  };
  return countryTimezones[countryCode] || TIMEZONES;
};

const AdminSitesPage = () => {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ id: null, name: '', code: '', country_code: 'GB', city: '', timezone: 'Europe/London', latitude: null, longitude: null });
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

  const resetForm = () => {
    setForm({ id: null, name: '', code: '', country_code: 'GB', city: '', timezone: 'Europe/London', latitude: null, longitude: null });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    
    if (!form.name || !form.code || !form.country_code || !form.city || !form.timezone) {
      setError('Name, Code, Country, City, and Timezone are required.');
      return;
    }

    // Validate coordinates if provided
    if ((form.latitude !== null || form.longitude !== null) && (!form.latitude || !form.longitude || isNaN(form.latitude) || isNaN(form.longitude))) {
      setError('Latitude and Longitude must both be valid numbers if provided.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        country_code: form.country_code,
        city: form.city,
        timezone: form.timezone,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null
      };

      if (form.id) {
        await api.put(`/sites/${form.id}`, payload);
      } else {
        await api.post('/sites', payload);
      }
      resetForm();
      await loadSites();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save site.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (site) => {
    setForm({
      id: site.id,
      name: site.name,
      code: site.code,
      country_code: site.country_code || 'GB',
      city: site.city || '',
      timezone: site.timezone || 'Europe/London',
      latitude: site.latitude || null,
      longitude: site.longitude || null
    });
  };

  const handleCountryChange = (newCountry) => {
    const newTimezones = getTimezonesForCountry(newCountry);
    setForm(prev => ({
      ...prev,
      country_code: newCountry,
      timezone: newTimezones[0]
    }));
  };

  if (loading) return <LoadingState message="Loading sites..." />;
  if (error && !sites.length) return <ErrorState message={error} />;

  const availableTimezones = getTimezonesForCountry(form.country_code);

  return (
    <div className="page admin-sites-page">
      <div className="admin-content-container">
        {/* Left Column: Form */}
        <div className="admin-form-column">
          <form className="admin-form-card" onSubmit={handleSubmit}>
            <h3>{form.id ? 'Edit Site' : 'Add Site'}</h3>
            {error && <div className="error-text">{error}</div>}
            
            <div className="admin-form-card__fields">
              {/* Row 1: Name, Code */}
              <label className="field">
                <span>Name *</span>
                <input 
                  value={form.name} 
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} 
                  placeholder="e.g. Head Office"
                  required
                />
              </label>
              <label className="field">
                <span>Code *</span>
                <input 
                  value={form.code} 
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} 
                  placeholder="e.g. HO"
                  required
                />
              </label>

              {/* Row 2: Country, City */}
              <label className="field">
                <span>Country *</span>
                <select 
                  value={form.country_code} 
                  onChange={(e) => handleCountryChange(e.target.value)}
                  required
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>City *</span>
                <input 
                  value={form.city} 
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} 
                  placeholder="e.g. London"
                  required
                />
              </label>

              {/* Row 3: Timezone */}
              <label className="field field-full">
                <span>Timezone *</span>
                <select 
                  value={form.timezone} 
                  onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  required
                >
                  {availableTimezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </label>

              {/* Row 4: Latitude, Longitude (optional) */}
              <label className="field">
                <span>Latitude (optional)</span>
                <input 
                  type="number" 
                  step="0.0001"
                  value={form.latitude !== null ? form.latitude : ''} 
                  onChange={(e) => setForm((prev) => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))} 
                  placeholder="e.g. 51.5074"
                />
              </label>
              <label className="field">
                <span>Longitude (optional)</span>
                <input 
                  type="number" 
                  step="0.0001"
                  value={form.longitude !== null ? form.longitude : ''} 
                  onChange={(e) => setForm((prev) => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))} 
                  placeholder="e.g. -0.1278"
                />
              </label>
            </div>

            <div className="admin-form-card__actions">
              {form.id && <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>}
              <button className="btn primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Site'}</button>
            </div>
          </form>
        </div>

        {/* Right Column: Table */}
        <div className="admin-table-column">
          {sites.length === 0 ? (
            <EmptyState message="No sites available." />
          ) : (
            <div className="card table-card">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th>Timezone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id}>
                      <td><strong>{site.name}</strong></td>
                      <td><code>{site.code}</code></td>
                      <td>{site.city}, {site.country_code || 'Unknown'}</td>
                      <td>{site.timezone || '-'}</td>
                      <td>
                        <button className="btn ghost" onClick={() => handleEdit(site)}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSitesPage;
