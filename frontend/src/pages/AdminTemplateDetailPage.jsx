import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { ErrorState, LoadingState } from '../components/States';

const AdminTemplateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inspection-templates/${id}`);
      setTemplate(res.data);
      setName(res.data.name);
      setDescription(res.data.description || '');
      setItems(res.data.items.map((item) => ({
        id: item.id,
        label: item.label,
        category: item.category || '',
        sortOrder: item.sortOrder
      })));
    } catch (err) {
      setError('Unable to load template detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [id]);

  const addItem = () => {
    setItems((prev) => ([
      ...prev,
      { id: `new-${Date.now()}`, label: '', category: '', sortOrder: prev.length + 1 }
    ]));
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, idx) => (
      idx == index ? { ...item, [field]: value } : item
    )));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx != index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/inspection-templates/${id}`, {
        name,
        description,
        items: items.map((item, index) => ({
          label: item.label,
          category: item.category || undefined,
          sortOrder: Number(item.sortOrder || index + 1)
        }))
      });
      await loadTemplate();
    } catch (err) {
      setError('Unable to save template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading template..." />;
  if (error) return <ErrorState message={error} />;
  if (!template) return null;

  return (
    <div className="page">
      <div className="card form-card">
        <h3>Template Detail</h3>
        {error && <div className="error-text">{error}</div>}
        <div className="form-grid">
          <label className="field">
            <span>Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>

        <div className="checklist">
          <div className="checklist-header">
            <h4>Checklist Items</h4>
            <button className="btn ghost" type="button" onClick={addItem}>Add Item</button>
          </div>
          {items.map((item, index) => (
            <div className="checklist-item" key={item.id}>
              <input
                className="item-input"
                placeholder="Label"
                value={item.label}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
              />
              <input
                className="item-input"
                placeholder="Category"
                value={item.category}
                onChange={(e) => updateItem(index, 'category', e.target.value)}
              />
              <input
                className="item-input small"
                type="number"
                placeholder="Order"
                value={item.sortOrder}
                onChange={(e) => updateItem(index, 'sortOrder', e.target.value)}
              />
              <button className="btn danger" type="button" onClick={() => removeItem(index)}>Remove</button>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn ghost" type="button" onClick={() => navigate('/admin/templates')}>Back</button>
          <button className="btn primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</button>
        </div>
      </div>
    </div>
  );
};

export default AdminTemplateDetailPage;
