import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'AE', name: 'United Arab Emirates' }
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
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Accra',
  'Asia/Dubai',
  'Australia/Sydney'
];

const getTimezonesForCountry = (countryCode) => {
  const countryTimezones = {
    // North America
    'US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'],
    'CA': ['America/Toronto', 'America/Vancouver', 'America/Winnipeg', 'America/Calgary'],
    'MX': ['America/Mexico_City', 'America/Monterrey', 'America/Cancun'],
    // South America
    'BR': ['America/Sao_Paulo', 'America/Rio_Branco', 'America/Manaus'],
    'AR': ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba'],
    'CL': ['America/Santiago', 'America/Punta_Arenas'],
    'CO': ['America/Bogota'],
    'PE': ['America/Lima'],
    // Europe
    'GB': ['Europe/London'],
    'FR': ['Europe/Paris'],
    'DE': ['Europe/Berlin'],
    'ES': ['Europe/Madrid'],
    'IT': ['Europe/Rome'],
    'NL': ['Europe/Amsterdam'],
    'PL': ['Europe/Warsaw'],
    'RU': ['Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Vladivostok'],
    // Asia
    'JP': ['Asia/Tokyo'],
    'IN': ['Asia/Kolkata'],
    'CN': ['Asia/Shanghai'],
    'AU': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth'],
    'SG': ['Asia/Singapore'],
    'TH': ['Asia/Bangkok'],
    'ID': ['Asia/Jakarta'],
    // Africa
    'ZA': ['Africa/Johannesburg'],
    'EG': ['Africa/Cairo'],
    'NG': ['Africa/Lagos'],
    'KE': ['Africa/Nairobi'],
    'ET': ['Africa/Addis_Ababa'],
    'GH': ['Africa/Accra'],
    'MA': ['Africa/Casablanca'],
    // Middle East
    'AE': ['Asia/Dubai']
  };
  return countryTimezones[countryCode] || TIMEZONES;
};

