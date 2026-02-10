import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ChevronRight,
  BookOpen,
  Play,
  Award,
  RefreshCw
} from 'lucide-react';
import './TrainingPage.css';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getStatusBadge = (status, dueDate) => {
  const isPastDue = dueDate && new Date(dueDate) < new Date();
  
  if (status === 'completed') {
    return <span className="training-badge training-badge--completed"><CheckCircle2 size={14} /> Completed</span>;
  }
  if (status === 'in_progress') {
    return <span className="training-badge training-badge--in-progress"><Play size={14} /> In Progress</span>;
  }
  if (isPastDue) {
    return <span className="training-badge training-badge--overdue"><AlertCircle size={14} /> Overdue</span>;
  }
  return <span className="training-badge training-badge--pending"><Clock size={14} /> Pending</span>;
};

const TrainingPage = () => {
  const [activeTab, setActiveTab] = useState('my-training');
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, overdue: 0 });

  const fetchMyTraining = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [myTrainingRes, historyRes] = await Promise.all([
        api.get('/training/my-training'),
        api.get('/training/my-training/history')
      ]);
      
      // my-training returns { assignments, upcomingDue, completed, overdueCount }
      const myTraining = myTrainingRes.data || {};
      const assignmentData = myTraining.assignments || [];
      const completionData = historyRes.data?.data || historyRes.data || [];
      
      setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      setCompletions(Array.isArray(completionData) ? completionData : []);
      
      // Calculate stats from response
      const completed = myTraining.completed || 0;
      const inProgress = assignmentData.filter(a => a.status === 'in_progress').length;
      const overdue = myTraining.overdueCount || 0;
      
      setStats({
        total: assignmentData.length,
        completed,
        inProgress,
        overdue
      });
    } catch (err) {
      console.error('Training fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load training data');
      // Set empty arrays on error to prevent mapping issues
      setAssignments([]);
      setCompletions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [coursesRes, categoriesRes] = await Promise.all([
        api.get('/training/courses'),
        api.get('/training/categories')
      ]);
      
      // Handle paginated responses: courses and categories may return { data: [], total, page }
      const coursesData = coursesRes.data?.data || coursesRes.data || [];
      const categoriesData = categoriesRes.data?.data || categoriesRes.data || [];
      
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Catalog fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load course catalog');
      setCourses([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'my-training') {
      fetchMyTraining();
    } else if (activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [activeTab, fetchMyTraining, fetchCatalog]);

  const handleStartCourse = async (assignmentId) => {
    try {
      await api.post(`/training/assignments/${assignmentId}/start`);
      fetchMyTraining();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start course');
    }
  };

  const handleCompleteCourse = async (assignmentId) => {
    try {
      await api.post(`/training/assignments/${assignmentId}/complete`);
      fetchMyTraining();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark course as complete');
    }
  };

  const renderStatsCards = () => (
    <div className="training-stats">
      <div className="training-stat-card">
        <div className="training-stat-icon training-stat-icon--total">
          <BookOpen size={20} />
        </div>
        <div className="training-stat-content">
          <span className="training-stat-value">{stats.total}</span>
          <span className="training-stat-label">Total Courses</span>
        </div>
      </div>
      <div className="training-stat-card">
        <div className="training-stat-icon training-stat-icon--completed">
          <CheckCircle2 size={20} />
        </div>
        <div className="training-stat-content">
          <span className="training-stat-value">{stats.completed}</span>
          <span className="training-stat-label">Completed</span>
        </div>
      </div>
      <div className="training-stat-card">
        <div className="training-stat-icon training-stat-icon--progress">
          <Play size={20} />
        </div>
        <div className="training-stat-content">
          <span className="training-stat-value">{stats.inProgress}</span>
          <span className="training-stat-label">In Progress</span>
        </div>
      </div>
      <div className="training-stat-card">
        <div className="training-stat-icon training-stat-icon--overdue">
          <AlertCircle size={20} />
        </div>
        <div className="training-stat-content">
          <span className="training-stat-value">{stats.overdue}</span>
          <span className="training-stat-label">Overdue</span>
        </div>
      </div>
    </div>
  );

  const renderMyTraining = () => (
    <div className="training-content">
      {renderStatsCards()}
      
      {assignments.length === 0 ? (
        <div className="training-empty">
          <GraduationCap size={48} />
          <h3>No Training Assigned</h3>
          <p>You don't have any training courses assigned yet. Check back later or browse the course catalog.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab('catalog')}>
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="training-list">
          {assignments.map(assignment => (
            <div key={assignment.id} className="training-card">
              <div className="training-card-header">
                <div className="training-card-icon">
                  <GraduationCap size={24} />
                </div>
                <div className="training-card-title">
                  <h3>{assignment.course_name || assignment.title}</h3>
                  <p>{assignment.category_name || 'General'}</p>
                </div>
                {getStatusBadge(assignment.status, assignment.due_date)}
              </div>
              
              <div className="training-card-body">
                {assignment.description && (
                  <p className="training-card-description">{assignment.description}</p>
                )}
                
                <div className="training-card-meta">
                  {assignment.due_date && (
                    <span className="training-meta-item">
                      <Calendar size={14} />
                      Due: {formatDate(assignment.due_date)}
                    </span>
                  )}
                  {assignment.duration_minutes && (
                    <span className="training-meta-item">
                      <Clock size={14} />
                      {assignment.duration_minutes} min
                    </span>
                  )}
                  {assignment.completed_at && (
                    <span className="training-meta-item">
                      <Award size={14} />
                      Completed: {formatDate(assignment.completed_at)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="training-card-actions">
                {assignment.status === 'pending' && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleStartCourse(assignment.id)}
                  >
                    <Play size={16} /> Start Course
                  </button>
                )}
                {assignment.status === 'in_progress' && (
                  <>
                    <button className="btn btn-secondary">
                      <Play size={16} /> Continue
                    </button>
                    <button 
                      className="btn btn-success"
                      onClick={() => handleCompleteCourse(assignment.id)}
                    >
                      <CheckCircle2 size={16} /> Mark Complete
                    </button>
                  </>
                )}
                {assignment.status === 'completed' && (
                  <button className="btn btn-secondary">
                    <RefreshCw size={16} /> Retake
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCatalog = () => (
    <div className="training-content">
      {categories.length > 0 && (
        <div className="training-categories">
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className="training-category-chip"
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
      
      {courses.length === 0 ? (
        <div className="training-empty">
          <BookOpen size={48} />
          <h3>No Courses Available</h3>
          <p>There are no training courses in the catalog yet. Contact your administrator to add courses.</p>
        </div>
      ) : (
        <div className="training-list">
          {courses.map(course => (
            <div key={course.id} className="training-card">
              <div className="training-card-header">
                <div className="training-card-icon">
                  <BookOpen size={24} />
                </div>
                <div className="training-card-title">
                  <h3>{course.name || course.title}</h3>
                  <p>{course.category_name || 'General'}</p>
                </div>
                {course.is_mandatory && (
                  <span className="training-badge training-badge--mandatory">Mandatory</span>
                )}
              </div>
              
              <div className="training-card-body">
                {course.description && (
                  <p className="training-card-description">{course.description}</p>
                )}
                
                <div className="training-card-meta">
                  {course.duration_minutes && (
                    <span className="training-meta-item">
                      <Clock size={14} />
                      {course.duration_minutes} min
                    </span>
                  )}
                  {course.validity_months && (
                    <span className="training-meta-item">
                      <Calendar size={14} />
                      Valid for {course.validity_months} months
                    </span>
                  )}
                </div>
              </div>
              
              <div className="training-card-actions">
                <button className="btn btn-link">
                  View Details <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCompletions = () => (
    <div className="training-content">
      {completions.length === 0 ? (
        <div className="training-empty">
          <Award size={48} />
          <h3>No Completions Yet</h3>
          <p>Complete training courses to see your achievements here.</p>
          <button className="btn btn-primary" onClick={() => setActiveTab('my-training')}>
            View My Training
          </button>
        </div>
      ) : (
        <div className="training-completions">
          {completions.map(completion => (
            <div key={completion.id} className="completion-card">
              <div className="completion-icon">
                <Award size={32} />
              </div>
              <div className="completion-content">
                <h4>{completion.course_name || completion.title}</h4>
                <p>Completed on {formatDate(completion.completed_at)}</p>
                {completion.score && (
                  <span className="completion-score">Score: {completion.score}%</span>
                )}
              </div>
              {completion.certificate_url && (
                <a 
                  href={completion.certificate_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  View Certificate
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="training-page">
      <header className="training-header">
        <h1><GraduationCap size={28} /> Training</h1>
        <p>Manage your training courses and track your progress</p>
      </header>

      <div className="training-tabs">
        <button 
          className={`training-tab ${activeTab === 'my-training' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-training')}
        >
          <GraduationCap size={18} /> My Training
        </button>
        <button 
          className={`training-tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <BookOpen size={18} /> Course Catalog
        </button>
        <button 
          className={`training-tab ${activeTab === 'completions' ? 'active' : ''}`}
          onClick={() => setActiveTab('completions')}
        >
          <Award size={18} /> Completions
        </button>
      </div>

      {error && (
        <div className="training-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="training-loading">
          <div className="spinner" />
          <p>Loading training data...</p>
        </div>
      ) : (
        <>
          {activeTab === 'my-training' && renderMyTraining()}
          {activeTab === 'catalog' && renderCatalog()}
          {activeTab === 'completions' && renderCompletions()}
        </>
      )}
    </div>
  );
};

export default TrainingPage;
