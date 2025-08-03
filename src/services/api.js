import { api } from './auth.js';

// 🔗 Fetch crypto coins from CoinGecko
export const fetchCoins = async (page = 1) => {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=${page}`
    );
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
};

// 🔗 User Profile API
export const getUserProfile = async () => {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/user/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};

// 🔗 Wallet API
export const addMoneyToWallet = async (amount) => {
  try {
    const response = await api.post('/wallet/add-money', { amount });
    return response.data;
  } catch (error) {
    console.error('Add money error:', error);
    throw error;
  }
};

export const getWalletBalance = async () => {
  try {
    const response = await api.get('/wallet/balance');
    return response.data;
  } catch (error) {
    console.error('Get balance error:', error);
    throw error;
  }
};

// 🔗 Transaction API
export const getTransactions = async () => {
  try {
    const response = await api.get('/transactions');
    return response.data;
  } catch (error) {
    console.error('Get transactions error:', error);
    throw error;
  }
};

export const executeTrade = async (tradeData) => {
  try {
    const response = await api.post('/transactions/trade', tradeData);
    return response.data;
  } catch (error) {
    console.error('Execute trade error:', error);
    throw error;
  }
};

// 🔗 Login Logs API
export const getLoginLogs = async () => {
  try {
    const response = await api.get('/login-logs');
    return response.data;
  } catch (error) {
    console.error('Get login logs error:', error);
    throw error;
  }
};

// 🔗 Database operations (replacing Firestore)
export const dbOperations = {
  // Get document
  getDoc: async (collection) => {
    try {
      if (collection === 'users') {
        return await getUserProfile();
      } else if (collection === 'loginLogs') {
        return await getLoginLogs();
      }
      throw new Error(`Collection ${collection} not supported`);
    } catch (error) {
      console.error('Get doc error:', error);
      throw error;
    }
  },

  // Set document
  setDoc: async (collection, docId, data, options = {}) => {
    try {
      if (collection === 'users') {
        if (options.merge) {
          return await updateUserProfile(data);
        } else {
          return await updateUserProfile(data);
        }
      }
      throw new Error(`Collection ${collection} not supported for setDoc`);
    } catch (error) {
      console.error('Set doc error:', error);
      throw error;
    }
  },

  // Update document
  updateDoc: async (collection, docId, data) => {
    try {
      if (collection === 'users') {
        return await updateUserProfile(data);
      }
      throw new Error(`Collection ${collection} not supported for updateDoc`);
    } catch (error) {
      console.error('Update doc error:', error);
      throw error;
    }
  }
};

// Export helper functions for compatibility with Firestore
export const doc = (collection, docId) => ({ collection, docId });
export const getDoc = async (docRef) => {
  const data = await dbOperations.getDoc(docRef.collection, docRef.docId);
  return {
    exists: () => !!data,
    data: () => data
  };
};
export const setDoc = async (docRef, data, options) => {
  return await dbOperations.setDoc(docRef.collection, docRef.docId, data, options);
};
export const updateDoc = async (docRef, data) => {
  return await dbOperations.updateDoc(docRef.collection, docRef.docId, data);
};
export const serverTimestamp = () => new Date();
