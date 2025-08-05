# OAuth Setup Guide

This guide will help you set up Google and Facebook OAuth authentication for your crypto app.

## 🚀 Quick Start

1. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Set up OAuth applications** (see detailed steps below)

3. **Update your `.env` file** with the OAuth credentials

4. **Restart your server**:
   ```bash
   npm run dev
   ```

## 📋 Prerequisites

- Google account for Google OAuth
- Facebook account for Facebook OAuth
- Domain/localhost setup for redirect URIs

## 🔧 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google+ API** or **Google People API**

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name**: Crypto Trading App
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if in development

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - Development: `http://localhost:5173/oauth-callback.html`
   - Production: `https://yourdomain.com/oauth-callback.html`
5. Copy **Client ID** and **Client Secret**

### Step 4: Update Environment Variables

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/oauth-callback.html
```

## 📘 Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **Create App**
3. Choose **Consumer** app type
4. Fill in app details

### Step 2: Add Facebook Login Product

1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Choose **Web** platform

### Step 3: Configure Facebook Login

1. Go to **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs**:
   - Development: `http://localhost:5173/oauth-callback.html`
   - Production: `https://yourdomain.com/oauth-callback.html`
3. Enable **Login with the JavaScript SDK**

### Step 4: Get App Credentials

1. Go to **Settings** → **Basic**
2. Copy **App ID** and **App Secret**
3. Add your domain to **App Domains**

### Step 5: Update Environment Variables

```env
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:5173/oauth-callback.html
```

## 🔒 Security Configuration

### Production Settings

1. **Update redirect URIs** to use HTTPS
2. **Set NODE_ENV=production**
3. **Use secure session cookies**
4. **Restrict OAuth app domains**

### Environment Variables for Production

```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
GOOGLE_REDIRECT_URI=https://yourdomain.com/oauth-callback.html
FACEBOOK_REDIRECT_URI=https://yourdomain.com/oauth-callback.html
```

## 🧪 Testing OAuth

### Test Google Login

1. Click "Continue with Google" button
2. Should open Google OAuth popup
3. Grant permissions
4. Should redirect back and log you in

### Test Facebook Login

1. Click "Continue with Facebook" button
2. Should open Facebook OAuth popup
3. Grant permissions
4. Should redirect back and log you in

## 🐛 Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Check that redirect URIs match exactly in OAuth app settings
   - Include the protocol (http/https)

2. **"invalid_client"**
   - Verify Client ID and Client Secret are correct
   - Check environment variables are loaded

3. **"access_denied"**
   - User cancelled OAuth flow
   - Check OAuth consent screen configuration

4. **Popup blocked**
   - Browser blocked the OAuth popup
   - Add site to popup exceptions

### Debug Mode

Add this to your `.env` for detailed OAuth logging:

```env
DEBUG=oauth:*
```

## 📊 OAuth Flow

1. User clicks social login button
2. Frontend requests auth URL from backend
3. Popup opens with OAuth provider
4. User grants permissions
5. Provider redirects to callback page
6. Callback page sends code to parent window
7. Frontend sends code to backend
8. Backend exchanges code for tokens
9. Backend creates/updates user account
10. Backend returns JWT token
11. Frontend stores token and redirects

## 🔄 User Data Mapping

### Google User Data
- `googleId` → profile.id
- `email` → profile.email
- `displayName` → profile.name
- `firstName` → profile.given_name
- `lastName` → profile.family_name
- `profilePicture` → profile.picture

### Facebook User Data
- `facebookId` → profile.id
- `email` → profile.email
- `displayName` → profile.name
- `firstName` → profile.first_name
- `lastName` → profile.last_name
- `profilePicture` → profile.picture.data.url

## 📈 Production Considerations

1. **Rate Limiting**: Implement OAuth request rate limiting
2. **Error Handling**: Proper error messages for users
3. **Analytics**: Track OAuth success/failure rates
4. **Monitoring**: Monitor OAuth endpoint performance
5. **Backup**: Email/password login as fallback

## 🔧 Advanced Configuration

### Custom Scopes

Add additional scopes in backend OAuth routes:

```javascript
// Google - request additional permissions
scope=openid%20email%20profile%20https://www.googleapis.com/auth/user.birthday.read

// Facebook - request additional permissions
scope=email,user_birthday,user_location
```

### Account Linking

The system automatically links OAuth accounts with existing email accounts:

1. If user exists with same email → Links OAuth ID
2. If new user → Creates new account
3. Updates provider information

This allows users to login with multiple methods for the same account.