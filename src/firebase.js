import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Firebase config (DO NOT expose this in public repos)
const firebaseConfig = {
  apiKey: "AIzaSyBAZ6HGBrcYIHa4Kce3mm1i63iHzUXzKTk",
  authDomain: "crypto-96ce2.firebaseapp.com",
  projectId: "crypto-96ce2",
  storageBucket: "crypto-96ce2.appspot.com",
  messagingSenderId: "309255778821",
  appId: "1:309255778821:web:5b453db2aecb77f6bf626c"
};

// ✅ Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ✅ Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// ✅ Exports
export {
  auth,
  db,
  googleProvider,
  facebookProvider
};
