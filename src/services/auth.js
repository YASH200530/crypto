import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth service class
class AuthService {
  constructor() {
    this.currentUser = null;
    this.authCallbacks = [];
  }

  // Register a callback for auth state changes
  onAuthStateChanged(callback) {
    this.authCallbacks.push(callback);
    
    // Immediately call with current user
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all callbacks of auth state change
  notifyAuthStateChange(user) {
    this.currentUser = user;
    this.authCallbacks.forEach(callback => callback(user));
  }

  // Initialize auth state from localStorage
  async initializeAuth() {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        // Verify token with server
        const response = await api.post('/auth/verify');
        const user = response.data.user;
        
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(user));
        this.notifyAuthStateChange(user);
        
        return user;
      } catch {
        // Token is invalid, clear storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.notifyAuthStateChange(null);
        return null;
      }
    } else {
      this.notifyAuthStateChange(null);
      return null;
    }
  }

  // Sign up with email and password
  async createUserWithEmailAndPassword(email, password, displayName = '') {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        displayName: displayName || email.split('@')[0]
      });

      const { token, user } = response.data;
      
      // Store token and user
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      this.notifyAuthStateChange(user);
      
      return { user };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  // Sign in with email and password
  async signInWithEmailAndPassword(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      
      // Store token and user
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      this.notifyAuthStateChange(user);
      
      return { user };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      
      // Map specific error messages for compatibility
      if (errorMessage === 'User not found') {
        const err = new Error(errorMessage);
        err.code = 'auth/user-not-found';
        throw err;
      } else if (errorMessage === 'Invalid password') {
        const err = new Error(errorMessage);
        err.code = 'auth/wrong-password';
        throw err;
      } else if (errorMessage === 'User already exists') {
        const err = new Error(errorMessage);
        err.code = 'auth/email-already-in-use';
        throw err;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Sign out
  async signOut() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.notifyAuthStateChange(null);
  }

  // Send password reset email (placeholder - you'd implement this on backend)
  async sendPasswordResetEmail(email) {
    try {
      // For now, just show a message - you can implement this on the backend
      console.log(`Password reset would be sent to: ${email}`);
      return Promise.resolve();
    } catch {
      throw new Error('Password reset failed');
    }
  }

  // Send email verification (placeholder)
  async sendEmailVerification(user) {
    try {
      console.log(`Email verification would be sent to: ${user.email}`);
      return Promise.resolve();
    } catch {
      throw new Error('Email verification failed');
    }
  }

  // Get current user
  getCurrentUser() {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  }

  // Sign in with popup (Google/Facebook)
  async signInWithPopup(provider) {
    const serverBase = API_URL.replace(/\/api\/?$/, '');
    const providerId = provider && provider.providerId;
    const path = providerId === 'facebook.com' ? '/auth/facebook' : '/auth/google';

    return new Promise((resolve, reject) => {
      try {
        const width = 520;
        const height = 600;
        const left = Math.floor(window.screenX + (window.innerWidth - width) / 2);
        const top = Math.floor(window.screenY + (window.innerHeight - height) / 2);
        const popup = window.open(
          `${serverBase}/api${path}`,
          'oauth-popup',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          reject(new Error('Popup blocked by browser'));
          return;
        }

        const onMessage = (event) => {
          const expectedOrigin = serverBase;
          if (!event.origin || !event.origin.startsWith(expectedOrigin)) {
            return;
          }
          const data = event.data || {};
          if (data.type === 'oauth-success' && data.token && data.user) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            this.notifyAuthStateChange(data.user);
            window.removeEventListener('message', onMessage);
            resolve({ user: data.user });
          } else if (data.type === 'oauth-error') {
            window.removeEventListener('message', onMessage);
            reject(new Error(data.error || 'Authentication failed'));
          }
        };

        window.addEventListener('message', onMessage);

        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            window.removeEventListener('message', onMessage);
          }
        }, 500);
      } catch (error) {
        reject(new Error(`Social login failed: ${error.message}`));
      }
    });
  }
}

// Create and export auth service instance
const auth = new AuthService();

// Initialize auth state
auth.initializeAuth();

export { auth, api };

// Export for compatibility with Firebase auth
export const onAuthStateChanged = (callback) => auth.onAuthStateChanged(callback);
export const signOut = () => auth.signOut();
export const createUserWithEmailAndPassword = (email, password) => 
  auth.createUserWithEmailAndPassword(email, password);
export const signInWithEmailAndPassword = (email, password) => 
  auth.signInWithEmailAndPassword(email, password);
export const sendPasswordResetEmail = (email) => 
  auth.sendPasswordResetEmail(email);
export const sendEmailVerification = (user) => 
  auth.sendEmailVerification(user);
export const signInWithPopup = (provider) => 
  auth.signInWithPopup(provider);

// Placeholder providers for compatibility
export const googleProvider = { providerId: 'google.com' };
export const facebookProvider = { providerId: 'facebook.com' };