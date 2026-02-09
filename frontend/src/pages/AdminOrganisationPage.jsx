import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useOrg } from '../context/OrgContext';
import { ErrorState, LoadingState } from '../components/States';

const TIMEZONES = [
  'UTC', 'GMT',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Stockholm', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul',
  'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Jakarta',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Brisbane',
  'Pacific/Auckland', 'Pacific/Fiji', 'Africa/Cairo', 'Africa/Johannesburg',
  'Africa/Lagos', 'Africa/Nairobi'
];

const AdminOrganisationPage = () => {
  const { organisation, refreshOrganisation, loading: orgLoading, error: orgError } = useOrg();
  const fileInputRef = useRef(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', timezone: 'UTC' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Logo state
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoSuccess, setLogoSuccess] = useState('');
  const [logoDeleting, setLogoDeleting] = useState(false);

  // Thresholds form state
  const [thresholds, setThresholds] = useState({
    openIncidentsWarning: 5,
    openIncidentsCritical: 10,
    overdueActionsWarning: 3,
    overdueActionsCritical: 5,
    failedInspectionsWarning: 2,
    failedInspectionsCritical: 5
  });
  const [thresholdsSaving, setThresholdsSaving] = useState(false);
  const [thresholdsError, setThresholdsError] = useState('');
  const [thresholdsSuccess, setThresholdsSuccess] = useState('');

  // Escalation settings state
  const [escalation, setEscalation] = useState({
    enabled: true,
    daysOverdue: 3,
    notifyManagers: true,
    customEmail: ''
  });
  const [escalationLoading, setEscalationLoading] = useState(true);
  const [escalationSaving, setEscalationSaving] = useState(false);
  const [escalationError, setEscalationError] = useState('');
  const [escalationSuccess, setEscalationSuccess] = useState('');

  // Initialize forms when organisation data loads
  useEffect(() => {
    if (organisation) {
      setProfileForm({
        name: organisation.name || '',
        timezone: organisation.timezone || 'UTC'
      });
      if (organisation.settings?.dashboard) {
        setThresholds({
          openIncidentsWarning: organisation.settings.dashboard.openIncidentsWarning ?? 5,
          openIncidentsCritical: organisation.settings.dashboard.openIncidentsCritical ?? 10,
          overdueActionsWarning: organisation.settings.dashboard.overdueActionsWarning ?? 3,
          overdueActionsCritical: organisation.settings.dashboard.overdueActionsCritical ?? 5,
          failedInspectionsWarning: organisation.settings.dashboard.failedInspectionsWarning ?? 2,
          failedInspectionsCritical: organisation.settings.dashboard.failedInspectionsCritical ?? 5
        });
      }
    }
  }, [organisation]);

  // Load escalation settings
  useEffect(() => {
    const fetchEscalationSettings = async () => {
      try {
        const response = await api.get('/admin/organisation/escalation');
        if (response.data.success) {
          const esc = response.data.data.escalation;
          setEscalation({
            enabled: esc.enabled ?? true,
            daysOverdue: esc.daysOverdue ?? 3,
            notifyManagers: esc.notifyManagers ?? true,
            customEmail: esc.customEmail || ''
          });
        }
      } catch (err) {
        console.error('[AdminOrganisationPage] Failed to load escalation settings:', err);
      } finally {
        setEscalationLoading(false);
      }
    };

    fetchEscalationSettings();
  }, []);

  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.name.trim()) {
      setProfileError('Organisation name is required');
      return;
    }
    if (profileForm.name.length > 200) {
      setProfileError('Name is too long (max 200 characters)');
      return;
    }

    setProfileSaving(true);
    try {
      await api.put('/organisation', {
        name: profileForm.name.trim(),
        timezone: profileForm.timezone
      });
      await refreshOrganisation();
      setProfileSuccess('Organisation settings updated');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Only PNG, JPEG, and SVG files are allowed');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File too large (max 2MB)');
      return;
    }

    setLogoError('');
    setLogoSuccess('');
    setLogoUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/organisation/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshOrganisation();
      setLogoSuccess('Logo uploaded successfully');
      setTimeout(() => setLogoSuccess(''), 3000);
    } catch (err) {
      setLogoError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [refreshOrganisation]);

  // Handle logo delete
  const handleLogoDelete = async () => {
    setLogoError('');
    setLogoSuccess('');
    setLogoDeleting(true);

    try {
      await api.delete('/organisation/logo');
      await refreshOrganisation();
      setLogoSuccess('Logo removed');
      setTimeout(() => setLogoSuccess(''), 3000);
    } catch (err) {
      setLogoError(err.response?.data?.error || 'Failed to remove logo');
    } finally {
      setLogoDeleting(false);
    }
  };

  // Handle thresholds form submission
  const handleThresholdsSubmit = async (e) => {
    e.preventDefault();
    setThresholdsError('');
    setThresholdsSuccess('');

    // Validate thresholds
    const fields = Object.entries(thresholds);
    for (const [key, value] of fields) {
      if (!Number.isInteger(value) || value < 0) {
        setThresholdsError('Threshold values must be non-negative integers');
        return;
      }
    }

    // Validate critical >= warning
    if (thresholds.openIncidentsCritical < thresholds.openIncidentsWarning) {
      setThresholdsError('Open Incidents: Critical must be >= Warning');
      return;
    }
    if (thresholds.overdueActionsCritical < thresholds.overdueActionsWarning) {
      setThresholdsError('Overdue Actions: Critical must be >= Warning');
      return;
    }
    if (thresholds.failedInspectionsCritical < thresholds.failedInspectionsWarning) {
      setThresholdsError('Failed Inspections: Critical must be >= Warning');
      return;
    }

    setThresholdsSaving(true);
    try {
      await api.put('/organisation/dashboard-settings', thresholds);
      await refreshOrganisation();
      setThresholdsSuccess('Dashboard thresholds updated');
      setTimeout(() => setThresholdsSuccess(''), 3000);
    } catch (err) {
      setThresholdsError(err.response?.data?.error || 'Failed to update thresholds');
    } finally {
      setThresholdsSaving(false);
    }
  };

  const handleThresholdChange = (field, value) => {
    const intValue = parseInt(value, 10);
    setThresholds((prev) => ({
      ...prev,
      [field]: Number.isNaN(intValue) ? 0 : intValue
    }));
  };

  // Handle escalation settings submission
  const handleEscalationSubmit = async (e) => {
    e.preventDefault();
    setEscalationError('');
    setEscalationSuccess('');

    // Validate daysOverdue
    const days = parseInt(escalation.daysOverdue, 10);
    if (isNaN(days) || days < 1 || days > 30) {
      setEscalationError('Days overdue must be between 1 and 30');
      return;
    }

    // Validate email if provided
    if (escalation.customEmail && escalation.customEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(escalation.customEmail.trim())) {
        setEscalationError('Please enter a valid email address');
        return;
      }
    }

    setEscalationSaving(true);
    try {
      await api.put('/admin/organisation/escalation', {
        enabled: escalation.enabled,
        daysOverdue: days,
        notifyManagers: escalation.notifyManagers,
        customEmail: escalation.customEmail.trim() || null
      });
      setEscalationSuccess('Escalation settings updated');
      setTimeout(() => setEscalationSuccess(''), 3000);
    } catch (err) {
      setEscalationError(err.response?.data?.error || 'Failed to update escalation settings');
    } finally {
      setEscalationSaving(false);
    }
  };

  const handleEscalationChange = (field, value) => {
    setEscalation((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  if (orgLoading) return <LoadingState message="Loading organisation settings..." />;
  if (orgError) return <ErrorState message={orgError} />;

  return (
    <div className="page">
      {/* Organisation Profile Section */}
      <div className="card settings-section">
        <h3>Organisation Profile</h3>
        <form onSubmit={handleProfileSubmit}>
          {profileError && <div className="form-error">{profileError}</div>}
          {profileSuccess && <div className="toast success">{profileSuccess}</div>}
          <div className="form-grid">
            <label className="field">
              <span>Organisation Name *</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Your organisation name"
                maxLength={200}
              />
            </label>
            <label className="field">
              <span>Timezone</span>
              <select
                value={profileForm.timezone}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, timezone: e.target.value }))}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Logo Section */}
      <div className="card settings-section">
        <h3>Organisation Logo</h3>
        {logoError && <div className="form-error">{logoError}</div>}
        {logoSuccess && <div className="toast success">{logoSuccess}</div>}
        <div className="logo-section">
          <div className="logo-preview">
            <div className="logo-preview-box">
              {organisation?.logoUrl ? (
                <img src={organisation.logoUrl} alt="Organisation logo" />
              ) : (
                <span className="logo-placeholder">No logo</span>
              )}
            </div>
            <div className="logo-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="visually-hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="btn primary" style={{ cursor: 'pointer' }}>
                {logoUploading ? 'Uploading...' : 'Upload New'}
              </label>
              {organisation?.logoUrl && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={handleLogoDelete}
                  disabled={logoDeleting}
                >
                  {logoDeleting ? 'Removing...' : 'Remove Logo'}
                </button>
              )}
            </div>
          </div>
          <p className="logo-hint">Allowed: PNG, JPEG, SVG. Max size: 2 MB</p>
        </div>
      </div>

      {/* Dashboard Settings Section */}
      <div className="card settings-section">
        <h3>Dashboard Settings</h3>
        <p className="muted">Configure KPI thresholds for dashboard alerts</p>
        <form onSubmit={handleThresholdsSubmit}>
          {thresholdsError && <div className="form-error">{thresholdsError}</div>}
          {thresholdsSuccess && <div className="toast success">{thresholdsSuccess}</div>}
          <div className="threshold-grid">
            <div className="threshold-row">
              <span className="threshold-label">Open Incidents</span>
              <div className="threshold-inputs">
                <label>
                  Warning at:
                  <input
                    type="number"
                    min="0"
                    value={thresholds.openIncidentsWarning}
                    onChange={(e) => handleThresholdChange('openIncidentsWarning', e.target.value)}
                  />
                </label>
                <label>
                  Critical at:
                  <input
                    type="number"
                    min="0"
                    value={thresholds.openIncidentsCritical}
                    onChange={(e) => handleThresholdChange('openIncidentsCritical', e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="threshold-row">
              <span className="threshold-label">Overdue Actions</span>
              <div className="threshold-inputs">
                <label>
                  Warning at:
                  <input
                    type="number"
                    min="0"
                    value={thresholds.overdueActionsWarning}
                    onChange={(e) => handleThresholdChange('overdueActionsWarning', e.target.value)}
                  />
                </label>
                <label>
                  Critical at:
                  <input
                    type="number"
                    min="0"
                    value={thresholds.overdueActionsCritical}
                    onChange={(e) => handleThresholdChange('overdueActionsCritical', e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="threshold-row">
              <span className="threshold-label">Failed Inspections (30 days)</span>
              <div className="threshold-inputs">
                <label>
                  Warning at:
                  <input
                    type="number"
                    min="0"
                    value={thresholds.failedInspectionsWarning}
                    onChange={(e) => handleThresholdChange('failedInspectionsWarning', e.target.value)}
                  />
                </label>
                <label>
                  Critical at:
                  <input
                    type="number"
                    min="0"
                    value={thresholds.failedInspectionsCritical}
                    onChange={(e) => handleThresholdChange('failedInspectionsCritical', e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={thresholdsSaving}>
              {thresholdsSaving ? 'Saving...' : 'Save Thresholds'}
            </button>
          </div>
        </form>
      </div>

      {/* Escalation Settings Section */}
      <div className="card settings-section">
        <h3>Action Escalation Settings</h3>
        <p className="muted">Configure automatic escalation for overdue actions</p>
        {escalationLoading ? (
          <div className="loading-inline">Loading escalation settings...</div>
        ) : (
          <form onSubmit={handleEscalationSubmit}>
            {escalationError && <div className="form-error">{escalationError}</div>}
            {escalationSuccess && <div className="toast success">{escalationSuccess}</div>}

            <div className="settings-list">
              <label className="setting-item">
                <div className="setting-checkbox">
                  <input
                    type="checkbox"
                    checked={escalation.enabled}
                    onChange={(e) => handleEscalationChange('enabled', e.target.checked)}
                  />
                </div>
                <div className="setting-content">
                  <div className="setting-label">Enable automatic escalation</div>
                  <div className="setting-description">
                    Automatically notify managers when actions are overdue
                  </div>
                </div>
              </label>
            </div>

            {escalation.enabled && (
              <div className="escalation-options">
                <div className="form-grid">
                  <label className="field">
                    <span>Days after due date</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={escalation.daysOverdue}
                      onChange={(e) => handleEscalationChange('daysOverdue', e.target.value)}
                    />
                    <span className="field-hint">Actions will be escalated after this many days overdue (1-30)</span>
                  </label>
                </div>

                <div className="settings-list" style={{ marginTop: '1rem' }}>
                  <label className="setting-item">
                    <div className="setting-checkbox">
                      <input
                        type="checkbox"
                        checked={escalation.notifyManagers}
                        onChange={(e) => handleEscalationChange('notifyManagers', e.target.checked)}
                      />
                    </div>
                    <div className="setting-content">
                      <div className="setting-label">Notify all managers</div>
                      <div className="setting-description">
                        Send escalation emails to all users with manager or admin role
                      </div>
                    </div>
                  </label>
                </div>

                <div className="form-grid" style={{ marginTop: '1rem' }}>
                  <label className="field">
                    <span>Additional notification email (optional)</span>
                    <input
                      type="email"
                      value={escalation.customEmail}
                      onChange={(e) => handleEscalationChange('customEmail', e.target.value)}
                      placeholder="safety-team@company.com"
                    />
                    <span className="field-hint">Send escalation notifications to this email in addition to managers</span>
                  </label>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={escalationSaving}>
                {escalationSaving ? 'Saving...' : 'Save Escalation Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminOrganisationPage;