// City to coordinates mapping for automatic population
const CITY_COORDINATES = {
  // NORTH AMERICA
  'US': {
    'New York': { lat: 40.7128, lon: -74.0060 },
    'Los Angeles': { lat: 34.0522, lon: -118.2437 },
    'Chicago': { lat: 41.8781, lon: -87.6298 },
    'Houston': { lat: 29.7604, lon: -95.3698 },
    'Phoenix': { lat: 33.4484, lon: -112.0742 },
    'Philadelphia': { lat: 39.9526, lon: -75.1652 },
    'San Antonio': { lat: 29.4241, lon: -98.4936 },
    'San Diego': { lat: 32.7157, lon: -117.1611 },
    'Dallas': { lat: 32.7767, lon: -96.7970 },
    'San Jose': { lat: 37.3382, lon: -121.8863 }
  },
  'CA': {
    'Toronto': { lat: 43.6629, lon: -79.3957 },
    'Montreal': { lat: 45.5017, lon: -73.5673 },
    'Vancouver': { lat: 49.2827, lon: -123.1207 },
    'Calgary': { lat: 51.0447, lon: -114.0719 },
    'Edmonton': { lat: 53.5461, lon: -113.4938 },
    'Ottawa': { lat: 45.4215, lon: -75.6972 },
    'Winnipeg': { lat: 49.8951, lon: -97.1384 },
    'Quebec City': { lat: 46.8139, lon: -71.2080 }
  },
  'MX': {
    'Mexico City': { lat: 19.4326, lon: -99.1332 },
    'Monterrey': { lat: 25.6866, lon: -100.3161 },
    'Cancun': { lat: 21.1619, lon: -86.8515 },
    'Guadalajara': { lat: 20.6596, lon: -103.2494 }
  },
  // SOUTH AMERICA
  'BR': {
    'São Paulo': { lat: -23.5505, lon: -46.6333 },
    'Rio de Janeiro': { lat: -22.9068, lon: -43.1729 },
    'Brasília': { lat: -15.7942, lon: -47.8822 },
    'Salvador': { lat: -12.9714, lon: -38.5014 },
    'Fortaleza': { lat: -3.7319, lon: -38.5267 }
  },
  'AR': {
    'Buenos Aires': { lat: -34.6037, lon: -58.3816 },
    'Córdoba': { lat: -31.4135, lon: -64.1895 },
    'Rosario': { lat: -32.9442, lon: -60.6500 },
    'La Plata': { lat: -34.9205, lon: -57.9545 }
  },
  'CL': {
    'Santiago': { lat: -33.4489, lon: -70.6693 },
    'Valparaíso': { lat: -33.0472, lon: -71.6127 },
    'Puerta Montt': { lat: -41.3272, lon: -72.7522 },
    'La Serena': { lat: -29.9037, lon: -71.5522 }
  },
  'CO': {
    'Bogotá': { lat: 4.7110, lon: -74.0721 },
    'Medellín': { lat: 6.2442, lon: -75.5812 },
    'Cali': { lat: 3.4372, lon: -76.5197 },
    'Barranquilla': { lat: 10.9639, lon: -74.7964 }
  },
  'PE': {
    'Lima': { lat: -12.0464, lon: -77.0428 },
    'Arequipa': { lat: -16.3889, lon: -71.5350 },
    'Cusco': { lat: -13.5320, lon: -71.9789 }
  },
  // EUROPE
  'GB': {
    'London': { lat: 51.5074, lon: -0.1278 },
    'Manchester': { lat: 53.4808, lon: -2.2426 },
    'Birmingham': { lat: 52.4862, lon: -1.8904 },
    'Bristol': { lat: 51.4545, lon: -2.5879 },
    'Leeds': { lat: 53.8008, lon: -1.5491 },
    'Edinburgh': { lat: 55.9533, lon: -3.1883 },
    'Glasgow': { lat: 55.8642, lon: -4.2518 },
    'Liverpool': { lat: 53.4084, lon: -2.9916 }
  },
  'FR': {
    'Paris': { lat: 48.8566, lon: 2.3522 },
    'Lyon': { lat: 45.7640, lon: 4.8357 },
    'Marseille': { lat: 43.2965, lon: 5.3698 },
    'Toulouse': { lat: 43.6047, lon: 1.4442 },
    'Nice': { lat: 43.7102, lon: 7.2620 }
  },
  'DE': {
    'Berlin': { lat: 52.5200, lon: 13.4050 },
    'Munich': { lat: 48.1351, lon: 11.5820 },
    'Hamburg': { lat: 53.5511, lon: 9.4769 },
    'Cologne': { lat: 50.9375, lon: 6.9603 },
    'Frankfurt': { lat: 50.1109, lon: 8.6821 }
  },
  'ES': {
    'Madrid': { lat: 40.4168, lon: -3.7038 },
    'Barcelona': { lat: 41.3851, lon: 2.1734 },
    'Valencia': { lat: 39.4699, lon: -0.3763 },
    'Seville': { lat: 37.3886, lon: -5.9823 },
    'Málaga': { lat: 36.7213, lon: -4.4214 }
  },
  'IT': {
    'Rome': { lat: 41.9028, lon: 12.4964 },
    'Milan': { lat: 45.4642, lon: 9.1900 },
    'Naples': { lat: 40.8518, lon: 14.2681 },
    'Florence': { lat: 43.7695, lon: 11.2558 },
    'Venice': { lat: 45.4408, lon: 12.3155 }
  },
  'NL': {
    'Amsterdam': { lat: 52.3676, lon: 4.9041 },
    'Rotterdam': { lat: 51.9225, lon: 4.4792 },
    'The Hague': { lat: 52.0705, lon: 4.3007 },
    'Utrecht': { lat: 52.0907, lon: 5.1214 }
  },
  'PL': {
    'Warsaw': { lat: 52.2297, lon: 21.0122 },
    'Krakow': { lat: 50.0647, lon: 19.9450 },
    'Wroclaw': { lat: 51.1079, lon: 17.0385 },
    'Gdansk': { lat: 54.3520, lon: 18.6466 }
  },
  'RU': {
    'Moscow': { lat: 55.7558, lon: 37.6173 },
    'Saint Petersburg': { lat: 59.9311, lon: 30.3609 },
    'Novosibirsk': { lat: 55.0084, lon: 82.9357 },
    'Yekaterinburg': { lat: 56.8389, lon: 60.6057 },
    'Vladivostok': { lat: 43.1135, lon: 131.8859 }
  },
  // ASIA
  'JP': {
    'Tokyo': { lat: 35.6762, lon: 139.6503 },
    'Osaka': { lat: 34.6937, lon: 135.5023 },
    'Kyoto': { lat: 35.0116, lon: 135.7681 },
    'Yokohama': { lat: 35.4437, lon: 139.6380 },
    'Sapporo': { lat: 43.0642, lon: 141.3469 }
  },
  'IN': {
    'Delhi': { lat: 28.7041, lon: 77.1025 },
    'Mumbai': { lat: 19.0760, lon: 72.8777 },
    'Bangalore': { lat: 12.9716, lon: 77.5946 },
    'Kolkata': { lat: 22.5726, lon: 88.3639 },
    'Chennai': { lat: 13.0827, lon: 80.2707 }
  },
  'CN': {
    'Beijing': { lat: 39.9042, lon: 116.4074 },
    'Shanghai': { lat: 31.2304, lon: 121.4737 },
    'Guangzhou': { lat: 23.1291, lon: 113.2644 },
    'Shenzhen': { lat: 22.5431, lon: 114.0579 },
    'Chengdu': { lat: 30.5728, lon: 104.0668 }
  },
  'AU': {
    'Sydney': { lat: -33.8688, lon: 151.2093 },
    'Melbourne': { lat: -37.8136, lon: 144.9631 },
    'Brisbane': { lat: -27.4698, lon: 153.0251 },
    'Perth': { lat: -31.9505, lon: 115.8605 },
    'Adelaide': { lat: -34.9285, lon: 138.6007 }
  },
  'SG': {
    'Singapore': { lat: 1.3521, lon: 103.8198 }
  },
  'TH': {
    'Bangkok': { lat: 13.7563, lon: 100.5018 },
    'Chiang Mai': { lat: 18.7883, lon: 98.9853 },
    'Pattaya': { lat: 12.9271, lon: 100.8765 }
  },
  'ID': {
    'Jakarta': { lat: -6.2088, lon: 106.8456 },
    'Surabaya': { lat: -7.2575, lon: 112.7521 },
    'Bandung': { lat: -6.9175, lon: 107.6191 },
    'Medan': { lat: 3.1957, lon: 98.6722 }
  },
  // AFRICA
  'ZA': {
    'Johannesburg': { lat: -26.2023, lon: 28.0436 },
    'Cape Town': { lat: -33.9249, lon: 18.4241 },
    'Durban': { lat: -29.8587, lon: 31.0218 },
    'Pretoria': { lat: -25.7461, lon: 28.2293 },
    'Port Elizabeth': { lat: -33.9685, lon: 25.6068 }
  },
  'EG': {
    'Cairo': { lat: 30.0444, lon: 31.2357 },
    'Alexandria': { lat: 31.2001, lon: 29.9187 },
    'Giza': { lat: 30.0131, lon: 31.2089 },
    'Luxor': { lat: 25.6872, lon: 32.6396 }
  },
  'NG': {
    'Lagos': { lat: 6.5244, lon: 3.3792 },
    'Abuja': { lat: 9.0765, lon: 7.3986 },
    'Kano': { lat: 12.0022, lon: 8.6753 },
    'Ibadan': { lat: 7.3957, lon: 3.8711 }
  },
  'KE': {
    'Nairobi': { lat: -1.2921, lon: 36.8219 },
    'Mombasa': { lat: -4.0435, lon: 39.6682 },
    'Kisumu': { lat: -0.1022, lon: 34.7617 }
  },
  'ET': {
    'Addis Ababa': { lat: 9.0320, lon: 38.7469 },
    'Dire Dawa': { lat: 9.5898, lon: 41.8625 }
  },
  'GH': {
    'Accra': { lat: 5.6037, lon: -0.1870 },
    'Kumasi': { lat: 6.6749, lon: -1.6236 },
    'Sekondi-Takoradi': { lat: 4.8916, lon: -2.0042 }
  },
  'MA': {
    'Casablanca': { lat: 33.5731, lon: -7.5898 },
    'Fez': { lat: 34.0657, lon: -5.0055 },
    'Marrakech': { lat: 31.6295, lon: -8.0088 },
    'Tangier': { lat: 35.7595, lon: -5.8340 }
  }
};

const getCoordinatesForCity = (country, city) => {
  if (!country || !city) return null;
  const cityData = CITY_COORDINATES[country]?.[city];
  return cityData ? { latitude: cityData.lat, longitude: cityData.lon } : null;
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

  const handleAddNew = () => {
    resetForm();
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
      timezone: newTimezones[0],
      city: '', // Reset city when country changes
      latitude: '',
      longitude: ''
    }));
  };

  const handleCityChange = (newCity) => {
    const coords = getCoordinatesForCity(form.country_code, newCity);
    setForm(prev => ({
      ...prev,
      city: newCity,
      latitude: coords ? coords.latitude.toString() : '',
      longitude: coords ? coords.longitude.toString() : ''
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
                  onChange={(e) => handleCityChange(e.target.value)} 
                  placeholder="e.g. London"
                  required
                />
                {form.city && !getCoordinatesForCity(form.country_code, form.city) && (
                  <small style={{ color: '#ff9800', marginTop: '4px' }}>Coordinates will be filled automatically for known cities</small>
                )}
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
          <div className="admin-table-header">
            <h3>Sites</h3>
            <button className="btn primary" onClick={handleAddNew}>+ Add New Site</button>
          </div>
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
