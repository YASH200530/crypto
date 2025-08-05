import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // You can change this to other services like 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your email password or app password
    }
  });
};

// Alternative configuration for SMTP (currently unused)
// const createSMTPTransporter = () => {
//   return nodemailer.createTransporter({
//     host: process.env.SMTP_HOST || 'smtp.gmail.com',
//     port: process.env.SMTP_PORT || 587,
//     secure: false, // true for 465, false for other ports
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS
//     }
//   });
// };

// Email templates
const emailTemplates = {
  welcome: (userEmail, displayName) => ({
    subject: 'Welcome to Crypto App!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Crypto App!</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${displayName || userEmail}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Thank you for joining our crypto trading platform. We're excited to have you on board!
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            With your account, you can:
          </p>
          <ul style="color: #666; font-size: 16px; line-height: 1.6;">
            <li>Track real-time cryptocurrency prices</li>
            <li>Buy and sell cryptocurrencies</li>
            <li>Manage your portfolio</li>
            <li>View detailed transaction history</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Start Trading
            </a>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you have any questions, feel free to contact our support team.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Don't want to receive welcome emails? This was a one-time email for account creation.
          </p>
        </div>
      </div>
    `
  }),

  transactionAlert: (userEmail, displayName, transaction) => ({
    subject: `Transaction ${transaction.type === 'buy' ? 'Purchase' : transaction.type === 'sell' ? 'Sale' : 'Deposit'} Confirmation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${transaction.type === 'buy' ? '#28a745' : transaction.type === 'sell' ? '#dc3545' : '#007bff'}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Transaction Confirmation</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${displayName || userEmail}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your ${transaction.type} transaction has been processed successfully.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${transaction.type === 'buy' ? '#28a745' : transaction.type === 'sell' ? '#dc3545' : '#007bff'};">
            <h3 style="margin-top: 0; color: #333;">Transaction Details:</h3>
            <p style="margin: 8px 0; color: #666;"><strong>Type:</strong> ${transaction.type.toUpperCase()}</p>
            ${transaction.coinName ? `<p style="margin: 8px 0; color: #666;"><strong>Cryptocurrency:</strong> ${transaction.coinName}</p>` : ''}
            ${transaction.quantity ? `<p style="margin: 8px 0; color: #666;"><strong>Quantity:</strong> ${transaction.quantity}</p>` : ''}
            ${transaction.price ? `<p style="margin: 8px 0; color: #666;"><strong>Price per unit:</strong> $${transaction.price}</p>` : ''}
            <p style="margin: 8px 0; color: #666;"><strong>Total Amount:</strong> $${transaction.amount}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            You can view all your transactions in your account dashboard.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/api/email/unsubscribe/${templateData.userId || 'unknown'}/transaction" style="color: #999; text-decoration: underline;">Unsubscribe from transaction alerts</a>
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (userEmail, resetToken) => ({
    subject: 'Password Reset Request - Crypto App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc3545; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Password Reset</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}" 
               style="background: #dc3545; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This link will expire in 1 hour for security reasons.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is a security-related email and cannot be unsubscribed from for your account protection.
          </p>
        </div>
      </div>
    `
  }),

  balanceAlert: (userEmail, displayName, currentBalance) => ({
    subject: 'Low Balance Alert - Crypto App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffc107; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #212529; margin: 0; font-size: 24px;">⚠️ Low Balance Alert</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${displayName || userEmail}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your account balance is running low. Current balance: <strong>$${currentBalance}</strong>
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Consider adding funds to continue trading seamlessly.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet" 
               style="background: #28a745; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Add Funds
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/api/email/unsubscribe/${templateData.userId || 'unknown'}/balance" style="color: #999; text-decoration: underline;">Unsubscribe from balance alerts</a>
          </p>
        </div>
      </div>
    `
  }),

  loginAlert: (userEmail, displayName, loginData) => ({
    subject: 'New Login to Your Crypto App Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #007bff; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Login Notification</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${displayName || userEmail}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            We detected a new login to your Crypto App account.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="margin-top: 0; color: #333;">Login Details:</h3>
            <p style="margin: 8px 0; color: #666;"><strong>Time:</strong> ${new Date(loginData.timestamp || Date.now()).toLocaleString()}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Device:</strong> ${loginData.userAgent || 'Unknown Device'}</p>
            <p style="margin: 8px 0; color: #666;"><strong>IP Address:</strong> ${loginData.ipAddress || 'Unknown IP'}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Location:</strong> ${loginData.location || 'Unknown Location'}</p>
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            If this was you, no action is needed. If you don't recognize this login, please secure your account immediately.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile/security" 
               style="background: #dc3545; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Secure Account
            </a>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            For your security, we recommend enabling two-factor authentication if you haven't already.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/api/email/unsubscribe/${templateData.userId || 'unknown'}/login" style="color: #999; text-decoration: underline;">Unsubscribe from login notifications</a>
          </p>
        </div>
      </div>
    `
  }),

  securityAlert: (userEmail, displayName, alertData) => ({
    subject: '🚨 Security Alert - Crypto App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc3545; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Security Alert</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${displayName || userEmail}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            We detected ${alertData.type || 'suspicious activity'} on your account.
          </p>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">Alert Details:</h3>
            <p style="margin: 8px 0; color: #856404;"><strong>Activity:</strong> ${alertData.activity || 'Unknown activity'}</p>
            <p style="margin: 8px 0; color: #856404;"><strong>Time:</strong> ${new Date(alertData.timestamp || Date.now()).toLocaleString()}</p>
            <p style="margin: 8px 0; color: #856404;"><strong>IP Address:</strong> ${alertData.ipAddress || 'Unknown IP'}</p>
            ${alertData.details ? `<p style="margin: 8px 0; color: #856404;"><strong>Details:</strong> ${alertData.details}</p>` : ''}
          </div>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            If this was not you, please secure your account immediately by changing your password and reviewing your recent activity.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile/security" 
               style="background: #dc3545; 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;">
              Secure Account Now
            </a>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This is an automated security alert. If you have questions, please contact our support team.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Security alerts are essential for account protection and cannot be fully disabled.
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
export const sendEmail = async (to, template, templateData = {}) => {
  try {
    const transporter = createTransporter();
    
    // Get email template
    const emailContent = emailTemplates[template](to, templateData.displayName, templateData);
    
    const mailOptions = {
      from: `"Crypto App" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send custom email
export const sendCustomEmail = async (to, subject, htmlContent, textContent = '') => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Crypto App" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Custom email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending custom email:', error);
    return { success: false, error: error.message };
  }
};

// Bulk email function
export const sendBulkEmail = async (recipients, template, templateData = {}) => {
  try {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await sendEmail(recipient, template, templateData);
      results.push({ recipient, ...result });
      
      // Add delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error sending bulk emails:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to get device info from User-Agent
export const getDeviceInfo = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android Device';
    return 'Mobile Device';
  }
  
  if (userAgent.includes('Windows')) return 'Windows Computer';
  if (userAgent.includes('Mac')) return 'Mac Computer';
  if (userAgent.includes('Linux')) return 'Linux Computer';
  
  return 'Web Browser';
};

// Helper function to get location from IP (basic implementation)
export const getLocationInfo = async (ipAddress) => {
  try {
    // In production, you might want to use a service like ipapi.co or geoip
    // For now, we'll return a basic response
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return 'Local Development';
    }
    
    // You could integrate with a geolocation service here
    // const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
    // const data = await response.json();
    // return `${data.city}, ${data.country}`;
    
    return 'Unknown Location';
  } catch (error) {
    console.error('Error getting location:', error);
    return 'Unknown Location';
  }
};

// Test email connection
export const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email service is ready');
    return { success: true, message: 'Email service is ready' };
  } catch (error) {
    console.error('❌ Email service error:', error);
    return { success: false, error: error.message };
  }
};