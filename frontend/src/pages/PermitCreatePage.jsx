import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPermitTypes, createPermit, submitPermit, checkPermitConflicts } from '../api/permits';
import api from '../api/client';
import { LoadingState, ErrorState } from '../components/States';
import AppIcon from '../components/AppIcon';
import './PermitCreatePage.css';

/**
 * Permit Create Page
 * Multi-step wizard for creating new permits
 * SCR-P7-PERM-04
 */

const STEPS = [
  { key: 'type', title: 'Select Type' },
  { key: 'details', title: 'Details & Schedule' },
  { key: 'controls', title: 'Pre-Work Controls' },
];

const PermitCreatePage = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(0);
  const [permitTypes, setPermitTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    permitTypeId: '',
    siteId: '',
    location: '',
    workDescription: '',
    startTime: '',
    endTime: '',
    workers: [],
    hazards: '',
    specialConditions: '',
    preWorkControlsCompleted: {}
  });
  
  // Worker input
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('');

  const selectedType = permitTypes.find((t) => t.id === formData.permitTypeId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [typesRes, sitesRes, usersRes] = await Promise.all([
        getPermitTypes(),
        api.get('/sites'),
        api.get('/users?limit=100')
      ]);
      setPermitTypes(typesRes.permitTypes || []);
      setSites(sitesRes.data.sites || []);
      setUsers(usersRes.data.users || []);
      setError('');
    } catch (err) {
      setError('Failed to load form data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Check for conflicts when schedule changes
    if ((name === 'startTime' || name === 'endTime' || name === 'siteId') && 
        formData.siteId && formData.startTime && formData.endTime) {
      checkConflicts();
    }
  };

  const handleTypeSelect = (typeId) => {
    setFormData((prev) => ({ 
      ...prev, 
      permitTypeId: typeId,
      preWorkControlsCompleted: {}
    }));
  };

  const addWorker = () => {
    if (!newWorkerName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      workers: [...prev.workers, { name: newWorkerName.trim(), role: newWorkerRole.trim() }]
    }));
    setNewWorkerName('');
    setNewWorkerRole('');
  };

  const removeWorker = (index) => {
    setFormData((prev) => ({
      ...prev,
      workers: prev.workers.filter((_, i) => i !== index)
    }));
  };

  const handleControlToggle = (controlId) => {
    setFormData((prev) => ({
      ...prev,
      preWorkControlsCompleted: {
        ...prev.preWorkControlsCompleted,
        [controlId]: !prev.preWorkControlsCompleted[controlId]
      }
    }));
  };

  const checkConflicts = async () => {
    if (!formData.siteId || !formData.startTime || !formData.endTime) return;
    
    try {
      const data = await checkPermitConflicts({
        siteId: formData.siteId,
        startTime: formData.startTime,
        endTime: formData.endTime
      });
      setConflicts(data.conflicts || []);
    } catch (err) {
      console.error('Failed to check conflicts:', err);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!formData.permitTypeId;
      case 1:
        return !!(formData.siteId && formData.location && formData.workDescription && 
                  formData.startTime && formData.endTime && formData.workers.length > 0);
      case 2:
        // All required pre-work controls must be completed
        const preWorkControls = selectedType?.requiredControls?.filter((c) => c.phase === 'pre_work') || [];
        const requiredControls = preWorkControls.filter((c) => c.required);
        return requiredControls.every((c) => formData.preWorkControlsCompleted[c.id]);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (asDraft = false) => {
    setSubmitting(true);
    setError('');
    
    try {
      const payload = {
        permitTypeId: formData.permitTypeId,
        siteId: formData.siteId,
        location: formData.location,
        workDescription: formData.workDescription,
        startTime: formData.startTime,
        endTime: formData.endTime,
        workers: formData.workers,
        hazards: formData.hazards ? { description: formData.hazards } : undefined,
        specialConditions: formData.specialConditions || undefined
      };
      
      const result = await createPermit(payload);
      const permitId = result.permit.id;
      
      // If not saving as draft, submit for approval
      if (!asDraft) {
        await submitPermit(permitId);
      }
      
      navigate(`/permits/${permitId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create permit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading form data..." />;

  return (
    <div className="page permit-create-page">
      <div className="page-header">
        <button className="btn ghost" onClick={() => navigate(-1)}>Back</button>
        <h2>New Permit</h2>
      </div>

      {/* Progress Steps */}
      <div className="wizard-steps">
        {STEPS.map((s, idx) => (
          <div 
            key={s.key} 
            className={`wizard-step ${idx === step ? 'active' : ''} ${idx < step ? 'completed' : ''}`}
          >
            <div className="step-number">{idx < step ? '✓' : idx + 1}</div>
            <div className="step-title">{s.title}</div>
          </div>
        ))}
      </div>

      {error && <ErrorState message={error} />}

      {/* Step Content */}
      <div className="wizard-content">
        {/* Step 1: Select Type */}
        {step === 0 && (
          <div className="step-panel">
            <h3>Select Permit Type</h3>
            <p className="step-description">Choose the type of permit required for your work activity.</p>
            
            <div className="permit-types-grid">
              {permitTypes.map((type) => (
                <div
                  key={type.id}
                  className={`permit-type-card ${formData.permitTypeId === type.id ? 'selected' : ''}`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <div className="type-icon"><AppIcon name={type.icon || 'clipboard'} size={18} /></div>
                  <div className="type-info">
                    <h4>{type.name}</h4>
                    <p>{type.description}</p>
                    {type.validityHours && (
                      <span className="validity">Max {type.validityHours} hours</span>
                    )}
                  </div>
                  {formData.permitTypeId === type.id && (
                    <div className="selected-check">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details & Schedule */}
        {step === 1 && (
          <div className="step-panel">
            <h3>Details & Schedule</h3>
            <p className="step-description">Provide work details, schedule, and list of authorized workers.</p>
            
            <div className="form-section">
              <h4><span className="inline-icon"><AppIcon name="mappin" size={16} />Location</span></h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="siteId">Site *</label>
                  <select
                    id="siteId"
                    name="siteId"
                    value={formData.siteId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select site...</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="location">Specific Location *</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g., Building A, Rooftop"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4><span className="inline-icon"><AppIcon name="document" size={16} />Work Description</span></h4>
              <div className="form-group">
                <label htmlFor="workDescription">Describe the work to be performed *</label>
                <textarea
                  id="workDescription"
                  name="workDescription"
                  value={formData.workDescription}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Detailed description of work activities..."
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <h4>⏱ Schedule</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startTime">Start Time *</label>
                  <input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="endTime">End Time *</label>
                  <input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              {conflicts.length > 0 && (
                <div className="conflict-warning">
                  ⚠️ <strong>Schedule Conflict:</strong> There are {conflicts.length} existing permit(s) 
                  at this location during the selected time.
                  <ul>
                    {conflicts.map((c, idx) => (
                      <li key={idx}>{c.permitNumber} - {c.permitType?.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="form-section">
              <h4><span className="inline-icon"><AppIcon name="users" size={16} />Authorized Workers *</span></h4>
              <div className="workers-input">
                <input
                  type="text"
                  placeholder="Worker name"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Role (optional)"
                  value={newWorkerRole}
                  onChange={(e) => setNewWorkerRole(e.target.value)}
                />
                <button type="button" className="btn secondary" onClick={addWorker}>
                  + Add
                </button>
              </div>
              
              {formData.workers.length > 0 && (
                <div className="workers-list">
                  {formData.workers.map((worker, idx) => (
                    <div key={idx} className="worker-item">
                      <span className="worker-name">{worker.name}</span>
                      {worker.role && <span className="worker-role">({worker.role})</span>}
                      <button 
                        type="button" 
                        className="remove-btn"
                        onClick={() => removeWorker(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {formData.workers.length === 0 && (
                <p className="muted">At least one worker is required.</p>
              )}
            </div>

            <div className="form-section">
              <h4>⚠️ Hazards & Special Conditions (Optional)</h4>
              <div className="form-group">
                <label htmlFor="hazards">Known Hazards</label>
                <textarea
                  id="hazards"
                  name="hazards"
                  value={formData.hazards}
                  onChange={handleChange}
                  rows={2}
                  placeholder="List any known hazards..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="specialConditions">Special Conditions</label>
                <textarea
                  id="specialConditions"
                  name="specialConditions"
                  value={formData.specialConditions}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any special conditions or requirements..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pre-Work Controls */}
        {step === 2 && (
          <div className="step-panel">
            <h3>Pre-Work Controls</h3>
            <p className="step-description">
              Complete the following pre-work controls before submitting the permit.
              Required controls are marked with *.
            </p>
            
            {selectedType?.requiredControls?.filter((c) => c.phase === 'pre_work').length > 0 ? (
              <div className="controls-checklist">
                {selectedType.requiredControls
                  .filter((c) => c.phase === 'pre_work')
                  .map((control) => (
                    <div 
                      key={control.id} 
                      className={`control-item ${formData.preWorkControlsCompleted[control.id] ? 'completed' : ''}`}
                    >
                      <label className="control-checkbox">
                        <input
                          type="checkbox"
                          checked={!!formData.preWorkControlsCompleted[control.id]}
                          onChange={() => handleControlToggle(control.id)}
                        />
                        <span className="checkmark" />
                        <span className="control-text">
                          {control.description}
                          {control.required && <span className="required-mark">*</span>}
                        </span>
                      </label>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="muted">No pre-work controls required for this permit type.</p>
            )}

            <div className="submit-section">
              <p className="submit-info">
                <span className="inline-icon"><AppIcon name="clipboard" size={16} />Summary:</span> {selectedType?.name} permit at{' '}
                {sites.find((s) => s.id === formData.siteId)?.name}, {formData.location}
              </p>
              <p className="submit-info">
                <span className="inline-icon"><AppIcon name="clock" size={16} />From</span> {new Date(formData.startTime).toLocaleString()} to{' '}
                {new Date(formData.endTime).toLocaleString()}
              </p>
              <p className="submit-info">
                <span className="inline-icon"><AppIcon name="users" size={16} />{formData.workers.length} worker(s) authorized</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-footer">
        <div className="footer-left">
          {step > 0 && (
            <button className="btn ghost" onClick={handleBack} disabled={submitting}>
              Back
            </button>
          )}
        </div>
        <div className="footer-right">
          {step < STEPS.length - 1 ? (
            <button 
              className="btn primary" 
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </button>
          ) : (
            <>
              <button 
                className="btn ghost" 
                onClick={() => handleSubmit(true)}
                disabled={submitting}
              >
                Save as Draft
              </button>
              <button 
                className="btn primary" 
                onClick={() => handleSubmit(false)}
                disabled={submitting || !canProceed()}
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermitCreatePage;



