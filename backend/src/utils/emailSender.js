const nodemailer = require('nodemailer');
const env = require('../config/env');

// Singleton transporter
let transporter = null;
let currentProvider = null;

/**
 * Get SMTP config based on selected provider
 * @returns {Object|null} - SMTP configuration or null if not configured
 */
const getSmtpConfig = () => {
  const provider = env.emailProvider || 'gmail';
  
  if (provider === 'gmail') {
    return {
      host: env.gmailHost,
      port: env.gmailPort,
      secure: env.gmailSecure,
      auth: env.gmailUser ? {
        user: env.gmailUser,
        pass: env.gmailPass
      } : undefined,
      from: env.gmailFrom
    };
  } else if (provider === 'laflogroup') {
    return {
      host: env.lafloHost,
      port: env.lafloPort,
      secure: env.lafloSecure,
      auth: env.lafloUser ? {
        user: env.lafloUser,
        pass: env.lafloPass
      } : undefined,
      from: env.lafloFrom
    };
  }
  
  // Fallback to legacy SMTP config for backward compatibility
  return {
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? {
      user: env.smtpUser,
      pass: env.smtpPass
    } : undefined,
    from: env.smtpFrom
  };
};

/**
 * Get or create nodemailer transporter
 * @returns {Object|null} - Nodemailer transporter or null if not configured
 */
const getTransporter = () => {
  const provider = env.emailProvider || 'gmail';
  
  // Reset transporter if provider has changed
  if (currentProvider !== provider) {
    transporter = null;
    currentProvider = provider;
  }

  if (transporter) return transporter;

  const config = getSmtpConfig();

  // Check if SMTP is configured
  if (!config.host) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  return transporter;
};

/**
 * Send an email with optional PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Buffer} options.attachmentBuffer - PDF attachment buffer (optional)
 * @param {string} options.attachmentFilename - Attachment filename (optional)
 * @returns {Promise<Object>} - Nodemailer send result
 */
const sendEmail = async ({ to, subject, text, html, attachmentBuffer, attachmentFilename }) => {
  const transport = getTransporter();

  if (!transport) {
    throw new Error(`Email not configured. Set EMAIL_PROVIDER and corresponding SMTP variables in .env`);
  }

  const config = getSmtpConfig();
  const mailOptions = {
    from: config.from,
    to,
    subject,
    text,
    html: html || undefined
  };

  if (attachmentBuffer && attachmentFilename) {
    mailOptions.attachments = [{
      filename: attachmentFilename,
      content: attachmentBuffer,
      contentType: 'application/pdf'
    }];
  }

  return transport.sendMail(mailOptions);
};

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if SMTP is configured
 * @returns {boolean} - True if SMTP is configured (or mock transporter is set)
 */
const isSmtpConfigured = () => {
  // If a transporter has been set (e.g., for testing), consider it configured
  if (transporter) return true;
  const config = getSmtpConfig();
  return Boolean(config.host);
};

/**
 * For testing purposes - allow replacing the transporter
 */
const setTransporter = (newTransporter) => {
  transporter = newTransporter;
};

const resetTransporter = () => {
  transporter = null;
  currentProvider = null;
};

module.exports = {
  sendEmail,
  isValidEmail,
  isSmtpConfigured,
  setTransporter,
  resetTransporter,
  getTransporter
};
