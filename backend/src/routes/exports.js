const express = require('express');
const { query } = require('../config/db');
const { AppError } = require('../utils/appError');
const { requireManager } = require('../middleware/requireRole');
const { orgScopeMiddleware } = require('../middleware/orgScope');
const { generateReportPDF } = require('../utils/pdfGenerator');
const { sendEmail, isValidEmail, isSmtpConfigured } = require('../utils/emailSender');
const env = require('../config/env');

const router = express.Router();

// In-memory rate limit store (per-user)
// In production, use Redis for multi-instance deployments
const rateLimitStore = new Map();

/**
 * Rate limit middleware for exports
 * Limits to 1 export per EXPORT_RATE_LIMIT_SECONDS per user
 */
const exportRateLimit = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const windowMs = env.exportRateLimitSeconds * 1000;

  const lastExport = rateLimitStore.get(userId);

  if (lastExport && (now - lastExport) < windowMs) {
    const retryAfter = Math.ceil((windowMs - (now - lastExport)) / 1000);
    const resetTime = Math.ceil((lastExport + windowMs) / 1000);

    res.set({
      'Retry-After': retryAfter,
      'X-RateLimit-Limit': '1',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': resetTime
    });

    return next(new AppError(
      `Export rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
      429,
      'RATE_LIMITED'
    ));
  }

  // Update last export time
  rateLimitStore.set(userId, now);

  // Set rate limit headers
  const resetTime = Math.ceil((now + windowMs) / 1000);
  res.set({
    'X-RateLimit-Limit': '1',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': resetTime
  });

  return next();
};

/**
 * Helper to escape CSV values
 */
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Helper to format date for CSV
 */
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toISOString();
};

/**
 * Format date short (YYYY-MM-DD)
 */
const formatDateShort = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Format datetime short (YYYY-MM-DD HH:mm)
 */
const formatDateTimeShort = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.toISOString().split('T')[0]} ${d.toISOString().split('T')[1].substring(0, 5)}`;
};

/**
 * Parse date from query param
 */
const parseQueryDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'invalid';
  }
  return date;
};

/**
 * Generate filename for export (new format for emails)
 */
const generateFilename = (type, orgSlug, format = 'csv', forEmail = false) => {
  const now = new Date();
  if (forEmail) {
    const dateStr = now.toISOString().replace(/[-:]/g, '').substring(0, 13).replace('T', '_');
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    return `${typeName}_Report_${orgSlug}_${dateStr}.${format}`;
  }
  const date = now.toISOString().split('T')[0];
  return `${type}_${orgSlug}_${date}.${format}`;
};

/**
 * Stream CSV to response
 */
const streamCSV = (res, filename, headers, rows) => {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`
  });

  // Write CSV header
  res.write(headers.join(',') + '\n');

  // Write CSV rows
  for (const row of rows) {
    const csvRow = row.map(escapeCSV);
    res.write(csvRow.join(',') + '\n');
  }

  res.end();
};

/**
 * Stream enhanced PDF to response
 */
const streamPDF = (res, filename, options) => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`
  });

  const doc = generateReportPDF(options);
  doc.pipe(res);
  doc.end();
};

/**
 * Generate PDF buffer (for email attachments)
 */
const generatePDFBuffer = (options) => {
  return new Promise((resolve, reject) => {
    const doc = generateReportPDF(options);

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.end();
  });
};

/**
 * Get site name by ID for filter display
 */
const getSiteName = async (siteId, orgId) => {
  if (!siteId) return null;
  const result = await query(
    'SELECT name FROM sites WHERE id = $1 AND organisation_id = $2',
    [siteId, orgId]
  );
  return result.rows[0]?.name || null;
};

// Apply orgScope and requireManager middleware to all routes
router.use(orgScopeMiddleware);
router.use(requireManager);

// ============================================================================
// INCIDENTS EXPORT
// ============================================================================

/**
 * Fetch incidents data with filters
 */
