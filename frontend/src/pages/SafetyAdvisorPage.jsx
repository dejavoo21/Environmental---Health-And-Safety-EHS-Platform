import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Shield,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Thermometer,
  Wind,
  Droplets,
  HardHat,
  AlertCircle,
  CheckCircle2,
  Scale,
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import './SafetyAdvisorPage.css';

const getWeatherIcon = (condition) => {
  const conditionLower = (condition || '').toLowerCase();
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return CloudRain;
  if (conditionLower.includes('snow') || conditionLower.includes('sleet')) return CloudSnow;
  if (conditionLower.includes('clear') || conditionLower.includes('sunny')) return Sun;
  if (conditionLower.includes('cloud')) return Cloud;
  return Cloud;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SafetyAdvisorPage = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [safetySummary, setSafetySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    weather: true,
    ppe: true,
    moment: true,
    legislation: false
  });
  const [acknowledging, setAcknowledging] = useState(false);

  // Fetch sites
  const fetchSites = useCallback(async () => {
    try {
      const res = await api.get('/sites');
      const sitesData = res.data?.data || res.data || [];
      setSites(sitesData);
      
      // Auto-select first site if available
      if (sitesData.length > 0 && !selectedSite) {
        setSelectedSite(sitesData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err);
      setError('Failed to load sites');
    } finally {
      setLoading(false);
    }
  }, [selectedSite]);

  // Fetch safety summary for selected site
  const fetchSafetySummary = useCallback(async () => {
    if (!selectedSite) return;
    
    setSummaryLoading(true);
    setError('');
    
    try {
      const res = await api.get(`/safety-advisor/sites/${selectedSite.id}/summary`);
      setSafetySummary(res.data);
    } catch (err) {
      console.error('Safety summary error:', err);
      if (err.response?.status === 404) {
        setError('Safety advisor not available for this site');
      } else {
        setError(err.response?.data?.message || 'Failed to load safety information');
      }
      setSafetySummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedSite]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    if (selectedSite) {
      fetchSafetySummary();
    }
  }, [selectedSite, fetchSafetySummary]);

  const handleAcknowledge = async () => {
    if (!selectedSite) return;
    
    setAcknowledging(true);
    try {
      await api.post(`/safety-advisor/sites/${selectedSite.id}/acknowledge`);
      fetchSafetySummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to acknowledge');
    } finally {
      setAcknowledging(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderWeatherCard = () => {
    const weather = safetySummary?.weather;
    if (!weather || weather.status === 'unavailable') {
      return (
        <div className="advisor-card advisor-card--warning">
          <div className="advisor-card-header" onClick={() => toggleSection('weather')}>
            <Cloud size={24} />
            <h3>Weather</h3>
            <span className="advisor-status advisor-status--warning">Unavailable</span>
            {expandedSections.weather ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.weather && (
            <div className="advisor-card-content">
              <p className="advisor-empty-message">
                Weather data is not available for this site. Ensure the site has location coordinates configured.
              </p>
            </div>
          )}
        </div>
      );
    }

    const WeatherIconComponent = getWeatherIcon(weather.condition);
    
    return (
      <div className="advisor-card">
        <div className="advisor-card-header" onClick={() => toggleSection('weather')}>
          <WeatherIconComponent size={24} />
          <h3>Weather</h3>
          <span className={`advisor-status ${weather.status === 'ok' ? 'advisor-status--ok' : 'advisor-status--stale'}`}>
            {weather.status === 'ok' ? 'Current' : 'Cached'}
          </span>
          {expandedSections.weather ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.weather && (
          <div className="advisor-card-content">
            <div className="weather-display">
              <div className="weather-main">
                <div className="weather-icon-large">
                  <WeatherIconComponent size={48} />
                </div>
                <div className="weather-temp">
                  <span className="temp-value">{weather.tempC ?? '--'}°C</span>
                  {weather.feelsLikeC && weather.feelsLikeC !== weather.tempC && (
                    <span className="temp-feels">Feels like {weather.feelsLikeC}°C</span>
                  )}
                </div>
                <div className="weather-condition">
                  {weather.condition || 'Unknown'}
                </div>
              </div>
              
              <div className="weather-details">
                {weather.windKph !== null && (
                  <div className="weather-detail">
                    <Wind size={16} />
                    <span>{weather.windKph} km/h</span>
                  </div>
                )}
                {weather.humidity !== undefined && (
                  <div className="weather-detail">
                    <Droplets size={16} />
                    <span>{weather.humidity}%</span>
                  </div>
                )}
              </div>
              
              {weather.summaryText && (
                <p className="weather-summary">{weather.summaryText}</p>
              )}
              
              {weather.warning && (
                <div className="weather-warning">
                  <AlertCircle size={16} />
                  <span>{weather.warning}</span>
                </div>
              )}
              
              {weather.updatedAt && (
                <p className="weather-updated">Last updated: {formatDate(weather.updatedAt)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPPECard = () => {
    const ppe = safetySummary?.ppeAdvice;
    
    return (
      <div className="advisor-card">
        <div className="advisor-card-header" onClick={() => toggleSection('ppe')}>
          <HardHat size={24} />
          <h3>PPE Recommendations</h3>
          {ppe?.items?.length > 0 && (
            <span className="advisor-badge">{ppe.items.length}</span>
          )}
          {expandedSections.ppe ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.ppe && (
          <div className="advisor-card-content">
            {ppe?.summary && (
              <p className="ppe-summary">{ppe.summary}</p>
            )}
            
            {(!ppe?.items || ppe.items.length === 0) ? (
              <p className="advisor-empty-message">No specific PPE recommendations for current conditions.</p>
            ) : (
              <ul className="ppe-list">
                {ppe.items.map((item, index) => (
                  <li key={index} className="ppe-item">
                    <HardHat size={18} />
                    <div className="ppe-item-content">
                      <strong>{item.name || item.type}</strong>
                      {item.reason && <span>{item.reason}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSafetyMomentCard = () => {
    const moment = safetySummary?.safetyMoment;
    
    return (
      <div className="advisor-card advisor-card--highlight">
        <div className="advisor-card-header" onClick={() => toggleSection('moment')}>
          <Sun size={24} />
          <h3>Today's Safety Moment</h3>
          {moment?.acknowledged && (
            <span className="advisor-status advisor-status--ok">
              <CheckCircle2 size={14} /> Acknowledged
            </span>
          )}
          {expandedSections.moment ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.moment && (
          <div className="advisor-card-content">
            {!moment ? (
              <p className="advisor-empty-message">No safety moment available for today.</p>
            ) : (
              <div className="safety-moment">
                <h4>{moment.title}</h4>
                {moment.category && (
                  <span className="moment-category">{moment.category}</span>
                )}
                <p>{moment.body}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderLegislationCard = () => {
    const legislation = safetySummary?.legislation;
    
    return (
      <div className="advisor-card">
        <div className="advisor-card-header" onClick={() => toggleSection('legislation')}>
          <Scale size={24} />
          <h3>Applicable Legislation</h3>
          {legislation?.length > 0 && (
            <span className="advisor-badge">{legislation.length}</span>
          )}
          {expandedSections.legislation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        
        {expandedSections.legislation && (
          <div className="advisor-card-content">
            {(!legislation || legislation.length === 0) ? (
              <p className="advisor-empty-message">No legislation references linked to this site.</p>
            ) : (
              <ul className="legislation-list">
                {legislation.map((leg, index) => (
                  <li key={index} className="legislation-item">
                    <Scale size={16} />
                    <div className="legislation-content">
                      <strong>{leg.title}</strong>
                      {leg.refCode && <span className="legislation-ref">{leg.refCode}</span>}
                      {leg.category && <span className="legislation-category">{leg.category}</span>}
                    </div>
                    {leg.linkUrl && (
                      <a href={leg.linkUrl} target="_blank" rel="noopener noreferrer" className="legislation-link">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="advisor-page">
        <div className="advisor-loading">
          <div className="spinner" />
          <p>Loading Safety Advisor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="advisor-page">
      <header className="advisor-header">
        <div className="advisor-header-content">
          <h1><Shield size={28} /> Safety Advisor</h1>
          <p>Real-time safety intelligence for your sites</p>
        </div>
        
        {sites.length > 0 && (
          <div className="site-selector">
            <MapPin size={18} />
            <select 
              value={selectedSite?.id || ''} 
              onChange={(e) => {
                const site = sites.find(s => String(s.id) === e.target.value);
                setSelectedSite(site);
              }}
              aria-label="Select site"
            >
              {sites.map(site => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {error && (
        <div className="advisor-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchSafetySummary} className="btn btn-sm">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="advisor-empty-state">
          <MapPin size={48} />
          <h3>No Sites Available</h3>
          <p>You need to have at least one site to use the Safety Advisor. Contact your administrator to set up sites.</p>
        </div>
      ) : summaryLoading ? (
        <div className="advisor-loading">
          <div className="spinner" />
          <p>Loading safety summary...</p>
        </div>
      ) : safetySummary ? (
        <>
          <div className="advisor-site-info">
            <h2>{safetySummary.siteName}</h2>
            {safetySummary.siteLocation && (
              <p><MapPin size={14} /> {safetySummary.siteLocation}</p>
            )}
          </div>

          <div className="advisor-grid">
            {renderWeatherCard()}
            {renderPPECard()}
            {renderSafetyMomentCard()}
            {renderLegislationCard()}
          </div>

          <div className="advisor-actions">
            {!safetySummary.lastAcknowledgedAt ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAcknowledge}
                disabled={acknowledging}
              >
                {acknowledging ? (
                  <>
                    <RefreshCw size={18} className="spinning" />
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Acknowledge Safety Briefing
                  </>
                )}
              </button>
            ) : (
              <div className="acknowledgement-status">
                <CheckCircle2 size={20} />
                <span>Safety briefing acknowledged today at {formatDate(safetySummary.lastAcknowledgedAt)}</span>
              </div>
            )}
          </div>
        </>
      ) : !error ? (
        <div className="advisor-empty-state">
          <Shield size={48} />
          <h3>No Safety Data Available</h3>
          <p>Safety information for the selected site is not yet configured. Please contact your administrator.</p>
          <button onClick={fetchSafetySummary} className="btn btn-secondary">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SafetyAdvisorPage;
