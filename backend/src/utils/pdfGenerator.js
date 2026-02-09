const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Colors
const COLORS = {
  primary: '#1c3a3b',
  secondary: '#f0b35d',
  headerBg: '#2c3e50',
  headerText: '#ffffff',
  rowEven: '#f8f9fa',
  rowOdd: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#dee2e6',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545'
};

/**
 * Format date/time with timezone
 */
const formatDateTime = (date, timezone = 'UTC') => {
  const d = date || new Date();
  const dateStr = d.toISOString().split('T')[0];
  const timeStr = d.toISOString().split('T')[1].substring(0, 5);
  return `${dateStr} ${timeStr} (${timezone})`;
};

/**
 * Format date for display (YYYY-MM-DD)
 */
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Build date range string with proper formatting
 * @param {Date|string|null} startDate - Start date
 * @param {Date|string|null} endDate - End date
 * @returns {string} Formatted date range string
 */
const buildDateRangeString = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `Date range: ${start} to ${end}`;
  } else if (start && !end) {
    return `Date range: ${start} onwards`;
  } else if (!start && end) {
    return `Date range: up to ${end}`;
  } else {
    return 'Date range: All';
  }
};

/**
 * Generate organisation initials from name
 */
const getInitials = (name) => {
  if (!name) return 'EHS';
  return name.split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 3)
    .toUpperCase();
};

/**
 * Generate a professional PDF report
 * @param {Object} options - PDF generation options
 * @param {string} options.reportType - 'incidents', 'inspections', or 'actions'
 * @param {string} options.title - Report title (e.g., "Incidents Report")
 * @param {Object} options.organisation - Organisation object with name, slug, logoUrl, settings
 * @param {Object} options.filters - Applied filters object
 * @param {string[]} options.headers - Column headers
 * @param {Array<Array>} options.rows - Data rows (array of arrays)
 * @param {number[]} options.columnWidths - Column widths as percentages (should sum to 100)
 * @param {Object} options.summary - Summary statistics object
 * @param {string} options.uploadsDir - Path to uploads directory for logo
 * @returns {PDFDocument} - PDF document stream
 */