const fetchIncidentsData = async (req) => {
  const { startDate, endDate, siteId, status, severity } = req.query;

  // Validate dates
  const start = parseQueryDate(startDate);
  const end = parseQueryDate(endDate);

  if (start === 'invalid' || end === 'invalid') {
    throw new AppError('Invalid date format. Use ISO 8601 (YYYY-MM-DD).', 400, 'INVALID_DATE');
  }

  // Build query
  const conditions = ['i.organisation_id = $1'];
  const values = [req.orgId];

  if (start) {
    values.push(start);
    conditions.push(`i.occurred_at >= $${values.length}`);
  }
  if (end) {
    values.push(end);
    conditions.push(`i.occurred_at <= $${values.length}`);
  }
  if (siteId) {
    values.push(siteId);
    conditions.push(`i.site_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`i.status = $${values.length}`);
  }
  if (severity) {
    values.push(severity);
    conditions.push(`i.severity = $${values.length}`);
  }

  // Count first to enforce row limit
  const countResult = await query(
    `SELECT COUNT(*) AS cnt FROM incidents i WHERE ${conditions.join(' AND ')}`,
    values
  );
  const rowCount = parseInt(countResult.rows[0].cnt, 10);

  if (rowCount > env.exportRowLimit) {
    throw new AppError(
      `Export exceeds ${env.exportRowLimit} row limit. Please refine your filters.`,
      400,
      'TOO_MANY_ROWS'
    );
  }

  // Fetch data with action count
  const result = await query(
    `SELECT i.id, i.title, i.occurred_at, s.name AS site_name,
            it.name AS incident_type, i.severity, i.status,
            u.name AS reported_by_name,
            (SELECT COUNT(*) FROM actions a WHERE a.source_type = 'incident' AND a.source_id = i.id) AS actions_count
     FROM incidents i
     JOIN incident_types it ON it.id = i.type_id
     JOIN sites s ON s.id = i.site_id
     JOIN users u ON u.id = i.reported_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY i.occurred_at DESC
     LIMIT ${env.exportRowLimit}`,
    values
  );

  // Get site name for filter display
  const siteName = siteId ? await getSiteName(siteId, req.orgId) : null;

  // Build filters object
  const filters = {
    startDate: start,
    endDate: end,
    siteId,
    siteName,
    status,
    severity
  };

  // Calculate summary statistics
  const summary = {
    byStatus: {},
    bySeverity: {}
  };
  result.rows.forEach(row => {
    summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
    summary.bySeverity[row.severity] = (summary.bySeverity[row.severity] || 0) + 1;
  });

  // PDF columns (compact)
  const pdfHeaders = [
    'ID', 'Title', 'Date & Time', 'Site', 'Type', 'Severity', 'Status', 'Reported By', 'Actions'
  ];

  const pdfColumnWidths = [8, 20, 12, 12, 12, 8, 10, 12, 6]; // percentages

  const pdfRows = result.rows.map(row => [
    row.id.substring(0, 8),
    row.title,
    formatDateTimeShort(row.occurred_at),
    row.site_name,
    row.incident_type,
    row.severity,
    row.status,
    row.reported_by_name,
    row.actions_count
  ]);

  // CSV columns (full detail)
  const csvHeaders = [
    'Incident ID', 'Title', 'Date & Time', 'Site', 'Type', 'Severity', 'Status', 'Reported By', 'Actions Count'
  ];

  const csvRows = result.rows.map(row => [
    row.id,
    row.title,
    formatDate(row.occurred_at),
    row.site_name,
    row.incident_type,
    row.severity,
    row.status,
    row.reported_by_name,
    row.actions_count
  ]);

  return {
    pdfHeaders,
    pdfColumnWidths,
    pdfRows,
    csvHeaders,
    csvRows,
    filters,
    summary,
    rawRows: result.rows
  };
};

/**
 * GET /api/exports/incidents
 * Export incidents to CSV or PDF
 */
router.get('/incidents', exportRateLimit, async (req, res, next) => {
  const format = (req.query.format || 'csv').toLowerCase();

  if (!['csv', 'pdf'].includes(format)) {
    return next(new AppError('Invalid format. Use csv or pdf.', 400, 'INVALID_FORMAT'));
  }

  try {
    const data = await fetchIncidentsData(req);
    const filename = generateFilename('incidents', req.organisation.slug, format);

    if (format === 'pdf') {
      return streamPDF(res, filename, {
        reportType: 'incidents',
        title: 'Incidents Report',
        organisation: req.organisation,
        filters: data.filters,
        headers: data.pdfHeaders,
        rows: data.pdfRows,
        columnWidths: data.pdfColumnWidths,
        summary: data.summary,
        uploadsDir: env.uploadsDir
      });
    }

    return streamCSV(res, filename, data.csvHeaders, data.csvRows);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/exports/incidents/email
 * Email incidents report as PDF attachment
 */
router.post('/incidents/email', exportRateLimit, async (req, res, next) => {
  const { toEmail, subject } = req.body;

  // Copy query params from body for filters
  req.query = { ...req.query, ...req.body };

  // Validate email
  if (!toEmail) {
    return next(new AppError('toEmail is required.', 400, 'VALIDATION_ERROR'));
  }

  if (!isValidEmail(toEmail)) {
    return next(new AppError('Invalid email address format.', 400, 'VALIDATION_ERROR'));
  }

  // Check SMTP configuration
  if (!isSmtpConfigured()) {
    return next(new AppError('Email service not configured. Contact administrator.', 503, 'SMTP_NOT_CONFIGURED'));
  }

  try {
    const data = await fetchIncidentsData(req);
    const filename = generateFilename('incidents', req.organisation.slug, 'pdf', true);

    const pdfBuffer = await generatePDFBuffer({
      reportType: 'incidents',
      title: 'Incidents Report',
      organisation: req.organisation,
      filters: data.filters,
      headers: data.pdfHeaders,
      rows: data.pdfRows,
      columnWidths: data.pdfColumnWidths,
      summary: data.summary,
      uploadsDir: env.uploadsDir
    });

    console.log('[Exports] PDF buffer generated, size:', pdfBuffer.length);

    const emailSubject = subject || `EHS Report - Incidents - ${req.organisation.name}`;
    const generatedAt = new Date().toISOString();

    console.log('[Exports] Sending email to:', toEmail, 'subject:', emailSubject);

    await sendEmail({
      to: toEmail,
      subject: emailSubject,
      text: `Attached is your Incidents report for ${req.organisation.name} generated on ${generatedAt} with the selected filters.\n\nTotal records: ${data.pdfRows.length}`,
      attachmentBuffer: pdfBuffer,
      attachmentFilename: filename
    });

    console.log('[Exports] Email sent successfully to:', toEmail);

    return res.json({
      success: true,
      message: `Report sent successfully to ${toEmail}`,
      data: {
        recipient: toEmail,
        filename,
        rowCount: data.pdfRows.length
      }
    });
  } catch (err) {
    console.error('[Exports] Email error:', err.message, err.stack);
    return next(err);
  }
});

// ============================================================================
// INSPECTIONS EXPORT
// ============================================================================

/**
 * Fetch inspections data with filters
 */
const fetchInspectionsData = async (req) => {
  const { startDate, endDate, siteId, result: resultFilter } = req.query;

  // Validate dates
  const start = parseQueryDate(startDate);
  const end = parseQueryDate(endDate);

  if (start === 'invalid' || end === 'invalid') {
    throw new AppError('Invalid date format. Use ISO 8601 (YYYY-MM-DD).', 400, 'INVALID_DATE');
  }

  // Build query
  const conditions = ['i.organisation_id = $1'];
  const values = [req.orgId];

  if (start) {
    values.push(start);
    conditions.push(`i.performed_at >= $${values.length}`);
  }
  if (end) {
    values.push(end);
    conditions.push(`i.performed_at <= $${values.length}`);
  }
  if (siteId) {
    values.push(siteId);
    conditions.push(`i.site_id = $${values.length}`);
  }
  if (resultFilter) {
    values.push(resultFilter);
    conditions.push(`i.overall_result = $${values.length}`);
  }

  // Count first to enforce row limit
  const countResult = await query(
    `SELECT COUNT(*) AS cnt FROM inspections i WHERE ${conditions.join(' AND ')}`,
    values
  );
  const rowCount = parseInt(countResult.rows[0].cnt, 10);

  if (rowCount > env.exportRowLimit) {
    throw new AppError(
      `Export exceeds ${env.exportRowLimit} row limit. Please refine your filters.`,
      400,
      'TOO_MANY_ROWS'
    );
  }

  // Fetch data with failed items count and action count
  const queryResult = await query(
    `SELECT i.id, i.performed_at, s.name AS site_name,
            t.name AS template_name, i.overall_result,
            u.name AS performed_by_name,
            (SELECT COUNT(*) FROM inspection_responses ir
             WHERE ir.inspection_id = i.id AND ir.result = 'not_ok') AS failed_items,
            (SELECT COUNT(*) FROM actions a WHERE a.source_type = 'inspection' AND a.source_id = i.id) AS actions_count
     FROM inspections i
     JOIN inspection_templates t ON t.id = i.template_id
     JOIN sites s ON s.id = i.site_id
     JOIN users u ON u.id = i.performed_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY i.performed_at DESC
     LIMIT ${env.exportRowLimit}`,
    values
  );

  // Get site name for filter display
  const siteName = siteId ? await getSiteName(siteId, req.orgId) : null;

  // Build filters object
  const filters = {
    startDate: start,
    endDate: end,
    siteId,
    siteName,
    result: resultFilter
  };

  // Calculate summary statistics
  let passCount = 0;
  let failCount = 0;
  queryResult.rows.forEach(row => {
    if (row.overall_result === 'pass') passCount++;
    else if (row.overall_result === 'fail') failCount++;
  });

  const summary = {
    total: queryResult.rows.length,
    pass: passCount,
    fail: failCount
  };

  // PDF columns
  const pdfHeaders = [
    'ID', 'Date', 'Site', 'Template', 'Result', 'Conducted By', 'Failed Items', 'Actions'
  ];

  const pdfColumnWidths = [10, 12, 15, 20, 8, 15, 10, 10];

  const pdfRows = queryResult.rows.map(row => [
    row.id.substring(0, 8),
    formatDateShort(row.performed_at),
    row.site_name,
    row.template_name,
    row.overall_result,
    row.performed_by_name,
    row.failed_items,
    row.actions_count
  ]);

  // CSV columns
  const csvHeaders = [
    'Inspection ID', 'Date', 'Site', 'Template', 'Result', 'Conducted By', 'Failed Items', 'Actions Count'
  ];

  const csvRows = queryResult.rows.map(row => [
    row.id,
    formatDate(row.performed_at),
    row.site_name,
    row.template_name,
    row.overall_result,
    row.performed_by_name,
    row.failed_items,
    row.actions_count
  ]);

  return {
    pdfHeaders,
    pdfColumnWidths,
    pdfRows,
    csvHeaders,
    csvRows,
    filters,
    summary,
    rawRows: queryResult.rows
  };
};

/**
 * GET /api/exports/inspections
 * Export inspections to CSV or PDF
 */
router.get('/inspections', exportRateLimit, async (req, res, next) => {
  const format = (req.query.format || 'csv').toLowerCase();

  if (!['csv', 'pdf'].includes(format)) {
    return next(new AppError('Invalid format. Use csv or pdf.', 400, 'INVALID_FORMAT'));
  }

  try {
    const data = await fetchInspectionsData(req);
    const filename = generateFilename('inspections', req.organisation.slug, format);

    if (format === 'pdf') {
      return streamPDF(res, filename, {
        reportType: 'inspections',
        title: 'Inspections Report',
        organisation: req.organisation,
        filters: data.filters,
        headers: data.pdfHeaders,
        rows: data.pdfRows,
        columnWidths: data.pdfColumnWidths,
        summary: data.summary,
        uploadsDir: env.uploadsDir
      });
    }

    return streamCSV(res, filename, data.csvHeaders, data.csvRows);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/exports/inspections/email
 * Email inspections report as PDF attachment
 */
router.post('/inspections/email', exportRateLimit, async (req, res, next) => {
  const { toEmail, subject } = req.body;

  // Copy query params from body for filters
  req.query = { ...req.query, ...req.body };

  // Validate email
  if (!toEmail) {
    return next(new AppError('toEmail is required.', 400, 'VALIDATION_ERROR'));
  }

  if (!isValidEmail(toEmail)) {
    return next(new AppError('Invalid email address format.', 400, 'VALIDATION_ERROR'));
  }

  // Check SMTP configuration
  if (!isSmtpConfigured()) {
    return next(new AppError('Email service not configured. Contact administrator.', 503, 'SMTP_NOT_CONFIGURED'));
  }

  try {
    const data = await fetchInspectionsData(req);
    const filename = generateFilename('inspections', req.organisation.slug, 'pdf', true);

    const pdfBuffer = await generatePDFBuffer({
      reportType: 'inspections',
      title: 'Inspections Report',
      organisation: req.organisation,
      filters: data.filters,
      headers: data.pdfHeaders,
      rows: data.pdfRows,
      columnWidths: data.pdfColumnWidths,
      summary: data.summary,
      uploadsDir: env.uploadsDir
    });

    console.log('[Exports] Inspections PDF buffer generated, size:', pdfBuffer.length);

    const emailSubject = subject || `EHS Report - Inspections - ${req.organisation.name}`;
    const generatedAt = new Date().toISOString();

    console.log('[Exports] Sending inspections email to:', toEmail);

    await sendEmail({
      to: toEmail,
      subject: emailSubject,
      text: `Attached is your Inspections report for ${req.organisation.name} generated on ${generatedAt} with the selected filters.\n\nTotal records: ${data.pdfRows.length}`,
      attachmentBuffer: pdfBuffer,
      attachmentFilename: filename
    });

    console.log('[Exports] Inspections email sent successfully');

    return res.json({
      success: true,
      message: `Report sent successfully to ${toEmail}`,
      data: {
        recipient: toEmail,
        filename,
        rowCount: data.pdfRows.length
      }
    });
  } catch (err) {
    console.error('[Exports] Inspections email error:', err.message, err.stack);
    return next(err);
  }
});

// ============================================================================
// ACTIONS EXPORT
// ============================================================================

/**
 * Fetch actions data with filters
 */
const fetchActionsData = async (req) => {
  const { startDate, endDate, status, dueBefore } = req.query;

  // Validate dates
  const start = parseQueryDate(startDate);
  const end = parseQueryDate(endDate);
  const dueBeforeDate = parseQueryDate(dueBefore);

  if (start === 'invalid' || end === 'invalid' || dueBeforeDate === 'invalid') {
    throw new AppError('Invalid date format. Use ISO 8601 (YYYY-MM-DD).', 400, 'INVALID_DATE');
  }

  // Build query
  const conditions = ['a.organisation_id = $1'];
  const values = [req.orgId];

  if (start) {
    values.push(start);
    conditions.push(`a.created_at >= $${values.length}`);
  }
  if (end) {
    values.push(end);
    conditions.push(`a.created_at <= $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`a.status = $${values.length}`);
  }
  if (dueBeforeDate) {
    values.push(dueBeforeDate);
    conditions.push(`a.due_date <= $${values.length}`);
  }

  // Count first to enforce row limit
  const countResult = await query(
    `SELECT COUNT(*) AS cnt FROM actions a WHERE ${conditions.join(' AND ')}`,
    values
  );
  const rowCount = parseInt(countResult.rows[0].cnt, 10);

  if (rowCount > env.exportRowLimit) {
    throw new AppError(
      `Export exceeds ${env.exportRowLimit} row limit. Please refine your filters.`,
      400,
      'TOO_MANY_ROWS'
    );
  }

  // Fetch data with source info and site
  const queryResult = await query(
    `SELECT a.id, a.title, a.source_type, a.source_id,
            CASE a.source_type
              WHEN 'incident' THEN (SELECT title FROM incidents WHERE id = a.source_id)
              WHEN 'inspection' THEN (SELECT t.name FROM inspections insp JOIN inspection_templates t ON t.id = insp.template_id WHERE insp.id = a.source_id)
              ELSE NULL
            END AS source_name,
            CASE a.source_type
              WHEN 'incident' THEN (SELECT s.name FROM incidents inc JOIN sites s ON s.id = inc.site_id WHERE inc.id = a.source_id)
              WHEN 'inspection' THEN (SELECT s.name FROM inspections insp JOIN sites s ON s.id = insp.site_id WHERE insp.id = a.source_id)
              ELSE NULL
            END AS site_name,
            assigned.name AS assigned_to_name,
            a.status, a.created_at, a.due_date
     FROM actions a
     LEFT JOIN users assigned ON assigned.id = a.assigned_to
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.created_at DESC
     LIMIT ${env.exportRowLimit}`,
    values
  );

  // Build filters object
  const filters = {
    startDate: start,
    endDate: end,
    status,
    dueBefore: dueBeforeDate
  };

  // Calculate summary statistics
  const summary = {
    byStatus: {}
  };
  queryResult.rows.forEach(row => {
    summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
  });

  // PDF columns
  const pdfHeaders = [
    'ID', 'Title', 'Source', 'Site', 'Assigned To', 'Status', 'Created', 'Due Date'
  ];

  const pdfColumnWidths = [8, 22, 18, 12, 12, 8, 10, 10];

  const pdfRows = queryResult.rows.map(row => {
    const sourceDisplay = row.source_type && row.source_id
      ? `${row.source_type.charAt(0).toUpperCase() + row.source_type.slice(1)} (${row.source_id.substring(0, 6)})`
      : '-';
    return [
      row.id.substring(0, 8),
      row.title,
      sourceDisplay,
      row.site_name || '-',
      row.assigned_to_name || '-',
      row.status,
      formatDateShort(row.created_at),
      formatDateShort(row.due_date)
    ];
  });

  // CSV columns
  const csvHeaders = [
    'Action ID', 'Title', 'Source Type', 'Source ID', 'Site', 'Assigned To', 'Status', 'Created Date', 'Due Date'
  ];

  const csvRows = queryResult.rows.map(row => [
    row.id,
    row.title,
    row.source_type,
    row.source_id,
    row.site_name || '',
    row.assigned_to_name || '',
    row.status,
    formatDate(row.created_at),
    row.due_date ? formatDateShort(row.due_date) : ''
  ]);

  return {
    pdfHeaders,
    pdfColumnWidths,
    pdfRows,
    csvHeaders,
    csvRows,
    filters,
    summary,
    rawRows: queryResult.rows
  };
};

