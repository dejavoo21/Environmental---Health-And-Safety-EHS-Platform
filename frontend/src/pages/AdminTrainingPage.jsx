import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Settings,
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import './AdminTrainingPage.css';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const AdminTrainingPage = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'course', 'category', 'assignment'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/training/courses');
      const coursesData = res.data?.courses || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCourses(coursesData);
    } catch (err) {
      setError('Failed to load courses');
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/training/categories');
      const categoriesData = res.data?.categories || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCategories(categoriesData);
    } catch (err) {
      setError('Failed to load categories');
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await api.get('/training/assignments');
      const assignmentsData = res.data?.assignments || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setAssignments(assignmentsData);
    } catch (err) {
      setError('Failed to load assignments');
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      const usersData = res.data?.users || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setUsers(usersData);
    } catch (err) {
      // Silently fail
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    await Promise.all([fetchCourses(), fetchCategories(), fetchAssignments(), fetchUsers()]);
    setLoading(false);
  }, [fetchCourses, fetchCategories, fetchAssignments, fetchUsers]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal handlers
  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    
    if (type === 'course') {
      setFormData(item ? {
        name: item.name,
        description: item.description || '',
        category_id: item.category_id || '',
        duration_minutes: item.duration_minutes || 30,
        validity_months: item.validity_months || 12,
        is_mandatory: item.is_mandatory || false,
        is_active: item.is_active !== false
      } : {
        name: '',
        description: '',
        category_id: '',
        duration_minutes: 30,
        validity_months: 12,
        is_mandatory: false,
        is_active: true
      });
    } else if (type === 'category') {
      setFormData(item ? {
        name: item.name,
        description: item.description || ''
      } : {
        name: '',
        description: ''
      });
    } else if (type === 'assignment') {
      setFormData({
        course_id: '',
        user_id: '',
        due_date: '',
        is_mandatory: true
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({});
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (modalType === 'course') {
        if (editingItem) {
          await api.put(`/training/courses/${editingItem.id}`, formData);
          setSuccess('Course updated successfully');
        } else {
          await api.post('/training/courses', formData);
          setSuccess('Course created successfully');
        }
        fetchCourses();
      } else if (modalType === 'category') {
        if (editingItem) {
          await api.put(`/training/categories/${editingItem.id}`, formData);
          setSuccess('Category updated successfully');
        } else {
          await api.post('/training/categories', formData);
          setSuccess('Category created successfully');
        }
        fetchCategories();
      } else if (modalType === 'assignment') {
        await api.post('/training/assignments', formData);
        setSuccess('Training assigned successfully');
        fetchAssignments();
      }
      
      closeModal();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      if (type === 'course') {
        await api.delete(`/training/courses/${id}`);
        fetchCourses();
      } else if (type === 'category') {
        await api.delete(`/training/categories/${id}`);
        fetchCategories();
      } else if (type === 'assignment') {
        await api.delete(`/training/assignments/${id}`);
        fetchAssignments();
      }
      setSuccess('Item deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const renderCourses = () => (
    <div className="admin-training-content">
      <div className="admin-training-toolbar">
        <div className="admin-training-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => openModal('course')}>
          <Plus size={16} /> Add Course
        </button>
      </div>
      
      {courses.length === 0 ? (
        <div className="admin-training-empty">
          <BookOpen size={48} />
          <h3>No Courses</h3>
          <p>Create your first training course to get started.</p>
          <button className="btn btn-primary" onClick={() => openModal('course')}>
            <Plus size={16} /> Add Course
          </button>
        </div>
      ) : (
        <div className="admin-training-table-wrapper">
          <table className="admin-training-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Category</th>
                <th>Duration</th>
                <th>Validity</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses
                .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(course => (
                  <tr key={course.id}>
                    <td>
                      <div className="course-name">
                        <GraduationCap size={18} />
                        <div>
                          <strong>{course.name}</strong>
                          {course.description && <span>{course.description.slice(0, 50)}...</span>}
                        </div>
                      </div>
                    </td>
                    <td>{course.category_name || '-'}</td>
                    <td>{course.duration_minutes} min</td>
                    <td>{course.validity_months} months</td>
                    <td>
                      {course.is_mandatory ? (
                        <span className="badge badge--mandatory">Mandatory</span>
                      ) : (
                        <span className="badge badge--optional">Optional</span>
                      )}
                    </td>
                    <td>
                      {course.is_active !== false ? (
                        <span className="badge badge--active">Active</span>
                      ) : (
                        <span className="badge badge--inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon" 
                          onClick={() => openModal('course', course)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="btn-icon btn-icon--danger" 
                          onClick={() => handleDelete('course', course.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="admin-training-content">
      <div className="admin-training-toolbar">
        <div className="admin-training-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => openModal('category')}>
          <Plus size={16} /> Add Category
        </button>
      </div>
      
      {categories.length === 0 ? (
        <div className="admin-training-empty">
          <BookOpen size={48} />
          <h3>No Categories</h3>
          <p>Create categories to organize your training courses.</p>
          <button className="btn btn-primary" onClick={() => openModal('category')}>
            <Plus size={16} /> Add Category
          </button>
        </div>
      ) : (
        <div className="categories-grid">
          {categories
            .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(cat => (
              <div key={cat.id} className="category-card">
                <div className="category-header">
                  <BookOpen size={24} />
                  <h3>{cat.name}</h3>
                </div>
                {cat.description && <p>{cat.description}</p>}
                <div className="category-actions">
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => openModal('category', cat)}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete('category', cat.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderAssignments = () => (
    <div className="admin-training-content">
      <div className="admin-training-toolbar">
        <div className="admin-training-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => openModal('assignment')}>
          <Plus size={16} /> Assign Training
        </button>
      </div>
      
      {assignments.length === 0 ? (
        <div className="admin-training-empty">
          <Users size={48} />
          <h3>No Assignments</h3>
          <p>Assign training courses to users to track their progress.</p>
          <button className="btn btn-primary" onClick={() => openModal('assignment')}>
            <Plus size={16} /> Assign Training
          </button>
        </div>
      ) : (
        <div className="admin-training-table-wrapper">
          <table className="admin-training-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Course</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments
                .filter(a => 
                  a.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  a.course_name?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map(assignment => (
                  <tr key={assignment.id}>
                    <td>
                      <div className="user-cell">
                        <Users size={18} />
                        <span>{assignment.user_name || assignment.user_email}</span>
                      </div>
                    </td>
                    <td>{assignment.course_name}</td>
                    <td>{formatDate(assignment.due_date)}</td>
                    <td>
                      {assignment.status === 'completed' ? (
                        <span className="badge badge--completed">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      ) : assignment.status === 'in_progress' ? (
                        <span className="badge badge--progress">In Progress</span>
                      ) : new Date(assignment.due_date) < new Date() ? (
                        <span className="badge badge--overdue">
                          <AlertCircle size={12} /> Overdue
                        </span>
                      ) : (
                        <span className="badge badge--pending">Pending</span>
                      )}
                    </td>
                    <td>{formatDate(assignment.assigned_at || assignment.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon btn-icon--danger" 
                          onClick={() => handleDelete('assignment', assignment.id)}
                          title="Remove Assignment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;
    
    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>
              {modalType === 'course' && (editingItem ? 'Edit Course' : 'Add Course')}
              {modalType === 'category' && (editingItem ? 'Edit Category' : 'Add Category')}
              {modalType === 'assignment' && 'Assign Training'}
            </h2>
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="modal-form">
            {modalType === 'course' && (
              <>
                <div className="form-group">
                  <label>Course Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Fire Safety Basics"
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Course description..."
                  />
                </div>
                
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category_id || ''}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes || 30}
                      onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      min="5"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Validity (months)</label>
                    <input
                      type="number"
                      value={formData.validity_months || 12}
                      onChange={e => setFormData({ ...formData, validity_months: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_mandatory || false}
                      onChange={e => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    />
                    <span>Mandatory course</span>
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active !== false}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </>
            )}
            
            {modalType === 'category' && (
              <>
                <div className="form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Health & Safety"
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Category description..."
                  />
                </div>
              </>
            )}
            
            {modalType === 'assignment' && (
              <>
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    value={formData.course_id || ''}
                    onChange={e => setFormData({ ...formData, course_id: e.target.value })}
                    required
                  >
                    <option value="">Select course...</option>
                    {courses.filter(c => c.is_active !== false).map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>User *</label>
                  <select
                    value={formData.user_id || ''}
                    onChange={e => setFormData({ ...formData, user_id: e.target.value })}
                    required
                  >
                    <option value="">Select user...</option>
                    {users.filter(u => u.is_active).map(user => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_mandatory !== false}
                    onChange={e => setFormData({ ...formData, is_mandatory: e.target.checked })}
                  />
                  <span>Mandatory assignment</span>
                </label>
              </>
            )}
            
            {error && (
              <div className="form-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : <><Save size={16} /> Save</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-training-page">
        <div className="admin-training-loading">
          <div className="spinner" />
          <p>Loading training administration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-training-page">
      <header className="admin-training-header">
        <h1><Settings size={28} /> Training Administration</h1>
        <p>Manage training courses, categories, and assignments</p>
      </header>

      <div className="admin-training-tabs">
        <button 
          className={`admin-training-tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => { setActiveTab('courses'); setSearchTerm(''); }}
        >
          <GraduationCap size={18} /> Courses
          <span className="tab-count">{courses.length}</span>
        </button>
        <button 
          className={`admin-training-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
        >
          <BookOpen size={18} /> Categories
          <span className="tab-count">{categories.length}</span>
        </button>
        <button 
          className={`admin-training-tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => { setActiveTab('assignments'); setSearchTerm(''); }}
        >
          <Users size={18} /> Assignments
          <span className="tab-count">{assignments.length}</span>
        </button>
      </div>

      {success && (
        <div className="admin-training-success">
          <CheckCircle2 size={20} />
          <span>{success}</span>
        </div>
      )}

      {error && !showModal && (
        <div className="admin-training-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {activeTab === 'courses' && renderCourses()}
      {activeTab === 'categories' && renderCategories()}
      {activeTab === 'assignments' && renderAssignments()}
      
      {renderModal()}
    </div>
  );
};

export default AdminTrainingPage;
