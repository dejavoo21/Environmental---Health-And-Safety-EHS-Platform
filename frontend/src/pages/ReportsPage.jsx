import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { LoadingState } from '../components/States';
import EmailReportModal from '../components/EmailReportModal';

// Export Panel Component
const ExportPanel = ({
  title,
  endpoint,
  reportType,
  filters,
  rateLimitCooldown,
  onRateLimitHit,
  onExportStart,
  onExportEnd
}) => {
  const [filterValues, setFilterValues] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rowLimitError, setRowLimitError] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const handleFilterChange = (field, value) => {
    setFilterValues((prev) => ({ ...prev, [field]: value }));
  };

  const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    return params.toString();
  };

  const handleExport = async (format = 'csv') => {
    if (rateLimitCooldown > 0) return;

    const isPdf = format === 'pdf';
    if (isPdf) {
      setExportingPdf(true);
    } else {
      setExporting(true);
    }
    setError('');
    setSuccessMessage('');
    setRowLimitError(false);
    onExportStart();

    try {
      const queryString = buildQueryString();
      const url = queryString
        ? `${endpoint}?${queryString}&format=${format}`
        : `${endpoint}?format=${format}`;

      const response = await api.get(url, { responseType: 'blob' });

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `export_${Date.now()}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      if (err.response?.status === 429) {
        // Rate limited
        const retryAfter = parseInt(err.response.headers['retry-after'] || '30', 10);
        onRateLimitHit(retryAfter);
        setError(`Export rate limit reached. Please wait ${retryAfter} seconds.`);
      } else if (err.response?.status === 400) {
        // Check if row limit error
        const blob = err.response.data;
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          if (json.code === 'TOO_MANY_ROWS') {
            setRowLimitError(true);
          } else {
            setError(json.error || 'Export failed');
          }
        } catch {
          setError('Export failed');
        }
      } else {
        setError('Export failed. Please try again.');
      }
    } finally {
      if (isPdf) {
        setExportingPdf(false);
      } else {
        setExporting(false);
      }
      onExportEnd();
    }
  };

  const handleEmailSend = async ({ toEmail, subject }) => {
    if (rateLimitCooldown > 0) return;

    setSendingEmail(true);
    setError('');
    setSuccessMessage('');
    setRowLimitError(false);
    onExportStart();

    try {
      const response = await api.post(`${endpoint}/email`, {
        toEmail,
        subject,
        ...filterValues
      });

      if (response.data.success) {
        setSuccessMessage(`Report sent successfully to ${toEmail}`);
        setEmailModalOpen(false);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response.headers['retry-after'] || '30', 10);
        onRateLimitHit(retryAfter);
        setError(`Rate limit reached. Please wait ${retryAfter} seconds.`);
      } else if (err.response?.status === 400) {
        const errorData = err.response.data;
        if (errorData.code === 'TOO_MANY_ROWS') {
          setRowLimitError(true);
        } else {
          setError(errorData.error || 'Failed to send email');
        }
      } else if (err.response?.status === 503) {
        setError('Email service not configured. Contact administrator.');
      } else {
        setError('Failed to send email. Please try again.');
      }
    } finally {
      setSendingEmail(false);
      onExportEnd();
    }
  };

  const isDisabled = exporting || exportingPdf || sendingEmail || rateLimitCooldown > 0;

  return (
    <div className="card export-section">
      <h3>{title}</h3>
      <div className="export-filters">
        {filters.map((filter) => (
          <label key={filter.field}>
            {filter.label}
            {filter.type === 'select' ? (
              <select
                value={filterValues[filter.field] || ''}
                onChange={(e) => handleFilterChange(filter.field, e.target.value)}
              >
                <option value="">{filter.placeholder || 'All'}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                value={filterValues[filter.field] || ''}
                onChange={(e) => handleFilterChange(filter.field, e.target.value)}
              />
            ) : (
              <input
                type={filter.type || 'text'}
                value={filterValues[filter.field] || ''}
                onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                placeholder={filter.placeholder}
              />
            )}
          </label>
        ))}
      </div>

      {error && !rowLimitError && (
        <div className="form-error">{error}</div>
      )}

      {successMessage && (
        <div className="form-success">{successMessage}</div>
      )}

      {rowLimitError && (
        <div className="row-limit-error">
          <h4>Export Too Large</h4>
          <p>Your export exceeds the 10,000 row limit.</p>
          <p>Please refine your filters:</p>
          <ul>
            <li>Use a shorter date range</li>
            <li>Filter by specific site</li>
            <li>Filter by status or severity</li>
          </ul>
        </div>
      )}

      <div className="export-actions">
        <button
          className="btn primary export-btn"
          onClick={() => handleExport('csv')}
          disabled={isDisabled}
        >
          {exporting ? 'Exporting...' : rateLimitCooldown > 0 ? `Wait ${rateLimitCooldown}s` : 'Export CSV'}
        </button>
        <button
          className="btn secondary export-btn"
          onClick={() => handleExport('pdf')}
          disabled={isDisabled}
        >
          {exportingPdf ? 'Exporting...' : 'Export PDF'}
        </button>
        <button
          className="btn outline export-btn"
          onClick={() => setEmailModalOpen(true)}
          disabled={isDisabled}
        >
          Email Report
        </button>
      </div>

      <EmailReportModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleEmailSend}
        reportType={reportType}
        sending={sendingEmail}
      />
    </div>
  );
};

// Main Reports Page
const ReportsPage = () => {
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [exportsInProgress, setExportsInProgress] = useState(0);

  // Load sites for filter dropdowns
  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await api.get('/sites');
        setSites(res.data.sites || []);
      } catch {
        // Silently fail - filters will work without site list
      } finally {
        setLoadingSites(false);
      }
    };
    loadSites();
  }, []);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;

    const timer = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCooldown]);

  const handleRateLimitHit = useCallback((seconds) => {
    setRateLimitCooldown(seconds);
  }, []);

  const handleExportStart = useCallback(() => {
    setExportsInProgress((prev) => prev + 1);
  }, []);

  const handleExportEnd = useCallback(() => {
    setExportsInProgress((prev) => Math.max(0, prev - 1));
  }, []);

  const siteOptions = sites.map((s) => ({ value: s.id, label: s.name }));

  // Filter configurations for each export type
  const incidentFilters = [
    { field: 'startDate', label: 'From Date', type: 'date' },
    { field: 'endDate', label: 'To Date', type: 'date' },
    { field: 'siteId', label: 'Site', type: 'select', options: siteOptions },
    {
      field: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'under_investigation', label: 'Under Investigation' },
        { value: 'closed', label: 'Closed' }
      ]
    },
    {
      field: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' }
      ]
    }
  ];

  const inspectionFilters = [
    { field: 'startDate', label: 'From Date', type: 'date' },
    { field: 'endDate', label: 'To Date', type: 'date' },
    { field: 'siteId', label: 'Site', type: 'select', options: siteOptions },
    {
      field: 'result',
      label: 'Result',
      type: 'select',
      options: [
        { value: 'pass', label: 'Pass' },
        { value: 'fail', label: 'Fail' }
      ]
    }
  ];

  const actionFilters = [
    { field: 'startDate', label: 'Created From', type: 'date' },
    { field: 'endDate', label: 'Created To', type: 'date' },
    {
      field: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'done', label: 'Done' },
        { value: 'overdue', label: 'Overdue' }
      ]
    },
    { field: 'dueBefore', label: 'Due Before', type: 'date' }
  ];

  if (loadingSites) {
    return <LoadingState message="Loading reports..." />;
  }

  return (
    <div className="page reports-page">
      <h1>Reports & Exports</h1>
      <p className="reports-intro">
        Export your data to CSV or PDF format for reporting and analysis, or email reports directly.
      </p>

      {rateLimitCooldown > 0 && (
        <div className="rate-limit-notice">
          ⏳ Export rate limit reached. Please wait {rateLimitCooldown} seconds before exporting again.
        </div>
      )}

      <ExportPanel
        title="Export Incidents"
        endpoint="/exports/incidents"
        reportType="Incidents"
        filters={incidentFilters}
        rateLimitCooldown={rateLimitCooldown}
        onRateLimitHit={handleRateLimitHit}
        onExportStart={handleExportStart}
        onExportEnd={handleExportEnd}
      />

      <ExportPanel
        title="Export Inspections"
        endpoint="/exports/inspections"
        reportType="Inspections"
        filters={inspectionFilters}
        rateLimitCooldown={rateLimitCooldown}
        onRateLimitHit={handleRateLimitHit}
        onExportStart={handleExportStart}
        onExportEnd={handleExportEnd}
      />

      <ExportPanel
        title="Export Actions"
        endpoint="/exports/actions"
        reportType="Actions"
        filters={actionFilters}
        rateLimitCooldown={rateLimitCooldown}
        onRateLimitHit={handleRateLimitHit}
        onExportStart={handleExportStart}
        onExportEnd={handleExportEnd}
      />

      <p className="export-hint">
        💡 Exports are limited to 10,000 rows. Use filters to narrow down your data if needed.
      </p>
    </div>
  );
};

export default ReportsPage;