const generateReportPDF = ({
  reportType,
  title,
  organisation,
  filters = {},
  headers,
  rows,
  columnWidths,
  summary = {},
  uploadsDir = 'uploads'
}) => {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margins: { top: 20, bottom: 40, left: 20, right: 20 },
    bufferPages: true // Enable page buffering for page numbers
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const pageHeight = doc.page.height;
  const marginLeft = doc.page.margins.left;
  const marginTop = doc.page.margins.top;
  const marginBottom = doc.page.margins.bottom;

  // Calculate column widths
  const numCols = headers.length;
  const defaultWidth = pageWidth / numCols;
  const colWidths = columnWidths
    ? columnWidths.map(w => (w / 100) * pageWidth)
    : headers.map(() => defaultWidth);

  const timezone = organisation?.settings?.timezone || 'UTC';
  const generatedAt = formatDateTime(new Date(), timezone);

  // Track current Y position
  let currentY = marginTop;

  // =========================================================================
  // HEADER SECTION
  // =========================================================================
  const drawHeader = () => {
    const headerStartY = marginTop;
    const logoSize = 40;

    // Left side: Logo or initials
    const logoPath = organisation?.logoUrl
      ? path.join(process.cwd(), uploadsDir, organisation.logoUrl.replace(/^\/uploads\//, ''))
      : null;

    let logoDrawn = false;
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, marginLeft, headerStartY, {
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize]
        });
        logoDrawn = true;
      } catch (e) {
        // Failed to load logo, use initials
      }
    }

    if (!logoDrawn) {
      // Draw initials box
      doc.fillColor(COLORS.primary)
        .roundedRect(marginLeft, headerStartY, logoSize, logoSize, 6)
        .fill();
      doc.fillColor(COLORS.secondary)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(getInitials(organisation?.name), marginLeft, headerStartY + 12, {
          width: logoSize,
          align: 'center'
        });
    }

    // Right side: Report info (right-aligned)
    const rightX = marginLeft + 60;
    const rightWidth = pageWidth - 60;

    doc.fillColor(COLORS.primary)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(title, rightX, headerStartY, { width: rightWidth, align: 'right' });

    doc.fillColor(COLORS.text)
      .fontSize(9)
      .font('Helvetica')
      .text(`Organisation: ${organisation?.name || 'Unknown'}`, rightX, headerStartY + 18, { width: rightWidth, align: 'right' })
      .text(`Generated: ${generatedAt}`, rightX, headerStartY + 30, { width: rightWidth, align: 'right' });

    // Horizontal rule
    const ruleY = headerStartY + logoSize + 8;
    doc.strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(marginLeft, ruleY)
      .lineTo(marginLeft + pageWidth, ruleY)
      .stroke();

    return ruleY + 10;
  };

  // =========================================================================
  // FILTERS SECTION
  // =========================================================================
  const drawFilters = (startY) => {
    doc.fillColor(COLORS.text)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Filters:', marginLeft, startY);

    let filterY = startY + 14;
    doc.font('Helvetica').fontSize(8);

    const filterLines = [];

    // Date range (always show)
    filterLines.push(buildDateRangeString(filters.startDate, filters.endDate));

    // Site filter (always show)
    if (filters.siteId && filters.siteName) {
      filterLines.push(`Site: ${filters.siteName}`);
    } else {
      filterLines.push('Site: All');
    }

    // Type-specific filters (always show with "All" default)
    if (reportType === 'incidents') {
      filterLines.push(`Status: ${filters.status || 'All'}`);
      filterLines.push(`Severity: ${filters.severity || 'All'}`);
    } else if (reportType === 'inspections') {
      filterLines.push(`Result: ${filters.result || 'All'}`);
    } else if (reportType === 'actions') {
      filterLines.push(`Status: ${filters.status || 'All'}`);
      if (filters.dueBefore) {
        filterLines.push(`Due before: ${formatDate(filters.dueBefore)}`);
      }
    }

    // Draw filter lines in columns (3 columns)
    const colWidth = pageWidth / 3;
    filterLines.forEach((line, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      doc.fillColor(COLORS.textLight)
        .text(line, marginLeft + (col * colWidth), filterY + (row * 12), { width: colWidth });
    });

    const numRows = Math.ceil(filterLines.length / 3);
    return filterY + (numRows * 12) + 12;
  };

  // =========================================================================
  // TABLE SECTION
  // =========================================================================
  const rowHeight = 18;
  const headerHeight = 22;
  const cellPadding = 3;
  const fontSize = 7;

  const drawTableHeader = (y) => {
    doc.fillColor(COLORS.headerBg)
      .rect(marginLeft, y, pageWidth, headerHeight)
      .fill();

    doc.fillColor(COLORS.headerText)
      .fontSize(fontSize)
      .font('Helvetica-Bold');

    let x = marginLeft + cellPadding;
    headers.forEach((header, i) => {
      doc.text(header, x, y + 6, {
        width: colWidths[i] - cellPadding * 2,
        height: headerHeight - 4,
        ellipsis: true
      });
      x += colWidths[i];
    });

    return y + headerHeight;
  };

  const drawTableRow = (row, y, isEven) => {
    // Row background
    doc.fillColor(isEven ? COLORS.rowEven : COLORS.rowOdd)
      .rect(marginLeft, y, pageWidth, rowHeight)
      .fill();

    // Row border
    doc.strokeColor(COLORS.border)
      .lineWidth(0.25)
      .moveTo(marginLeft, y + rowHeight)
      .lineTo(marginLeft + pageWidth, y + rowHeight)
      .stroke();

    doc.fillColor(COLORS.text)
      .fontSize(fontSize)
      .font('Helvetica');

    let x = marginLeft + cellPadding;
    row.forEach((cell, i) => {
      const cellText = cell !== null && cell !== undefined ? String(cell) : '';
      doc.text(cellText, x, y + 4, {
        width: colWidths[i] - cellPadding * 2,
        height: rowHeight - 4,
        ellipsis: true
      });
      x += colWidths[i];
    });

    return y + rowHeight;
  };

  // =========================================================================
  // SUMMARY SECTION
  // =========================================================================
  const drawSummary = (startY) => {
    doc.fillColor(COLORS.text)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Summary', marginLeft, startY);

    let summaryY = startY + 14;
    doc.fontSize(8).font('Helvetica');

    if (reportType === 'incidents') {
      // Status totals
      doc.fillColor(COLORS.textLight).text('By Status:', marginLeft, summaryY);
      summaryY += 11;
      const statusCounts = summary.byStatus || {};
      Object.entries(statusCounts).forEach(([status, count]) => {
        doc.fillColor(COLORS.text).text(`  ${status}: ${count}`, marginLeft, summaryY);
        summaryY += 10;
      });

      // Severity totals
      summaryY += 5;
      doc.fillColor(COLORS.textLight).text('By Severity:', marginLeft, summaryY);
      summaryY += 11;
      const severityCounts = summary.bySeverity || {};
      Object.entries(severityCounts).forEach(([severity, count]) => {
        doc.fillColor(COLORS.text).text(`  ${severity}: ${count}`, marginLeft, summaryY);
        summaryY += 10;
      });

    } else if (reportType === 'inspections') {
      doc.fillColor(COLORS.text)
        .text(`Total Inspections: ${summary.total || rows.length}`, marginLeft, summaryY);
      summaryY += 11;
      doc.text(`Pass: ${summary.pass || 0}`, marginLeft, summaryY);
      summaryY += 10;
      doc.text(`Fail: ${summary.fail || 0}`, marginLeft, summaryY);

    } else if (reportType === 'actions') {
      doc.fillColor(COLORS.textLight).text('By Status:', marginLeft, summaryY);
      summaryY += 11;
      const statusCounts = summary.byStatus || {};
      Object.entries(statusCounts).forEach(([status, count]) => {
        doc.fillColor(COLORS.text).text(`  ${status}: ${count}`, marginLeft, summaryY);
        summaryY += 10;
      });
    }

    doc.fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text(`Total Records: ${rows.length}`, marginLeft, summaryY + 10);

    return summaryY + 25;
  };

  // =========================================================================
  // FOOTER SECTION (drawn on each page after all content)
  // =========================================================================
  const drawFooter = (pageNum, totalPages) => {
    const footerY = pageHeight - marginBottom + 15;

    doc.fillColor(COLORS.textLight)
      .fontSize(7)
      .font('Helvetica')
      .text(`Generated by EHS Portal – ${organisation?.name || 'Unknown'}`, marginLeft, footerY)
      .text(`Page ${pageNum} of ${totalPages}`, marginLeft, footerY, {
        width: pageWidth,
        align: 'right'
      });
  };

  // =========================================================================
  // RENDER THE PDF
  // =========================================================================

  // First page header and filters
  currentY = drawHeader();
  currentY = drawFilters(currentY);

  // Draw table header
  currentY = drawTableHeader(currentY);

  // Draw table rows
  const contentEndY = pageHeight - marginBottom - 80; // Leave room for summary on last page

  rows.forEach((row, index) => {
    // Check if we need a new page (leave extra space on last few rows for summary)
    const isNearEnd = index >= rows.length - 5;
    const threshold = isNearEnd ? contentEndY - 100 : contentEndY;

    if (currentY + rowHeight > threshold) {
      doc.addPage();
      currentY = marginTop;
      currentY = drawHeader();
      currentY = drawTableHeader(currentY);
    }

    currentY = drawTableRow(row, currentY, index % 2 === 0);
  });

  // Draw summary on last page
  currentY += 15;
  if (currentY + 100 > pageHeight - marginBottom) {
    doc.addPage();
    currentY = marginTop;
    currentY = drawHeader();
  }
  drawSummary(currentY);

  // Add page numbers to all pages
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    drawFooter(i + 1, totalPages);
  }

  return doc;
};

/**
 * Legacy function for backwards compatibility
 */
const generateTablePDF = ({ title, orgName, headers, rows, columnWidths }) => {
  return generateReportPDF({
    reportType: 'generic',
    title,
    organisation: { name: orgName },
    headers,
    rows,
    columnWidths
  });
};

module.exports = {
  generateReportPDF,
  generateTablePDF,
  formatDateTime,
  formatDate,
  buildDateRangeString
};
