const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  port: process.env.PORT || 3001,
  databaseUrl: process.env.DATABASE_URL || '',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT || 5432),
  dbName: process.env.DB_NAME || 'ehs_portal',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres',
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // Uploads directory
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  // Email provider configuration - supports switching between 'gmail' and 'laflogroup'
  emailProvider: process.env.EMAIL_PROVIDER || 'gmail',
  // Gmail SMTP configuration
  gmailHost: process.env.GMAIL_HOST || 'smtp.gmail.com',
  gmailPort: Number(process.env.GMAIL_PORT || 587),
  gmailUser: process.env.GMAIL_USER || '',
  gmailPass: process.env.GMAIL_PASS || '',
  gmailFrom: process.env.GMAIL_FROM || 'noreply@ehs-portal.local',
  gmailSecure: process.env.GMAIL_SECURE === 'true',
  // LaFloGroup SMTP configuration (backup)
  lafloHost: process.env.LAFLO_HOST || '',
  lafloPort: Number(process.env.LAFLO_PORT || 465),
  lafloUser: process.env.LAFLO_USER || '',
  lafloPass: process.env.LAFLO_PASS || '',
  lafloFrom: process.env.LAFLO_FROM || 'noreply@ehs-portal.local',
  lafloSecure: process.env.LAFLO_SECURE === 'true',
  // Legacy SMTP (deprecated - kept for backward compatibility)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@ehs-portal.local',
  smtpSecure: process.env.SMTP_SECURE === 'true',
  // Phase 4 Notifications configuration
  notificationRetentionDays: Number(process.env.NOTIFICATION_RETENTION_DAYS || 90),
  digestDefaultTime: process.env.DIGEST_DEFAULT_TIME || '07:00',
  digestDefaultDayOfWeek: Number(process.env.DIGEST_DEFAULT_DAY_OF_WEEK || 1),
  escalationDefaultDays: Number(process.env.ESCALATION_DEFAULT_DAYS || 3),
  emailMaxRetryAttempts: Number(process.env.EMAIL_MAX_RETRY_ATTEMPTS || 3),
  // Job schedules (cron expressions)
  cronDailyDigest: process.env.CRON_DAILY_DIGEST || '0 7 * * *',
  cronWeeklyDigest: process.env.CRON_WEEKLY_DIGEST || '0 7 * * 1',
  cronEscalation: process.env.CRON_ESCALATION || '0 8 * * *',
  cronEmailRetry: process.env.CRON_EMAIL_RETRY || '*/15 * * * *',
  cronCleanup: process.env.CRON_CLEANUP || '0 2 * * *',
  // Feature flags
  jobsEnabled: process.env.JOBS_ENABLED !== 'false',
  // Phase 5 configuration
  phase5JobsEnabled: process.env.PHASE5_JOBS_ENABLED !== 'false',
  cronAnalyticsAggregation: process.env.CRON_ANALYTICS_AGGREGATION || '0 2 * * *',
  cronRiskScoreCalculation: process.env.CRON_RISK_SCORE_CALCULATION || '0 3 * * *',
  cronRiskHistoryCleanup: process.env.CRON_RISK_HISTORY_CLEANUP || '0 4 1 * *',
  riskHistoryRetentionDays: Number(process.env.RISK_HISTORY_RETENTION_DAYS || 365),
  riskScoringWindowDays: Number(process.env.RISK_SCORING_WINDOW_DAYS || 90),
  analyticsAggregationRetentionDays: Number(process.env.ANALYTICS_AGGREGATION_RETENTION_DAYS || 730),
  savedViewsMaxPerUser: Number(process.env.SAVED_VIEWS_MAX_PER_USER || 20),
  // Phase 6 Security configuration
  totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY || '',
  passwordResetExpiryMinutes: Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 30),
  accountLockoutMinutes: Number(process.env.ACCOUNT_LOCKOUT_MINUTES || 15),
  maxFailedLoginAttempts: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5),
  loginHistoryRetentionDays: Number(process.env.LOGIN_HISTORY_RETENTION_DAYS || 90),
  securityAuditRetentionDays: Number(process.env.SECURITY_AUDIT_RETENTION_DAYS || 730),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  // Phase 10 Integrations configuration
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  encryptionKey: process.env.ENCRYPTION_KEY || process.env.TOTP_ENCRYPTION_KEY || '',
  ssoStateExpiryMinutes: Number(process.env.SSO_STATE_EXPIRY_MINUTES || 10),
  apiKeyDefaultExpiryDays: Number(process.env.API_KEY_DEFAULT_EXPIRY_DAYS || 365),
  webhookTimeoutSeconds: Number(process.env.WEBHOOK_TIMEOUT_SECONDS || 30),
  webhookMaxRetries: Number(process.env.WEBHOOK_MAX_RETRIES || 5),
  webhookAutoDisableAfterFailures: Number(process.env.WEBHOOK_AUTO_DISABLE_AFTER_FAILURES || 10),
  integrationEventRetentionDays: Number(process.env.INTEGRATION_EVENT_RETENTION_DAYS || 90),
  cronWebhookDelivery: process.env.CRON_WEBHOOK_DELIVERY || '*/1 * * * *',
  cronWebhookRetry: process.env.CRON_WEBHOOK_RETRY || '*/5 * * * *',
  cronIntegrationEventCleanup: process.env.CRON_INTEGRATION_EVENT_CLEANUP || '0 3 * * *',
  phase10JobsEnabled: process.env.PHASE10_JOBS_ENABLED !== 'false',
  nodeEnv: process.env.NODE_ENV || 'development',
  // Phase 11 Weather configuration
  // Note: Base URL should NOT include /weather - just the API base path (e.g., https://api.openweathermap.org/data/2.5)
  weatherApiBaseUrl: process.env.WEATHER_API_BASE_URL || 'https://api.openweathermap.org/data/2.5',
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  weatherCacheTtlSeconds: Number(process.env.WEATHER_CACHE_TTL_SECONDS || 1800),
  weatherTimeoutMs: Number(process.env.WEATHER_TIMEOUT_MS || 5000)
};

// Log weather configuration status on startup
if (!env.weatherApiKey) {
  console.warn('[Config] WARNING: WEATHER_API_KEY is not set. Weather features will be unavailable.');
} else {
  console.log('[Config] Weather API configured with base URL:', env.weatherApiBaseUrl);
}

module.exports = env;
