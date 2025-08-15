import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendEmail, sendCustomEmail, sendBulkEmail, testEmailConnection } from './emailService.js';
import passport from 'passport';
import session from 'express-session';
import GoogleOAuth from 'passport-google-oauth20';
import FacebookOAuth from 'passport-facebook';
const GoogleStrategy = GoogleOAuth.Strategy;
const FacebookStrategy = FacebookOAuth.Strategy;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

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
  password: { type: String, required: true },
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

// Transaction Schema (moved above usage)
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

// JWT Middleware (moved above usage)
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

// Passport OAuth Strategies
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const HAS_GOOGLE = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const HAS_FACEBOOK = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

if (HAS_GOOGLE) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (!email) {
        return done(new Error('Google account has no public email'));
      }

      let user = await User.findOne({ email });
      if (!user) {
        const randomPassword = await bcrypt.hash(jwt.sign({ p: profile.id }, process.env.JWT_SECRET || 'your-secret-key'), 10);
        user = await User.create({
          email,
          password: randomPassword,
          displayName: profile.displayName || email.split('@')[0],
          emailVerified: true,
          provider: 'google'
        });
      } else {
        user.provider = 'google';
        user.displayName = user.displayName || profile.displayName;
        user.lastLogin = new Date();
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

if (HAS_FACEBOOK) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/facebook/callback`,
    profileFields: ['id', 'emails', 'name', 'displayName']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (!email) {
        email = `${profile.id}@facebook.local`;
      }

      let user = await User.findOne({ email });
      if (!user) {
        const randomPassword = await bcrypt.hash(jwt.sign({ p: profile.id }, process.env.JWT_SECRET || 'your-secret-key'), 10);
        user = await User.create({
          email,
          password: randomPassword,
          displayName: profile.displayName || [profile.name?.givenName, profile.name?.familyName].filter(Boolean).join(' ') || email.split('@')[0],
          emailVerified: true,
          provider: 'facebook'
        });
      } else {
        user.provider = 'facebook';
        user.displayName = user.displayName || profile.displayName;
        user.lastLogin = new Date();
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
}

const sendOauthError = (res, message) => {
  res.status(503).send(`<!doctype html><html><head><meta charset="utf-8"/></head><body><script>try{window.opener && window.opener.postMessage({type:'oauth-error',message:${JSON.stringify(message)}}, '${CLIENT_URL}');}catch(e){}window.close();</script></body></html>`);
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
    const { email, password } = req.body;

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

// OAuth Routes
if (HAS_GOOGLE) {
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth-failed' }), async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      await LoginLog.findOneAndUpdate(
        { userId: user._id },
        { userId: user._id, email: user.email, provider: 'google', lastLogin: new Date() },
        { upsert: true }
      );

      const payload = {
        type: 'oauth-success',
        token,
        user: { uid: user._id, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified }
      };

      res.send(`<!doctype html><html><head><meta charset="utf-8"/></head><body><script>(function(){var payload=${JSON.stringify(payload)};var targetOrigin='${CLIENT_URL}';try{window.opener && window.opener.postMessage(payload,targetOrigin);}catch(e){}window.close();})();</script></body></html>`);
    } catch (error) {
      res.redirect('/auth-failed');
    }
  });
} else {
  app.get('/api/auth/google', (req, res) => sendOauthError(res, 'Google OAuth not configured'));
  app.get('/api/auth/google/callback', (req, res) => sendOauthError(res, 'Google OAuth not configured'));
}

if (HAS_FACEBOOK) {
  app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  app.get('/api/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/auth-failed' }), async (req, res) => {
    try {
      const user = req.user;
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      await LoginLog.findOneAndUpdate(
        { userId: user._id },
        { userId: user._id, email: user.email, provider: 'facebook', lastLogin: new Date() },
        { upsert: true }
      );

      const payload = {
        type: 'oauth-success',
        token,
        user: { uid: user._id, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified }
      };

      res.send(`<!doctype html><html><head><meta charset="utf-8"/></head><body><script>(function(){var payload=${JSON.stringify(payload)};var targetOrigin='${CLIENT_URL}';try{window.opener && window.opener.postMessage(payload,targetOrigin);}catch(e){}window.close();})();</script></body></html>`);
    } catch (error) {
      res.redirect('/auth-failed');
    }
  });
} else {
  app.get('/api/auth/facebook', (req, res) => sendOauthError(res, 'Facebook OAuth not configured'));
  app.get('/api/auth/facebook/callback', (req, res) => sendOauthError(res, 'Facebook OAuth not configured'));
}

app.get('/auth-failed', (req, res) => {
  res.status(401).send(`<!doctype html><html><head><meta charset="utf-8"/></head><body><script>try{window.opener && window.opener.postMessage({type:'oauth-error',message:'OAuth failed'}, '${CLIENT_URL}');}catch(e){}window.close();</script></body></html>`);
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