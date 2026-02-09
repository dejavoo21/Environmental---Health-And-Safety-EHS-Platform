import { useEffect, useState } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import {
  getPPERules,
  createPPERule,
  updatePPERule,
  deletePPERule
} from '../api/safetyAdvisor';
import './AdminSafetyPages.css';

/**
 * Admin PPE Rules Page - Phase 11
 *
 * Manage PPE rules that determine required protective equipment
 * based on conditions like weather, tasks, or site-specific requirements.
 *
 * Test Cases: TC-273-1, TC-273-2
 */
const AdminPPERulesPage = () => {
  const [rules, setRules] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    ppeItems: [],
    conditions: {
      minTemp: '',
      maxTemp: '',
      weatherConditions: [],
      taskTypes: [],
      siteIds: []
    },
    priority: 'medium',
    isActive: true
  });

  const ppeOptions = [
    { id: 'hard_hat', label: 'Hard Hat', icon: '👷' },
    { id: 'safety_glasses', label: 'Safety Glasses', icon: '🥽' },
    { id: 'high_vis', label: 'High-Vis Vest', icon: '🦺' },
    { id: 'safety_boots', label: 'Safety Boots', icon: '👢' },
    { id: 'gloves', label: 'Work Gloves', icon: '🧤' },
    { id: 'ear_protection', label: 'Ear Protection', icon: '🎧' },
    { id: 'respirator', label: 'Respirator/Mask', icon: '😷' },
    { id: 'face_shield', label: 'Face Shield', icon: '🛡️' },
    { id: 'fall_protection', label: 'Fall Protection', icon: '🪢' },
    { id: 'thermal_clothing', label: 'Thermal Clothing', icon: '🧥' },
    { id: 'rain_gear', label: 'Rain Gear', icon: '🌧️' },
    { id: 'sun_protection', label: 'Sun Protection', icon: '☀️' }
  ];

  const weatherConditions = [
    'rain',
    'snow',
    'extreme_cold',
    'extreme_heat',
    'high_wind',
    'thunderstorm',
    'fog',
    'any'
  ];

  const taskTypes = [
    'general',
    'construction',
    'electrical',
    'welding',
    'chemical_handling',
    'confined_space',
    'heights',
    'excavation',
    'maintenance'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, sitesRes] = await Promise.all([
        getPPERules(),
        api.get('/sites')
      ]);
      setRules(rulesRes.rules || rulesRes || []);
      setSites(sitesRes.data?.sites || []);
    } catch (err) {
      setError('Unable to load PPE rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      ppeItems: [],
      conditions: {
        minTemp: '',
        maxTemp: '',
        weatherConditions: [],
        taskTypes: [],
        siteIds: []
      },
      priority: 'medium',
      isActive: true
    });
    setEditingRule(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (rule) => {
    setForm({
      name: rule.name,
      description: rule.description || '',
      ppeItems: rule.ppeItems || [],
      conditions: {
        minTemp: rule.conditions?.minTemp ?? '',
        maxTemp: rule.conditions?.maxTemp ?? '',
        weatherConditions: rule.conditions?.weatherConditions || [],
        taskTypes: rule.conditions?.taskTypes || [],
        siteIds: rule.conditions?.siteIds || []
      },
      priority: rule.priority || 'medium',
      isActive: rule.isActive !== false
    });
    setEditingRule(rule);
    setShowForm(true);
  };

  const handlePPEToggle = (ppeId) => {
    setForm(prev => ({
      ...prev,
      ppeItems: prev.ppeItems.includes(ppeId)
        ? prev.ppeItems.filter(id => id !== ppeId)
        : [...prev.ppeItems, ppeId]
    }));
  };

  const handleConditionToggle = (type, value) => {
    setForm(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [type]: prev.conditions[type].includes(value)
          ? prev.conditions[type].filter(v => v !== value)
          : [...prev.conditions[type], value]
      }
    }));
  };

  const handleSiteToggle = (siteId) => {
    setForm(prev => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        siteIds: prev.conditions.siteIds.includes(siteId)
          ? prev.conditions.siteIds.filter(id => id !== siteId)
          : [...prev.conditions.siteIds, siteId]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Rule name is required.');
      return;
    }

    if (form.ppeItems.length === 0) {
      setError('At least one PPE item is required.');
      return;
    }

    const payload = {
      ...form,
      conditions: {
        ...form.conditions,
        minTemp: form.conditions.minTemp !== '' ? Number(form.conditions.minTemp) : null,
        maxTemp: form.conditions.maxTemp !== '' ? Number(form.conditions.maxTemp) : null
      }
    };

    setSaving(true);
    try {
      if (editingRule) {
        await updatePPERule(editingRule.id, payload);
      } else {
        await createPPERule(payload);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save PPE rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      await deletePPERule(rule.id);
      await loadData();
    } catch (err) {
      setError('Unable to delete PPE rule.');
    }
  };

  const getPPELabel = (ppeId) => {
    const ppe = ppeOptions.find(p => p.id === ppeId);
    return ppe ? `${ppe.icon} ${ppe.label}` : ppeId;
  };

  if (loading) return <LoadingState message="Loading PPE rules..." />;
  if (error && !rules.length && !showForm) return <ErrorState message={error} />;

  return (
    <div className="page admin-safety-page">
      <div className="page-header">
        <div>
          <h2>PPE Rules</h2>
          <p className="muted">Define conditions that trigger PPE requirements</p>
        </div>
        {!showForm && (
          <button className="btn primary" onClick={() => setShowForm(true)}>
            + Add PPE Rule
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form className="admin-form-card ppe-form" onSubmit={handleSubmit}>
          <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>{editingRule ? 'Edit PPE Rule' : 'New PPE Rule'}</h3>
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
          </div>
          {error && <div className="error-text">{error}</div>}

          <div className="form-section">
            <h4>Basic Information</h4>
            <div className="admin-form-card__fields">
              <label className="field">
                <span>Rule Name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Cold Weather PPE"
                />
              </label>
              <label className="field">
                <span>Priority</span>
                <select
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label className="field field-full">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="When and why this rule applies..."
                  rows={2}
                />
              </label>
            </div>
          </div>

            <div className="form-section">
              <h4>Required PPE *</h4>
              <div className="ppe-grid">
                {ppeOptions.map(ppe => (
                  <label
                    key={ppe.id}
                    className={`ppe-option ${form.ppeItems.includes(ppe.id) ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.ppeItems.includes(ppe.id)}
                      onChange={() => handlePPEToggle(ppe.id)}
                    />
                    <span className="ppe-icon">{ppe.icon}</span>
                    <span className="ppe-label">{ppe.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h4>Trigger Conditions</h4>

              {/* Temperature */}
              <div className="condition-group">
                <label className="condition-label">Temperature Range (°C)</label>
                <div className="temp-range">
                  <input
                    type="number"
                    value={form.conditions.minTemp}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, minTemp: e.target.value }
                    }))}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={form.conditions.maxTemp}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      conditions: { ...prev.conditions, maxTemp: e.target.value }
                    }))}
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Weather conditions */}
              <div className="condition-group">
                <label className="condition-label">Weather Conditions</label>
                <div className="condition-options">
                  {weatherConditions.map(cond => (
                    <label
                      key={cond}
                      className={`condition-chip ${form.conditions.weatherConditions.includes(cond) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.conditions.weatherConditions.includes(cond)}
                        onChange={() => handleConditionToggle('weatherConditions', cond)}
                      />
                      <span>{cond.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Task types */}
              <div className="condition-group">
                <label className="condition-label">Task Types</label>
                <div className="condition-options">
                  {taskTypes.map(task => (
                    <label
                      key={task}
                      className={`condition-chip ${form.conditions.taskTypes.includes(task) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.conditions.taskTypes.includes(task)}
                        onChange={() => handleConditionToggle('taskTypes', task)}
                      />
                      <span>{task.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sites */}
              <div className="condition-group">
                <label className="condition-label">Specific Sites (leave empty for all)</label>
                <div className="condition-options">
                  {sites.map(site => (
                    <label
                      key={site.id}
                      className={`condition-chip ${form.conditions.siteIds.includes(site.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.conditions.siteIds.includes(site.id)}
                        onChange={() => handleSiteToggle(site.id)}
                      />
                      <span>{site.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
              <span>Active (rule is enforced)</span>
            </label>

          <div className="admin-form-card__actions">
            <button className="btn ghost" type="button" onClick={resetForm}>Cancel</button>
            <button className="btn primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {rules.length === 0 ? (
        <EmptyState message="No PPE rules defined yet." />
      ) : (
        <div className="rules-list">
          {rules.map((rule) => (
            <div key={rule.id} className={`rule-card ${rule.isActive ? '' : 'inactive'}`}>
              <div className="rule-header">
                <div className="rule-title-row">
                  <h4>{rule.name}</h4>
                  <span className={`priority-badge priority-${rule.priority || 'medium'}`}>
                    {rule.priority || 'medium'}
                  </span>
                  <span className={`status-badge status-${rule.isActive ? 'active' : 'inactive'}`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {rule.description && <p className="rule-description">{rule.description}</p>}
              </div>

              <div className="rule-ppe">
                <span className="rule-section-label">Required PPE:</span>
                <div className="ppe-badges">
                  {rule.ppeItems?.map(ppeId => (
                    <span key={ppeId} className="ppe-badge">
                      {getPPELabel(ppeId)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rule-conditions">
                <span className="rule-section-label">Conditions:</span>
                <div className="condition-badges">
                  {rule.conditions?.minTemp != null && (
                    <span className="condition-badge">Min: {rule.conditions.minTemp}°C</span>
                  )}
                  {rule.conditions?.maxTemp != null && (
                    <span className="condition-badge">Max: {rule.conditions.maxTemp}°C</span>
                  )}
                  {rule.conditions?.weatherConditions?.map(cond => (
                    <span key={cond} className="condition-badge">{cond.replace('_', ' ')}</span>
                  ))}
                  {rule.conditions?.taskTypes?.map(task => (
                    <span key={task} className="condition-badge">{task.replace('_', ' ')}</span>
                  ))}
                  {rule.conditions?.siteIds?.length > 0 && (
                    <span className="condition-badge">{rule.conditions.siteIds.length} sites</span>
                  )}
                </div>
              </div>

              <div className="rule-actions">
                <button className="btn ghost small" onClick={() => handleEdit(rule)}>
                  Edit
                </button>
                <button
                  className="btn ghost small danger"
                  onClick={() => handleDelete(rule)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPPERulesPage;
