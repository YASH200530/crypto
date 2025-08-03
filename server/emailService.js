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

// Alternative configuration for SMTP
const createSMTPTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

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
        </div>
      </div>
    `
  }),

  balanceAlert: (userEmail, displayName, currentBalance, threshold) => ({
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