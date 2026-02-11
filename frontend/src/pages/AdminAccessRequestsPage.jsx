import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' }
];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const AdminAccessRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalType, setModalType] = useState(null); // 'approve' | 'reject' | 'view'
  const [modalData, setModalData] = useState({ role: '', siteIds: [], notes: '', reason: '', sendEmail: true });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch access requests
  const fetchRequests = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/access-requests/admin', {
        params: { status: statusFilter, page, limit: 20 }
      });
      setRequests(response.data.data);
      setPagination(response.data.pagination);
      setCounts(response.data.counts || {});
    } catch (err) {
      console.error('Failed to fetch access requests:', err);
      setError(err.response?.data?.message || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  const openModal = (request, type) => {
    setSelectedRequest(request);
    setModalType(type);
    setModalData({
      role: request.requestedRole || 'worker',
      siteIds: [],
      notes: '',
      reason: '',
      sendEmail: true
    });
    setModalError('');
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalType(null);
    setModalData({ role: '', siteIds: [], notes: '', reason: '', sendEmail: true });
    setModalError('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setModalLoading(true);
    setModalError('');
    try {
      await api.post(`/access-requests/admin/${selectedRequest.id}/approve`, {
        assignedRole: modalData.role,
        sendWelcomeEmail: true
      });
      closeModal();
      fetchRequests(pagination.page);
    } catch (err) {
      console.error('Approve error:', err);
      setModalError(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setModalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setModalLoading(true);
    setModalError('');
    try {
      await api.post(`/access-requests/admin/${selectedRequest.id}/reject`, {
        reason: modalData.reason.trim() || undefined,
        sendEmail: modalData.sendEmail
      });
      closeModal();
      fetchRequests(pagination.page);
    } catch (err) {
      console.error('Reject error:', err);
      setModalError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      pending: 'badge warning',
      approved: 'badge success',
      rejected: 'badge error',
      expired: 'badge muted'
    };
    return <span className={classes[status] || 'badge'}>{status}</span>;
  };

  return (
    <div className="admin-page" data-testid="admin-access-requests-page">
      <div className="page-header">
        <h1>Access Requests</h1>
        <p>Review and manage access requests from new users.</p>
      </div>

      {/* Counts summary */}
      <div className="counts-bar">
        <div className="count-item pending">
          <span className="count-value">{counts.pending || 0}</span>
          <span className="count-label">Awaiting Review</span>
        </div>
        <div className="count-item approved">
          <span className="count-value">{counts.approved || 0}</span>
          <span className="count-label">User Approved</span>
        </div>
        <div className="count-item rejected">
          <span className="count-value">{counts.rejected || 0}</span>
          <span className="count-label">User Rejected</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <label className="filter-field">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="status-filter"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-banner" role="alert">{error}</div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading-state">Loading access requests...</div>
      )}

      {/* Empty state */}
      {!loading && !error && requests.length === 0 && (
        <div className="empty-state">
          <p>No access requests found.</p>
        </div>
      )}

      {/* Requests table */}
      {!loading && requests.length > 0 && (
        <>
          <table className="data-table" data-testid="requests-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td><code>{req.referenceNumber}</code></td>
                  <td>{req.fullName}</td>
                  <td>{req.email}</td>
                  <td className="capitalize">{req.requestedRole}</td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td>{formatDate(req.createdAt)}</td>
                  <td>
                    <div className="action-btns">
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => openModal(req, 'view')}
                      >
                        View
                      </button>
                      {req.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="btn small success"
                            onClick={() => openModal(req, 'approve')}
                            data-testid={`approve-${req.id}`}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn small error"
                            onClick={() => openModal(req, 'reject')}
                            data-testid={`reject-${req.id}`}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <span>
                Showing {(pagination.page - 1) * 20 + 1}-{Math.min(pagination.page * 20, pagination.total)} of {pagination.total}
              </span>
              <div className="pagination-btns">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRequests(pagination.page - 1)}
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchRequests(pagination.page + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selectedRequest && modalType && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} data-testid="request-modal">
            {modalType === 'view' && (
              <>
                <div className="modal-header">
                  <h2>Access Request Details</h2>
                  <button type="button" className="close-btn" onClick={closeModal}>×</button>
                </div>
                <div className="modal-body">
                  <dl className="detail-list">
                    <dt>Reference</dt>
                    <dd><code>{selectedRequest.referenceNumber}</code></dd>
                    <dt>Full Name</dt>
                    <dd>{selectedRequest.fullName}</dd>
                    <dt>Email</dt>
                    <dd>{selectedRequest.email}</dd>
                    <dt>Requested Role</dt>
                    <dd className="capitalize">{selectedRequest.requestedRole}</dd>
                    <dt>Reason</dt>
                    <dd>{selectedRequest.reason || '-'}</dd>
                    <dt>Status</dt>
                    <dd>{getStatusBadge(selectedRequest.status)}</dd>
                    <dt>Submitted</dt>
                    <dd>{formatDate(selectedRequest.createdAt)}</dd>
                    <dt>Expires</dt>
                    <dd>{formatDate(selectedRequest.expiresAt)}</dd>
                  </dl>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={closeModal}>Close</button>
                </div>
              </>
            )}

            {modalType === 'approve' && (
              <>
                <div className="modal-header">
                  <h2>Approve Access Request</h2>
                  <button type="button" className="close-btn" onClick={closeModal}>×</button>
                </div>
                <div className="modal-body">
                  <p>
                    Approve access for <strong>{selectedRequest.fullName}</strong> ({selectedRequest.email})?
                  </p>

                  <label className="field">
                    <span>Role</span>
                    <select
                      value={modalData.role}
                      onChange={(e) => setModalData((p) => ({ ...p, role: e.target.value }))}
                    >
                      <option value="worker">Worker</option>
                      <option value="manager">Manager</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Notes (internal)</span>
                    <textarea
                      value={modalData.notes}
                      onChange={(e) => setModalData((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional internal notes"
                      rows={2}
                    />
                  </label>

                  {modalError && (
                    <div className="error-text" role="alert">{modalError}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={closeModal} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleApprove}
                    disabled={modalLoading}
                    data-testid="confirm-approve-btn"
                  >
                    {modalLoading ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </>
            )}

            {modalType === 'reject' && (
              <>
                <div className="modal-header">
                  <h2>Reject Access Request</h2>
                  <button type="button" className="close-btn" onClick={closeModal}>×</button>
                </div>
                <div className="modal-body">
                  <p>
                    Reject access request from <strong>{selectedRequest.fullName}</strong> ({selectedRequest.email})?
                  </p>

                  <label className="field">
                    <span>Reason (internal)</span>
                    <textarea
                      value={modalData.reason}
                      onChange={(e) => setModalData((p) => ({ ...p, reason: e.target.value }))}
                      placeholder="Optional internal reason"
                      rows={2}
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={modalData.sendEmail}
                      onChange={(e) => setModalData((p) => ({ ...p, sendEmail: e.target.checked }))}
                    />
                    <span>Send polite rejection email to applicant</span>
                  </label>

                  {modalError && (
                    <div className="error-text" role="alert">{modalError}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={closeModal} disabled={modalLoading}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn error"
                    onClick={handleReject}
                    disabled={modalLoading}
                    data-testid="confirm-reject-btn"
                  >
                    {modalLoading ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccessRequestsPage;
