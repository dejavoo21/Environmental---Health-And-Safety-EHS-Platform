import { useState, useEffect } from 'react';
import api from '../api/client';
import { LoadingState, ErrorState } from '../components/States';

const DIGEST_FREQUENCY_OPTIONS = [
  { value: 'none', label: 'None - No digest emails' },
  { value: 'daily', label: 'Daily - Every morning' },
  { value: 'weekly', label: 'Weekly - Every Monday morning' }
];

const DIGEST_TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: `${i.toString().padStart(2, '0')}:00`,
  label: `${i.toString().padStart(2, '0')}:00`
}));

const DIGEST_DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const NotificationPreferencesPage = () => {
  const [preferences, setPreferences] = useState(null);
  const [originalPreferences, setOriginalPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/preferences/notifications');
      if (response.data.success) {
        setPreferences(response.data.data);
        setOriginalPreferences(response.data.data);
      }
    } catch (err) {
      console.error('[NotificationPreferencesPage] Fetch error:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const handleChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggle = (field) => {
    setPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await api.put('/preferences/notifications', {
        emailActionAssigned: preferences.emailActionAssigned,
        emailActionOverdue: preferences.emailActionOverdue,
        emailHighSeverityIncident: preferences.emailHighSeverityIncident,
        emailInspectionFailed: preferences.emailInspectionFailed,
        digestFrequency: preferences.digestFrequency,
        digestTime: preferences.digestTime,
        digestDayOfWeek: preferences.digestDayOfWeek,
        inappEnabled: preferences.inappEnabled
      });

      if (response.data.success) {
        setOriginalPreferences(response.data.data);
        setPreferences(response.data.data);
        showToast('Notification preferences saved');
      }
    } catch (err) {
      console.error('[NotificationPreferencesPage] Save error:', err);
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPreferences(originalPreferences);
  };

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  if (loading) {
    return <LoadingState message="Loading preferences..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchPreferences} />;
  }

  return (
    <div className="page notification-preferences-page">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <h2>Notification Settings</h2>
      </div>

      <div className="card">
        <div className="settings-section">
          <h3>Email Notifications</h3>
          <p className="section-description">
            Choose which events trigger email notifications.
          </p>

          <div className="settings-list">
            <label className="setting-item">
              <div className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.emailActionAssigned || false}
                  onChange={() => handleToggle('emailActionAssigned')}
                />
              </div>
              <div className="setting-content">
                <div className="setting-label">Action assigned to me</div>
                <div className="setting-description">
                  Get notified when someone assigns an action to you
                </div>
              </div>
            </label>

            <label className="setting-item">
              <div className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.emailActionOverdue || false}
                  onChange={() => handleToggle('emailActionOverdue')}
                />
              </div>
              <div className="setting-content">
                <div className="setting-label">My actions become overdue</div>
                <div className="setting-description">
                  Get reminded when your assigned actions pass their due date
                </div>
              </div>
            </label>

            <label className="setting-item">
              <div className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.emailHighSeverityIncident || false}
                  onChange={() => handleToggle('emailHighSeverityIncident')}
                />
              </div>
              <div className="setting-content">
                <div className="setting-label">High-severity incidents in my organisation</div>
                <div className="setting-description">
                  Get alerted immediately when critical incidents are reported
                </div>
              </div>
            </label>

            <label className="setting-item">
              <div className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.emailInspectionFailed || false}
                  onChange={() => handleToggle('emailInspectionFailed')}
                />
              </div>
              <div className="setting-content">
                <div className="setting-label">Inspections with failed items</div>
                <div className="setting-description">
                  Get notified when inspections have failed items
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Digest Emails</h3>
          <p className="section-description">
            Receive a summary email with recent incidents and upcoming actions.
          </p>

          <div className="settings-form">
            <div className="form-group">
              <label htmlFor="digest-frequency">Frequency</label>
              <select
                id="digest-frequency"
                value={preferences.digestFrequency || 'none'}
                onChange={(e) => handleChange('digestFrequency', e.target.value)}
              >
                {DIGEST_FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {preferences.digestFrequency && preferences.digestFrequency !== 'none' && (
              <>
                <div className="form-group">
                  <label htmlFor="digest-time">Delivery time</label>
                  <select
                    id="digest-time"
                    value={preferences.digestTime || '07:00'}
                    onChange={(e) => handleChange('digestTime', e.target.value)}
                  >
                    {DIGEST_TIME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {preferences.digestFrequency === 'weekly' && (
                  <div className="form-group">
                    <label htmlFor="digest-day">Day of week</label>
                    <select
                      id="digest-day"
                      value={preferences.digestDayOfWeek ?? 1}
                      onChange={(e) => handleChange('digestDayOfWeek', parseInt(e.target.value))}
                    >
                      {DIGEST_DAY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="settings-section">
          <h3>In-App Notifications</h3>

          <div className="settings-list">
            <label className="setting-item">
              <div className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.inappEnabled !== false}
                  onChange={() => handleChange('inappEnabled', !preferences.inappEnabled)}
                />
              </div>
              <div className="setting-content">
                <div className="setting-label">Enable in-app notifications</div>
                <div className="setting-description">
                  Show notifications in the bell icon dropdown
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="btn secondary"
            onClick={handleCancel}
            disabled={!hasChanges || saving}
          >
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
