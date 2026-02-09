import { useState, useEffect } from 'react';
import api from '../../api/client';

const DATE_PRESETS = [
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'last365', label: 'Last 365 Days' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' }
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
];

const FilterPanel = ({ filters, onChange, onClear, loading = false }) => {
  const [sites, setSites] = useState([]);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Fetch sites and incident types
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [sitesRes, typesRes] = await Promise.all([
          api.get('/sites'),
          api.get('/incident-types')
        ]);
        // Handle various response formats
        const sitesData = sitesRes.data?.data || sitesRes.data || [];
        const typesData = typesRes.data?.data || typesRes.data || [];
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setIncidentTypes(Array.isArray(typesData) ? typesData : []);
      } catch (err) {
        console.error('[FilterPanel] Failed to load filter options:', err);
        setSites([]);
        setIncidentTypes([]);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    setShowCustomDates(filters.dateRange?.preset === 'custom');
  }, [filters.dateRange?.preset]);

  const handleDatePresetChange = (e) => {
    const preset = e.target.value;
    setShowCustomDates(preset === 'custom');

    if (preset !== 'custom') {
      onChange({
        dateRange: { preset }
      });
    }
  };

  const handleCustomDateChange = (field, value) => {
    onChange({
      dateRange: {
        ...filters.dateRange,
        preset: 'custom',
        [field]: value
      }
    });
  };

  const handleMultiSelectChange = (field, value) => {
    const currentValues = filters[field] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onChange({ [field]: newValues });
  };

  const handleSelectAll = (field, options) => {
    const allValues = options.map(o => o.value || o.id);
    const currentValues = filters[field] || [];

    if (currentValues.length === allValues.length) {
      onChange({ [field]: [] });
    } else {
      onChange({ [field]: allValues });
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.siteIds?.length > 0) count++;
    if (filters.incidentTypeIds?.length > 0) count++;
    if (filters.severities?.length > 0) count++;
    if (filters.dateRange?.preset && filters.dateRange.preset !== 'last90') count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className={`filter-panel ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="filter-panel-header">
        <button
          className="filter-panel-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span>Filters</span>
          {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
          <span className="filter-chevron">{expanded ? '\u25B2' : '\u25BC'}</span>
        </button>

        {activeCount > 0 && (
          <button className="btn btn-link filter-clear-btn" onClick={onClear}>
            Clear All
          </button>
        )}
      </div>

      {expanded && (
        <div className="filter-panel-body">
          {/* Date Range */}
          <div className="filter-group">
            <label className="filter-label">Date Range</label>
            <select
              className="filter-select"
              value={filters.dateRange?.preset || 'last90'}
              onChange={handleDatePresetChange}
              disabled={loading}
            >
              {DATE_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>

            {showCustomDates && (
              <div className="filter-custom-dates">
                <input
                  type="date"
                  className="filter-date-input"
                  value={filters.dateRange?.startDate || ''}
                  onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                  disabled={loading}
                />
                <span className="filter-date-separator">to</span>
                <input
                  type="date"
                  className="filter-date-input"
                  value={filters.dateRange?.endDate || ''}
                  onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Sites */}
          <div className="filter-group">
            <div className="filter-label-row">
              <label className="filter-label">Sites</label>
              <button
                className="btn btn-link btn-xs"
                onClick={() => handleSelectAll('siteIds', sites)}
                disabled={loading}
              >
                {filters.siteIds?.length === sites.length ? 'Clear' : 'All'}
              </button>
            </div>
            <div className="filter-checkbox-group">
              {sites.length === 0 ? (
                <span className="filter-empty">No sites available</span>
              ) : (
                sites.slice(0, 10).map(site => (
                  <label key={site.id} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.siteIds?.includes(site.id) || false}
                      onChange={() => handleMultiSelectChange('siteIds', site.id)}
                      disabled={loading}
                    />
                    <span>{site.name}</span>
                  </label>
                ))
              )}
              {sites.length > 10 && (
                <span className="filter-more">+{sites.length - 10} more</span>
              )}
            </div>
          </div>

          {/* Incident Types */}
          <div className="filter-group">
            <div className="filter-label-row">
              <label className="filter-label">Incident Types</label>
              <button
                className="btn btn-link btn-xs"
                onClick={() => handleSelectAll('incidentTypeIds', incidentTypes)}
                disabled={loading}
              >
                {filters.incidentTypeIds?.length === incidentTypes.length ? 'Clear' : 'All'}
              </button>
            </div>
            <div className="filter-checkbox-group">
              {incidentTypes.length === 0 ? (
                <span className="filter-empty">No types available</span>
              ) : (
                incidentTypes.slice(0, 10).map(type => (
                  <label key={type.id} className="filter-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.incidentTypeIds?.includes(type.id) || false}
                      onChange={() => handleMultiSelectChange('incidentTypeIds', type.id)}
                      disabled={loading}
                    />
                    <span>{type.name}</span>
                  </label>
                ))
              )}
              {incidentTypes.length > 10 && (
                <span className="filter-more">+{incidentTypes.length - 10} more</span>
              )}
            </div>
          </div>

          {/* Severity */}
          <div className="filter-group">
            <div className="filter-label-row">
              <label className="filter-label">Severity</label>
              <button
                className="btn btn-link btn-xs"
                onClick={() => handleSelectAll('severities', SEVERITY_OPTIONS)}
                disabled={loading}
              >
                {filters.severities?.length === SEVERITY_OPTIONS.length ? 'Clear' : 'All'}
              </button>
            </div>
            <div className="filter-checkbox-group filter-checkbox-inline">
              {SEVERITY_OPTIONS.map(sev => (
                <label key={sev.value} className={`filter-checkbox-label severity-${sev.value}`}>
                  <input
                    type="checkbox"
                    checked={filters.severities?.includes(sev.value) || false}
                    onChange={() => handleMultiSelectChange('severities', sev.value)}
                    disabled={loading}
                  />
                  <span>{sev.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