/**
 * GET /api/exports/actions
 * Export actions to CSV or PDF
 */
router.get('/actions', exportRateLimit, async (req, res, next) => {
  const format = (req.query.format || 'csv').toLowerCase();

  if (!['csv', 'pdf'].includes(format)) {
    return next(new AppError('Invalid format. Use csv or pdf.', 400, 'INVALID_FORMAT'));
  }

  try {
    const data = await fetchActionsData(req);
    const filename = generateFilename('actions', req.organisation.slug, format);

    if (format === 'pdf') {
      return streamPDF(res, filename, {
        reportType: 'actions',
        title: 'Actions Report',
        organisation: req.organisation,
        filters: data.filters,
        headers: data.pdfHeaders,
        rows: data.pdfRows,
        columnWidths: data.pdfColumnWidths,
        summary: data.summary,
        uploadsDir: env.uploadsDir
      });
    }

    return streamCSV(res, filename, data.csvHeaders, data.csvRows);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/exports/actions/email
 * Email actions report as PDF attachment
 */
router.post('/actions/email', exportRateLimit, async (req, res, next) => {
  const { toEmail, subject } = req.body;

  // Copy query params from body for filters
  req.query = { ...req.query, ...req.body };

  // Validate email
  if (!toEmail) {
    return next(new AppError('toEmail is required.', 400, 'VALIDATION_ERROR'));
  }

  if (!isValidEmail(toEmail)) {
    return next(new AppError('Invalid email address format.', 400, 'VALIDATION_ERROR'));
  }

  // Check SMTP configuration
  if (!isSmtpConfigured()) {
    return next(new AppError('Email service not configured. Contact administrator.', 503, 'SMTP_NOT_CONFIGURED'));
  }

  try {
    const data = await fetchActionsData(req);
    const filename = generateFilename('actions', req.organisation.slug, 'pdf', true);

    const pdfBuffer = await generatePDFBuffer({
      reportType: 'actions',
      title: 'Actions Report',
      organisation: req.organisation,
      filters: data.filters,
      headers: data.pdfHeaders,
      rows: data.pdfRows,
      columnWidths: data.pdfColumnWidths,
      summary: data.summary,
      uploadsDir: env.uploadsDir
    });

    console.log('[Exports] Actions PDF buffer generated, size:', pdfBuffer.length);

    const emailSubject = subject || `EHS Report - Actions - ${req.organisation.name}`;
    const generatedAt = new Date().toISOString();

    console.log('[Exports] Sending actions email to:', toEmail);

    await sendEmail({
      to: toEmail,
      subject: emailSubject,
      text: `Attached is your Actions report for ${req.organisation.name} generated on ${generatedAt} with the selected filters.\n\nTotal records: ${data.pdfRows.length}`,
      attachmentBuffer: pdfBuffer,
      attachmentFilename: filename
    });

    console.log('[Exports] Actions email sent successfully');

    return res.json({
      success: true,
      message: `Report sent successfully to ${toEmail}`,
      data: {
        recipient: toEmail,
        filename,
        rowCount: data.pdfRows.length
      }
    });
  } catch (err) {
    console.error('[Exports] Actions email error:', err.message, err.stack);
    return next(err);
  }
});

// Export rate limit store for testing purposes
router._rateLimitStore = rateLimitStore;

module.exports = router;
