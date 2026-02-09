import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChemicals } from '../api/chemicals';
import api from '../api/client';
import { GHSHazardIcons, SDSStatusBadge, ChemicalStatusBadge } from '../components/chemicals';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import './ChemicalRegisterPage.css';

/**
 * Chemical Register Page
 * List, search, filter chemicals
 * SCR-P7-CHEM-01
 */

const ChemicalRegisterPage = () => {
  const navigate = useNavigate();
  const [chemicals, setChemicals] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hazardFilter, setHazardFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [sdsStatusFilter, setSdsStatusFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadSites = async () => {
    try {
      const res = await api.get('/sites');
      setSites(res.data.sites || []);
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const loadChemicals = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (hazardFilter) params.hazardClass = hazardFilter;
      if (siteFilter) params.siteId = siteFilter;
      if (sdsStatusFilter === 'expired') params.sdsExpired = true;
      if (sdsStatusFilter === 'expiring') params.sdsExpiring = 30;

      const data = await getChemicals(params);
      setChemicals(data.chemicals || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.totalItems || 0);
    } catch (err) {
      setError('Unable to load chemicals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    loadChemicals();
  }, [page, search, statusFilter, hazardFilter, siteFilter, sdsStatusFilter]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setHazardFilter('');
    setSiteFilter('');
    setSdsStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter || hazardFilter || siteFilter || sdsStatusFilter;

  return (
    <div className="page chemical-register-page">
      <div className="page-header">
        <h2>Chemical Register</h2>
        <button className="btn primary" onClick={() => navigate('/chemicals/new')}>
          + Add Chemical
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, CAS number, code..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="phase_out">Phase Out</option>
            <option value="banned">Banned</option>
          </select>
          
          <select value={hazardFilter} onChange={(e) => { setHazardFilter(e.target.value); setPage(1); }}>
            <option value="">All Hazard Classes</option>
            <option value="explosive">Explosive</option>
            <option value="flammable">Flammable</option>
            <option value="oxidizer">Oxidizer</option>
            <option value="compressed_gas">Gas Under Pressure</option>
            <option value="corrosive">Corrosive</option>
            <option value="toxic">Acute Toxicity</option>
            <option value="irritant">Irritant</option>
            <option value="health_hazard">Health Hazard</option>
            <option value="environmental">Environmental</option>
          </select>
          
          <select value={siteFilter} onChange={(e) => { setSiteFilter(e.target.value); setPage(1); }}>
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          
          <select value={sdsStatusFilter} onChange={(e) => { setSdsStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All SDS Status</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring Soon (30 days)</option>
            <option value="expired">Expired</option>
          </select>
          
          {hasActiveFilters && (
            <button className="btn ghost" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingState message="Loading chemicals..." />}
      {error && <ErrorState message={error} />}
      
      {!loading && !error && chemicals.length === 0 && (
        <EmptyState 
          message={hasActiveFilters ? "No chemicals match your filters." : "No chemicals in the register yet."} 
        />
      )}
      
      {!loading && !error && chemicals.length > 0 && (
        <>
          <div className="card table-card">
            <table className="chemical-table">
              <thead>
                <tr>
                  <th>Name / Code</th>
                  <th>CAS Number</th>
                  <th>Hazards</th>
                  <th>SDS Status</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {chemicals.map((chemical) => (
                  <tr 
                    key={chemical.id} 
                    onClick={() => navigate(`/chemicals/${chemical.id}`)}
                    className="clickable-row"
                  >
                    <td>
                      <div className="chemical-name">{chemical.name}</div>
                      <div className="chemical-code">{chemical.internalCode}</div>
                    </td>
                    <td>{chemical.casNumber || '-'}</td>
                    <td>
                      <GHSHazardIcons hazardClasses={chemical.ghsHazardClasses} size="small" />
                    </td>
                    <td>
                      <SDSStatusBadge 
                        expiryDate={chemical.sdsExpiryDate} 
                        hasDocument={!!chemical.sdsVersion} 
                      />
                    </td>
                    <td>
                      <ChemicalStatusBadge status={chemical.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, totalItems)} of {totalItems} chemicals
            </span>
            <div className="pagination-controls">
              <button 
                className="btn ghost" 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className="page-indicator">Page {page} of {totalPages}</span>
              <button 
                className="btn ghost" 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChemicalRegisterPage;
