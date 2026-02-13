const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const env = require('../config/env');

// Singleton instances
let transporter = null;
let resendClient = null;
let currentProvider = null;

/**
 * Get Resend client
 * @returns {Resend|null} - Resend client or null if not configured
 */
const getResendClient = () => {
  if (resendClient) return resendClient;
  
  if (env.resendApiKey) {
    resendClient = new Resend(env.resendApiKey);
    return resendClient;
  }
  
  return null;
};

/**
 * Send email via Brevo HTTP API
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Brevo send result
 */
const sendViaBrevoApi = async ({ to, subject, text, html, attachmentBuffer, attachmentFilename }) => {
  if (!env.brevoApiKey) {
    throw new Error('Brevo not configured. Set BREVO_API_KEY in environment variables.');
  }
  
  const fromEmail = env.brevoFrom || 'EHS Portal <noreply@ehs-portal.com>';
  const fromMatch = fromEmail.match(/^(.+?)\s*<(.+?)>$/);
  const senderName = fromMatch ? fromMatch[1].trim() : 'EHS Portal';
  const senderEmail = fromMatch ? fromMatch[2].trim() : fromEmail;
  
  const emailData = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: Array.isArray(to) ? to[0] : to }],
    subject,
    textContent: text,
    htmlContent: html || `<p>${text.replace(/\n/g, '<br>')}</p>`
  };
  
  // Add attachment if provided
  if (attachmentBuffer && attachmentFilename) {
    emailData.attachment = [{
      name: attachmentFilename,
      content: attachmentBuffer.toString('base64')
    }];
  }
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': env.brevoApiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    console.error('[Email] Brevo API error:', result);
    throw new Error(result.message || `Brevo API error: ${response.status}`);
  }
  
  console.log('[Email] Sent via Brevo API:', { to, subject, messageId: result.messageId });
  return result;
};

/**
 * Get SMTP config based on selected provider
 * @returns {Object|null} - SMTP configuration or null if not configured
 */
const getSmtpConfig = () => {
  const provider = env.emailProvider || 'brevo';
  
  if (provider === 'brevo') {
    return {
      host: env.brevoHost,
      port: env.brevoPort,
      secure: env.brevoSecure,
      auth: env.brevoUser ? {
        user: env.brevoUser,
        pass: env.brevoPass
      } : undefined,
      from: env.brevoFrom
    };
  } else if (provider === 'gmail') {
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
 * Get or create nodemailer transporter (for SMTP providers)
 * @returns {Object|null} - Nodemailer transporter or null if not configured
 */
const getTransporter = () => {
  const provider = env.emailProvider || 'resend';
  
  // Resend doesn't use nodemailer transporter
  if (provider === 'resend') {
    return null;
  }
  
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
    auth: config.auth,
    connectionTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
};

/**
 * Send email via Resend API
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Resend send result
 */
const sendViaResend = async ({ to, subject, text, html, attachmentBuffer, attachmentFilename }) => {
  const client = getResendClient();
  
  if (!client) {
    throw new Error('Resend not configured. Set RESEND_API_KEY in environment variables.');
  }
  
  const emailData = {
    from: env.resendFrom || 'EHS Portal <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html: html || undefined
  };
  
  // Add attachment if provided
  if (attachmentBuffer && attachmentFilename) {
    emailData.attachments = [{
      filename: attachmentFilename,
      content: attachmentBuffer.toString('base64')
    }];
  }
  
  const result = await client.emails.send(emailData);
  
  if (result.error) {
    throw new Error(result.error.message || 'Failed to send email via Resend');
  }
  
  console.log('[Email] Sent via Resend:', { to, subject, id: result.data?.id });
  return result;
};

/**
 * Send email via SMTP (nodemailer)
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Nodemailer send result
 */
const sendViaSmtp = async ({ to, subject, text, html, attachmentBuffer, attachmentFilename }) => {
  const transport = getTransporter();

  if (!transport) {
    throw new Error(`Email not configured. Set EMAIL_PROVIDER and corresponding SMTP variables.`);
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

  const result = await transport.sendMail(mailOptions);
  console.log('[Email] Sent via SMTP:', { to, subject, messageId: result.messageId });
  return result;
};

/**
 * Send an email with optional PDF attachment
 * Uses Resend by default, falls back to SMTP if configured
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Buffer} options.attachmentBuffer - PDF attachment buffer (optional)
 * @param {string} options.attachmentFilename - Attachment filename (optional)
 * @returns {Promise<Object>} - Send result
 */
const sendEmail = async ({ to, subject, text, html, attachmentBuffer, attachmentFilename }) => {
  const provider = env.emailProvider || 'brevo';
  
  console.log('[Email] Sending email:', { provider, to, subject });
  
  if (provider === 'brevo') {
    return sendViaBrevoApi({ to, subject, text, html, attachmentBuffer, attachmentFilename });
  }
  
  if (provider === 'resend') {
    return sendViaResend({ to, subject, text, html, attachmentBuffer, attachmentFilename });
  }
  
  return sendViaSmtp({ to, subject, text, html, attachmentBuffer, attachmentFilename });
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
 * Check if email sending is configured
 * @returns {boolean} - True if email is configured (Brevo, Resend, or SMTP)
 */
const isSmtpConfigured = () => {
  const provider = env.emailProvider || 'brevo';
  
  // Check Brevo API
  if (provider === 'brevo') {
    return Boolean(env.brevoApiKey);
  }
  
  // Check Resend
  if (provider === 'resend') {
    return Boolean(env.resendApiKey);
  }
  
  // If a transporter has been set (e.g., for testing), consider it configured
  if (transporter) return true;
  
  // Check SMTP config
  const config = getSmtpConfig();
  return Boolean(config.host && config.auth && config.auth.user && config.auth.pass);
};

/**
 * For testing purposes - allow replacing the transporter
 */
const setTransporter = (newTransporter) => {
  transporter = newTransporter;
};

const resetTransporter = () => {
  transporter = null;
  resendClient = null;
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
