import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendEmail, sendCustomEmail, sendBulkEmail, testEmailConnection } from './emailService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

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
  lastLogin: { type: Date, default: Date.now },
  // KYC fields
  kycStatus: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
  kycMobile: { type: String, default: '' },
  kycVerifiedAt: { type: Date }
});

const User = mongoose.model('User', userSchema);

// OTP Session Schema for KYC during login
const otpSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pan: { type: String, required: true },
  mobile: { type: String, required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const OtpSession = mongoose.model('OtpSession', otpSessionSchema);

// Helper: generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: send SMS (stub). Replace with an actual SMS provider integration.
const sendSms = async (mobileNumber, message) => {
  // In production, integrate with an SMS gateway (e.g., Twilio, MSG91, etc.)
  console.log(`📲 SMS to ${mobileNumber}: ${message}`);
  return { success: true };
};

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
    const { email, password, pan, mobile } = req.body;

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

    // If KYC already verified, proceed directly
    if (user.kycStatus === 'verified' && user.pan && user.kycMobile) {
      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          uid: user._id,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        }
      });
    }

    // If KYC is not verified, ensure PAN and mobile are provided
    if (!pan || !mobile) {
      return res.status(200).json({ requiresKyc: true, reason: 'missing_pan_mobile' });
    }

    // Initiate KYC OTP flow
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create session
    const session = await OtpSession.create({
      userId: user._id,
      pan,
      mobile,
      otpHash,
      expiresAt
    });

    // Send OTP via SMS (stub)
    await sendSms(mobile, `Your KYC OTP is ${otp}. It is valid for 5 minutes.`);

    // Also send via email as fallback for testing environments
    try {
      await sendCustomEmail(
        user.email,
        'Your KYC OTP',
        `<p>Your KYC OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`
      );
    } catch (e) {
      console.warn('Failed to send fallback email for OTP:', e?.message);
    }

    return res.status(200).json({ requiresKyc: true, sessionId: session._id.toString(), message: 'OTP sent to registered mobile' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify KYC OTP and complete login
app.post('/api/auth/verify-kyc-otp', async (req, res) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Session and OTP are required' });
    }

    const session = await OtpSession.findById(sessionId);
    if (!session) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    if (new Date() > session.expiresAt) {
      await session.deleteOne();
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (session.attempts >= 5) {
      await session.deleteOne();
      return res.status(429).json({ error: 'Too many attempts' });
    }

    const isMatch = await bcrypt.compare(otp, session.otpHash);
    if (!isMatch) {
      session.attempts += 1;
      await session.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP is valid -> complete KYC and login
    const user = await User.findById(session.userId);
    if (!user) {
      await session.deleteOne();
      return res.status(404).json({ error: 'User not found' });
    }

    user.pan = session.pan; // store/update PAN
    user.kycMobile = session.mobile;
    user.kycStatus = 'verified';
    user.kycVerifiedAt = new Date();
    user.lastLogin = new Date();
    await user.save();

    await session.deleteOne();

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

    return res.json({
      message: 'KYC verified and login successful',
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