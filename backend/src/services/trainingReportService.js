/**
 * TrainingReportService - Phase 8
 * Handles training reports, statistics, and exports
 */

const { query } = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Get training dashboard statistics
 */
const getDashboardStats = async (organisationId, options = {}) => {
  const { siteId, fromDate, toDate } = options;
  
  const dateCondition = fromDate && toDate 
    ? `AND comp.completion_date BETWEEN '${fromDate}' AND '${toDate}'`
    : '';
  
  const siteJoin = siteId 
    ? `JOIN users u ON comp.user_id = u.id AND u.site_id = ${siteId}`
    : '';
  
  // Overall completion stats
  const completionStats = await query(`
    SELECT 
      COUNT(*) as total_completions,
      COUNT(DISTINCT user_id) as users_trained,
      COUNT(DISTINCT course_id) as courses_completed,
      COUNT(*) FILTER (WHERE result = 'passed') as passed_count,
      COUNT(*) FILTER (WHERE result = 'failed') as failed_count
    FROM training_completions comp
    ${siteJoin}
    WHERE comp.organisation_id = $1 ${dateCondition}
  `, [organisationId]);
  
  // Session stats
  const sessionStats = await query(`
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_sessions,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_sessions
    FROM training_sessions
    WHERE organisation_id = $1
    ${siteId ? `AND site_id = ${siteId}` : ''}
  `, [organisationId]);
  
  // Assignment stats
  const assignmentStats = await query(`
    SELECT 
      COUNT(*) as total_assignments,
      COUNT(*) FILTER (WHERE status = 'assigned') as pending_assignments,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_assignments,
      COUNT(*) FILTER (WHERE status = 'assigned' AND due_date < CURRENT_DATE) as overdue_assignments
    FROM training_assignments
    WHERE organisation_id = $1
  `, [organisationId]);
  
  // Expiry stats
  const expiryStats = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE expires_at < CURRENT_DATE) as expired_count,
      COUNT(*) FILTER (WHERE expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_30_days,
      COUNT(*) FILTER (WHERE expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days') as expiring_90_days
    FROM training_completions
    WHERE organisation_id = $1
  `, [organisationId]);
  
  // Course popularity
  const popularCourses = await query(`
    SELECT c.id, c.code, c.title, COUNT(comp.id) as completion_count
    FROM training_courses c
    LEFT JOIN training_completions comp ON c.id = comp.course_id ${dateCondition.replace('comp.', '')}
    WHERE c.organisation_id = $1 AND c.status = 'active'
    GROUP BY c.id, c.code, c.title
    ORDER BY completion_count DESC
    LIMIT 10
  `, [organisationId]);
  
  // Monthly trend
  const monthlyTrend = await query(`
    SELECT 
      DATE_TRUNC('month', completion_date) as month,
      COUNT(*) as completions
    FROM training_completions
    WHERE organisation_id = $1 
    AND completion_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', completion_date)
    ORDER BY month
  `, [organisationId]);
  
  return {
    completions: {
      total: parseInt(completionStats.rows[0].total_completions, 10),
      usersTrained: parseInt(completionStats.rows[0].users_trained, 10),
      coursesCompleted: parseInt(completionStats.rows[0].courses_completed, 10),
      passRate: completionStats.rows[0].total_completions > 0
        ? Math.round((completionStats.rows[0].passed_count / completionStats.rows[0].total_completions) * 100)
        : 0
    },
    sessions: {
      total: parseInt(sessionStats.rows[0].total_sessions, 10),
      scheduled: parseInt(sessionStats.rows[0].scheduled_sessions, 10),
      completed: parseInt(sessionStats.rows[0].completed_sessions, 10),
      cancelled: parseInt(sessionStats.rows[0].cancelled_sessions, 10)
    },
    assignments: {
      total: parseInt(assignmentStats.rows[0].total_assignments, 10),
      pending: parseInt(assignmentStats.rows[0].pending_assignments, 10),
      completed: parseInt(assignmentStats.rows[0].completed_assignments, 10),
      overdue: parseInt(assignmentStats.rows[0].overdue_assignments, 10)
    },
    certifications: {
      expired: parseInt(expiryStats.rows[0].expired_count, 10),
      expiring30Days: parseInt(expiryStats.rows[0].expiring_30_days, 10),
      expiring90Days: parseInt(expiryStats.rows[0].expiring_90_days, 10)
    },
    popularCourses: popularCourses.rows.map(row => ({
      id: row.id,
      code: row.code,
      title: row.title,
      completionCount: parseInt(row.completion_count, 10)
    })),
    monthlyTrend: monthlyTrend.rows.map(row => ({
      month: row.month,
      completions: parseInt(row.completions, 10)
    }))
  };
};

/**
 * Generate training compliance report
 */
const generateComplianceReport = async (organisationId, options = {}) => {
  const { siteId, departmentId, roleId } = options;
  
  // Build user filter
  const conditions = ['u.organisation_id = $1', 'u.is_active = true'];
  const values = [organisationId];
  let paramIndex = 1;
  
  if (siteId) {
    paramIndex++;
    conditions.push(`u.site_id = $${paramIndex}`);
    values.push(siteId);
  }
  
  if (departmentId) {
    paramIndex++;
    conditions.push(`u.department_id = $${paramIndex}`);
    values.push(departmentId);
  }
  
  if (roleId) {
    paramIndex++;
    conditions.push(`u.role_id = $${paramIndex}`);
    values.push(roleId);
  }
  
  const result = await query(`
    WITH user_requirements AS (
      SELECT 
        u.id as user_id,
        u.full_name,
        u.email,
        s.name as site_name,
        d.name as department_name,
        r.name as role_name,
        c.id as course_id,
        c.code as course_code,
        c.title as course_title,
        c.is_mandatory
      FROM users u
      LEFT JOIN sites s ON u.site_id = s.id
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      CROSS JOIN training_courses c
      WHERE ${conditions.join(' AND ')}
      AND c.organisation_id = $1 AND c.status = 'active'
      AND (c.is_mandatory = true 
           OR EXISTS (SELECT 1 FROM training_role_requirements rr WHERE rr.role_id = u.role_id AND rr.course_id = c.id)
           OR EXISTS (SELECT 1 FROM training_site_requirements sr WHERE sr.site_id = u.site_id AND sr.course_id = c.id))
    ),
    user_completions AS (
      SELECT DISTINCT ON (user_id, course_id)
        user_id, course_id, completion_date, expires_at, result
      FROM training_completions
      WHERE organisation_id = $1
      ORDER BY user_id, course_id, completion_date DESC
    )
    SELECT 
      ur.*,
      uc.completion_date,
      uc.expires_at,
      uc.result,
      CASE 
        WHEN uc.completion_date IS NULL THEN 'missing'
        WHEN uc.expires_at < CURRENT_DATE THEN 'expired'
        WHEN uc.expires_at < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
        ELSE 'compliant'
      END as compliance_status
    FROM user_requirements ur
    LEFT JOIN user_completions uc ON ur.user_id = uc.user_id AND ur.course_id = uc.course_id
    ORDER BY ur.full_name, ur.course_title
  `, values);
  
  // Aggregate by user
  const userCompliance = {};
  for (const row of result.rows) {
    if (!userCompliance[row.user_id]) {
      userCompliance[row.user_id] = {
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        site: row.site_name,
        department: row.department_name,
        role: row.role_name,
        requirements: [],
        compliant: 0,
        missing: 0,
        expired: 0,
        expiringSoon: 0
      };
    }
    
    userCompliance[row.user_id].requirements.push({
      courseId: row.course_id,
      courseCode: row.course_code,
      courseTitle: row.course_title,
      isMandatory: row.is_mandatory,
      completionDate: row.completion_date,
      expiresAt: row.expires_at,
      status: row.compliance_status
    });
    
    switch (row.compliance_status) {
      case 'compliant': userCompliance[row.user_id].compliant++; break;
      case 'missing': userCompliance[row.user_id].missing++; break;
      case 'expired': userCompliance[row.user_id].expired++; break;
      case 'expiring_soon': userCompliance[row.user_id].expiringSoon++; break;
    }
  }
  
  // Calculate compliance percentage for each user
  const users = Object.values(userCompliance).map(user => ({
    ...user,
    totalRequired: user.requirements.length,
    compliancePercentage: user.requirements.length > 0
      ? Math.round((user.compliant / user.requirements.length) * 100)
      : 100
  }));
  
  // Calculate summary
  const summary = {
    totalUsers: users.length,
    fullyCompliant: users.filter(u => u.compliancePercentage === 100).length,
    partiallyCompliant: users.filter(u => u.compliancePercentage > 0 && u.compliancePercentage < 100).length,
    nonCompliant: users.filter(u => u.compliancePercentage === 0 && u.totalRequired > 0).length,
    averageCompliancePercentage: users.length > 0
      ? Math.round(users.reduce((sum, u) => sum + u.compliancePercentage, 0) / users.length)
      : 100,
    totalGaps: users.reduce((sum, u) => sum + u.missing + u.expired, 0)
  };
  
  return {
    reportType: 'training_compliance',
    generatedAt: new Date().toISOString(),
    filters: { siteId, departmentId, roleId },
    summary,
    users
  };
};

/**
 * Export training matrix to Excel
 */
const exportMatrixToExcel = async (organisationId, matrixData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  workbook.creator = 'EHS Portal';
  
  const sheet = workbook.addWorksheet('Training Matrix');
  
  // Header row - User info + course columns
  const headerRow = ['Name', 'Email', 'Site', 'Department', 'Role', 'Compliance %'];
  for (const course of matrixData.courses) {
    headerRow.push(course.title);
  }
  sheet.addRow(headerRow);
  
  // Style header
  const headerRowNum = sheet.getRow(1);
  headerRowNum.font = { bold: true };
  headerRowNum.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRowNum.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Data rows
  for (const userRow of matrixData.matrix) {
    const row = [
      userRow.user.fullName,
      userRow.user.email,
      userRow.user.site?.name || '',
      userRow.user.department?.name || '',
      userRow.user.role?.name || '',
      userRow.statistics.compliancePercentage
    ];
    
    // Add course statuses
    for (const course of matrixData.courses) {
      const userCourse = userRow.courses.find(c => c.courseId === course.id);
      if (userCourse) {
        row.push(userCourse.status === 'completed' ? '✓' : userCourse.status === 'expired' ? '⚠ Expired' : '✗');
      } else {
        row.push('N/A');
      }
    }
    
    const dataRow = sheet.addRow(row);
    
    // Color code compliance
    const complianceCell = dataRow.getCell(6);
    const percentage = userRow.statistics.compliancePercentage;
    if (percentage === 100) {
      complianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    } else if (percentage >= 75) {
      complianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    } else {
      complianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6B6B' } };
    }
  }
  
  // Auto-fit columns
  sheet.columns.forEach(column => {
    column.width = 15;
  });
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 30;
  
  return workbook;
};

/**
 * Export completions to Excel
 */
const exportCompletionsToExcel = async (organisationId, completions) => {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Training Completions');
  
  sheet.columns = [
    { header: 'User Name', key: 'userName', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Course Code', key: 'courseCode', width: 15 },
    { header: 'Course Title', key: 'courseTitle', width: 35 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Completion Date', key: 'completionDate', width: 15 },
    { header: 'Result', key: 'result', width: 12 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Expires', key: 'expiresAt', width: 15 },
    { header: 'Status', key: 'status', width: 15 }
  ];
  
  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  for (const comp of completions) {
    let status = 'Valid';
    if (comp.isExpired) status = 'Expired';
    else if (comp.expiresAt && new Date(comp.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      status = 'Expiring Soon';
    }
    
    sheet.addRow({
      userName: comp.user.fullName,
      email: comp.user.email,
      courseCode: comp.course.code,
      courseTitle: comp.course.title,
      category: comp.course.categoryName,
      completionDate: comp.completionDate ? new Date(comp.completionDate).toLocaleDateString() : '',
      result: comp.result,
      score: comp.score,
      expiresAt: comp.expiresAt ? new Date(comp.expiresAt).toLocaleDateString() : 'N/A',
      status
    });
  }
  
  return workbook;
};

/**
 * Generate training report PDF
 */
const generateReportPDF = async (reportData) => {
  const doc = new PDFDocument({ margin: 50 });
  
  // Title
  doc.fontSize(20).text('Training Compliance Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);
  
  // Summary
  doc.fontSize(14).text('Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Total Users: ${reportData.summary.totalUsers}`);
  doc.text(`Fully Compliant: ${reportData.summary.fullyCompliant} (${Math.round(reportData.summary.fullyCompliant / reportData.summary.totalUsers * 100)}%)`);
  doc.text(`Average Compliance: ${reportData.summary.averageCompliancePercentage}%`);
  doc.text(`Total Training Gaps: ${reportData.summary.totalGaps}`);
  doc.moveDown(2);
  
  // User details (top 20 with lowest compliance)
  doc.fontSize(14).text('Users Requiring Attention', { underline: true });
  doc.moveDown(0.5);
  
  const usersNeedingAttention = reportData.users
    .filter(u => u.compliancePercentage < 100)
    .sort((a, b) => a.compliancePercentage - b.compliancePercentage)
    .slice(0, 20);
  
  for (const user of usersNeedingAttention) {
    doc.fontSize(10);
    doc.text(`${user.fullName} - ${user.compliancePercentage}% compliant`);
    doc.fontSize(9).fillColor('gray');
    doc.text(`  Missing: ${user.missing}, Expired: ${user.expired}`, { indent: 20 });
    doc.fillColor('black');
  }
  
  return doc;
};

module.exports = {
  getDashboardStats,
  generateComplianceReport,
  exportMatrixToExcel,
  exportCompletionsToExcel,
  generateReportPDF
};
