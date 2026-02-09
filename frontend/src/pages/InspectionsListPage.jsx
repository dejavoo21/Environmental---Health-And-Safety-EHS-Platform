import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import './IncidentsStatusBadge.css';

const InspectionsListPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inspections, setInspections] = useState([]);
  const [sites, setSites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState(() => ({
    siteId: searchParams.get('siteId') || '',
    templateId: searchParams.get('templateId') || '',
    result: searchParams.get('result') || ''
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [siteRes, templateRes] = await Promise.all([
          api.get('/sites'),
          api.get('/inspection-templates')
        ]);
        setSites(siteRes.data.sites || []);
        setTemplates(templateRes.data.templates || []);
      } catch (err) {
        setError('Unable to load filters.');
      }
    };
    load();
  }, []);

  useEffect(() => {
    setFilters({
      siteId: searchParams.get('siteId') || '',
      templateId: searchParams.get('templateId') || '',
      result: searchParams.get('result') || ''
    });
  }, [searchParams]);

  const loadInspections = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.siteId) params.siteId = filters.siteId;
      if (filters.templateId) params.templateId = filters.templateId;
      if (filters.result) params.result = filters.result;

      const res = await api.get('/inspections', { params });
      setInspections(res.data.inspections || []);
    } catch (err) {
      setError('Unable to load inspections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [filters]);

  if (loading) return <LoadingState message="Loading inspections..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="page">
      <div className="page-actions">
        <button className="btn primary" onClick={() => navigate('/inspections/new')}>New Inspection</button>
      </div>

      <div className="filter-bar-v2">
        <div className="filter-group">
          <label>Site</label>
          <select value={filters.siteId} onChange={(e) => setFilters((prev) => ({ ...prev, siteId: e.target.value }))}>
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Template</label>
          <select value={filters.templateId} onChange={(e) => setFilters((prev) => ({ ...prev, templateId: e.target.value }))}>
            <option value="">All Templates</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Result</label>
          <select value={filters.result} onChange={(e) => setFilters((prev) => ({ ...prev, result: e.target.value }))}>
            <option value="">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </div>
      </div>

      {inspections.length === 0 ? (
        <EmptyState message="No inspections found." />
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Template</th>
                <th>Site</th>
                <th>Performed By</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((inspection) => (
                <tr key={inspection.id} onClick={() => navigate(`/inspections/${inspection.id}`)}>
                  <td>{new Date(inspection.performedAt).toLocaleDateString()}</td>
                  <td>{inspection.template?.name}</td>
                  <td>{inspection.site?.name}</td>
                  <td>{inspection.performedBy?.name}</td>
                  <td>
                    <span className={`badge status-${inspection.overallResult?.toLowerCase()}`}>
                      {inspection.overallResult}
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

export default InspectionsListPage;
