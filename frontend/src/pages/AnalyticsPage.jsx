import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '../context/AnalyticsContext';
import {
  KPICard,
  FilterPanel,
  TimeSeriesChart,
  SiteComparisonChart,
  RiskWidget,
  IncidentTypesWidget,
  SavedViewsDropdown,
  SaveViewModal,
  ManageViewsModal
} from '../components/analytics';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const {
    filters,
    summary,
    incidentTimeSeries,
    incidentsBySite,
    incidentsByType,
    inspectionsTimeSeries,
    actionsTimeSeries,
    topRiskSites,
    savedViews,
    activeViewId,
    loading,
    error,
    setFilters,
    loadView,
    saveView,
    updateView,
    deleteView,
    clearFilters,
    refreshData
  } = useAnalytics();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Drill-down navigation handlers
  const navigateToIncidents = useCallback((params = {}) => {
    const searchParams = new URLSearchParams();

    if (params.siteId) searchParams.set('siteId', params.siteId);
    if (params.typeId) searchParams.set('typeId', params.typeId);
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);

    // Carry over date range from filters if not specified
    if (!params.startDate && filters.dateRange?.preset) {
      searchParams.set('preset', filters.dateRange.preset);
    }

    const queryString = searchParams.toString();
    navigate(`/incidents${queryString ? `?${queryString}` : ''}`);
  }, [navigate, filters]);

  const navigateToActions = useCallback((params = {}) => {
    const searchParams = new URLSearchParams();

    if (params.status) searchParams.set('status', params.status);
    if (params.siteId) searchParams.set('siteId', params.siteId);

    const queryString = searchParams.toString();
    navigate(`/actions${queryString ? `?${queryString}` : ''}`);
  }, [navigate]);

  const navigateToInspections = useCallback(() => {
    navigate('/inspections');
  }, [navigate]);

  // Chart click handlers
  const handleIncidentTimeSeriesClick = (data) => {
    if (data?.period) {
      const periodDate = new Date(data.period);
      const startDate = periodDate.toISOString().split('T')[0];
      const endDate = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0)
        .toISOString().split('T')[0];
      navigateToIncidents({ startDate, endDate });
    }
  };

  const handleIncidentBySiteClick = (siteId) => {
    navigateToIncidents({ siteId });
  };

  const handleIncidentByTypeClick = (typeId) => {
    navigateToIncidents({ typeId });
  };

  const handleRiskSiteClick = (siteId) => {
    navigateToIncidents({ siteId });
  };

  // KPI click handlers
  const handleTotalIncidentsClick = () => {
    navigateToIncidents();
  };

  const handleOpenActionsClick = () => {
    navigateToActions({ status: 'open' });
  };

  const handlePassRateClick = () => {
    navigateToInspections();
  };

  // Save view handler
  const handleSaveView = async (viewData) => {
    setSaveLoading(true);
    try {
      await saveView(viewData);
    } finally {
      setSaveLoading(false);
    }
  };

  // Extract KPIs from summary
  const kpis = summary?.kpis || {};

  return (
    <div className="analytics-page">
      {/* Saved Views Dropdown - positioned at top right */}
      <div className="analytics-header">
        <SavedViewsDropdown
          views={savedViews}
          currentViewId={activeViewId}
          onSelectView={loadView}
          onSaveView={() => setShowSaveModal(true)}
          onManageViews={() => setShowManageModal(true)}
          loading={loading}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button className="btn btn-link" onClick={() => refreshData()}>
            Retry
          </button>
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        loading={loading}
      />

      {/* KPI Cards */}
      <div className="kpi-grid" role="region" aria-label="Key Performance Indicators">
        <KPICard
          title="Total Incidents"
          value={kpis.totalIncidents?.value}
          trend={kpis.totalIncidents?.trendDirection}
          percentChange={kpis.totalIncidents?.trend}
          format="number"
          onClick={handleTotalIncidentsClick}
          helpText="Total incidents reported in the selected period"
          invertTrend={true}
          loading={loading}
        />
        <KPICard
          title="% High Severity"
          value={kpis.highSeverityPercent?.value}
          trend={null}
          percentChange={null}
          format="percent"
          helpText="Percentage of incidents with high or critical severity"
          loading={loading}
        />
        <KPICard
          title="Avg Resolution"
          value={kpis.avgResolutionDays?.value}
          trend={null}
          percentChange={null}
          format="days"
          helpText="Average time to close incidents"
          loading={loading}
        />
        <KPICard
          title="Open Actions"
          value={kpis.openActions?.value}
          trend={null}
          percentChange={null}
          format="number"
          onClick={handleOpenActionsClick}
          helpText="Current open corrective actions"
          loading={loading}
        />
        <KPICard
          title="Pass Rate"
          value={kpis.inspectionPassRate?.value}
          trend={kpis.inspectionPassRate?.trendDirection}
          percentChange={kpis.inspectionPassRate?.trend}
          format="percent"
          onClick={handlePassRateClick}
          helpText="Inspection pass rate in the selected period"
          invertTrend={false}
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        <div className="chart-half">
          <TimeSeriesChart
            title="Incidents Over Time"
            data={incidentTimeSeries}
            type="stacked-bar"
            series={[
              { key: 'critical', label: 'Critical', color: '#DC2626' },
              { key: 'high', label: 'High', color: '#F97316' },
              { key: 'medium', label: 'Medium', color: '#FBBF24' },
              { key: 'low', label: 'Low', color: '#22C55E' }
            ]}
            onDataClick={handleIncidentTimeSeriesClick}
            loading={loading}
          />
        </div>
        <div className="chart-half">
          <SiteComparisonChart
            title="Incidents by Site"
            data={incidentsBySite}
            valueKey="incidentCount"
            labelKey="siteName"
            idKey="siteId"
            onBarClick={handleIncidentBySiteClick}
            loading={loading}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        <div className="chart-half">
          <TimeSeriesChart
            title="Actions Created vs Completed"
            data={actionsTimeSeries}
            type="line"
            series={[
              { key: 'created', label: 'Created', color: '#3B82F6' },
              { key: 'completed', label: 'Completed', color: '#22C55E' }
            ]}
            loading={loading}
          />
        </div>
        <div className="chart-half">
          <TimeSeriesChart
            title="Inspections Over Time"
            data={inspectionsTimeSeries}
            type="line"
            series={[
              { key: 'passRate', label: 'Pass Rate %', color: '#22C55E' }
            ]}
            loading={loading}
          />
        </div>
      </div>

      {/* Widgets Row */}
      <div className="widgets-row">
        <div className="widget-half">
          <RiskWidget
            title="Top 5 High-Risk Sites"
            sites={topRiskSites}
            onSiteClick={handleRiskSiteClick}
            loading={loading}
          />
        </div>
        <div className="widget-half">
          <IncidentTypesWidget
            title="Top Incident Types"
            data={incidentsByType}
            onTypeClick={handleIncidentByTypeClick}
            loading={loading}
          />
        </div>
      </div>

      {/* Modals */}
      <SaveViewModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveView}
        currentFilters={filters}
        loading={saveLoading}
      />

      <ManageViewsModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        views={savedViews}
        onUpdateView={updateView}
        onDeleteView={deleteView}
      />
    </div>
  );
};

export default AnalyticsPage;
