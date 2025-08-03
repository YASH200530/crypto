import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: '🎉 Welcome to Crypto Trading App!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Welcome to Crypto Trading!</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Welcome to our crypto trading platform! We're excited to have you on board. 
            You can now start trading cryptocurrencies, manage your wallet, and track your portfolio.
          </p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #334155; margin-top: 0;">🎯 What you can do:</h3>
            <ul style="color: #475569; line-height: 1.8;">
              <li>💰 Add money to your wallet</li>
              <li>📊 Trade popular cryptocurrencies</li>
              <li>📈 Track your transaction history</li>
              <li>👤 Manage your profile settings</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              Start Trading Now
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 30px;">
            Happy Trading!<br>
            The Crypto Trading Team
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (name, resetToken) => ({
    subject: '🔐 Reset Your Password - Crypto Trading App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              ⚠️ This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 30px;">
            Stay secure!<br>
            The Crypto Trading Team
          </p>
        </div>
      </div>
    `
  }),

  emailVerification: (name, verificationToken) => ({
    subject: '✅ Verify Your Email - Crypto Trading App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Verify Your Email</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Please verify your email address to complete your account setup and start trading:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/verify-email?token=${verificationToken}" 
               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              Verify Email
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 30px;">
            Thanks for joining us!<br>
            The Crypto Trading Team
          </p>
        </div>
      </div>
    `
  }),

  tradeConfirmation: (name, tradeDetails) => ({
    subject: `📊 Trade Confirmation - ${tradeDetails.action.toUpperCase()} ${tradeDetails.coinName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, ${tradeDetails.action === 'buy' ? '#10b981 0%, #059669 100%' : '#ef4444 0%, #dc2626 100%'}); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📊 Trade Executed</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Your trade has been successfully executed. Here are the details:
          </p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Action:</td>
                <td style="padding: 8px 0; color: #334155; text-transform: uppercase;">${tradeDetails.action}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Cryptocurrency:</td>
                <td style="padding: 8px 0; color: #334155;">${tradeDetails.coinName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Quantity:</td>
                <td style="padding: 8px 0; color: #334155;">${tradeDetails.quantity}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Price per unit:</td>
                <td style="padding: 8px 0; color: #334155;">₹${tradeDetails.price}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Total Amount:</td>
                <td style="padding: 8px 0; color: #334155; font-weight: bold;">₹${tradeDetails.totalAmount}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">New Balance:</td>
                <td style="padding: 8px 0; color: #334155; font-weight: bold;">₹${tradeDetails.newBalance}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/transactions" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              View Transaction History
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 30px;">
            Happy Trading!<br>
            The Crypto Trading Team
          </p>
        </div>
      </div>
    `
  }),

  depositConfirmation: (name, amount, newBalance) => ({
    subject: '💰 Deposit Confirmation - Crypto Trading App',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💰 Deposit Successful</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Your deposit has been successfully processed and added to your wallet.
          </p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #334155; margin-top: 0;">Deposit Amount</h3>
            <p style="font-size: 32px; font-weight: bold; color: #10b981; margin: 10px 0;">₹${amount}</p>
            <p style="color: #64748b; margin-bottom: 0;">New Wallet Balance: <strong>₹${newBalance}</strong></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}" 
               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                      color: white; 
                      padding: 12px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;">
              Start Trading
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-top: 30px;">
            Ready to trade!<br>
            The Crypto Trading Team
          </p>
        </div>
      </div>
    `
  })
};

// Email service class
class EmailService {
  constructor() {
    this.transporter = null;
  }

  async initialize() {
    try {
      this.transporter = createTransporter();
      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      return false;
    }
  }

  async sendEmail(to, template, data = {}) {
    if (!this.transporter) {
      await this.initialize();
    }

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      const emailContent = emailTemplates[template](data.name || 'User', data);
      
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: to,
        subject: emailContent.subject,
        html: emailContent.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}:`, result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      throw error;
    }
  }

  // Convenience methods for different email types
  async sendWelcomeEmail(to, name) {
    return this.sendEmail(to, 'welcome', { name });
  }

  async sendPasswordResetEmail(to, name, resetToken) {
    return this.sendEmail(to, 'passwordReset', { name, resetToken });
  }

  async sendEmailVerification(to, name, verificationToken) {
    return this.sendEmail(to, 'emailVerification', { name, verificationToken });
  }

  async sendTradeConfirmation(to, name, tradeDetails) {
    return this.sendEmail(to, 'tradeConfirmation', { name, ...tradeDetails });
  }

  async sendDepositConfirmation(to, name, amount, newBalance) {
    return this.sendEmail(to, 'depositConfirmation', { name, amount, newBalance });
  }
}

// Create and export singleton instance
const emailService = new EmailService();

export default emailService;