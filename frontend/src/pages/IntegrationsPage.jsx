import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  ShieldCheck,
  Code2,
  Webhook,
  Clock,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  Pause,
  Play,
  FlaskConical,
  AlertTriangle,
  Wrench,
  Info,
  FileText,
  LockKeyhole,
  Building2
} from 'lucide-react';
import './IntegrationsPage.css';

// Utility functions
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

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

// Status Badge Component
const StatusBadge = ({ status, label }) => {
  const statusClass = {
    active: 'status-active',
    enabled: 'status-active',
    suspended: 'status-suspended',
    revoked: 'status-revoked',
    disabled: 'status-disabled',
    failed: 'status-failed'
  }[status] || 'status-default';

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot"></span>
      {label || status}
    </span>
  );
};

// Copy Button Component
const CopyButton = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button className="btn-copy" onClick={handleCopy} title={label}>
      {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
    </button>
  );
};

// Secret Field Component
const SecretField = ({ value, masked = true }) => {
  const [show, setShow] = useState(false);
  const displayValue = show ? value : value?.replace(/./g, '•').slice(0, 32) + '****';

  return (
    <div className="secret-field">
      <code className="secret-value">{displayValue}</code>
      <button className="btn-icon" onClick={() => setShow(!show)}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
      <CopyButton text={value} />
    </div>
  );
};

// ============================================
// SSO TAB COMPONENTS
// ============================================

