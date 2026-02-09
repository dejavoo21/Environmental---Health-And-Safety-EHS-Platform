/**
 * RiskDetailPage - Phase 9
 * Risk detail view with tabs for Details, Controls, Links, Reviews, History
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AppIcon from '../components/AppIcon';
import {
  getRisk,
  updateRisk,
  changeRiskStatus,
  deleteRisk,
  listControls,
  addControl,
  updateControl,
  deleteControl,
  verifyControl,
  listLinks,
  createLink,
  deleteLink,
  listReviews,
  recordReview
} from '../api/risks';
import {
  RiskLevelBadge,
  RiskStatusBadge,
  RiskScoreCard,
  ControlCard,
  LinkCard,
  ReviewCard
} from '../components/risks';
import {
  ReviewModal,
  LinkEntityModal,
  AddControlModal,
  VerifyControlModal,
  ChangeStatusModal,
  DeleteConfirmModal
} from '../components/risks';
import { LoadingState, ErrorState } from '../components/States';
import './RiskDetailPage.css';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'controls', label: 'Controls' },
  { id: 'links', label: 'Links' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'history', label: 'History' }
];

const RiskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Main state
  const [risk, setRisk] = useState(null);
  const [controls, setControls] = useState([]);
  const [links, setLinks] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Active tab
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  
  // Modal states
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Edit states
  const [selectedControl, setSelectedControl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Check permissions
  const canEdit = user?.role === 'manager' || user?.role === 'admin';
  const canDelete = user?.role === 'admin';
  const isOwner = risk?.owner_id === user?.id;
  
  // Fetch risk data
  const fetchRisk = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getRisk(id);
      setRisk(response.data);
      
    } catch (err) {
      console.error('Error fetching risk:', err);
      setError(err.message || 'Failed to load risk');
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  // Fetch controls
  const fetchControls = useCallback(async () => {
    try {
      const response = await listControls(id);
      setControls(response.data || []);
    } catch (err) {
      console.error('Error fetching controls:', err);
    }
  }, [id]);
  
  // Fetch links
  const fetchLinks = useCallback(async () => {
    try {
      const response = await listLinks(id);
      setLinks(response.data || []);
    } catch (err) {
      console.error('Error fetching links:', err);
    }
  }, [id]);
  
  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    try {
      const response = await listReviews(id);
      setReviews(response.data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  }, [id]);
  
  // Initial load
  useEffect(() => {
    fetchRisk();
    fetchControls();
    fetchLinks();
    fetchReviews();
  }, [fetchRisk, fetchControls, fetchLinks, fetchReviews]);
  
  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);
  
  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };
  
  // Handle status change
  const handleStatusChange = async (data) => {
    try {
      setActionLoading(true);
      await changeRiskStatus(id, data.status, data.reason);
      await fetchRisk();
      setStatusModalOpen(false);
    } catch (err) {
      console.error('Error changing status:', err);
      alert(err.message || 'Failed to change status');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle delete risk
  const handleDeleteRisk = async () => {
    try {
      setActionLoading(true);
      await deleteRisk(id);
      navigate('/risks');
    } catch (err) {
      console.error('Error deleting risk:', err);
      alert(err.message || 'Failed to delete risk');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle add/edit control
  const handleSaveControl = async (data) => {
    try {
      setActionLoading(true);
      if (selectedControl) {
        await updateControl(id, selectedControl.id, data);
      } else {
        await addControl(id, data);
      }
      await fetchControls();
      setControlModalOpen(false);
      setSelectedControl(null);
    } catch (err) {
      console.error('Error saving control:', err);
      alert(err.message || 'Failed to save control');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle verify control
  const handleVerifyControl = async (data) => {
    try {
      setActionLoading(true);
      await verifyControl(id, data.control_id, {
        effectiveness: data.effectiveness,
        notes: data.notes
      });
      await fetchControls();
      setVerifyModalOpen(false);
      setSelectedControl(null);
    } catch (err) {
      console.error('Error verifying control:', err);
      alert(err.message || 'Failed to verify control');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle delete control
  const handleDeleteControl = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      await deleteControl(id, deleteTarget.id);
      await fetchControls();
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting control:', err);
      alert(err.message || 'Failed to delete control');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle add link
  const handleAddLink = async (data) => {
    try {
      setActionLoading(true);
      await createLink(id, data);
      await fetchLinks();
      setLinkModalOpen(false);
    } catch (err) {
      console.error('Error adding link:', err);
      alert(err.message || 'Failed to add link');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle unlink
  const handleUnlink = async (link) => {
    if (!confirm('Are you sure you want to unlink this entity?')) return;
    try {
      setActionLoading(true);
      await deleteLink(id, link.id);
      await fetchLinks();
    } catch (err) {
      console.error('Error unlinking:', err);
      alert(err.message || 'Failed to unlink entity');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle record review
  const handleRecordReview = async (data) => {
    try {
      setActionLoading(true);
      await recordReview(id, data);
      await fetchRisk();
      await fetchReviews();
      setReviewModalOpen(false);
    } catch (err) {
      console.error('Error recording review:', err);
      alert(err.message || 'Failed to record review');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Render loading
  if (loading) {
    return <LoadingState message="Loading risk details..." />;
  }
  
  // Render error
  if (error) {
    return <ErrorState message={error} onRetry={fetchRisk} />;
  }
  
  if (!risk) {
    return <ErrorState message="Risk not found" />;
  }
  
  return (
    <div className="risk-detail-page">
      {/* Header */}
      <div className="risk-detail-page__header">
        <button
          className="btn btn--ghost back-btn"
          onClick={() => navigate('/risks')}
        >
          ← Back to Register
        </button>
        
        <div className="risk-detail-page__title-row">
          <div className="risk-detail-page__title">
            <span className="risk-reference">{risk.reference}</span>
            <h1>{risk.title}</h1>
            <div className="risk-badges">
              <RiskStatusBadge status={risk.status} />
              <RiskLevelBadge
                level={risk.residual_level}
                score={risk.residual_score}
              />
            </div>
          </div>
          
          <div className="risk-detail-page__actions">
            {(canEdit || isOwner) && (
              <>
                <button
                  className="btn btn--secondary"
                  onClick={() => setReviewModalOpen(true)}
                ><span className="inline-icon"><AppIcon name="document" size={16} />Record Review</span></button>
                <button
                  className="btn btn--secondary"
                  onClick={() => setStatusModalOpen(true)}
                ><span className="inline-icon"><AppIcon name="refresh" size={16} />Change Status</span></button>
                <button
                  className="btn btn--primary"
                  onClick={() => navigate(`/risks/${id}/edit`)}
                >
                  Edit Risk
                </button>
              </>
            )}
            {canDelete && (
              <button
                className="btn btn--danger"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="risk-detail-page__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
            {tab.id === 'controls' && controls.length > 0 && (
              <span className="tab-count">{controls.length}</span>
            )}
            {tab.id === 'links' && links.length > 0 && (
              <span className="tab-count">{links.length}</span>
            )}
            {tab.id === 'reviews' && reviews.length > 0 && (
              <span className="tab-count">{reviews.length}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="risk-detail-page__content">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="tab-content tab-content--details">
            <div className="details-grid">
              {/* Score Cards */}
              <div className="score-cards-row">
                <RiskScoreCard
                  title="Inherent Risk"
                  score={risk.inherent_score}
                  level={risk.inherent_level}
                  likelihood={risk.inherent_likelihood}
                  impact={risk.inherent_impact}
                  rationale={risk.inherent_rationale}
                />
                <RiskScoreCard
                  title="Residual Risk"
                  score={risk.residual_score}
                  level={risk.residual_level}
                  likelihood={risk.residual_likelihood}
                  impact={risk.residual_impact}
                  rationale={risk.residual_rationale}
                />
              </div>
              
              {/* Details Section */}
              <div className="details-section">
                <h3>Risk Details</h3>
                <div className="details-fields">
                  <div className="detail-field">
                    <label>Category</label>
                    <span>{risk.category_name || 'Uncategorised'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Site</label>
                    <span>{risk.site_name || 'Enterprise-wide'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Owner</label>
                    <span>{risk.owner_name || 'Unassigned'}</span>
                  </div>
                  <div className="detail-field">
                    <label>Review Frequency</label>
                    <span style={{ textTransform: 'capitalize' }}>
                      {risk.review_frequency?.replace('_', ' ') || 'Not set'}
                    </span>
                  </div>
                  <div className="detail-field">
                    <label>Next Review Date</label>
                    <span className={isOverdue(risk.next_review_date) ? 'overdue' : ''}>
                      {risk.next_review_date
                        ? new Date(risk.next_review_date).toLocaleDateString()
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="detail-field">
                    <label>Last Reviewed</label>
                    <span>
                      {risk.last_review_date
                        ? new Date(risk.last_review_date).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div className="details-section details-section--full">
                <h3>Description</h3>
                <p className="description-text">
                  {risk.description || 'No description provided.'}
                </p>
              </div>
              
              {/* Hazard Info */}
              {(risk.hazard_source || risk.potential_consequences) && (
                <div className="details-section details-section--full">
                  <h3>Hazard Information</h3>
                  {risk.hazard_source && (
                    <div className="detail-field">
                      <label>Hazard Source</label>
                      <p>{risk.hazard_source}</p>
                    </div>
                  )}
                  {risk.potential_consequences && (
                    <div className="detail-field">
                      <label>Potential Consequences</label>
                      <p>{risk.potential_consequences}</p>
                    </div>
                  )}
                  {risk.affected_parties && (
                    <div className="detail-field">
                      <label>Affected Parties</label>
                      <p>{risk.affected_parties}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Controls Tab */}
        {activeTab === 'controls' && (
          <div className="tab-content tab-content--controls">
            <div className="tab-header">
              <h3>Controls ({controls.length})</h3>
              {(canEdit || isOwner) && (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    setSelectedControl(null);
                    setControlModalOpen(true);
                  }}
                >
                  + Add Control
                </button>
              )}
            </div>
            
            {controls.length === 0 ? (
              <div className="empty-tab">
                <p>No controls have been added to this risk.</p>
                {(canEdit || isOwner) && (
                  <button
                    className="btn btn--primary"
                    onClick={() => {
                      setSelectedControl(null);
                      setControlModalOpen(true);
                    }}
                  >
                    Add First Control
                  </button>
                )}
              </div>
            ) : (
              <div className="controls-list">
                {controls.map((control, index) => (
                  <ControlCard
                    key={control.id}
                    control={control}
                    index={index}
                    onEdit={() => {
                      setSelectedControl(control);
                      setControlModalOpen(true);
                    }}
                    onDelete={() => {
                      setDeleteTarget(control);
                      setDeleteModalOpen(true);
                    }}
                    onVerify={() => {
                      setSelectedControl(control);
                      setVerifyModalOpen(true);
                    }}
                    canEdit={canEdit || isOwner}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="tab-content tab-content--links">
            <div className="tab-header">
              <h3>Linked Entities ({links.length})</h3>
              {(canEdit || isOwner) && (
                <button
                  className="btn btn--primary"
                  onClick={() => setLinkModalOpen(true)}
                >
                  + Link Entity
                </button>
              )}
            </div>
            
            {links.length === 0 ? (
              <div className="empty-tab">
                <p>No entities have been linked to this risk.</p>
                {(canEdit || isOwner) && (
                  <button
                    className="btn btn--primary"
                    onClick={() => setLinkModalOpen(true)}
                  >
                    Link First Entity
                  </button>
                )}
              </div>
            ) : (
              <div className="links-list">
                {links.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onUnlink={handleUnlink}
                    canEdit={canEdit || isOwner}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="tab-content tab-content--reviews">
            <div className="tab-header">
              <h3>Review History ({reviews.length})</h3>
              {(canEdit || isOwner) && (
                <button
                  className="btn btn--primary"
                  onClick={() => setReviewModalOpen(true)}
                >
                  + Record Review
                </button>
              )}
            </div>
            
            {reviews.length === 0 ? (
              <div className="empty-tab">
                <p>No reviews have been recorded for this risk.</p>
                {(canEdit || isOwner) && (
                  <button
                    className="btn btn--primary"
                    onClick={() => setReviewModalOpen(true)}
                  >
                    Record First Review
                  </button>
                )}
              </div>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content tab-content--history">
            <div className="tab-header">
              <h3>Activity History</h3>
            </div>
            
            <div className="history-timeline">
              <div className="history-item">
                <div className="history-marker"></div>
                <div className="history-content">
                  <span className="history-date">
                    {new Date(risk.created_at).toLocaleDateString()}
                  </span>
                  <span className="history-action">
                    Risk created by {risk.created_by_name || 'System'}
                  </span>
                </div>
              </div>
              
              {risk.updated_at && risk.updated_at !== risk.created_at && (
                <div className="history-item">
                  <div className="history-marker"></div>
                  <div className="history-content">
                    <span className="history-date">
                      {new Date(risk.updated_at).toLocaleDateString()}
                    </span>
                    <span className="history-action">Risk last updated</span>
                  </div>
                </div>
              )}
              
              {reviews.map((review) => (
                <div key={review.id} className="history-item">
                  <div className="history-marker history-marker--review"></div>
                  <div className="history-content">
                    <span className="history-date">
                      {new Date(review.review_date).toLocaleDateString()}
                    </span>
                    <span className="history-action">
                      Review recorded: {review.outcome?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={handleRecordReview}
        risk={risk}
        controls={controls}
        isLoading={actionLoading}
      />
      
      <LinkEntityModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSubmit={handleAddLink}
        availableEntities={{}}
        isLoading={actionLoading}
      />
      
      <AddControlModal
        isOpen={controlModalOpen}
        onClose={() => {
          setControlModalOpen(false);
          setSelectedControl(null);
        }}
        onSubmit={handleSaveControl}
        control={selectedControl}
        users={[]}
        isLoading={actionLoading}
      />
      
      <VerifyControlModal
        isOpen={verifyModalOpen}
        onClose={() => {
          setVerifyModalOpen(false);
          setSelectedControl(null);
        }}
        onSubmit={handleVerifyControl}
        control={selectedControl}
        isLoading={actionLoading}
      />
      
      <ChangeStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onSubmit={handleStatusChange}
        currentStatus={risk.status}
        isLoading={actionLoading}
      />
      
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={deleteTarget ? handleDeleteControl : handleDeleteRisk}
        title={deleteTarget ? 'Delete Control' : 'Delete Risk'}
        message={
          deleteTarget
            ? 'Are you sure you want to delete this control?'
            : 'Are you sure you want to delete this risk? This will remove all associated controls, links, and reviews.'
        }
        itemName={deleteTarget?.description || risk.title}
        isLoading={actionLoading}
      />
    </div>
  );
};

// Helper
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default RiskDetailPage;


