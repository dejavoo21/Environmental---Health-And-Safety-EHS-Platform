import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from 'recharts';
import api from '../api/client';
import { useOrg } from '../context/OrgContext';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { getMySafetyOverview } from '../api/safetyAdvisor';
import {
  AlertTriangle, CheckCircle2, Clock, FileText, Shield, Users,
  Clipboard, HardHat, Scale, ChevronRight, Cloud, Sun, MapPin,
  Plus, Activity, AlertCircle, TrendingUp, Zap
} from 'lucide-react';

import './DashboardPage.css';

// Color palette for charts
const COLORS = {
  primary: '#2d6a6a',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#9333ea',
  teal: '#14b8a6'
};

const STATUS_COLORS = {
  open: COLORS.blue,
  in_progress: COLORS.amber,
  closed: COLORS.green,
  completed: COLORS.green
};

const SEVERITY_COLORS = {
  low: COLORS.green,
  medium: COLORS.amber,
  high: COLORS.orange,
  critical: COLORS.red
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { thresholds } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [safetySummary, setSafetySummary] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [dashRes, safetyRes] = await Promise.allSettled([
          api.get('/dashboard/summary'),
          getMySafetyOverview()
        ]);

        if (active) {
          if (dashRes.status === 'fulfilled') {
            setData(dashRes.value.data);
          } else {
            setError('Unable to load dashboard summary.');
          }
          if (safetyRes.status === 'fulfilled') {
            setSafetySummary(safetyRes.value);
          }
        }
      } catch (err) {
        if (active) setError('Unable to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState message="No dashboard data available." />;

  const kpis = data.kpis || {};

  // Prepare chart data
  const incidentsByStatus = data.incidentsByStatus || [];
  const incidentsBySeverity = data.incidentsBySeverity || [];
  const incidentsByType = data.incidentsByType || [];
  const severityTrend = data.severityTrend || [];
  const actionsSummary = data.actionsSummary || { open: 0, inProgress: 0, completed: 0, overdue: 0 };

  return (
    <div className="dashboard-page">
      {/* Quick Stats Row */}
      <div className="dashboard-quick-stats">
        <div
          className="quick-stat-card"
          onClick={() => navigate('/incidents')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon blue">
            <AlertTriangle size={18} />
          </div>
          <div className="quick-stat-value">{kpis.totalIncidents ?? 0}</div>
          <div className="quick-stat-label">Total Incidents</div>
        </div>

        <div
          className={`quick-stat-card ${kpis.openIncidents > 0 ? 'warning' : ''}`}
          onClick={() => navigate('/incidents?status=open')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon orange">
            <AlertCircle size={18} />
          </div>
          <div className="quick-stat-value">{kpis.openIncidents ?? 0}</div>
          <div className="quick-stat-label">Open Incidents</div>
        </div>

        <div
          className="quick-stat-card"
          onClick={() => navigate('/inspections')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon green">
            <Clipboard size={18} />
          </div>
          <div className="quick-stat-value">{kpis.inspectionsLast30Days ?? 0}</div>
          <div className="quick-stat-label">Inspections (30d)</div>
        </div>

        <div
          className={`quick-stat-card ${kpis.overdueActions > 0 ? 'danger' : ''}`}
          onClick={() => navigate('/actions?status=overdue')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon red">
            <Clock size={18} />
          </div>
          <div className="quick-stat-value">{kpis.overdueActions ?? 0}</div>
          <div className="quick-stat-label">Overdue Actions</div>
        </div>

        <div
          className="quick-stat-card"
          onClick={() => navigate('/permits')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon purple">
            <FileText size={18} />
          </div>
          <div className="quick-stat-value">{kpis.activePermits ?? 0}</div>
          <div className="quick-stat-label">Active Permits</div>
        </div>

        <div
          className={`quick-stat-card ${kpis.highRisks > 0 ? 'danger' : ''}`}
          onClick={() => navigate('/risks')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon amber">
            <Scale size={18} />
          </div>
          <div className="quick-stat-value">{kpis.highRisks ?? 0}</div>
          <div className="quick-stat-label">High/Extreme Risks</div>
        </div>

        <div
          className={`quick-stat-card ${kpis.overdueTraining > 0 ? 'warning' : ''}`}
          onClick={() => navigate('/training')}
          role="button"
          tabIndex={0}
        >
          <div className="quick-stat-icon teal">
            <Users size={18} />
          </div>
          <div className="quick-stat-value">{kpis.overdueTraining ?? 0}</div>
          <div className="quick-stat-label">Overdue Training</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-main-grid">
        {/* Left Column - Charts and Tables */}
        <div className="dashboard-left-column">
          {/* Charts Row */}
          <div className="dashboard-charts-row">
            {/* Incidents by Type - Bar Chart */}
            <div className="mini-chart-card">
              <div className="mini-chart-header">
                <h4 className="mini-chart-title">Incidents by Type</h4>
              </div>
              {incidentsByType.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidentsByType} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="type"
                        width={80}
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="dashboard-empty">
                  <Activity size={32} />
                  <p>No incident data</p>
                </div>
              )}
            </div>

            {/* Incidents by Severity - Pie Chart */}
            <div className="mini-chart-card">
              <div className="mini-chart-header">
                <h4 className="mini-chart-title">Severity Distribution</h4>
              </div>
              {incidentsBySeverity.length > 0 ? (
                <>
                  <div className="pie-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incidentsBySeverity}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {incidentsBySeverity.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={SEVERITY_COLORS[entry.name] || COLORS.blue}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border-subtle)',
                            borderRadius: '6px',
                            fontSize: '13px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-legend">
                    {incidentsBySeverity.map((entry, index) => (
                      <div key={index} className="legend-item">
                        <span
                          className="legend-dot"
                          style={{ backgroundColor: SEVERITY_COLORS[entry.name] || COLORS.blue }}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="dashboard-empty">
                  <TrendingUp size={32} />
                  <p>No severity data</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Summary + Trend Chart Row */}
          <div className="dashboard-charts-row">
            {/* Actions Summary */}
            <div className="mini-chart-card">
              <div className="mini-chart-header">
                <h4 className="mini-chart-title">Actions Overview</h4>
                <button className="dashboard-card-action" onClick={() => navigate('/actions')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="actions-summary">
                <div className="action-stat">
                  <div className="action-stat-value">{actionsSummary.open}</div>
                  <div className="action-stat-label">Open</div>
                </div>
                <div className="action-stat">
                  <div className="action-stat-value">{actionsSummary.inProgress}</div>
                  <div className="action-stat-label">In Progress</div>
                </div>
                <div className="action-stat">
                  <div className="action-stat-value">{actionsSummary.completed}</div>
                  <div className="action-stat-label">Completed</div>
                </div>
                <div className="action-stat">
                  <div className={`action-stat-value ${actionsSummary.overdue > 0 ? 'overdue' : ''}`}>
                    {actionsSummary.overdue}
                  </div>
                  <div className="action-stat-label">Overdue</div>
                </div>
              </div>
              {/* Upcoming Actions List */}
              {data.upcomingActions?.length > 0 && (
                <ul className="recent-list">
                  {data.upcomingActions.slice(0, 3).map(action => (
                    <li
                      key={action.id}
                      className="recent-item"
                      onClick={() => navigate(`/actions/${action.id}`)}
                    >
                      <div className="recent-item-main">
                        <div className="recent-item-title">{action.title}</div>
                        <div className="recent-item-meta">Due: {formatDate(action.dueDate)}</div>
                      </div>
                      <span className={`badge-mini ${action.priority}`}>{action.priority}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Severity Trend - Line Chart */}
            <div className="mini-chart-card">
              <div className="mini-chart-header">
                <h4 className="mini-chart-title">Incident Trend (12mo)</h4>
              </div>
              {severityTrend.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={severityTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val.slice(5)} // Show only MM
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        width={25}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: '6px',
                          fontSize: '11px'
                        }}
                      />
                      <Line type="monotone" dataKey="low" stroke={COLORS.green} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="medium" stroke={COLORS.amber} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="high" stroke={COLORS.orange} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="critical" stroke={COLORS.red} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="dashboard-empty">
                  <TrendingUp size={32} />
                  <p>No trend data</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Tables Row */}
          <div className="dashboard-tables-row">
            {/* Recent Incidents */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  <AlertTriangle size={16} /> Recent Incidents
                </h3>
                <button className="dashboard-card-action" onClick={() => navigate('/incidents')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="dashboard-card-body" style={{ padding: 0 }}>
                {data.recentIncidents?.length > 0 ? (
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentIncidents.map(inc => (
                        <tr key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}>
                          <td className="truncate">{inc.title}</td>
                          <td>{formatDate(inc.occurredAt)}</td>
                          <td><span className={`badge-mini ${inc.severity}`}>{inc.severity}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="dashboard-empty">
                    <CheckCircle2 size={24} />
                    <p>No recent incidents</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Inspections */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  <Clipboard size={16} /> Recent Inspections
                </h3>
                <button className="dashboard-card-action" onClick={() => navigate('/inspections')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="dashboard-card-body" style={{ padding: 0 }}>
                {data.recentInspections?.length > 0 ? (
                  <table className="compact-table">
                    <thead>
                      <tr>
                        <th>Template</th>
                        <th>Site</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentInspections.map(ins => (
                        <tr key={ins.id} onClick={() => navigate(`/inspections/${ins.id}`)}>
                          <td className="truncate">{ins.templateName}</td>
                          <td className="truncate">{ins.siteName}</td>
                          <td><span className={`badge-mini ${ins.overallResult}`}>{ins.overallResult}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="dashboard-empty">
                    <CheckCircle2 size={24} />
                    <p>No recent inspections</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-right-column">
          {/* Safety Advisor Compact Card */}
          <div className="safety-compact-card">
            <div className="safety-compact-header">
              <Shield size={18} />
              <h3>Safety Advisor</h3>
            </div>

            {safetySummary?.primarySiteWeather ? (
              <div className="safety-weather-row">
                {safetySummary.primarySiteWeather.status === 'ok' ? (
                  <>
                    <Sun size={28} />
                    <div className="weather-temp">
                      {safetySummary.primarySiteWeather.tempC ?? '--'}°C
                    </div>
                    <div className="weather-details">
                      <div className="weather-condition">
                        {safetySummary.primarySiteWeather.condition || 'Unknown'}
                      </div>
                      <div className="weather-location">
                        {safetySummary.primarySiteWeather.summaryText || ''}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Cloud size={28} />
                    <div className="weather-details">
                      <div className="weather-condition">Weather unavailable</div>
                      <div className="weather-location">Configure site location</div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="safety-weather-row">
                <Cloud size={28} />
                <div className="weather-details">
                  <div className="weather-condition">No weather data</div>
                  <div className="weather-location">Select a primary site</div>
                </div>
              </div>
            )}

            {safetySummary?.safetyMoment && (
              <div className="safety-moment-preview">
                <h4>{safetySummary.safetyMoment.title}</h4>
                <p>{safetySummary.safetyMoment.body}</p>
              </div>
            )}

            <Link to="/safety-advisor" className="safety-link">
              Open Safety Advisor <ChevronRight size={14} />
            </Link>
          </div>

          {/* Permit Alerts */}
          {(kpis.expiringPermits > 0) && (
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">
                  <AlertCircle size={16} /> Alerts
                </h3>
              </div>
              <div className="dashboard-card-body">
                <ul className="recent-list">
                  {kpis.expiringPermits > 0 && (
                    <li
                      className="recent-item"
                      onClick={() => navigate('/permits')}
                    >
                      <div className="recent-item-main">
                        <div className="recent-item-title">{kpis.expiringPermits} permits expiring soon</div>
                        <div className="recent-item-meta">Within next 7 days</div>
                      </div>
                      <ChevronRight size={16} />
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Quick Actions - Full width at bottom */}
      <div className="dashboard-card quick-actions-card">
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">
            <Zap size={16} /> Quick Actions
          </h3>
        </div>
        <div className="dashboard-card-body">
          <div className="quick-links-grid">
            <Link to="/incidents/new" className="quick-link">
              <Plus size={16} /> New Incident
            </Link>
            <Link to="/inspections/new" className="quick-link">
              <Plus size={16} /> New Inspection
            </Link>
            <Link to="/permits/new" className="quick-link">
              <Plus size={16} /> New Permit
            </Link>
            <Link to="/risks/new" className="quick-link">
              <Plus size={16} /> New Risk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
