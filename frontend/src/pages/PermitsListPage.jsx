import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPermits, getPermitTypes, PERMIT_STATUSES } from '../api/permits';
import api from '../api/client';
import { PermitStatusBadge } from '../components/permits';
import { LoadingState, ErrorState, EmptyState, Pagination } from '../components/States';
import AppIcon from '../components/AppIcon';
import './PermitsListPage.css';

/**
 * Permits List Page
 * Searchable, filterable list of all permits
 * SCR-P7-PERM-02
 */

const PermitsListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [permits, setPermits] = useState([]);
  const [sites, setSites] = useState([]);
  const [permitTypes, setPermitTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [permitTypeId, setPermitTypeId] = useState(searchParams.get('type') || '');
  const [siteId, setSiteId] = useState(searchParams.get('site') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  
  const page = parseInt(searchParams.get('page') || '1', 10);

  const loadFilters = async () => {
    try {
      const [sitesRes, typesRes] = await Promise.all([
        api.get('/sites'),
        getPermitTypes()
      ]);
      setSites(sitesRes.data.sites || []);
      setPermitTypes(typesRes.permitTypes || []);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadPermits = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (permitTypeId) params.permitTypeId = permitTypeId;
      if (siteId) params.siteId = siteId;
      if (dateFrom) params.startFrom = dateFrom;
      if (dateTo) params.startTo = dateTo;
      
      const data = await getPermits(params);
      setPermits(data.permits || []);
      setPagination({
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 20
      });
      setError('');
    } catch (err) {
      setError('Unable to load permits.');
    } finally {
      setLoading(false);
    }
  }, [search, status, permitTypeId, siteId, dateFrom, dateTo, page]);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ search, page: 1 });
  };

  const updateParams = (newParams) => {
    const current = Object.fromEntries(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        current[key] = value;
      } else {
        delete current[key];
      }
    });
    setSearchParams(current);
  };

  const handleFilterChange = (name, value) => {
    switch (name) {
      case 'status': setStatus(value); break;
      case 'type': setPermitTypeId(value); break;
      case 'site': setSiteId(value); break;
      case 'from': setDateFrom(value); break;
      case 'to': setDateTo(value); break;
      default: break;
    }
    updateParams({ [name]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage });
  };

  const handleRowClick = (permit) => {
    navigate(`/permits/${permit.id}`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="page permits-list-page">
      <div className="page-header">
        <h2>Permits</h2>
        <button className="btn primary" onClick={() => navigate('/permits/new')}>
          + New Permit
        </button>
      </div>

      {/* Search and Filters */}
      <div className="filters-container">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search permits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn secondary with-icon">
            <AppIcon name="search" size={16} />
            Search
          </button>
        </form>
        
        <div className="filters-row">
          <select 
            value={status} 
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(PERMIT_STATUSES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          <select 
            value={permitTypeId} 
            onChange={(e) => handleFilterChange('type', e.target.value)}
          >
            <option value="">All Types</option>
            {permitTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          
          <select 
            value={siteId} 
            onChange={(e) => handleFilterChange('site', e.target.value)}
          >
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          
          <div className="date-range">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange('from', e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange('to', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && <LoadingState message="Loading permits..." />}
      {error && <ErrorState message={error} />}
      
      {!loading && !error && permits.length === 0 && (
        <EmptyState message="No permits found. Try adjusting your filters or create a new permit." />
      )}
      
      {!loading && !error && permits.length > 0 && (
        <>
          <div className="permits-table-wrapper">
            <table className="permits-table">
              <thead>
                <tr>
                  <th>Permit #</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Site / Location</th>
                  <th>Requested By</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {permits.map((permit) => (
                  <tr 
                    key={permit.id} 
                    className="clickable"
                    onClick={() => handleRowClick(permit)}
                  >
                    <td className="permit-number">{permit.permitNumber}</td>
                    <td>
                      <span className="permit-type">
                        <AppIcon name={permit.permitType?.icon || 'clipboard'} size={16} /> {permit.permitType?.name || '-'}
                      </span>
                    </td>
                    <td>
                      <PermitStatusBadge status={permit.status} />
                    </td>
                    <td>
                      <div className="location-cell">
                        <span className="site">{permit.site?.name || '-'}</span>
                        {permit.location && <span className="location">{permit.location}</span>}
                      </div>
                    </td>
                    <td>{permit.requestedBy?.fullName || '-'}</td>
                    <td>{formatDate(permit.startTime)}</td>
                    <td>{formatDate(permit.endTime)}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn ghost small"
                        onClick={() => navigate(`/permits/${permit.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
          
          <div className="results-summary">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} permits
          </div>
        </>
      )}
    </div>
  );
};

export default PermitsListPage;

