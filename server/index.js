import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import emailService from './emailService.js';

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

// Initialize email service
emailService.initialize();

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
  resetPasswordToken: String,
  resetPasswordExpires: Date,
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
      await emailService.sendWelcomeEmail(user.email, user.displayName);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError.message);
      // Don't fail registration if email fails
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

    // Send deposit confirmation email
    try {
      await emailService.sendDepositConfirmation(
        user.email, 
        user.displayName || user.email.split('@')[0], 
        parseFloat(amount), 
        user.balance
      );
    } catch (emailError) {
      console.error('Failed to send deposit confirmation email:', emailError.message);
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
    const { type, coinId, coinName, amount, price, quantity } = req.body;
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

    // Send trade confirmation email
    try {
      await emailService.sendTradeConfirmation(
        user.email,
        user.displayName || user.email.split('@')[0],
        {
          action: type,
          coinName,
          quantity,
          price,
          totalAmount: totalCost,
          newBalance: user.balance
        }
      );
    } catch (emailError) {
      console.error('Failed to send trade confirmation email:', emailError.message);
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

// Password Reset Routes
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.displayName || user.email.split('@')[0],
        resetToken
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError.message);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findOne({
      _id: decoded.userId,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});