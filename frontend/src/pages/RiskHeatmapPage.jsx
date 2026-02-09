/**
 * RiskHeatmapPage - Phase 9
 * Risk heatmap visualisation with drill-down capability
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  getHeatmap,
  listRisks,
  getTopRisks,
  listCategories
} from '../api/risks';
import {
  RiskHeatmap,
  RiskLevelBadge,
  RiskStatusBadge,
  RiskSummaryCards
} from '../components/risks';
import { LoadingState, ErrorState } from '../components/States';
import './RiskHeatmapPage.css';

const RiskHeatmapPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [heatmapData, setHeatmapData] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellRisks, setCellRisks] = useState([]);
  const [topRisks, setTopRisks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [cellLoading, setCellLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filters
  const [scoreType, setScoreType] = useState(
    searchParams.get('scoreType') || 'residual'
  );
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get('categoryId') || ''
  );
  const [siteFilter, setSiteFilter] = useState(
    searchParams.get('siteId') || ''
  );
  
  // Check permissions
  const canAccess = user?.role === 'manager' || user?.role === 'admin';
  
  // Fetch heatmap data
  const fetchHeatmap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = { scoreType };
      if (categoryFilter) params.categoryId = categoryFilter;
      if (siteFilter) params.siteId = siteFilter;
      
      const [heatmapResponse, topResponse, catResponse] = await Promise.all([
        getHeatmap(params),
        getTopRisks({ limit: 10, ...params }),
        listCategories()
      ]);
      
      setHeatmapData(heatmapResponse.data);
      setSummary(heatmapResponse.summary);
      setTopRisks(topResponse.data || []);
      setCategories(catResponse.data || []);
      
    } catch (err) {
      console.error('Error fetching heatmap:', err);
      setError(err.message || 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  }, [scoreType, categoryFilter, siteFilter]);
  
  // Fetch risks for selected cell
  const fetchCellRisks = useCallback(async (likelihood, impact) => {
    try {
      setCellLoading(true);
      
      const params = {
        [`${scoreType}Likelihood`]: likelihood,
        [`${scoreType}Impact`]: impact
      };
      if (categoryFilter) params.categoryId = categoryFilter;
      if (siteFilter) params.siteId = siteFilter;
      
      const response = await listRisks(params);
      setCellRisks(response.data || []);
      
    } catch (err) {
      console.error('Error fetching cell risks:', err);
      setCellRisks([]);
    } finally {
      setCellLoading(false);
    }
  }, [scoreType, categoryFilter, siteFilter]);
  
  // Initial load
  useEffect(() => {
    if (!canAccess) {
      navigate('/risks');
      return;
    }
    fetchHeatmap();
  }, [fetchHeatmap, canAccess, navigate]);
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (scoreType !== 'residual') params.set('scoreType', scoreType);
    if (categoryFilter) params.set('categoryId', categoryFilter);
    if (siteFilter) params.set('siteId', siteFilter);
    setSearchParams(params, { replace: true });
  }, [scoreType, categoryFilter, siteFilter, setSearchParams]);
  
  // Handle cell click
  const handleCellClick = (likelihood, impact) => {
    if (selectedCell?.likelihood === likelihood && selectedCell?.impact === impact) {
      // Deselect
      setSelectedCell(null);
      setCellRisks([]);
    } else {
      // Select new cell
      setSelectedCell({ likelihood, impact });
      fetchCellRisks(likelihood, impact);
    }
  };
  
  // Handle risk click
  const handleRiskClick = (risk) => {
    navigate(`/risks/${risk.id}`);
  };
  
  // Clear selection
  const handleClearSelection = () => {
    setSelectedCell(null);
    setCellRisks([]);
  };
  
  if (!canAccess) {
    return <ErrorState message="You don't have permission to view this page" />;
  }
  
  if (loading) {
    return <LoadingState message="Loading risk heatmap..." />;
  }
  
  if (error) {
    return <ErrorState message={error} onRetry={fetchHeatmap} />;
  }
  
  return (
    <div className="risk-heatmap-page">
      {/* Header */}
      <div className="risk-heatmap-page__header">
        <div className="risk-heatmap-page__title-row">
          <div>
            <button
              className="btn btn--ghost back-btn"
              onClick={() => navigate('/risks')}
            >
              ← Back to Register
            </button>
            <h1>Risk Heatmap</h1>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      {summary && <RiskSummaryCards summary={summary} />}
      
      {/* Filters */}
      <div className="heatmap-filters">
        <label className="heatmap-filter">
          Score Type
          <select
            value={scoreType}
            onChange={(e) => setScoreType(e.target.value)}
          >
            <option value="residual">Residual Risk</option>
            <option value="inherent">Inherent Risk</option>
          </select>
        </label>
        
        <label className="heatmap-filter">
          Category
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </label>
        
        <label className="heatmap-filter">
          Site
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
          >
            <option value="">All Sites</option>
            {/* TODO: Add sites */}
          </select>
        </label>
      </div>
      
      {/* Main Content */}
      <div className="heatmap-content">
        {/* Heatmap */}
        <div className="heatmap-section">
          <RiskHeatmap
            data={heatmapData}
            onCellClick={handleCellClick}
            selectedCell={selectedCell}
            scoreType={scoreType}
          />
        </div>
        
        {/* Side Panel - Top Risks or Cell Details */}
        <div className="heatmap-side-panel">
          {selectedCell ? (
            <div className="cell-details">
              <div className="cell-details__header">
                <h3>
                  Risks at L{selectedCell.likelihood} × I{selectedCell.impact}
                </h3>
                <button
                  className="btn btn--ghost btn--small"
                  onClick={handleClearSelection}
                >
                  ✕ Clear
                </button>
              </div>
              
              {cellLoading ? (
                <div className="cell-details__loading">Loading risks...</div>
              ) : cellRisks.length === 0 ? (
                <div className="cell-details__empty">
                  No risks in this cell
                </div>
              ) : (
                <ul className="cell-risks-list">
                  {cellRisks.map((risk) => (
                    <li
                      key={risk.id}
                      className="cell-risk-item"
                      onClick={() => handleRiskClick(risk)}
                    >
                      <div className="cell-risk-item__header">
                        <span className="cell-risk-ref">{risk.reference}</span>
                        <RiskStatusBadge status={risk.status} />
                      </div>
                      <div className="cell-risk-item__title">
                        {risk.title}
                      </div>
                      <div className="cell-risk-item__meta">
                        {risk.category_name || 'Uncategorised'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="top-risks-panel">
              <h3>Top 10 Risks</h3>
              <p className="panel-hint">
                Click a cell on the heatmap to drill down
              </p>
              
              {topRisks.length === 0 ? (
                <div className="panel-empty">No risks to display</div>
              ) : (
                <ul className="top-risks-list">
                  {topRisks.map((risk, index) => (
                    <li
                      key={risk.id}
                      className="top-risk-item"
                      onClick={() => handleRiskClick(risk)}
                    >
                      <span className="top-risk-rank">{index + 1}</span>
                      <div className="top-risk-info">
                        <div className="top-risk-title">{risk.title}</div>
                        <div className="top-risk-meta">
                          <RiskLevelBadge
                            level={scoreType === 'inherent' ? risk.inherent_level : risk.residual_level}
                            score={scoreType === 'inherent' ? risk.inherent_score : risk.residual_score}
                            size="small"
                          />
                          <span className="top-risk-category">
                            {risk.category_name || 'Uncategorised'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Risk Distribution by Category */}
      <div className="category-distribution">
        <h3>Risks by Category</h3>
        <div className="category-bars">
          {heatmapData?.byCategory?.map((cat) => (
            <div key={cat.category_id || 'uncategorised'} className="category-bar">
              <div className="category-bar__label">
                {cat.category_name || 'Uncategorised'}
              </div>
              <div className="category-bar__bar-container">
                <div 
                  className="category-bar__bar category-bar__bar--extreme"
                  style={{ width: `${(cat.extreme / (cat.total || 1)) * 100}%` }}
                  title={`Extreme: ${cat.extreme}`}
                />
                <div 
                  className="category-bar__bar category-bar__bar--high"
                  style={{ width: `${(cat.high / (cat.total || 1)) * 100}%` }}
                  title={`High: ${cat.high}`}
                />
                <div 
                  className="category-bar__bar category-bar__bar--medium"
                  style={{ width: `${(cat.medium / (cat.total || 1)) * 100}%` }}
                  title={`Medium: ${cat.medium}`}
                />
                <div 
                  className="category-bar__bar category-bar__bar--low"
                  style={{ width: `${(cat.low / (cat.total || 1)) * 100}%` }}
                  title={`Low: ${cat.low}`}
                />
              </div>
              <div className="category-bar__count">{cat.total}</div>
            </div>
          )) || (
            <div className="panel-empty">No category data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskHeatmapPage;
