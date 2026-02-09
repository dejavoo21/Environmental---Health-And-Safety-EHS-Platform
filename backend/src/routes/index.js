const express = require('express');
const authRoutes = require('./auth');
const siteRoutes = require('./sites');
const incidentTypeRoutes = require('./incidentTypes');
const incidentRoutes = require('./incidents');
const inspectionTemplateRoutes = require('./inspectionTemplates');
const inspectionRoutes = require('./inspections');
const dashboardRoutes = require('./dashboard');
const actionRoutes = require('./actions');
const attachmentRoutes = require('./attachments');
const auditLogRoutes = require('./auditLogs');
const helpRoutes = require('./help');
const userRoutes = require('./users');
const safetyAdvisorRoutes = require('./safetyAdvisor');
const safetyAdminRoutes = require('./safetyAdmin');
// Phase 3 routes
const organisationRoutes = require('./organisation');
const orgUsersRoutes = require('./orgUsers');
const exportsRoutes = require('./exports');
// Phase 4 routes
const notificationRoutes = require('./notifications');
const preferencesRoutes = require('./preferences');
const adminRoutes = require('./admin');
// Phase 5 routes
const analyticsRoutes = require('./analytics');
// Phase 6 routes
const accessRequestRoutes = require('./accessRequests');
const securityRoutes = require('./security');
// Phase 8 routes
const trainingRoutes = require('./training');
// Phase 9 routes
const riskRoutes = require('./risks');
const riskCategoryRoutes = require('./riskCategories');
const riskSettingsRoutes = require('./riskSettings');
// Phase 10 routes
const ssoRoutes = require('./sso');
const integrationsRoutes = require('./integrations');
const publicApiRoutes = require('./publicApi');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sites', authMiddleware, siteRoutes);
router.use('/incident-types', authMiddleware, incidentTypeRoutes);
router.use('/incidents', authMiddleware, incidentRoutes);
router.use('/inspection-templates', authMiddleware, inspectionTemplateRoutes);
router.use('/inspections', authMiddleware, inspectionRoutes);
router.use('/actions', authMiddleware, actionRoutes);
router.use('/attachments', authMiddleware, attachmentRoutes);
router.use('/audit-logs', authMiddleware, auditLogRoutes);
router.use('/help', authMiddleware, helpRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/users', authMiddleware, userRoutes);
// Phase 3 routes
router.use('/organisation', authMiddleware, organisationRoutes);
router.use('/org-users', authMiddleware, orgUsersRoutes);
router.use('/exports', authMiddleware, exportsRoutes);
// Phase 4 routes
router.use('/notifications', authMiddleware, notificationRoutes);
router.use('/preferences', authMiddleware, preferencesRoutes);
router.use('/admin', authMiddleware, adminRoutes);
// Phase 5 routes
router.use('/analytics', authMiddleware, analyticsRoutes);
// Phase 6 routes (access-requests has mixed public/auth endpoints)
router.use('/access-requests', accessRequestRoutes);
// Security routes - uses users and admin paths (handled in security.js)
router.use('/', securityRoutes);
// Phase 8 routes
router.use('/training', trainingRoutes);
// Phase 9 routes
router.use('/risks', riskRoutes);
router.use('/risk-categories', riskCategoryRoutes);
router.use('/risk-settings', riskSettingsRoutes);
// Phase 10 routes
router.use('/auth/sso', ssoRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/public/v1', publicApiRoutes);
// Phase 11 routes
router.use('/safety-advisor', safetyAdvisorRoutes);
router.use('/safety-admin', safetyAdminRoutes);

module.exports = router;
