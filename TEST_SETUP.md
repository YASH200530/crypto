# Test Setup Guide

This guide will help you test the authentication system step by step.

## 🧪 Testing Email/Password Login

### 1. Start the Server
```bash
npm run dev
```

### 2. Test Registration
1. Go to `http://localhost:5173/login`
2. Click "Sign Up"
3. Enter test email: `test@example.com`
4. Enter password: `password123`
5. Click "Sign Up"

### 3. Test Login
1. Go to `http://localhost:5173/login`
2. Enter the same credentials
3. Click "Login"

## 🔍 Debugging Steps

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors during login

### Check Network Tab
1. Open DevTools → Network tab
2. Try to login
3. Check if requests to `/api/auth/login` are successful
4. Look for 200 status codes

### Check Local Storage
1. Open DevTools → Application tab
2. Go to Local Storage → `http://localhost:5173`
3. After successful login, you should see:
   - `authToken`: JWT token
   - `user`: User object

## 🚨 Common Issues & Fixes

### Issue 1: "Buffering" / Infinite Loading
**Symptoms**: Page keeps loading, never shows content
**Fix**: 
1. Clear browser cache and localStorage
2. Check browser console for errors
3. Restart the server

**Clear localStorage**:
```javascript
// Run in browser console
localStorage.clear();
window.location.reload();
```

### Issue 2: Login Not Working
**Symptoms**: Login form submits but nothing happens
**Check**:
1. Server is running on port 5000
2. MongoDB is connected
3. No errors in server console

**Server logs should show**:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
```

### Issue 3: OAuth Not Working
**For testing without OAuth apps**:
1. Only test email/password login first
2. OAuth requires actual Google/Facebook app setup
3. See OAUTH_SETUP.md for complete OAuth setup

## ⚡ Quick Debug Commands

### Clear All Data
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
window.location.href = '/login';
```

### Check Auth State
```javascript
// Run in browser console
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));
```

### Test API Directly
```javascript
// Test login API directly
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 🎯 Step-by-Step Login Test

### 1. Fresh Start
```bash
# Clear everything
rm -rf node_modules/.cache
npm run dev
```

### 2. Open Browser
- Go to `http://localhost:5173`
- Should redirect to `/login`

### 3. Create Account
- Click "Sign Up"
- Use: `test@test.com` / `test123`
- Should show success message

### 4. Login
- Use same credentials
- Should redirect to dashboard

### 5. Check Dashboard
- Should see "Crypto Dashboard" header
- User avatar in top right
- No loading spinner

## 🔧 Environment Check

Make sure your `.env` file has:
```env
MONGODB_URI=mongodb://localhost:27017/crypto-app
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 📞 If Still Not Working

1. **Check server logs** for errors
2. **Check browser console** for frontend errors
3. **Try incognito mode** to avoid cache issues
4. **Restart everything**:
   ```bash
   # Kill all node processes
   pkill -f node
   
   # Restart
   npm run dev
   ```

## 🎮 Test User Accounts

For testing, you can create these accounts:
- `admin@test.com` / `admin123`
- `user@test.com` / `user123`
- `demo@test.com` / `demo123`

Each should work independently for testing different scenarios.