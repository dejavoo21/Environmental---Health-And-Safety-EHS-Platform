/**
 * RiskEditPage - Phase 9
 * Edit an existing risk
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getRisk, updateRisk, listCategories } from '../api/risks';
import { ScoringSelector } from '../components/risks';
import { LoadingState, ErrorState } from '../components/States';
import './RiskNewPage.css'; // Reuse styles

const RiskEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    site_id: '',
    owner_id: '',
    hazard_source: '',
    potential_consequences: '',
    affected_parties: '',
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch risk and reference data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [riskResponse, catResponse] = await Promise.all([
        getRisk(id),
        listCategories()
      ]);
      
      const risk = riskResponse.data;
      setFormData({
        title: risk.title || '',
        description: risk.description || '',
        category_id: risk.category_id || '',
        site_id: risk.site_id || '',
        owner_id: risk.owner_id || '',
        hazard_source: risk.hazard_source || '',
        potential_consequences: risk.potential_consequences || '',
        affected_parties: risk.affected_parties || '',
        inherent_likelihood: risk.inherent_likelihood || 3,
        inherent_impact: risk.inherent_impact || 3,
        inherent_rationale: risk.inherent_rationale || '',
        residual_likelihood: risk.residual_likelihood || 2,
        residual_impact: risk.residual_impact || 2,
        residual_rationale: risk.residual_rationale || '',
        review_frequency: risk.review_frequency || 'quarterly'
      });
      
      setCategories(catResponse.data || []);
      
    } catch (err) {
      console.error('Error fetching risk:', err);
      setError(err.message || 'Failed to load risk');
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Handle field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
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
      
      await updateRisk(id, payload);
      navigate(`/risks/${id}`);
      
    } catch (err) {
      console.error('Error updating risk:', err);
      alert(err.message || 'Failed to update risk');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <LoadingState message="Loading risk..." />;
  }
  
  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }
  
  return (
    <div className="risk-new-page">
      {/* Header */}
      <div className="risk-new-page__header">
        <button
          className="btn btn--ghost"
          onClick={() => navigate(`/risks/${id}`)}
        >
          ← Cancel
        </button>
        <h1>Edit Risk</h1>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="risk-form">
        {/* Basic Information */}
        <div className="form-step">
          <h2>Basic Information</h2>
          
          <label className={`form-field ${errors.title ? 'form-field--error' : ''}`}>
            Risk Title <span className="required">*</span>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
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
        
        {/* Hazard Details */}
        <div className="form-step" style={{ marginTop: '32px' }}>
          <h2>Hazard Details</h2>
          
          <label className="form-field">
            Hazard Source
            <textarea
              rows={3}
              value={formData.hazard_source}
              onChange={(e) => handleChange('hazard_source', e.target.value)}
            />
          </label>
          
          <label className="form-field">
            Potential Consequences
            <textarea
              rows={3}
              value={formData.potential_consequences}
              onChange={(e) => handleChange('potential_consequences', e.target.value)}
            />
          </label>
          
          <label className="form-field">
            Affected Parties
            <textarea
              rows={2}
              value={formData.affected_parties}
              onChange={(e) => handleChange('affected_parties', e.target.value)}
            />
          </label>
        </div>
        
        {/* Risk Scoring */}
        <div className="form-step" style={{ marginTop: '32px' }}>
          <h2>Risk Scoring</h2>
          
          {/* Inherent Risk */}
          <div className="scoring-section">
            <h3>Inherent Risk (Before Controls)</h3>
            
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
              />
            </label>
          </div>
          
          {/* Residual Risk */}
          <div className="scoring-section">
            <h3>Residual Risk (After Controls)</h3>
            
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
        
        {/* Navigation Buttons */}
        <div className="form-navigation">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate(`/risks/${id}`)}
          >
            Cancel
          </button>
          
          <div className="form-navigation__spacer"></div>
          
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
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

export default RiskEditPage;
