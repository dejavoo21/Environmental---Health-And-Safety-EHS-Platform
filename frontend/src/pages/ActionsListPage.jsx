import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

// P2-J3: My Actions, P2-J4: All Actions
const ActionsListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const viewAll = searchParams.get('view') === 'all';

  const [actions, setActions] = useState([]);
  const [sites, setSites] = useState([]);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [siteFilter, setSiteFilter] = useState(() => searchParams.get('siteId') || '');
  const [dueDateFrom, setDueDateFrom] = useState(() => searchParams.get('dueDateFrom') || '');
  const [dueDateTo, setDueDateTo] = useState(() => searchParams.get('dueDateTo') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canViewAll = user?.role === 'manager' || user?.role === 'admin';

  const loadSites = async () => {
    try {
      const res = await api.get('/sites');
      setSites(res.data.sites || []);
    } catch (err) {
      // Sites not critical, ignore error
    }
  };

  const loadActions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { scope: viewAll && canViewAll ? 'all' : 'my' };
      if (statusFilter) params.status = statusFilter;
      if (siteFilter) params.siteId = siteFilter;
      if (dueDateFrom) params.dueDateFrom = dueDateFrom;
      if (dueDateTo) params.dueDateTo = dueDateTo;

      const res = await api.get('/actions', { params });
      setActions(res.data.actions || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view all actions.');
      } else {
        setError('Unable to load actions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '');
    setSiteFilter(searchParams.get('siteId') || '');
    setDueDateFrom(searchParams.get('dueDateFrom') || '');
    setDueDateTo(searchParams.get('dueDateTo') || '');
  }, [searchParams]);

  useEffect(() => {
    loadActions();
  }, [statusFilter, siteFilter, dueDateFrom, dueDateTo, viewAll]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'badge status-open';
      case 'in_progress': return 'badge status-progress';
      case 'done': return 'badge status-done';
      case 'overdue': return 'badge status-overdue';
      default: return 'badge';
    }
  };

  const getSourceLabel = (action) => {
    if (action.sourceType === 'incident') return 'Incident';
    if (action.sourceType === 'inspection') return 'Inspection';
    return action.sourceType;
  };

  if (loading) return <LoadingState message="Loading actions..." />;
  if (error) return <ErrorState message={error} />;

  const pageTitle = viewAll && canViewAll ? 'All Actions' : 'My Actions';
  const emptyMessage = viewAll && canViewAll
    ? 'No actions found.'
    : 'No actions assigned to you.';

  return (
    <div className="page">
      <div className="page-header">
        <h2>{pageTitle}</h2>
        {canViewAll && (
          <div className="view-toggle">
            <button
              className={`btn ${!viewAll ? 'primary' : 'ghost'}`}
              onClick={() => navigate('/actions')}
            >
              My Actions
            </button>
            <button
              className={`btn ${viewAll ? 'primary' : 'ghost'}`}
              onClick={() => navigate('/actions?view=all')}
            >
              All Actions
            </button>
          </div>
        )}
      </div>

      <div className="filters compact sticky">
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="overdue">Overdue</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Site
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="">All</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </label>
        <label>
          Due From
          <input
            type="date"
            value={dueDateFrom}
            onChange={(e) => setDueDateFrom(e.target.value)}
          />
        </label>
        <label>
          Due To
          <input
            type="date"
            value={dueDateTo}
            onChange={(e) => setDueDateTo(e.target.value)}
          />
        </label>
      </div>

      {actions.length === 0 ? (
        <div className="card empty-actions-card">
          <div className="empty-actions-content">
            {viewAll && canViewAll ? (
              <>
                <h3>No Actions Found</h3>
                <p>There are no actions in the system yet.</p>
                <p className="muted">
                  Actions are created from incidents or inspections when corrective measures are needed.
                </p>
                <p className="muted">
                  Go to an <strong>Incident</strong> or <strong>Inspection</strong> detail page and click{' '}
                  <strong>+ Add Action</strong> to create one.
                </p>
              </>
            ) : (
              <>
                <h3>No Actions Assigned to You</h3>
                <p>You currently have no actions assigned to you.</p>
                {canViewAll ? (
                  <>
                    <p className="muted">
                      To assign an action to yourself, go to an <strong>Incident</strong> or{' '}
                      <strong>Inspection</strong> detail page and click <strong>+ Add Action</strong>.
                      You can then select yourself as the assignee.
                    </p>
                    <button
                      className="btn ghost"
                      onClick={() => navigate('/actions?view=all')}
                    >
                      View All Actions
                    </button>
                  </>
                ) : (
                  <p className="muted">
                    When a manager assigns you an action from an incident or inspection, it will appear here.
                    Ask your manager to assign actions to you if needed.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Source</th>
                <th>Site</th>
                {viewAll && canViewAll && <th>Assignee</th>}
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id} onClick={() => navigate(`/actions/${action.id}`)}>
                  <td>{action.title}</td>
                  <td>{getSourceLabel(action)}</td>
                  <td>{action.siteId ? sites.find(s => s.id === action.siteId)?.name || '-' : '-'}</td>
                  {viewAll && canViewAll && (
                    <td>
                      {action.assignedTo
                        ? `${action.assignedTo.firstName} ${action.assignedTo.lastName}`
                        : '-'}
                    </td>
                  )}
                  <td>{formatDate(action.dueDate)}</td>
                  <td>
                    <span className={getStatusBadgeClass(action.status)}>
                      {action.status.replace('_', ' ')}
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

export default ActionsListPage;
