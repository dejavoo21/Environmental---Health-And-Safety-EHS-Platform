import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  ShieldCheck,
  Users,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  LogIn,
  LogOut,
  Eye,
  Download
} from 'lucide-react';
import './AdminSecurityPage.css';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AdminSecurityPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const [usersRes, logsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/audit-logs', { params: { limit: 50 } })
      ]);
      
      const usersData = usersRes.data?.users || usersRes.data?.data || (Array.isArray(usersRes.data) ? usersRes.data : []);
      const logsData = logsRes.data?.logs || logsRes.data?.data || (Array.isArray(logsRes.data) ? logsRes.data : []);
      
      setUsers(usersData);
      setAuditLogs(logsData);
      
      // Calculate overview stats
      const activeUsers = Array.isArray(usersData) ? usersData.filter(u => u.is_active).length : 0;
      const with2FA = Array.isArray(usersData) ? usersData.filter(u => u.has_2fa_enabled).length : 0;
      const lockedOut = Array.isArray(usersData) ? usersData.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length : 0;
      const failedLogins = Array.isArray(logsData) ? logsData.filter(l => 
        l.action === 'login_failed' && 
        new Date(l.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length : 0;
      
      setOverview({
        totalUsers: Array.isArray(usersData) ? usersData.length : 0,
        activeUsers,
        with2FA,
        lockedOut,
        failedLogins24h: failedLogins,
        recentActivity: Array.isArray(logsData) ? logsData.slice(0, 10) : []
      });
    } catch (err) {
      console.error('Security overview error:', err);
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message || err.message;
      let errorMsg = 'Failed to load security data';

      if (status === 500) {
        errorMsg = `Failed to load security data (500). ${serverMessage}. Please ensure migrations are applied.`;
      } else if (status === 404) {
        errorMsg = `Security endpoint not found (404). API may not be configured.`;
      } else if (status === 403) {
        errorMsg = `Access denied (403). You may not have admin permissions.`;
      } else if (serverMessage) {
        errorMsg = serverMessage;
      }

      setError(errorMsg);
      // Still set empty overview so page renders
      setOverview({
        totalUsers: 0,
        activeUsers: 0,
        with2FA: 0,
        lockedOut: 0,
        failedLogins24h: 0,
        recentActivity: []
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filterAction) params.action = filterAction;
      
      const res = await api.get('/audit-logs', { params });
      setAuditLogs(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filterAction]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/sessions');
      setSessions(res.data?.data || res.data || []);
    } catch (err) {
      // Sessions endpoint may not exist
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, fetchOverview, fetchAuditLogs, fetchSessions]);

  const handleExportLogs = async () => {
    try {
      const res = await api.get('/audit-logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export logs');
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Revoke this session? The user will be logged out.')) return;
    
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke session');
    }
  };

  const handleUnlockUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unlock`);
      fetchOverview();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unlock user');
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'login': return <LogIn size={16} className="action-icon action-icon--success" />;
      case 'login_failed': return <XCircle size={16} className="action-icon action-icon--danger" />;
      case 'logout': return <LogOut size={16} className="action-icon action-icon--muted" />;
      case 'password_change': return <Key size={16} className="action-icon action-icon--warning" />;
      case '2fa_enabled': return <Shield size={16} className="action-icon action-icon--success" />;
      case '2fa_disabled': return <Shield size={16} className="action-icon action-icon--danger" />;
      default: return <Eye size={16} className="action-icon" />;
    }
  };

  const renderOverview = () => (
    <div className="security-content">
      {/* Stats Cards */}
      <div className="security-stats">
        <div className="security-stat-card">
          <div className="security-stat-icon security-stat-icon--blue">
            <Users size={20} />
          </div>
          <div className="security-stat-content">
            <span className="security-stat-value">{overview?.totalUsers || 0}</span>
            <span className="security-stat-label">Total Users</span>
          </div>
        </div>
        
        <div className="security-stat-card">
          <div className="security-stat-icon security-stat-icon--green">
            <CheckCircle2 size={20} />
          </div>
          <div className="security-stat-content">
            <span className="security-stat-value">{overview?.activeUsers || 0}</span>
            <span className="security-stat-label">Active Users</span>
          </div>
        </div>
        
        <div className="security-stat-card">
          <div className="security-stat-icon security-stat-icon--purple">
            <Shield size={20} />
          </div>
          <div className="security-stat-content">
            <span className="security-stat-value">{overview?.with2FA || 0}</span>
            <span className="security-stat-label">With 2FA</span>
          </div>
        </div>
        
        <div className="security-stat-card security-stat-card--warning">
          <div className="security-stat-icon security-stat-icon--red">
            <Lock size={20} />
          </div>
          <div className="security-stat-content">
            <span className="security-stat-value">{overview?.lockedOut || 0}</span>
            <span className="security-stat-label">Locked Out</span>
          </div>
        </div>
        
        <div className="security-stat-card">
          <div className="security-stat-icon security-stat-icon--orange">
            <AlertTriangle size={20} />
          </div>
          <div className="security-stat-content">
            <span className="security-stat-value">{overview?.failedLogins24h || 0}</span>
            <span className="security-stat-label">Failed Logins (24h)</span>
          </div>
        </div>
      </div>

      {/* 2FA Coverage */}
      <div className="security-section">
        <h3>2FA Coverage</h3>
        <div className="twofa-progress">
          <div className="twofa-bar">
            <div 
              className="twofa-fill" 
              style={{ 
                width: `${overview?.totalUsers ? (overview.with2FA / overview.totalUsers * 100) : 0}%` 
              }}
            />
          </div>
          <span className="twofa-label">
            {overview?.with2FA || 0} of {overview?.totalUsers || 0} users have 2FA enabled
            ({overview?.totalUsers ? Math.round(overview.with2FA / overview.totalUsers * 100) : 0}%)
          </span>
        </div>
      </div>

      {/* Locked Users */}
      {overview?.lockedOut > 0 && (
        <div className="security-section security-section--alert">
          <h3><Lock size={18} /> Locked Out Users</h3>
          <div className="locked-users-list">
            {users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).map(user => (
              <div key={user.id} className="locked-user-item">
                <div className="locked-user-info">
                  <strong>{user.name || user.email}</strong>
                  <span>Locked until {formatDate(user.locked_until)}</span>
                </div>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleUnlockUser(user.id)}
                >
                  Unlock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="security-section">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {overview?.recentActivity?.slice(0, 5).map((log, index) => (
            <div key={index} className="activity-item">
              {getActionIcon(log.action)}
              <div className="activity-content">
                <span className="activity-action">{log.action?.replace(/_/g, ' ')}</span>
                <span className="activity-user">{log.user_name || log.email || 'Unknown'}</span>
              </div>
              <span className="activity-time">{formatDate(log.created_at)}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-link" onClick={() => setActiveTab('audit')}>
          View all activity →
        </button>
      </div>
    </div>
  );

  const renderAuditLogs = () => (
    <div className="security-content">
      <div className="audit-toolbar">
        <div className="audit-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          value={filterAction} 
          onChange={(e) => setFilterAction(e.target.value)}
          aria-label="Filter by action"
        >
          <option value="">All Actions</option>
          <option value="login">Login</option>
          <option value="login_failed">Failed Login</option>
          <option value="logout">Logout</option>
          <option value="password_change">Password Change</option>
          <option value="2fa_enabled">2FA Enabled</option>
          <option value="2fa_disabled">2FA Disabled</option>
        </select>
        
        <button className="btn btn-secondary" onClick={handleExportLogs}>
          <Download size={16} /> Export
        </button>
      </div>
      
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Details</th>
              <th>IP Address</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs
              .filter(log => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                  log.action?.toLowerCase().includes(term) ||
                  log.user_name?.toLowerCase().includes(term) ||
                  log.email?.toLowerCase().includes(term)
                );
              })
              .map((log, index) => (
                <tr key={index}>
                  <td>
                    <span className="audit-action">
                      {getActionIcon(log.action)}
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{log.user_name || log.email || '-'}</td>
                  <td className="audit-details">{log.details || '-'}</td>
                  <td><code>{log.ip_address || '-'}</code></td>
                  <td>{formatDate(log.created_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      
      {auditLogs.length === 0 && !loading && (
        <div className="audit-empty">
          <Eye size={48} />
          <p>No audit logs found</p>
        </div>
      )}
    </div>
  );

  const renderSessions = () => (
    <div className="security-content">
      <div className="sessions-header">
        <h3>Active Sessions</h3>
        <button className="btn btn-secondary" onClick={fetchSessions}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      
      {sessions.length === 0 ? (
        <div className="sessions-empty">
          <Users size={48} />
          <p>No active sessions found or session management is not available.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-icon">
                <Users size={24} />
              </div>
              <div className="session-info">
                <strong>{session.user_name || session.email}</strong>
                <span>{session.browser || 'Unknown Browser'}</span>
                <span className="session-meta">
                  <Clock size={12} />
                  Last active: {formatDate(session.last_activity)}
                </span>
              </div>
              <button 
                className="btn btn-sm btn-danger"
                onClick={() => handleRevokeSession(session.id)}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading && overview === null) {
    return (
      <div className="admin-security-page">
        <header className="security-header">
          <h1><ShieldCheck size={28} /> Security Centre</h1>
          <p>Monitor and manage security across your organisation</p>
        </header>
        <div className="security-loading">
          <div className="spinner" />
          <p>Loading security centre...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-security-page">
      <header className="security-header">
        <h1><ShieldCheck size={28} /> Security Centre</h1>
        <p>Monitor and manage security across your organisation</p>
      </header>

      <div className="security-tabs">
        <button 
          className={`security-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <ShieldCheck size={18} /> Overview
        </button>
        <button 
          className={`security-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Eye size={18} /> Audit Logs
        </button>
        <button 
          className={`security-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Users size={18} /> Active Sessions
        </button>
      </div>

      {error && (
        <div className="security-error">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'audit' && renderAuditLogs()}
      {activeTab === 'sessions' && renderSessions()}
    </div>
  );
};

export default AdminSecurityPage;
