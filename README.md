# Crypto Trading App

A modern crypto trading application built with **Vite + React + Tailwind CSS + Express + MongoDB**.

## Features

- 🔐 **JWT Authentication** - Secure user authentication
- 💰 **Wallet Management** - Add money, view balance
- 📊 **Crypto Trading** - Buy/sell cryptocurrencies
- 📈 **Transaction History** - Track all trades
- 👤 **User Profiles** - Manage personal information
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

### Frontend
- **Vite** - Fast build tool
- **React 19** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animations
- **React Router** - Navigation
- **Axios** - HTTP client

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)

### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd crypto-app
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/crypto-app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173

# Email Configuration with Nodemailer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Crypto Trading App
```

Create a `.env.local` file for client configuration:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# For local MongoDB
mongod
```

Or use MongoDB Atlas for cloud database.

### 4. Configure Email Service (Optional)

The app uses Nodemailer to send emails for:
- Welcome emails on registration
- Password reset emails
- Trade confirmations
- Deposit confirmations

**For Gmail:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: [Google App Passwords Guide](https://support.google.com/accounts/answer/185833)
3. Update the `.env` file with your Gmail credentials:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM=your-gmail@gmail.com
   EMAIL_FROM_NAME=Crypto Trading App
   ```

**For other email providers:**
- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` with port 587
- **Yahoo**: Use `smtp.mail.yahoo.com` with port 587
- **Custom SMTP**: Update the host, port, and credentials accordingly

If email configuration fails, the app will still work but won't send emails.

### 5. Run the Application
```bash
# This will start both the Express server and Vite dev server
npm run dev

# Or run them separately:
npm run server  # Express server on port 5000
npm run client  # Vite dev server on port 5173
```

### 6. Access the App
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify JWT token
- `POST /api/auth/forgot-password` - Send password reset email
- `POST /api/auth/reset-password` - Reset password with token

### User Profile
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Wallet
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/add-money` - Add money to wallet

### Transactions
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions/trade` - Execute trade

## Migration from Firebase

This app was migrated from Firebase to Express + MongoDB:

- **Firebase Auth** → **JWT Authentication**
- **Firestore** → **MongoDB with Mongoose**
- **Firebase SDK** → **Axios HTTP client**
- **Real-time updates** → **REST API calls**

The frontend code structure remains largely the same, with updated service layers for authentication and data management.

## Development

### Project Structure
```
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── services/      # API and auth services
│   └── App.jsx        # Main app component
├── server/
│   └── index.js       # Express server
├── package.json
└── README.md
```

### Available Scripts
- `npm run dev` - Start both server and client
- `npm run server` - Start Express server only
- `npm run client` - Start Vite dev server only
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the ISC License.
