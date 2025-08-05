import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import session from 'express-session';
import dotenv from 'dotenv';
import { sendEmail, sendCustomEmail, sendBulkEmail, testEmailConnection, getDeviceInfo, getLocationInfo } from './emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Session middleware for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Not required for OAuth users
  displayName: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  profilePicture: { type: String },
  emailVerified: { type: Boolean, default: false },
  provider: { type: String, default: 'email' },
  googleId: { type: String },
  facebookId: { type: String },
  fullName: String,
  pan: String,
  UPI: String,
  account: String,
  ifsc: String,
  balance: { type: Number, default: 0 },
  emailPreferences: {
    loginNotifications: { type: Boolean, default: true },
    transactionAlerts: { type: Boolean, default: true },
    balanceAlerts: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Login Log Schema
const loginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: String,
  provider: String,
  lastLogin: { type: Date, default: Date.now },
  lastWelcomeEmailSent: Date
});

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['buy', 'sell', 'deposit'], required: true },
  coinId: String,
  coinName: String,
  amount: Number,
  price: Number,
  quantity: Number,
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      displayName: displayName || email.split('@')[0],
      emailVerified: true // For simplicity, we'll skip email verification
    });

    await user.save();

    // Send welcome email
    try {
      await sendEmail(user.email, 'welcome', { displayName: user.displayName });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, sendLoginNotification = true } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Get client info for login notification
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const deviceInfo = getDeviceInfo(userAgent);
    const locationInfo = await getLocationInfo(ipAddress);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log login with additional info
    await LoginLog.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        email: user.email,
        provider: 'email',
        lastLogin: new Date(),
        lastWelcomeEmailSent: user.lastLogin
      },
      { upsert: true }
    );

    // Send login notification email (if enabled and user preference allows)
    if (sendLoginNotification && user.emailPreferences?.loginNotifications !== false) {
      try {
        await sendEmail(user.email, 'loginAlert', {
          displayName: user.displayName,
          userId: user._id,
          timestamp: new Date(),
          userAgent: deviceInfo,
          ipAddress: ipAddress,
          location: locationInfo
        });
      } catch (error) {
        console.error('Failed to send login notification email:', error);
        // Don't fail the login if email fails
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Profile Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      fullName: user.fullName || '',
      pan: user.pan || '',
      UPI: user.UPI || '',
      account: user.account || '',
      ifsc: user.ifsc || '',
      balance: user.balance || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, pan, UPI, account, ifsc } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName, pan, UPI, account, ifsc },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: {
        fullName: user.fullName,
        pan: user.pan,
        UPI: user.UPI,
        account: user.account,
        ifsc: user.ifsc
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wallet Routes
app.post('/api/wallet/add-money', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.balance = (user.balance || 0) + parseFloat(amount);
    await user.save();

    // Log transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: parseFloat(amount),
      timestamp: new Date()
    });
    await transaction.save();

    // Send transaction notification email (if user preference allows)
    if (user.emailPreferences?.transactionAlerts !== false) {
      try {
        await sendEmail(user.email, 'transactionAlert', {
          displayName: user.displayName,
          userId: user._id,
          ...transaction.toObject()
        });
      } catch (error) {
        console.error('Failed to send transaction email:', error);
      }
    }

    res.json({
      message: 'Money added successfully',
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ balance: user.balance || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction Routes
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions/trade', authenticateToken, async (req, res) => {
  try {
    const { type, coinId, coinName, price, quantity } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalCost = quantity * price;

    if (type === 'buy' && user.balance < totalCost) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Update balance
    if (type === 'buy') {
      user.balance -= totalCost;
    } else if (type === 'sell') {
      user.balance += totalCost;
    }
    
    await user.save();

    // Log transaction
    const transaction = new Transaction({
      userId: user._id,
      type,
      coinId,
      coinName,
      amount: totalCost,
      price,
      quantity,
      timestamp: new Date()
    });
    await transaction.save();

    // Send transaction notification email (if user preference allows)
    if (user.emailPreferences?.transactionAlerts !== false) {
      try {
        await sendEmail(user.email, 'transactionAlert', {
          displayName: user.displayName,
          userId: user._id,
          ...transaction.toObject()
        });
      } catch (error) {
        console.error('Failed to send transaction email:', error);
      }
    }

    res.json({
      message: `${type === 'buy' ? 'Purchase' : 'Sale'} successful`,
      balance: user.balance,
      transaction
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login Logs Route
app.get('/api/login-logs', authenticateToken, async (req, res) => {
  try {
    const log = await LoginLog.findOne({ userId: req.user.userId });
    res.json(log || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email Routes
app.post('/api/email/test', authenticateToken, async (req, res) => {
  try {
    const result = await testEmailConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/send', authenticateToken, async (req, res) => {
  try {
    const { to, template, templateData } = req.body;
    
    if (!to || !template) {
      return res.status(400).json({ error: 'Email address and template are required' });
    }

    const result = await sendEmail(to, template, templateData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/send-custom', authenticateToken, async (req, res) => {
  try {
    const { to, subject, htmlContent, textContent } = req.body;
    
    if (!to || !subject || !htmlContent) {
      return res.status(400).json({ error: 'Email address, subject, and HTML content are required' });
    }

    const result = await sendCustomEmail(to, subject, htmlContent, textContent);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/send-bulk', authenticateToken, async (req, res) => {
  try {
    const { recipients, template, templateData } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || !template) {
      return res.status(400).json({ error: 'Recipients array and template are required' });
    }

    const results = await sendBulkEmail(recipients, template, templateData);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/email/balance-alert', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { threshold = 100 } = req.body;
    
    if (user.balance <= threshold && user.emailPreferences?.balanceAlerts !== false) {
      const result = await sendEmail(user.email, 'balanceAlert', {
        displayName: user.displayName,
        currentBalance: user.balance,
        threshold,
        userId: user._id
      });
      res.json({ message: 'Balance alert sent', ...result });
    } else if (user.balance > threshold) {
      res.json({ message: 'Balance is above threshold, no alert sent' });
    } else {
      res.json({ message: 'Balance alerts disabled for this user' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Password Reset Route (with email)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Send password reset email
    const result = await sendEmail(user.email, 'passwordReset', {
      displayName: user.displayName,
      resetToken
    });

    if (result.success) {
      res.json({ message: 'Password reset email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security Alert Route
app.post('/api/email/security-alert', authenticateToken, async (req, res) => {
  try {
    const { type, activity, details } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    const result = await sendEmail(user.email, 'securityAlert', {
      displayName: user.displayName,
      type: type || 'suspicious activity',
      activity: activity || 'Unknown activity detected',
      details: details,
      timestamp: new Date(),
      ipAddress: ipAddress
    });

    if (result.success) {
      res.json({ message: 'Security alert sent successfully', ...result });
    } else {
      res.status(500).json({ error: 'Failed to send security alert' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual Login Notification Route
app.post('/api/email/login-notification', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const deviceInfo = getDeviceInfo(userAgent);
    const locationInfo = await getLocationInfo(ipAddress);

    const result = await sendEmail(user.email, 'loginAlert', {
      displayName: user.displayName,
      timestamp: new Date(),
      userAgent: deviceInfo,
      ipAddress: ipAddress,
      location: locationInfo
    });

    if (result.success) {
      res.json({ message: 'Login notification sent successfully', ...result });
    } else {
      res.status(500).json({ error: 'Failed to send login notification' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email Preferences Routes
app.get('/api/user/email-preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('emailPreferences');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      emailPreferences: user.emailPreferences || {
        loginNotifications: true,
        transactionAlerts: true,
        balanceAlerts: true,
        securityAlerts: true,
        marketingEmails: false
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/user/email-preferences', authenticateToken, async (req, res) => {
  try {
    const { emailPreferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { emailPreferences },
      { new: true }
    ).select('emailPreferences');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Email preferences updated successfully',
      emailPreferences: user.emailPreferences
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe Route (for email links)
app.get('/api/email/unsubscribe/:userId/:type', async (req, res) => {
  try {
    const { userId, type } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update specific email preference
    const updateField = {};
    switch (type) {
      case 'login':
        updateField['emailPreferences.loginNotifications'] = false;
        break;
      case 'transaction':
        updateField['emailPreferences.transactionAlerts'] = false;
        break;
      case 'balance':
        updateField['emailPreferences.balanceAlerts'] = false;
        break;
      case 'security':
        updateField['emailPreferences.securityAlerts'] = false;
        break;
      case 'marketing':
        updateField['emailPreferences.marketingEmails'] = false;
        break;
      case 'all':
        updateField.emailPreferences = {
          loginNotifications: false,
          transactionAlerts: false,
          balanceAlerts: false,
          securityAlerts: true, // Keep security alerts for safety
          marketingEmails: false
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid unsubscribe type' });
    }

    await User.findByIdAndUpdate(userId, updateField);

    res.json({ 
      message: `Successfully unsubscribed from ${type} emails`,
      type: type
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth Routes
// Google OAuth
app.get('/api/auth/google', (req, res) => {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google/callback`;
  const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile`;
  
  res.json({ authUrl: googleAuthURL });
});

app.post('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google/callback`,
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' });
    }

    // Get user profile
    const profileResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`);
    const profile = await profileResponse.json();

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: profile.email }
      ]
    });

    if (user) {
      // Update Google ID if user exists but doesn't have it
      if (!user.googleId) {
        user.googleId = profile.id;
        user.provider = 'google';
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        googleId: profile.id,
        email: profile.email,
        displayName: profile.name,
        firstName: profile.given_name,
        lastName: profile.family_name,
        profilePicture: profile.picture,
        provider: 'google',
        emailVerified: true
      });
      await user.save();

      // Send welcome email
      try {
        await sendEmail(user.email, 'welcome', { displayName: user.displayName });
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google login successful',
      token,
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Facebook OAuth
app.get('/api/auth/facebook', (req, res) => {
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/facebook/callback`;
  const facebookAuthURL = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${process.env.FACEBOOK_APP_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=email&` +
    `response_type=code`;
  
  res.json({ authUrl: facebookAuthURL });
});

app.post('/api/auth/facebook/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${process.env.FACEBOOK_APP_ID}&` +
      `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
      `code=${code}&` +
      `redirect_uri=${encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/facebook/callback`)}`
    );

    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to get access token' });
    }

    // Get user profile
    const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${tokens.access_token}`);
    const profile = await profileResponse.json();

    if (!profile.email) {
      return res.status(400).json({ error: 'Email permission required' });
    }

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { facebookId: profile.id },
        { email: profile.email }
      ]
    });

    if (user) {
      // Update Facebook ID if user exists but doesn't have it
      if (!user.facebookId) {
        user.facebookId = profile.id;
        user.provider = 'facebook';
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        facebookId: profile.id,
        email: profile.email,
        displayName: profile.name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        profilePicture: profile.picture?.data?.url,
        provider: 'facebook',
        emailVerified: true
      });
      await user.save();

      // Send welcome email
      try {
        await sendEmail(user.email, 'welcome', { displayName: user.displayName });
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Facebook login successful',
      token,
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.status(500).json({ error: 'Facebook authentication failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});