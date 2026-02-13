/**
 * Modern Email Templates for EHS Portal
 * Professional, responsive email designs
 */

const env = require('../config/env');

// Brand colors and config
const BRAND = {
  primaryColor: '#1e3a5f',      // Dark blue
  accentColor: '#22c55e',       // Green
  warningColor: '#f59e0b',      // Amber
  dangerColor: '#ef4444',       // Red
  infoColor: '#3b82f6',         // Blue
  textColor: '#374151',
  lightBg: '#f9fafb',
  borderColor: '#e5e7eb',
  logoUrl: '', // Can be set via env
  companyName: 'EHS Portal',
  supportEmail: 'support@ehs-portal.com'
};

/**
 * Base email layout wrapper
 */
const baseLayout = (content, options = {}) => {
  const { preheader = '' } = options;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.companyName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: ${BRAND.lightBg};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: ${BRAND.textColor};
    }
    
    .email-wrapper {
      width: 100%;
      background-color: ${BRAND.lightBg};
      padding: 40px 0;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    
    .email-header {
      background: linear-gradient(135deg, ${BRAND.primaryColor} 0%, #2d4a6f 100%);
      padding: 30px;
      text-align: center;
    }
    
    .email-header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.5px;
    }
    
    .email-header .logo {
      margin-bottom: 15px;
    }
    
    .email-body {
      padding: 40px 30px;
    }
    
    .email-footer {
      background-color: ${BRAND.lightBg};
      padding: 25px 30px;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      border-top: 1px solid ${BRAND.borderColor};
    }
    
    h2 {
      color: ${BRAND.primaryColor};
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 20px;
    }
    
    p {
      margin: 0 0 16px;
      color: ${BRAND.textColor};
    }
    
    .btn {
      display: inline-block;
      padding: 14px 32px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    
    .btn-primary {
      background-color: ${BRAND.accentColor};
      color: #ffffff !important;
    }
    
    .btn-secondary {
      background-color: ${BRAND.infoColor};
      color: #ffffff !important;
    }
    
    .info-box {
      background-color: #f0f9ff;
      border-left: 4px solid ${BRAND.infoColor};
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .warning-box {
      background-color: #fffbeb;
      border-left: 4px solid ${BRAND.warningColor};
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .success-box {
      background-color: #f0fdf4;
      border-left: 4px solid ${BRAND.accentColor};
      padding: 16px 20px;
      margin: 24px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .credential-box {
      background-color: ${BRAND.lightBg};
      border: 2px dashed ${BRAND.borderColor};
      padding: 20px;
      margin: 24px 0;
      border-radius: 8px;
      text-align: center;
    }
    
    .credential-box .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .credential-box .value {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 18px;
      font-weight: 600;
      color: ${BRAND.primaryColor};
      background-color: #ffffff;
      padding: 12px 20px;
      border-radius: 6px;
      display: inline-block;
      border: 1px solid ${BRAND.borderColor};
    }
    
    .reference-badge {
      display: inline-block;
      background-color: ${BRAND.primaryColor};
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .divider {
      height: 1px;
      background-color: ${BRAND.borderColor};
      margin: 30px 0;
    }
    
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid ${BRAND.borderColor};
    }
    
    .detail-label {
      font-weight: 600;
      color: #6b7280;
      width: 120px;
    }
    
    .detail-value {
      color: ${BRAND.textColor};
    }
    
    .otp-code {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 8px;
      color: ${BRAND.primaryColor};
      background-color: ${BRAND.lightBg};
      padding: 20px 30px;
      border-radius: 8px;
      display: inline-block;
      margin: 20px 0;
    }
    
    .timer-notice {
      color: ${BRAND.warningColor};
      font-size: 14px;
      font-weight: 500;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 10px !important; }
      .email-body { padding: 30px 20px !important; }
      .btn { width: 100%; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <div class="email-wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="email-container">
            <div class="email-header">
              <div class="logo">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="48" height="48" rx="10" fill="white" fill-opacity="0.15"/>
                  <path d="M14 18L24 12L34 18V30L24 36L14 30V18Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M24 36V24M24 24L14 18M24 24L34 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1>EHS Portal</h1>
            </div>
            <div class="email-body">
              ${content}
            </div>
            <div class="email-footer">
              <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} EHS Portal. All rights reserved.</p>
              <p style="margin-bottom: 0;">Environmental Health & Safety Management Platform</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Access Request Confirmation Email
 */
const accessRequestConfirmation = ({ fullName, referenceNumber, organisationName }) => {
  const content = `
    <h2>Access Request Received ✓</h2>
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>Thank you for your interest in joining ${organisationName || 'EHS Portal'}. We have received your access request and it is now pending review by an administrator.</p>
    
    <div class="credential-box">
      <div class="label">Your Reference Number</div>
      <div class="value">${referenceNumber}</div>
    </div>
    
    <div class="info-box">
      <strong>What happens next?</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">Our team will review your request and you will receive an email notification once a decision has been made. This typically takes 1-2 business days.</p>
    </div>
    
    <p>Please keep your reference number safe - you may need it if you contact us about your request.</p>
  `;
  
  return {
    subject: `Access Request Received [${referenceNumber}]`,
    html: baseLayout(content, { preheader: `Your reference: ${referenceNumber}` }),
    text: `
Hello ${fullName},

Thank you for your interest in joining ${organisationName || 'EHS Portal'}. We have received your access request.

Reference Number: ${referenceNumber}

Our team will review your request and you will receive an email notification once a decision has been made.

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * Access Request Approved Email
 */
const accessRequestApproved = ({ name, email, tempPassword, loginUrl }) => {
  const content = `
    <h2>Welcome to EHS Portal! 🎉</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Great news! Your access request has been <strong style="color: ${BRAND.accentColor};">approved</strong>. Your account is now ready to use.</p>
    
    <div class="success-box">
      <strong>Your account has been created</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">You can now log in and start using the EHS Portal.</p>
    </div>
    
    <div class="credential-box">
      <div class="label">Your Email</div>
      <div class="value">${email}</div>
    </div>
    
    <div class="credential-box">
      <div class="label">Temporary Password</div>
      <div class="value">${tempPassword}</div>
    </div>
    
    <div class="warning-box">
      <strong>⚠️ Important Security Notice</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">For your security, you will be required to <strong>change your password</strong> when you first log in. Please choose a strong, unique password.</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="btn btn-primary">Log In Now →</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${loginUrl}" style="color: ${BRAND.infoColor};">${loginUrl}</a></p>
  `;
  
  return {
    subject: 'Welcome to EHS Portal - Your Account is Ready!',
    html: baseLayout(content, { preheader: 'Your account has been approved and is ready to use.' }),
    text: `
Hello ${name},

Great news! Your access request has been approved. Your account is now ready to use.

Your Login Details:
- Email: ${email}
- Temporary Password: ${tempPassword}

IMPORTANT: You will be required to change your password when you first log in.

Log in here: ${loginUrl}

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * Access Request Rejected Email
 */
const accessRequestRejected = ({ name }) => {
  const content = `
    <h2>Access Request Update</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Thank you for your interest in the EHS Portal.</p>
    <p>After careful review, we are unable to approve your access request at this time.</p>
    
    <div class="info-box">
      <strong>Need Help?</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">If you believe this decision was made in error or you have questions, please contact your organisation's administrator for further assistance.</p>
    </div>
    
    <p>We appreciate your understanding.</p>
  `;
  
  return {
    subject: 'EHS Portal - Access Request Update',
    html: baseLayout(content, { preheader: 'An update on your access request.' }),
    text: `
Hello ${name},

Thank you for your interest in the EHS Portal.

After careful review, we are unable to approve your access request at this time.

If you believe this decision was made in error or you have questions, please contact your organisation's administrator.

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * Additional Information Required Email
 */
const additionalInfoRequired = ({ name, referenceNumber, message, responseUrl }) => {
  const content = `
    <h2>Additional Information Required</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>We need some additional information to process your access request.</p>
    
    <div style="margin: 20px 0;">
      <span class="reference-badge">Ref: ${referenceNumber}</span>
    </div>
    
    <div class="info-box">
      <strong>Message from Administrator:</strong>
      <p style="margin-top: 12px; margin-bottom: 0;">${message.replace(/\n/g, '<br>')}</p>
    </div>
    
    <p>Please click the button below to provide the requested information:</p>
    
    <div style="text-align: center;">
      <a href="${responseUrl}" class="btn btn-secondary">Respond to Request →</a>
    </div>
    
    <div class="warning-box">
      <strong>⏰ Please respond promptly</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">Your request cannot be processed until we receive the additional information.</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${responseUrl}" style="color: ${BRAND.infoColor};">${responseUrl}</a></p>
  `;
  
  return {
    subject: `EHS Portal - Additional Information Required [${referenceNumber}]`,
    html: baseLayout(content, { preheader: 'We need additional information for your access request.' }),
    text: `
Hello ${name},

We need some additional information to process your access request.

Reference: ${referenceNumber}

Message from Administrator:
${message}

Please respond by visiting: ${responseUrl}

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * Password Reset Email
 */
const passwordReset = ({ name, resetUrl, expiryMinutes }) => {
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>We received a request to reset your password for your EHS Portal account.</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn btn-secondary">Reset My Password →</a>
    </div>
    
    <div class="warning-box">
      <p class="timer-notice" style="margin-bottom: 8px;">⏱️ This link expires in <strong>${expiryMinutes} minutes</strong></p>
      <p style="margin-bottom: 0; font-size: 14px;">For security reasons, this link can only be used once.</p>
    </div>
    
    <div class="divider"></div>
    
    <p style="color: #6b7280; font-size: 14px;"><strong>Didn't request this?</strong><br>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    
    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color: ${BRAND.infoColor};">${resetUrl}</a></p>
  `;
  
  return {
    subject: 'EHS Portal - Password Reset Request',
    html: baseLayout(content, { preheader: 'Reset your password for EHS Portal.' }),
    text: `
Hello ${name},

We received a request to reset your password for your EHS Portal account.

Click here to reset your password: ${resetUrl}

This link will expire in ${expiryMinutes} minutes.

If you didn't request this, you can safely ignore this email.

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * OTP Verification Email
 */
const otpVerification = ({ name, otpCode, expiryMinutes, purpose = 'verify your email' }) => {
  const content = `
    <h2>Verification Code</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Use the following code to ${purpose}:</p>
    
    <div style="text-align: center;">
      <div class="otp-code">${otpCode}</div>
    </div>
    
    <div class="warning-box">
      <p class="timer-notice" style="margin-bottom: 8px;">⏱️ This code expires in <strong>${expiryMinutes} minutes</strong></p>
      <p style="margin-bottom: 0; font-size: 14px;">Do not share this code with anyone. Our team will never ask for this code.</p>
    </div>
    
    <div class="divider"></div>
    
    <p style="color: #6b7280; font-size: 14px;"><strong>Didn't request this?</strong><br>If you didn't request this verification code, someone may be trying to access your account. Please secure your account immediately.</p>
  `;
  
  return {
    subject: `${otpCode} is your EHS Portal verification code`,
    html: baseLayout(content, { preheader: `Your verification code is ${otpCode}` }),
    text: `
Hello ${name},

Your verification code is: ${otpCode}

This code will expire in ${expiryMinutes} minutes.

Do not share this code with anyone.

If you didn't request this code, please secure your account.

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * Two-Factor Authentication Setup Email
 */
const twoFactorSetup = ({ name }) => {
  const content = `
    <h2>Two-Factor Authentication Enabled</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Two-factor authentication (2FA) has been successfully enabled on your EHS Portal account.</p>
    
    <div class="success-box">
      <strong>✓ Your account is now more secure</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">You will need to enter a verification code from your authenticator app each time you log in.</p>
    </div>
    
    <div class="info-box">
      <strong>Important Reminders:</strong>
      <ul style="margin-top: 8px; margin-bottom: 0; padding-left: 20px;">
        <li>Keep your backup codes in a safe place</li>
        <li>Never share your authentication codes</li>
        <li>Contact your administrator if you lose access to your authenticator</li>
      </ul>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;"><strong>Didn't enable this?</strong><br>If you didn't enable 2FA, please contact your administrator immediately as your account may be compromised.</p>
  `;
  
  return {
    subject: 'EHS Portal - Two-Factor Authentication Enabled',
    html: baseLayout(content, { preheader: '2FA has been enabled on your account.' }),
    text: `
Hello ${name},

Two-factor authentication (2FA) has been successfully enabled on your EHS Portal account.

You will need to enter a verification code from your authenticator app each time you log in.

Important:
- Keep your backup codes in a safe place
- Never share your authentication codes
- Contact your administrator if you lose access to your authenticator

If you didn't enable this, please contact your administrator immediately.

Best regards,
EHS Portal Team
    `.trim()
  };
};

/**
 * Password Changed Notification
 */
const passwordChanged = ({ name }) => {
  const content = `
    <h2>Password Changed Successfully</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your EHS Portal password has been successfully changed.</p>
    
    <div class="success-box">
      <strong>✓ Password Updated</strong>
      <p style="margin-top: 8px; margin-bottom: 0;">Your new password is now active. Please use it for your next login.</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;"><strong>Didn't change your password?</strong><br>If you didn't make this change, please reset your password immediately and contact your administrator.</p>
  `;
  
  return {
    subject: 'EHS Portal - Password Changed Successfully',
    html: baseLayout(content, { preheader: 'Your password has been updated.' }),
    text: `
Hello ${name},

Your EHS Portal password has been successfully changed.

If you didn't make this change, please reset your password immediately and contact your administrator.

Best regards,
EHS Portal Team
    `.trim()
  };
};

module.exports = {
  baseLayout,
  accessRequestConfirmation,
  accessRequestApproved,
  accessRequestRejected,
  additionalInfoRequired,
  passwordReset,
  otpVerification,
  twoFactorSetup,
  passwordChanged,
  BRAND
};
