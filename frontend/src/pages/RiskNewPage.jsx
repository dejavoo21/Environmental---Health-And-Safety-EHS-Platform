/**
 * RiskNewPage - Phase 9
 * Multi-step form for creating a new risk
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { createRisk, listCategories } from '../api/risks';
import { ScoringSelector } from '../components/risks';
import { LoadingState } from '../components/States';
import './RiskNewPage.css';

const STEPS = [
  { id: 1, title: 'Basic Information' },
  { id: 2, title: 'Hazard Details' },
  { id: 3, title: 'Risk Scoring' }
];

const RiskNewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1 - Basic Info
    title: '',
    description: '',
    category_id: '',
    site_id: '',
    owner_id: user?.id || '',
    
    // Step 2 - Hazard Details
    hazard_source: '',
    potential_consequences: '',
    affected_parties: '',
    
    // Step 3 - Scoring
    inherent_likelihood: 3,
    inherent_impact: 3,
    inherent_rationale: '',
    residual_likelihood: 2,
    residual_impact: 2,
    residual_rationale: '',
    review_frequency: 'quarterly'
  });
  
  // UI state
  const [categories, setCategories] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const catResponse = await listCategories();
        setCategories(catResponse.data || []);
        // TODO: Fetch sites and users from respective APIs
        setSites([]);
        setUsers([]);
      } catch (err) {
        console.error('Error fetching reference data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // Handle field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Validate step
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.title?.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.description?.trim()) {
        newErrors.description = 'Description is required';
      }
    }
    
    if (step === 3) {
      if (!formData.inherent_likelihood) {
        newErrors.inherent_likelihood = 'Inherent likelihood is required';
      }
      if (!formData.inherent_impact) {
        newErrors.inherent_impact = 'Inherent impact is required';
      }
      if (!formData.residual_likelihood) {
        newErrors.residual_likelihood = 'Residual likelihood is required';
      }
      if (!formData.residual_impact) {
        newErrors.residual_impact = 'Residual impact is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Navigate between steps
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    try {
      setSubmitting(true);
      
      const payload = {
        ...formData,
        inherent_score: formData.inherent_likelihood * formData.inherent_impact,
        residual_score: formData.residual_likelihood * formData.residual_impact
      };
      
      // Remove empty optional fields
      if (!payload.category_id) delete payload.category_id;
      if (!payload.site_id) delete payload.site_id;
      if (!payload.owner_id) delete payload.owner_id;
      
      const response = await createRisk(payload);
      navigate(`/risks/${response.data.id}`);
      
    } catch (err) {
      console.error('Error creating risk:', err);
      alert(err.message || 'Failed to create risk');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <LoadingState message="Loading form..." />;
  }
  
  return (
    <div className="risk-new-page">
      {/* Header */}
      <div className="risk-new-page__header">
        <button
          className="btn btn--ghost"
          onClick={() => navigate('/risks')}
        >
          ← Cancel
        </button>
        <h1>Register New Risk</h1>
      </div>
      
      {/* Progress Steps */}
      <div className="step-progress">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`step-progress__item ${
              step.id === currentStep ? 'step-progress__item--active' : ''
            } ${step.id < currentStep ? 'step-progress__item--complete' : ''}`}
          >
            <div className="step-progress__number">
              {step.id < currentStep ? '✓' : step.id}
            </div>
            <div className="step-progress__title">{step.title}</div>
          </div>
        ))}
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="risk-form">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="form-step">
            <h2>Basic Information</h2>
            <p className="form-step__desc">
              Provide the essential details about this risk
            </p>
            
            <label className={`form-field ${errors.title ? 'form-field--error' : ''}`}>
              Risk Title <span className="required">*</span>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter a clear, concise title for this risk"
                maxLength={200}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </label>
            
            <label className={`form-field ${errors.description ? 'form-field--error' : ''}`}>
              Description <span className="required">*</span>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe the risk in detail..."
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </label>
            
            <div className="form-row">
              <label className="form-field">
                Category
                <select
                  value={formData.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>
              
              <label className="form-field">
                Site
                <select
                  value={formData.site_id}
                  onChange={(e) => handleChange('site_id', e.target.value)}
                >
                  <option value="">Enterprise-wide</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </label>
            </div>
            
            <label className="form-field">
              Risk Owner
              <select
                value={formData.owner_id}
                onChange={(e) => handleChange('owner_id', e.target.value)}
              >
                <option value="">Unassigned</option>
                <option value={user?.id}>{user?.name} (Me)</option>
                {users.filter(u => u.id !== user?.id).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        
        {/* Step 2: Hazard Details */}
        {currentStep === 2 && (
          <div className="form-step">
            <h2>Hazard Details</h2>
            <p className="form-step__desc">
              Describe the hazard and its potential impact
            </p>
            
            <label className="form-field">
              Hazard Source
              <textarea
                rows={3}
                value={formData.hazard_source}
                onChange={(e) => handleChange('hazard_source', e.target.value)}
                placeholder="What is the source or cause of this hazard?"
              />
            </label>
            
            <label className="form-field">
              Potential Consequences
              <textarea
                rows={3}
                value={formData.potential_consequences}
                onChange={(e) => handleChange('potential_consequences', e.target.value)}
                placeholder="What could happen if this risk materialises?"
              />
            </label>
            
            <label className="form-field">
              Affected Parties
              <textarea
                rows={2}
                value={formData.affected_parties}
                onChange={(e) => handleChange('affected_parties', e.target.value)}
                placeholder="Who could be affected? (employees, contractors, public, environment)"
              />
            </label>
          </div>
        )}
        
        {/* Step 3: Risk Scoring */}
        {currentStep === 3 && (
          <div className="form-step">
            <h2>Risk Scoring</h2>
            <p className="form-step__desc">
              Assess the inherent and residual risk levels
            </p>
            
            {/* Inherent Risk */}
            <div className="scoring-section">
              <h3>Inherent Risk (Before Controls)</h3>
              <p className="scoring-hint">
                Assess the risk level assuming no controls are in place
              </p>
              
              <ScoringSelector
                type="likelihood"
                value={formData.inherent_likelihood}
                onChange={(val) => handleChange('inherent_likelihood', val)}
                error={errors.inherent_likelihood}
                required
              />
              
              <ScoringSelector
                type="impact"
                value={formData.inherent_impact}
                onChange={(val) => handleChange('inherent_impact', val)}
                error={errors.inherent_impact}
                required
              />
              
              <div className="score-preview">
                <strong>Inherent Score: </strong>
                {formData.inherent_likelihood * formData.inherent_impact}
                <span className="score-level">
                  {' '}({getLevel(formData.inherent_likelihood * formData.inherent_impact)})
                </span>
              </div>
              
              <label className="form-field">
                Rationale
                <textarea
                  rows={2}
                  value={formData.inherent_rationale}
                  onChange={(e) => handleChange('inherent_rationale', e.target.value)}
                  placeholder="Explain the basis for this inherent risk assessment"
                />
              </label>
            </div>
            
            {/* Residual Risk */}
            <div className="scoring-section">
              <h3>Residual Risk (After Controls)</h3>
              <p className="scoring-hint">
                Assess the risk level considering existing controls
              </p>
              
              <ScoringSelector
                type="likelihood"
                value={formData.residual_likelihood}
                onChange={(val) => handleChange('residual_likelihood', val)}
                error={errors.residual_likelihood}
                required
              />
              
              <ScoringSelector
                type="impact"
                value={formData.residual_impact}
                onChange={(val) => handleChange('residual_impact', val)}
                error={errors.residual_impact}
                required
              />
              
              <div className="score-preview">
                <strong>Residual Score: </strong>
                {formData.residual_likelihood * formData.residual_impact}
                <span className="score-level">
                  {' '}({getLevel(formData.residual_likelihood * formData.residual_impact)})
                </span>
              </div>
              
              <label className="form-field">
                Rationale
                <textarea
                  rows={2}
                  value={formData.residual_rationale}
                  onChange={(e) => handleChange('residual_rationale', e.target.value)}
                  placeholder="Explain the basis for this residual risk assessment"
                />
              </label>
            </div>
            
            {/* Review Frequency */}
            <div className="scoring-section">
              <h3>Review Settings</h3>
              
              <label className="form-field">
                Review Frequency
                <select
                  value={formData.review_frequency}
                  onChange={(e) => handleChange('review_frequency', e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="bi_annually">Bi-annually</option>
                  <option value="annually">Annually</option>
                </select>
              </label>
            </div>
          </div>
        )}
        
        {/* Navigation Buttons */}
        <div className="form-navigation">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleBack}
            >
              ← Back
            </button>
          )}
          
          <div className="form-navigation__spacer"></div>
          
          {currentStep < 3 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleNext}
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Risk'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// Helper to get level from score
function getLevel(score) {
  if (score <= 4) return 'Low';
  if (score <= 9) return 'Medium';
  if (score <= 16) return 'High';
  return 'Extreme';
}

export default RiskNewPage;
