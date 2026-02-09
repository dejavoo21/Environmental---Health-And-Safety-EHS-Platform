import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  listRisks,
  listCategories,
  getTopRisks,
  getUpcomingReviews
} from '../api/risks';
import {
  RiskLevelBadge,
  RiskStatusBadge,
  RiskFilters,
  RiskSummaryCards
} from '../components/risks';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import AppIcon from '../components/AppIcon';
import './RisksListPage.css';


const RisksListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [risks, setRisks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);
  const [upcomingReviews, setUpcomingReviews] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    categoryId: searchParams.get('categoryId') || '',
    siteId: searchParams.get('siteId') || '',
    level: searchParams.get('level') || '',
    search: searchParams.get('search') || ''
  });
  
  const [sortField, setSortField] = useState('residual_score');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Check permissions
  const canCreate = user?.role === 'manager' || user?.role === 'admin';
  const canViewHeatmap = user?.role === 'manager' || user?.role === 'admin';
  
  // Fetch risks
  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortField,
        sortOrder
      };
      
      // Add filters
      if (filters.status) params.status = filters.status;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.siteId) params.siteId = filters.siteId;
      if (filters.level) params.level = filters.level;
      if (filters.search) params.search = filters.search;
      
      const response = await listRisks(params);
      
      // Response is { data: { risks, pagination, summary } }
      const result = response.data || response;
      setRisks(result.risks || []);
      setPagination(prev => ({
        ...prev,
        total: result.pagination?.totalItems || 0,
        totalPages: result.pagination?.totalPages || 0
      }));
      setSummary(result.summary || null);
      
    } catch (err) {
      console.error('Error fetching risks:', err);
      setError(err.message || 'Failed to load risks');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortField, sortOrder, filters]);
  
  // Fetch categories for filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await listCategories();
      const result = response.data || response;
      setCategories(result.categories || result || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);
  
  // Fetch summary data
  const fetchSummaryData = useCallback(async () => {
    try {
      const [topResponse, reviewsResponse] = await Promise.all([
        getTopRisks({ limit: 5 }),
        getUpcomingReviews({ limit: 5 })
      ]);
      const topResult = topResponse.data || topResponse;
      const reviewsResult = reviewsResponse.data || reviewsResponse;
      setTopRisks(topResult.risks || topResult || []);
      setUpcomingReviews(reviewsResult.reviews || reviewsResult || []);
    } catch (err) {
      console.error('Error fetching summary data:', err);
    }
  }, []);
  
  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);
  
  useEffect(() => {
    fetchCategories();
    fetchSummaryData();
  }, [fetchCategories, fetchSummaryData]);
  
  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);
  
  // Handlers
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleClearFilters = () => {
    setFilters({
      status: '',
      categoryId: '',
      siteId: '',
      level: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  const handleRiskClick = (risk) => {
    navigate(`/risks/${risk.id}`);
  };
  
  // Render loading state
  if (loading && risks.length === 0) {
    return <LoadingState message="Loading risk register..." />;
  }
  
  // Render error state
  if (error && risks.length === 0) {
    return <ErrorState message={error} onRetry={fetchRisks} />;
  }
  
  return (
    <div className="risks-list-page">
      {/* Header */}
      <div className="risks-list-page__header">
        <div className="risks-list-page__title-row">
          <h1>Risk Register</h1>
          <div className="risks-list-page__actions">
            {canViewHeatmap && (
              <button
                className="btn btn--secondary"
                onClick={() => navigate('/risks/heatmap')}
              >
                <span className="inline-icon"><AppIcon name="info" size={16} />View Heatmap</span>
              </button>
            )}
            {canCreate && (
              <button
                className="btn btn--primary"
                onClick={() => navigate('/risks/new')}
              >
                + Add Risk
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <RiskSummaryCards summary={summary} />
      )}
      
      {/* Quick Stats Sidebar */}
      <div className="risks-list-page__content">
        <div className="risks-list-page__main">
          {/* Filters */}
          <RiskFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categories}
            sites={[]} // TODO: Add sites from context
            onClear={handleClearFilters}
          />
          
          {/* Results */}
          {risks.length === 0 ? (
            <EmptyState
              title="No risks found"
              message={
                Object.values(filters).some(v => v)
                  ? "Try adjusting your filters"
                  : "No risks have been registered yet"
              }
              action={
                canCreate && !Object.values(filters).some(v => v) && {
                  label: "Register First Risk",
                  onClick: () => navigate('/risks/new')
                }
              }
            />
          ) : (
            <>
              {/* Results Table */}
              <div className="risks-table-container">
                <table className="risks-table">
                  <thead>
                    <tr>
                      <th 
                        className="sortable"
                        onClick={() => handleSort('reference')}
                      >
                        Reference
                        {sortField === 'reference' && (
                          <span className="sort-indicator">
                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        className="sortable"
                        onClick={() => handleSort('title')}
                      >
                        Title
                        {sortField === 'title' && (
                          <span className="sort-indicator">
                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </th>
                      <th>Category</th>
                      <th>Status</th>
                      <th 
                        className="sortable"
                        onClick={() => handleSort('inherent_score')}
                      >
                        Inherent
                        {sortField === 'inherent_score' && (
                          <span className="sort-indicator">
                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </th>
                      <th 
                        className="sortable"
                        onClick={() => handleSort('residual_score')}
                      >
                        Residual
                        {sortField === 'residual_score' && (
                          <span className="sort-indicator">
                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </th>
                      <th>Owner</th>
                      <th 
                        className="sortable"
                        onClick={() => handleSort('next_review_date')}
                      >
                        Next Review
                        {sortField === 'next_review_date' && (
                          <span className="sort-indicator">
                            {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risks.map((risk) => (
                      <tr
                        key={risk.id}
                        onClick={() => handleRiskClick(risk)}
                        className="clickable-row"
                      >
                        <td className="risk-reference">{risk.reference}</td>
                        <td className="risk-title">{risk.title}</td>
                        <td>{risk.category_name || '-'}</td>
                        <td>
                          <RiskStatusBadge status={risk.status} />
                        </td>
                        <td>
                          <RiskLevelBadge
                            level={risk.inherent_level}
                            score={risk.inherent_score}
                            size="small"
                          />
                        </td>
                        <td>
                          <RiskLevelBadge
                            level={risk.residual_level}
                            score={risk.residual_score}
                            size="small"
                          />
                        </td>
                        <td>{risk.owner_name || 'Unassigned'}</td>
                        <td className={isOverdue(risk.next_review_date) ? 'overdue' : ''}>
                          {risk.next_review_date
                            ? new Date(risk.next_review_date).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination__btn"
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    ← Previous
                  </button>
                  
                  <span className="pagination__info">
                    Page {pagination.page} of {pagination.totalPages}
                    {' '}({pagination.total} risks)
                  </span>
                  
                  <button
                    className="pagination__btn"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Sidebar */}
        <aside className="risks-list-page__sidebar">
          {/* Top Risks */}
          <div className="sidebar-card">
            <h3>Top 5 Risks</h3>
            {topRisks.length > 0 ? (
              <ul className="top-risks-list">
                {topRisks.map((risk) => (
                  <li
                    key={risk.id}
                    onClick={() => handleRiskClick(risk)}
                    className="top-risk-item"
                  >
                    <RiskLevelBadge
                      level={risk.residual_level}
                      score={risk.residual_score}
                      size="small"
                    />
                    <span className="top-risk-title">{risk.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sidebar-empty">No risks to display</p>
            )}
          </div>
          
          {/* Upcoming Reviews */}
          <div className="sidebar-card">
            <h3>Upcoming Reviews</h3>
            {upcomingReviews.length > 0 ? (
              <ul className="reviews-list">
                {upcomingReviews.map((risk) => (
                  <li
                    key={risk.id}
                    onClick={() => handleRiskClick(risk)}
                    className="review-item"
                  >
                    <span className="review-reference">{risk.reference}</span>
                    <span className="review-date">
                      {new Date(risk.next_review_date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sidebar-empty">No upcoming reviews</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

// Helper function to check if date is overdue
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default RisksListPage;



