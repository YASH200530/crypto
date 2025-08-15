import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendEmail, sendCustomEmail, sendBulkEmail, testEmailConnection } from './emailService.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

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
  password: { type: String },
  displayName: { type: String },
  emailVerified: { type: Boolean, default: false },
  provider: { type: String, default: 'email' },
  fullName: String,
  pan: String,
  UPI: String,
  account: String,
  ifsc: String,
  balance: { type: Number, default: 0 },
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

// OAuth Strategies
const isGoogleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const isFacebookEnabled = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

if (isGoogleEnabled) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      const displayName = profile.displayName || (email ? email.split('@')[0] : 'Google User');
      if (!email) {
        return done(new Error('Google account did not return an email'));
      }

      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          email,
          displayName,
          emailVerified: true,
          provider: 'google'
        });
      } else {
        user.provider = 'google';
        user.emailVerified = true;
        if (!user.displayName) user.displayName = displayName;
      }
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

if (isFacebookEnabled) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || `facebook_${profile.id}@no-email.local`;
      const displayName = profile.displayName || 'Facebook User';

      let user = await User.findOne({ email });
      if (!user) {
        user = new User({
          email,
          displayName,
          emailVerified: true,
          provider: 'facebook'
        });
      } else {
        user.provider = 'facebook';
        user.emailVerified = true;
        if (!user.displayName) user.displayName = displayName;
      }
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

const makeOAuthCallbackHandler = (providerName) => async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect('/api/auth/failure');
    }

    // Log login
    await LoginLog.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        email: user.email,
        provider: providerName,
        lastLogin: new Date()
      },
      { upsert: true }
    );

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    const payload = {
      token,
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true
      }
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><script>(function(){var payload=${JSON.stringify(payload)};if(window.opener&&typeof window.opener.postMessage==='function'){window.opener.postMessage(Object.assign({type:'oauth-success'},payload),'${CLIENT_URL}');}window.close();})();</script></body></html>`;
    res.send(html);
  } catch (error) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><script>(function(){if(window.opener&&typeof window.opener.postMessage==='function'){window.opener.postMessage({type:'oauth-error',error:${JSON.stringify('OAuth callback failed')}},'${CLIENT_URL}');}window.close();})();</script></body></html>`;
    res.send(html);
  }
};

// Auth Routes
app.get('/api/auth/google', isGoogleEnabled
  ? passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  : (req, res) => res.status(501).json({ error: 'Google login not configured' })
);

app.get('/api/auth/google/callback', isGoogleEnabled
  ? passport.authenticate('google', { session: false, failureRedirect: '/api/auth/failure' })
  : (req, res, next) => next(),
  isGoogleEnabled ? makeOAuthCallbackHandler('google') : (req, res) => res.status(501).send('Google login not configured')
);

app.get('/api/auth/facebook', isFacebookEnabled
  ? passport.authenticate('facebook', { scope: ['email'], session: false })
  : (req, res) => res.status(501).json({ error: 'Facebook login not configured' })
);

app.get('/api/auth/facebook/callback', isFacebookEnabled
  ? passport.authenticate('facebook', { session: false, failureRedirect: '/api/auth/failure' })
  : (req, res, next) => next(),
  isFacebookEnabled ? makeOAuthCallbackHandler('facebook') : (req, res) => res.status(501).send('Facebook login not configured')
);

app.get('/api/auth/failure', (req, res) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><script>(function(){if(window.opener&&typeof window.opener.postMessage==='function'){window.opener.postMessage({type:'oauth-error',error:'Authentication failed'},'${CLIENT_URL}');}window.close();})();</script></body></html>`;
  res.send(html);
});

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
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

      // Check password (skip for OAuth users)
  if (!user.password) {
    return res.status(400).json({ error: 'Use social login for this account' });
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: 'Invalid password' });
  }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log login
    await LoginLog.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        email: user.email,
        provider: 'email',
        lastLogin: new Date()
      },
      { upsert: true }
    );

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

    // Send transaction notification email
    try {
      await sendEmail(user.email, 'transactionAlert', {
        displayName: user.displayName,
        ...transaction.toObject()
      });
    } catch (error) {
      console.error('Failed to send transaction email:', error);
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

    // Send transaction notification email
    try {
      await sendEmail(user.email, 'transactionAlert', {
        displayName: user.displayName,
        ...transaction.toObject()
      });
    } catch (error) {
      console.error('Failed to send transaction email:', error);
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
    
    if (user.balance <= threshold) {
      const result = await sendEmail(user.email, 'balanceAlert', {
        displayName: user.displayName,
        currentBalance: user.balance,
        threshold
      });
      res.json({ message: 'Balance alert sent', ...result });
    } else {
      res.json({ message: 'Balance is above threshold, no alert sent' });
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});