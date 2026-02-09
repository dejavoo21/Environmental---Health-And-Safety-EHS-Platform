import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';
import { useOrg } from '../context/OrgContext';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import SafetyAdvisorPanel from '../components/safety/SafetyAdvisorPanel';
import DashboardSafetyMomentCard from '../components/safety/DashboardSafetyMomentCard';
import DashboardUpcomingSafetyCard from '../components/safety/DashboardUpcomingSafetyCard';
import { getMySafetyOverview } from '../api/safetyAdvisor';

import './IncidentsStatusBadge.css';

// Helper to determine KPI color based on thresholds
const getKpiClass = (value, warningThreshold, criticalThreshold) => {
  if (value >= criticalThreshold) return 'kpi-critical';
  if (value >= warningThreshold) return 'kpi-warning';
  return 'kpi-normal';
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { thresholds } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const handleKpiKeyDown = (event, handler) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        if (active) {
          setData(res.data);
        }
      } catch (err) {
        if (active) {
          setError('Unable to load dashboard summary.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  // Phase 11: Fetch Safety Summary for dashboard cards
  const [safetySummary, setSafetySummary] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const loadSafety = async () => {
      setSafetyLoading(true);
      try {
        const data = await getMySafetyOverview();
        if (active) setSafetySummary(data);
      } catch (err) {
        // Silently fail - safety data is supplementary
        console.warn('Failed to load safety overview:', err);
      } finally {
        if (active) setSafetyLoading(false);
      }
    };
    loadSafety();
    return () => { active = false; };
  }, []);

  // Phase 11: Handle safety moment acknowledgement
  const handleSafetyMomentAcknowledge = () => {
    // Refresh safety summary after acknowledgement
    getMySafetyOverview().then(data => {
      setSafetySummary(data);
    }).catch(() => {});
  };

  if (loading) return <LoadingState message="Loading dashboard metrics..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState message="No dashboard data yet." />;

  const kpis = data.kpis || {};

  // Calculate overdue actions count (for threshold coloring)
  const overdueActions = kpis.overdueActions ?? 0;

  return (
    <div className="page dashboard-grid">
      <div className="kpi-grid">
        <div
          className="card kpi clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/incidents')}
          onKeyDown={(event) => handleKpiKeyDown(event, () => navigate('/incidents'))}
        >
          <div className="label">Total Incidents</div>
          <div className="value">{kpis.totalIncidents ?? 0}</div>
        </div>
        <div
          className={`card kpi clickable ${getKpiClass(
            kpis.openIncidents ?? 0,
            thresholds.openIncidentsWarning,
            thresholds.openIncidentsCritical
          )}`}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/incidents?status=open')}
          onKeyDown={(event) => handleKpiKeyDown(event, () => navigate('/incidents?status=open'))}
        >
          <div className="label">Open Incidents</div>
          <div className="value">{kpis.openIncidents ?? 0}</div>
        </div>
        <div
          className="card kpi clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/incidents')}
          onKeyDown={(event) => handleKpiKeyDown(event, () => navigate('/incidents'))}
        >
          <div className="label">Incidents (30d)</div>
          <div className="value">{kpis.incidentsLast30Days ?? 0}</div>
        </div>
        <div
          className="card kpi clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/inspections')}
          onKeyDown={(event) => handleKpiKeyDown(event, () => navigate('/inspections'))}
        >
          <div className="label">Inspections (30d)</div>
          <div className="value">{kpis.inspectionsLast30Days ?? 0}</div>
        </div>
        <div
          className={`card kpi clickable ${getKpiClass(
            kpis.failedInspectionsLast30Days ?? 0,
            thresholds.failedInspectionsWarning,
            thresholds.failedInspectionsCritical
          )}`}
          role="button"
          tabIndex={0}
          onClick={() => navigate('/inspections?result=fail')}
          onKeyDown={(event) => handleKpiKeyDown(event, () => navigate('/inspections?result=fail'))}
        >
          <div className="label">Failed Inspections</div>
          <div className="value">{kpis.failedInspectionsLast30Days ?? 0}</div>
        </div>
        {overdueActions !== undefined && (
          <div
            className={`card kpi clickable ${getKpiClass(
              overdueActions,
              thresholds.overdueActionsWarning,
              thresholds.overdueActionsCritical
            )}`}
            role="button"
            tabIndex={0}
            onClick={() => navigate('/actions?status=overdue')}
            onKeyDown={(event) => handleKpiKeyDown(event, () => navigate('/actions?status=overdue'))}
          >
            <div className="label">Overdue Actions</div>
            <div className="value">{overdueActions}</div>
          </div>
        )}
      </div>

      <div className="card chart-card">
        <h3>Incidents by Type</h3>
        {data.incidentsByType?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.incidentsByType}>
              <XAxis
                dataKey="type"
                tick={{ fill: 'var(--color-text-muted)' }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--color-text-muted)' }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--color-text-strong)'
                }}
              />
              <Bar dataKey="count" fill="#2d6a6a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No incident data yet." />
        )}
      </div>

      <div className="card chart-card">
        <h3>Severity Trend (12 months)</h3>
        {data.severityTrend?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.severityTrend}>
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--color-text-muted)' }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: 'var(--color-text-muted)' }}
                axisLine={{ stroke: 'var(--color-border-subtle)' }}
                tickLine={{ stroke: 'var(--color-border-subtle)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--color-text-strong)'
                }}
              />
              <Line type="monotone" dataKey="low" stroke="#96c291" />
              <Line type="monotone" dataKey="medium" stroke="#f0b35d" />
              <Line type="monotone" dataKey="high" stroke="#d97855" />
              <Line type="monotone" dataKey="critical" stroke="#b23c3c" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message="No severity data yet." />
        )}
      </div>

      <div className="card table-card">
        <h3>Recent Incidents</h3>
        {data.recentIncidents?.length ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentIncidents.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/incidents/${row.id}`)}>
                  <td>{new Date(row.occurredAt).toLocaleDateString()}</td>
                  <td>{row.title}</td>
                  <td>
                    <span className={`badge status-${row.severity?.toLowerCase()}`}>{row.severity}</span>
                  </td>
                  <td>
                    <span className={`badge status-${row.status?.toLowerCase().replace(/[^a-z]/g, '-')}`}>{row.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No incidents yet." />
        )}
      </div>

      <div className="card table-card">
        <h3>Recent Inspections</h3>
        {data.recentInspections?.length ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Template</th>
                <th>Site</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInspections.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/inspections/${row.id}`)}>
                  <td>{new Date(row.performedAt).toLocaleDateString()}</td>
                  <td>{row.templateName}</td>
                  <td>{row.siteName}</td>
                  <td>
                    <span className={`badge status-${row.overallResult?.toLowerCase()}`}>{row.overallResult}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No inspections yet." />
        )}
      </div>

      {/* Phase 11: Safety Advisor right column */}
      <div className="dashboard-right-col">
        <DashboardSafetyMomentCard
          safetyMoment={safetySummary?.safetyMoment}
          siteId={safetySummary?.siteId}
          loading={safetyLoading}
          onAcknowledge={handleSafetyMomentAcknowledge}
        />
        <DashboardUpcomingSafetyCard
          upcomingWork={safetySummary?.upcomingWork}
          loading={safetyLoading}
        />
        <SafetyAdvisorPanel
          siteId={safetySummary?.siteId}
          safetySummary={safetySummary}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
