import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChemical, GHS_HAZARD_CLASSES } from '../api/chemicals';
import { GHSClassificationSelector } from '../components/chemicals';
import { ErrorState } from '../components/States';
import './ChemicalFormPage.css';

/**
 * Chemical Create Page
 * Form to add new chemical
 * SCR-P7-CHEM-03
 */

const ChemicalCreatePage = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    internalCode: '',
    casNumber: '',
    supplier: '',
    physicalState: 'liquid',
    ghsHazardClasses: [],
    ppeRequirements: '',
    handlingNotes: '',
    status: 'active'
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Chemical name is required.');
      return false;
    }
    if (!formData.physicalState) {
      setError('Physical state is required.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError('');
    try {
      const result = await createChemical(formData);
      navigate(`/chemicals/${result.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create chemical.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/chemicals');
  };

  return (
    <div className="page chemical-form-page">
      <div className="page-header">
        <h2>Add New Chemical</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card form-card">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="chem-name">Chemical Name *</label>
              <input
                id="chem-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Acetone"
                maxLength={200}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="chem-code">Internal Code</label>
                <input
                  id="chem-code"
                  type="text"
                  value={formData.internalCode}
                  onChange={(e) => handleChange('internalCode', e.target.value)}
                  placeholder="e.g., CHM-001"
                />
              </div>
              <div className="form-group">
                <label htmlFor="chem-cas">CAS Number</label>
                <input
                  id="chem-cas"
                  type="text"
                  value={formData.casNumber}
                  onChange={(e) => handleChange('casNumber', e.target.value)}
                  placeholder="e.g., 67-64-1"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="chem-supplier">Supplier</label>
                <input
                  id="chem-supplier"
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="e.g., Sigma-Aldrich"
                />
              </div>
              <div className="form-group">
                <label htmlFor="chem-state">Physical State *</label>
                <select
                  id="chem-state"
                  value={formData.physicalState}
                  onChange={(e) => handleChange('physicalState', e.target.value)}
                >
                  <option value="solid">Solid</option>
                  <option value="liquid">Liquid</option>
                  <option value="gas">Gas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>GHS Hazard Classification</h3>
            <p className="section-help">Select all that apply:</p>
            <GHSClassificationSelector
              selected={formData.ghsHazardClasses}
              onChange={(classes) => handleChange('ghsHazardClasses', classes)}
            />
          </div>

          <div className="form-section">
            <h3>Handling Requirements</h3>
            
            <div className="form-group">
              <label htmlFor="chem-ppe">PPE Requirements</label>
              <textarea
                id="chem-ppe"
                value={formData.ppeRequirements}
                onChange={(e) => handleChange('ppeRequirements', e.target.value)}
                placeholder="e.g., Safety goggles, nitrile gloves"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="chem-handling">Handling Notes</label>
              <textarea
                id="chem-handling"
                value={formData.handlingNotes}
                onChange={(e) => handleChange('handlingNotes', e.target.value)}
                placeholder="e.g., Store away from heat sources. Use in well-ventilated area."
                rows={4}
              />
            </div>
          </div>

          {error && <ErrorState message={error} />}
        </div>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Chemical'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChemicalCreatePage;
