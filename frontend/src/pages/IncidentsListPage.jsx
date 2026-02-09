import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

import './IncidentsStatusBadge.css';

const IncidentsListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [incidents, setIncidents] = useState([]);
  const [sites, setSites] = useState([]);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [siteFilter, setSiteFilter] = useState(() => searchParams.get('siteId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSites = async () => {
    const res = await api.get('/sites');
    setSites(res.data.sites || []);
  };

  const loadIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (siteFilter) params.siteId = siteFilter;

      const res = await api.get('/incidents', { params });
      setIncidents(res.data.incidents || []);
    } catch (err) {
      setError('Unable to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    const nextStatus = searchParams.get('status') || '';
    const nextSite = searchParams.get('siteId') || '';
    setStatusFilter(nextStatus);
    setSiteFilter(nextSite);
  }, [searchParams]);

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, siteFilter]);

  if (loading) return <LoadingState message="Loading incidents..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="page">
      <div className="page-actions">
        <button className="btn primary" onClick={() => navigate('/incidents/new')}>New Incident</button>
      </div>

      <div className="filter-bar-v2">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Site</label>
          <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
      </div>

      {incidents.length === 0 ? (
        <EmptyState message="No incidents found." />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Type</th>
                <th>Site</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)}>
                  <td>{new Date(incident.occurredAt).toLocaleDateString()}</td>
                  <td>{incident.title}</td>
                  <td>{incident.incidentType?.name}</td>
                  <td>{incident.site?.name}</td>
                  <td>{incident.severity}</td>
                  <td>
                    <span className={getStatusBadgeClass(incident.status)}>
                      {incident.status.replace('_', ' ')}
                    </span>
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

// Helper function for status badge class
function getStatusBadgeClass(status) {
  switch (status) {
    case 'open': return 'badge status-open';
    case 'under_investigation': return 'badge status-progress';
    case 'closed': return 'badge status-done';
    case 'overdue': return 'badge status-overdue';
    default: return 'badge';
  }
}

export default IncidentsListPage;