const SSOTab = ({ orgId }) => {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/integrations/sso');
      setProvider(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.message || 'Failed to load SSO configuration');
      }
      setProvider(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  if (loading) {
    return <div className="loading-state">Loading SSO configuration...</div>;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  if (!provider && !showConfig) {
    return (
      <div className="empty-state-card">
        <div className="empty-icon"><LockKeyhole size={48} strokeWidth={1.5} /></div>
        <h3>Enable Single Sign-On for your organisation</h3>
        <p>Allow users to sign in using their corporate identity provider (Azure AD, Okta, etc.)</p>
        <button className="btn btn-primary" onClick={() => setShowConfig(true)}>
          + Configure SSO Provider
        </button>
        <div className="supported-providers">
          <p>Supported providers:</p>
          <ul>
            <li>Microsoft Entra ID (Azure AD)</li>
            <li>Generic OpenID Connect</li>
          </ul>
        </div>
      </div>
    );
  }

  if (showConfig) {
    return (
      <SSOConfigWizard
        provider={provider}
        onSave={() => {
          setShowConfig(false);
          fetchProvider();
        }}
        onCancel={() => setShowConfig(false)}
      />
    );
  }

  return (
    <div className="sso-configured">
      <div className="card">
        <div className="card-header">
          <div className="card-title-row">
            <h3>Provider Status</h3>
            <div className="card-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfig(true)}>
                Edit
              </button>
              <button className="btn btn-danger-outline" onClick={() => {/* TODO: Delete */}}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="provider-info">
            <div className="provider-logo">
              {provider.provider_type === 'azure_ad' ? <Building2 size={28} strokeWidth={1.5} /> : <KeyRound size={28} strokeWidth={1.5} />}
            </div>
            <div className="provider-details">
              <h4>{provider.name}</h4>
              <p className="provider-type">
                {provider.provider_type === 'azure_ad' ? 'Microsoft Entra ID' : 'OpenID Connect'}
              </p>
            </div>
          </div>
          
          <div className="provider-stats">
            <div className="stat-item">
              <span className="stat-label">Status:</span>
              <StatusBadge status={provider.is_enabled ? 'enabled' : 'disabled'} label={provider.is_enabled ? 'Enabled' : 'Disabled'} />
            </div>
            <div className="stat-item">
              <span className="stat-label">JIT Provisioning:</span>
              <span className={provider.jit_provisioning ? 'status-pill status-enabled' : 'status-pill status-disabled'}>{provider.jit_provisioning ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">SSO-Only Mode:</span>
              <span className={provider.sso_only_mode ? 'status-pill status-enabled' : 'status-pill status-disabled'}>{provider.sso_only_mode ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Default Role:</span>
              <span>{provider.default_role || 'worker'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Redirect URI (configure in your IdP)</h3>
        </div>
        <div className="card-body">
          <div className="copy-field">
            <code>{window.location.origin}/api/auth/sso/callback</code>
            <CopyButton text={`${window.location.origin}/api/auth/sso/callback`} />
          </div>
        </div>
      </div>

      {provider.role_mappings && provider.role_mappings.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title-row">
              <h3>Role Mappings</h3>
              <button className="btn btn-secondary btn-sm">Edit Mappings</button>
            </div>
          </div>
          <div className="card-body">
            <ul className="role-mappings-list">
              {provider.role_mappings.map((mapping, idx) => (
                <li key={idx}>
                  {mapping.idp_group} → {mapping.ehs_role} (Priority: {mapping.priority})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const SSOConfigWizard = ({ provider, onSave, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    provider_type: provider?.provider_type || 'azure_ad',
    issuer_url: provider?.issuer_url || '',
    client_id: provider?.client_id || '',
    client_secret: '',
    jit_provisioning: provider?.jit_provisioning ?? true,
    sso_only_mode: provider?.sso_only_mode ?? false,
    default_role: provider?.default_role || 'worker',
    group_claim: provider?.group_claim || 'groups',
    role_mappings: provider?.role_mappings || []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    setTestResult({ status: 'testing' });
    try {
      await api.post('/integrations/sso/test', {
        issuer_url: formData.issuer_url,
        client_id: formData.client_id,
        client_secret: formData.client_secret || undefined
      });
      setTestResult({ status: 'success', message: 'Connection successful!' });
    } catch (err) {
      setTestResult({ status: 'error', message: err.response?.data?.message || 'Connection failed' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (provider) {
        await api.put(`/integrations/sso/${provider.id}`, formData);
      } else {
        await api.post('/integrations/sso', formData);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save SSO configuration');
    } finally {
      setSaving(false);
    }
  };

  const addRoleMapping = () => {
    setFormData(prev => ({
      ...prev,
      role_mappings: [...prev.role_mappings, { idp_group: '', ehs_role: 'worker', priority: 0 }]
    }));
  };

  const updateRoleMapping = (index, field, value) => {
    const updated = [...formData.role_mappings];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, role_mappings: updated }));
  };

  const removeRoleMapping = (index) => {
    setFormData(prev => ({
      ...prev,
      role_mappings: prev.role_mappings.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <h2>{provider ? 'Edit SSO Provider' : 'Configure SSO Provider'}</h2>
        <div className="wizard-steps">
          <div className={`wizard-step ${step >= 1 ? 'active' : ''}`}>1. Provider Details</div>
          <div className={`wizard-step ${step >= 2 ? 'active' : ''}`}>2. Options</div>
          <div className={`wizard-step ${step >= 3 ? 'active' : ''}`}>3. Role Mappings</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <div className="wizard-step-content">
          <div className="form-group">
            <label>Provider Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Corporate Azure AD"
            />
            <small>Display name shown to users</small>
          </div>

          <div className="form-group">
            <label>Provider Type</label>
            <select
              value={formData.provider_type}
              onChange={(e) => handleChange('provider_type', e.target.value)}
            >
              <option value="azure_ad">Microsoft Entra ID (Azure AD)</option>
              <option value="oidc">Generic OpenID Connect</option>
            </select>
          </div>

          <div className="form-group">
            <label>Issuer URL</label>
            <input
              type="url"
              value={formData.issuer_url}
              onChange={(e) => handleChange('issuer_url', e.target.value)}
              placeholder="https://login.microsoftonline.com/your-tenant-id/v2.0"
            />
            <small>The OIDC issuer URL from your identity provider</small>
          </div>

          <div className="form-group">
            <label>Client ID</label>
            <input
              type="text"
              value={formData.client_id}
              onChange={(e) => handleChange('client_id', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label>Client Secret</label>
            <input
              type="password"
              value={formData.client_secret}
              onChange={(e) => handleChange('client_secret', e.target.value)}
              placeholder={provider ? '(unchanged)' : 'Enter client secret'}
            />
          </div>

          {testResult && (
            <div className={`alert ${testResult.status === 'success' ? 'alert-success' : testResult.status === 'error' ? 'alert-error' : 'alert-info'}`}>
              {testResult.status === 'testing' ? 'Testing connection...' : testResult.message}
            </div>
          )}

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <div className="wizard-actions-right">
              <button className="btn btn-secondary" onClick={handleTestConnection}>Test Connection</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-step-content">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.jit_provisioning}
                onChange={(e) => handleChange('jit_provisioning', e.target.checked)}
              />
              Enable Just-In-Time Provisioning
            </label>
            <small>Automatically create user accounts on first SSO login</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.sso_only_mode}
                onChange={(e) => handleChange('sso_only_mode', e.target.checked)}
              />
              Enforce SSO-Only Mode
            </label>
            <small>⚠️ Disable password login for all users (requires SSO)</small>
          </div>

          <div className="form-group">
            <label>Default Role for New Users</label>
            <select
              value={formData.default_role}
              onChange={(e) => handleChange('default_role', e.target.value)}
            >
              <option value="worker">Worker</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <small>Assigned when no role mapping matches</small>
          </div>

          <div className="form-group">
            <label>Group Claim Name</label>
            <input
              type="text"
              value={formData.group_claim}
              onChange={(e) => handleChange('group_claim', e.target.value)}
              placeholder="groups"
            />
            <small>The claim in the ID token containing user groups</small>
          </div>

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-step-content">
          <p>Map identity provider groups to EHS Portal roles:</p>

          <table className="role-mappings-table">
            <thead>
              <tr>
                <th>IdP Group Name</th>
                <th>EHS Role</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {formData.role_mappings.map((mapping, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      value={mapping.idp_group}
                      onChange={(e) => updateRoleMapping(idx, 'idp_group', e.target.value)}
                      placeholder="EHS-Admins"
                    />
                  </td>
                  <td>
                    <select
                      value={mapping.ehs_role}
                      onChange={(e) => updateRoleMapping(idx, 'ehs_role', e.target.value)}
                    >
                      <option value="worker">Worker</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={mapping.priority}
                      onChange={(e) => updateRoleMapping(idx, 'priority', parseInt(e.target.value, 10))}
                      min="0"
                      max="100"
                    />
                  </td>
                  <td>
                    <button className="btn btn-icon" onClick={() => removeRoleMapping(idx)} aria-label="Remove mapping"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn btn-secondary btn-sm" onClick={addRoleMapping}>
            + Add Mapping
          </button>

          <p className="help-text">
            ⓘ Higher priority mappings are evaluated first. If a user belongs to multiple groups, the highest priority match determines their role.
          </p>

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Enable'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// API CLIENTS TAB COMPONENTS
// ============================================

const APIClientsTab = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newApiKey, setNewApiKey] = useState(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/integrations/api-clients');
      setClients(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load API clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateClient = async (formData) => {
    try {
      const res = await api.post('/integrations/api-clients', formData);
      setNewApiKey({
        apiKey: res.data.apiKey,
        clientId: res.data.client.id,
        name: res.data.client.name
      });
      setShowCreateModal(false);
      fetchClients();
    } catch (err) {
      throw err;
    }
  };

  const handleSuspendClient = async (clientId) => {
    if (!confirm('Are you sure you want to suspend this API client?')) return;
    try {
      await api.post(`/integrations/api-clients/${clientId}/suspend`);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to suspend client');
    }
  };

  const handleActivateClient = async (clientId) => {
    try {
      await api.post(`/integrations/api-clients/${clientId}/activate`);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to activate client');
    }
  };

  if (loading) {
    return <div className="loading-state">Loading API clients...</div>;
  }

  return (
    <div className="api-clients-tab">
      <div className="tab-header">
        <h3>API Clients</h3>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create API Client
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {newApiKey && (
        <APIKeyDisplayModal
          apiKey={newApiKey.apiKey}
          clientId={newApiKey.clientId}
          name={newApiKey.name}
          onClose={() => setNewApiKey(null)}
        />
      )}

      {showCreateModal && (
        <APIClientFormModal
          onSave={handleCreateClient}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {selectedClient && (
        <APIClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onRefresh={fetchClients}
        />
      )}

      {clients.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon"><Code2 size={48} strokeWidth={1.5} /></div>
          <h3>No API clients configured</h3>
          <p>Create an API client to allow external systems to access EHS Portal data.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create API Client
          </button>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Scopes</th>
              <th>Last Used</th>
              <th>Requests</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id}>
                <td>
                  <button className="link-button" onClick={() => setSelectedClient(client)}>
                    {client.name}
                  </button>
                </td>
                <td>
                  <StatusBadge status={client.status} />
                </td>
                <td className="scopes-cell">
                  {client.scopes?.slice(0, 2).join(', ')}
                  {client.scopes?.length > 2 && ` +${client.scopes.length - 2}`}
                </td>
                <td>{formatRelativeTime(client.last_used_at)}</td>
                <td>{client.request_count?.toLocaleString() || 0}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-icon" onClick={() => setSelectedClient(client)} title="View Details">
                      <Eye size={16} />
                    </button>
                    {client.status === 'active' ? (
                      <button className="btn btn-icon" onClick={() => handleSuspendClient(client.id)} title="Suspend">
                        <Pause size={16} />
                      </button>
                    ) : (
                      <button className="btn btn-icon" onClick={() => handleActivateClient(client.id)} title="Activate">
                        <Play size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="info-box">
        <p><Info size={14} className="info-icon" /> API clients allow external systems to access EHS Portal data. Each client receives a unique API key for authentication.</p>
        <a href="#" className="link"><FileText size={14} /> View API Documentation</a>
      </div>
    </div>
  );
};

const APIClientFormModal = ({ client, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    description: client?.description || '',
    scopes: client?.scopes || [],
    ip_allowlist: client?.ip_allowlist?.join(', ') || '',
    rate_limit_tier: client?.rate_limit_tier || 'standard'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const availableScopes = [
    { id: 'read:incidents', label: 'Read Incidents' },
    { id: 'write:incidents', label: 'Write Incidents' },
    { id: 'read:actions', label: 'Read Actions' },
    { id: 'write:actions', label: 'Write Actions' },
    { id: 'read:inspections', label: 'Read Inspections' },
    { id: 'read:risks', label: 'Read Risks' },
    { id: 'read:training', label: 'Read Training' },
    { id: 'read:users', label: 'Read Users' },
    { id: 'read:chemicals', label: 'Read Chemicals' }
  ];

  const toggleScope = (scope) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...formData,
        ip_allowlist: formData.ip_allowlist ? formData.ip_allowlist.split(',').map(ip => ip.trim()) : []
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create API client');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{client ? 'Edit API Client' : 'Create API Client'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Client Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Power BI Dashboard"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Read-only access for executive dashboards"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Scopes *</label>
              <div className="scopes-grid">
                {availableScopes.map(scope => (
                  <label key={scope.id} className="scope-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>IP Allowlist (optional)</label>
              <input
                type="text"
                value={formData.ip_allowlist}
                onChange={(e) => setFormData(prev => ({ ...prev, ip_allowlist: e.target.value }))}
                placeholder="10.0.0.0/8, 192.168.1.100"
              />
              <small>Comma-separated IPs or CIDR ranges. Leave empty to allow all IPs.</small>
            </div>

            <div className="form-group">
              <label>Rate Limit Tier</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="standard"
                    checked={formData.rate_limit_tier === 'standard'}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_tier: e.target.value }))}
                  />
                  Standard (1,000 requests/minute)
                </label>
                <label>
                  <input
                    type="radio"
                    value="premium"
                    checked={formData.rate_limit_tier === 'premium'}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_tier: e.target.value }))}
                  />
                  Premium (5,000 requests/minute)
                </label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || formData.scopes.length === 0}>
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const APIKeyDisplayModal = ({ apiKey, clientId, name, onClose }) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>API Client Created</h2>
        </div>
        <div className="modal-body">
          <div className="alert alert-success"><Check size={16} /> {name} created successfully</div>
          
          <div className="alert alert-warning">
            <AlertTriangle size={16} /> Save your API key now - it won't be shown again!
          </div>

          <div className="form-group">
            <label>API Key</label>
            <div className="key-display">
              <code>{apiKey}</code>
              <CopyButton text={apiKey} />
            </div>
          </div>

          <div className="form-group">
            <label>Client ID</label>
            <div className="key-display">
              <code>{clientId}</code>
              <CopyButton text={clientId} />
            </div>
          </div>

          <label className="confirm-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I have saved this API key securely
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose} disabled={!confirmed}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const APIClientDetailModal = ({ client, onClose, onRefresh }) => {
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenText, setRegenText] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [newKey, setNewKey] = useState(null);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post(`/integrations/api-clients/${client.id}/regenerate`);
      setNewKey(res.data.apiKey);
      setShowRegenConfirm(false);
      setRegenText('');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to regenerate key');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{client.name}</h2>
          <div className="modal-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowRegenConfirm(true)}>
              Regenerate Key
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <label>Status</label>
              <StatusBadge status={client.status} />
            </div>
            <div className="detail-item">
              <label>Created</label>
              <span>{formatDate(client.created_at)}</span>
            </div>
          </div>

          {newKey && (
            <div className="alert alert-warning">
              <strong>New API Key Generated!</strong>
              <div className="key-display">
                <code>{newKey}</code>
                <CopyButton text={newKey} />
              </div>
              <small>Save this key now - it won't be shown again!</small>
            </div>
          )}

          <div className="form-group">
            <label>API Key (masked)</label>
            <div className="key-display">
              <code>{client.key_prefix}****************************</code>
            </div>
          </div>

          <div className="form-group">
            <label>Client ID</label>
            <div className="key-display">
              <code>{client.id}</code>
              <CopyButton text={client.id} />
            </div>
          </div>

          <div className="form-group">
            <label>Scopes</label>
            <div className="scopes-display">
              {client.scopes?.map(scope => (
                <span key={scope} className="scope-tag">{scope}</span>
              ))}
            </div>
          </div>

          {client.ip_allowlist && client.ip_allowlist.length > 0 && (
            <div className="form-group">
              <label>IP Allowlist</label>
              <p>{client.ip_allowlist.join(', ')}</p>
            </div>
          )}

          <div className="form-group">
            <label>Rate Limit</label>
            <p>{client.rate_limit_tier === 'premium' ? 'Premium (5,000 req/min)' : 'Standard (1,000 req/min)'}</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{client.request_count?.toLocaleString() || 0}</div>
              <div className="stat-label">Total Requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatRelativeTime(client.last_used_at)}</div>
              <div className="stat-label">Last Used</div>
            </div>
          </div>

          {showRegenConfirm && (
            <div className="inline-confirm">
              <div className="alert alert-warning">
                ⚠️ Warning: This will immediately invalidate the current API key.
                Any integrations using the current key will stop working until updated with the new key.
              </div>
              <div className="form-group">
                <label>Type "REGENERATE" to confirm:</label>
                <input
                  type="text"
                  value={regenText}
                  onChange={(e) => setRegenText(e.target.value)}
                  placeholder="REGENERATE"
                />
              </div>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => { setShowRegenConfirm(false); setRegenText(''); }}>Cancel</button>
                <button
                  className="btn btn-danger"
                  onClick={handleRegenerate}
                  disabled={regenText !== 'REGENERATE' || regenerating}
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate Key'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// WEBHOOKS TAB COMPONENTS
// ============================================

const WebhooksTab = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/integrations/webhooks');
      setWebhooks(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggleWebhook = async (webhookId, currentStatus) => {
    try {
      if (currentStatus === 'active') {
        await api.post(`/integrations/webhooks/${webhookId}/disable`);
      } else {
        await api.post(`/integrations/webhooks/${webhookId}/enable`);
      }
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await api.delete(`/integrations/webhooks/${webhookId}`);
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (webhookId) => {
    try {
      await api.post(`/integrations/webhooks/${webhookId}/test`);
      alert('Test webhook sent successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send test webhook');
    }
  };

  if (loading) {
    return <div className="loading-state">Loading webhooks...</div>;
  }

  const failedWebhooks = webhooks.filter(w => w.status === 'suspended');

  return (
    <div className="webhooks-tab">
      <div className="tab-header">
        <h3>Webhooks</h3>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Webhook
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {failedWebhooks.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {failedWebhooks.length} webhook{failedWebhooks.length > 1 ? 's' : ''} auto-disabled due to consecutive failures
        </div>
      )}

      {showCreateModal && (
        <WebhookFormModal
          onSave={() => {
            setShowCreateModal(false);
            fetchWebhooks();
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {selectedWebhook && (
        <WebhookDetailModal
          webhook={selectedWebhook}
          onClose={() => setSelectedWebhook(null)}
          onRefresh={fetchWebhooks}
        />
      )}

      {webhooks.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon"><Webhook size={48} strokeWidth={1.5} /></div>
          <h3>No webhooks configured</h3>
          <p>Create a webhook to receive real-time notifications when events occur in EHS Portal.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Webhook
          </button>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Events</th>
              <th>Status</th>
              <th>Success Rate</th>
              <th>Last Delivery</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map(webhook => (
              <tr key={webhook.id}>
                <td>
                  <button className="link-button" onClick={() => setSelectedWebhook(webhook)}>
                    {webhook.name}
                  </button>
                </td>
                <td className="events-cell">
                  {webhook.event_types?.slice(0, 2).join(', ')}
                  {webhook.event_types?.length > 2 && ` +${webhook.event_types.length - 2}`}
                </td>
                <td>
                  <StatusBadge
                    status={webhook.status}
                    label={webhook.status === 'active' ? 'On' : webhook.status === 'suspended' ? 'Disabled (fail)' : webhook.status}
                  />
                </td>
                <td>
                  <div className="success-rate">
                    <span>{webhook.success_rate || 100}%</span>
                    <div className="rate-bar">
                      <div className="rate-fill" style={{ width: `${webhook.success_rate || 100}%` }}></div>
                    </div>
                  </div>
                </td>
                <td>{formatRelativeTime(webhook.last_delivery_at)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-icon" onClick={() => setSelectedWebhook(webhook)} title="View">
                      <Eye size={16} />
                    </button>
                    <button className="btn btn-icon" onClick={() => handleTestWebhook(webhook.id)} title="Test">
                      <FlaskConical size={16} />
                    </button>
                    <button
                      className="btn btn-icon"
                      onClick={() => handleToggleWebhook(webhook.id, webhook.status)}
                      title={webhook.status === 'active' ? 'Disable' : 'Enable'}
                    >
                      {webhook.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="btn btn-icon" onClick={() => handleDeleteWebhook(webhook.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const WebhookFormModal = ({ webhook, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: webhook?.name || '',
    description: webhook?.description || '',
    target_url: webhook?.target_url || '',
    event_types: webhook?.event_types || [],
    custom_headers: webhook?.custom_headers ? JSON.stringify(webhook.custom_headers, null, 2) : ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const eventCategories = {
    Incidents: [
      { id: 'incident.created', label: 'incident.created' },
      { id: 'incident.severity_changed', label: 'incident.severity_changed' },
      { id: 'incident.updated', label: 'incident.updated' },
      { id: 'incident.closed', label: 'incident.closed' }
    ],
    Actions: [
      { id: 'action.created', label: 'action.created' },
      { id: 'action.assigned', label: 'action.assigned' },
      { id: 'action.overdue', label: 'action.overdue' },
      { id: 'action.completed', label: 'action.completed' }
    ],
    Risks: [
      { id: 'risk.created', label: 'risk.created' },
      { id: 'risk.level_changed', label: 'risk.level_changed' },
      { id: 'risk.review_due', label: 'risk.review_due' }
    ],
    Training: [
      { id: 'training.assigned', label: 'training.assigned' },
      { id: 'training.overdue', label: 'training.overdue' },
      { id: 'training.completed', label: 'training.completed' }
    ]
  };

  const toggleEvent = (eventId) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventId)
        ? prev.event_types.filter(e => e !== eventId)
        : [...prev.event_types, eventId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let headers = {};
      if (formData.custom_headers) {
        try {
          headers = JSON.parse(formData.custom_headers);
        } catch {
          setError('Custom headers must be valid JSON');
          setSaving(false);
          return;
        }
      }

      const payload = {
        ...formData,
        custom_headers: headers
      };

      if (webhook) {
        await api.put(`/integrations/webhooks/${webhook.id}`, payload);
      } else {
        await api.post('/integrations/webhooks', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save webhook');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{webhook ? 'Edit Webhook' : 'Create Webhook'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Teams Incident Alerts"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Post incident notifications to #safety-alerts channel"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Target URL * (HTTPS required)</label>
              <input
                type="url"
                value={formData.target_url}
                onChange={(e) => setFormData(prev => ({ ...prev, target_url: e.target.value }))}
                placeholder="https://outlook.office.com/webhook/..."
                required
                pattern="https://.*"
              />
            </div>

            <div className="form-group">
              <label>Event Types *</label>
              <div className="events-grid">
                {Object.entries(eventCategories).map(([category, events]) => (
                  <div key={category} className="event-category">
                    <h4>{category}</h4>
                    {events.map(event => (
                      <label key={event.id} className="event-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.event_types.includes(event.id)}
                          onChange={() => toggleEvent(event.id)}
                        />
                        {event.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Custom Headers (optional, JSON)</label>
              <textarea
                value={formData.custom_headers}
                onChange={(e) => setFormData(prev => ({ ...prev, custom_headers: e.target.value }))}
                placeholder='{"X-Source": "ehs-portal"}'
                rows={3}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || formData.event_types.length === 0}>
              {saving ? 'Saving...' : webhook ? 'Save Changes' : 'Test & Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WebhookDetailModal = ({ webhook, onClose, onRefresh }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const res = await api.get(`/integrations/webhooks/${webhook.id}/deliveries`);
        setDeliveries(res.data.data || []);
      } catch (err) {
        console.error('Failed to load deliveries:', err);
      } finally {
        setLoadingDeliveries(false);
      }
    };
    fetchDeliveries();
  }, [webhook.id]);

  const handleRetry = async (deliveryId) => {
    try {
      await api.post(`/integrations/webhooks/${webhook.id}/deliveries/${deliveryId}/retry`);
      alert('Retry queued successfully');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to retry delivery');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{webhook.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <label>Status</label>
              <StatusBadge status={webhook.status} label={webhook.status === 'active' ? 'Enabled' : 'Disabled'} />
            </div>
            <div className="detail-item">
              <label>URL</label>
              <code className="url-display">{webhook.target_url}</code>
            </div>
            <div className="detail-item">
              <label>Events</label>
              <span>{webhook.event_types?.join(', ')}</span>
            </div>
            <div className="detail-item">
              <label>Created</label>
              <span>{formatDate(webhook.created_at)}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Signing Secret</label>
            <SecretField value={webhook.signing_secret || 'whsec_****************************'} />
          </div>

          <h3>Recent Deliveries</h3>
          {loadingDeliveries ? (
            <div className="loading-state">Loading deliveries...</div>
          ) : deliveries.length === 0 ? (
            <p className="no-data">No deliveries yet</p>
          ) : (
            <table className="data-table data-table-sm">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event Type</th>
                  <th>Status</th>
                  <th>Response</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 10).map(delivery => (
                  <tr key={delivery.id}>
                    <td>{formatRelativeTime(delivery.attempted_at)}</td>
                    <td>{delivery.event_type}</td>
                    <td>
                      {delivery.status === 'delivered' ? (
                        <span className="status-success"><Check size={14} /> {delivery.response_status}</span>
                      ) : (
                        <span className="status-error"><AlertTriangle size={14} /> {delivery.response_status || 'Failed'}</span>
                      )}
                    </td>
                    <td>{delivery.response_body?.slice(0, 20) || '-'}</td>
                    <td>{delivery.duration_ms}ms</td>
                    <td>
                      {delivery.status !== 'delivered' && (
                        <button className="btn btn-secondary btn-xs" onClick={() => handleRetry(delivery.id)}>
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// ACTIVITY LOG TAB COMPONENT
// ============================================

const ActivityLogTab = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    source: '',
    days: 7
  });

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.source) params.append('source', filters.source);
      params.append('days', filters.days);
      
      const res = await api.get(`/integrations/activity?${params.toString()}`);
      setActivities(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'webhook_delivered': return <Webhook size={16} />;
      case 'webhook_failed': return <AlertTriangle size={16} />;
      case 'api_request': return <Code2 size={16} />;
      case 'sso_login': return <ShieldCheck size={16} />;
      case 'sso_login_failed': return <AlertTriangle size={16} />;
      case 'client_updated': return <Wrench size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return <div className="loading-state">Loading activity...</div>;
  }

  return (
    <div className="activity-log-tab">
      <div className="tab-header">
        <h3>Integration Activity</h3>
        <div className="filters">
          <select value={filters.type} onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}>
            <option value="">All Types</option>
            <option value="webhook">Webhooks</option>
            <option value="api">API</option>
            <option value="sso">SSO</option>
          </select>
          <select value={filters.days} onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value, 10) }))}>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {activities.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon"><Clock size={48} strokeWidth={1.5} /></div>
          <h3>No activity recorded</h3>
          <p>Integration activities will appear here when SSO logins, API requests, or webhook deliveries occur.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {activities.map((activity, idx) => (
            <div key={idx} className={`activity-item activity-${activity.status}`}>
              <div className="activity-icon">{getActivityIcon(activity.event_type)}</div>
              <div className="activity-content">
                <div className="activity-title">{activity.description}</div>
                <div className="activity-meta">
                  {activity.details && <span className="activity-details">{activity.details}</span>}
                  <span className="activity-time">{formatRelativeTime(activity.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN INTEGRATIONS PAGE COMPONENT
// ============================================

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState('sso');
  const [counts, setCounts] = useState({ apiClients: 0, webhooks: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [clientsRes, webhooksRes] = await Promise.all([
          api.get('/integrations/api-clients'),
          api.get('/integrations/webhooks')
        ]);
        setCounts({
          apiClients: clientsRes.data.data?.length || 0,
          webhooks: webhooksRes.data.data?.length || 0
        });
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      }
    };
    fetchCounts();
  }, [activeTab]);

  const tabs = [
    { id: 'sso', label: 'SSO', icon: <ShieldCheck size={18} /> },
    { id: 'api-clients', label: 'API Clients', icon: <Code2 size={18} />, count: counts.apiClients },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={18} />, count: counts.webhooks },
    { id: 'activity', label: 'Activity Log', icon: <Clock size={18} /> }
  ];

  return (
    <div className="integrations-page">
      <div className="page-header">
        <div className="page-breadcrumb">
          <span className="breadcrumb-muted">Admin</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Integrations</span>
        </div>
        <p className="page-subtitle">
          Configure SSO providers, API clients, and webhooks for external integrations
        </p>
      </div>

      <div className="tabs-container">
        <nav className="tabs-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="tab-count">({tab.count})</span>
              )}
            </button>
          ))}
        </nav>

        <div className="tab-content">
          {activeTab === 'sso' && <SSOTab />}
          {activeTab === 'api-clients' && <APIClientsTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
          {activeTab === 'activity' && <ActivityLogTab />}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;

