import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { EmptyState, ErrorState, LoadingState } from './States';

// P2-J5, P2-J6, P2-J7: Attachments for incidents, inspections, actions
const AttachmentsPanel = ({ entityType, entityId }) => {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const loadAttachments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/attachments', {
        params: { entityType, entityId }
      });
      setAttachments(res.data.attachments || []);
    } catch (err) {
      setError('Unable to load attachments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      loadAttachments();
    }
  }, [entityType, entityId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds max size (10MB).');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('file', file);

      await api.post('/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await loadAttachments();
    } catch (err) {
      if (err.response?.status === 413) {
        setUploadError('File exceeds max size (10MB).');
      } else if (err.response?.status === 415) {
        setUploadError('File type not allowed. Use images, PDFs, or Office documents.');
      } else if (err.response?.status === 403) {
        setUploadError('You do not have permission to upload here.');
      } else {
        setUploadError('Failed to upload file.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const res = await api.get(`/attachments/${attachment.id}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Unable to download file.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="card panel">
      <div className="panel-header">
        <h3>Attachments</h3>
        <div className="upload-control">
          <input
            ref={fileInputRef}
            type="file"
            id={`file-upload-${entityType}-${entityId}`}
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <label
            htmlFor={`file-upload-${entityType}-${entityId}`}
            className={`btn ${uploading ? 'ghost' : 'primary'}`}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </label>
        </div>
      </div>

      {uploadError && (
        <div className="upload-error">{uploadError}</div>
      )}

      <div className="panel-content">
        {loading && <LoadingState message="Loading attachments..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && attachments.length === 0 && (
          <EmptyState message="No attachments yet." />
        )}
        {!loading && !error && attachments.length > 0 && (
          <div className="attachments-list">
            {attachments.map((att) => (
              <div key={att.id} className="attachment-item">
                <div className="attachment-info">
                  <div className="attachment-name">{att.filename}</div>
                  <div className="attachment-meta">
                    {formatFileSize(att.fileSize)} - Uploaded by{' '}
                    {att.uploadedBy?.firstName} {att.uploadedBy?.lastName} on{' '}
                    {formatDate(att.uploadedAt)}
                  </div>
                </div>
                <button
                  className="btn ghost"
                  onClick={() => handleDownload(att)}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentsPanel;
