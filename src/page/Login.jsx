import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  googleProvider,
  facebookProvider,
} from "../services/auth";
import { AnimatePresence, motion } from "framer-motion";
import emailjs from "@emailjs/browser";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ EmailJS Welcome Mail
  const sendWelcomeEmail = async (email) => {
    try {
      await emailjs.send(
        "service_gy5dacm",
        "template_vq91bu8",
        { to_email: email },
        "XRDV3jAVQ485rMlMY"
      );
      console.log("✅ Welcome email sent to", email);
    } catch (error) {
      console.error("❌ EmailJS error:", error);
    }
  };

  const shouldSendWelcomeEmail = async () => {
    // This logic is now handled on the backend
    return true; // Always send for now, backend will handle rate limiting
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      let userCred;
      if (isSignup) {
        userCred = await createUserWithEmailAndPassword(email, password);
        await sendEmailVerification(userCred.user);
        setError("");
        alert("Signup successful! Account created and ready to use.");
        setIsSignup(false);
        return;
      }

      userCred = await signInWithEmailAndPassword(email, password);
      const user = userCred.user;

      // Email verification is now handled on backend, so we skip this check
      const sendNow = await shouldSendWelcomeEmail(user);
      if (sendNow) await sendWelcomeEmail(user.email);

      setError("");
      navigate("/");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found. Please sign up first.");
        setIsSignup(true);
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (err.code === "auth/email-already-in-use" && isSignup) {
        setError("Email already registered. Please login.");
        setIsSignup(false);
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithProvider = async (provider, providerName) => {
    setIsLoading(true);
    setError("");
    
    try {
      const result = await signInWithPopup(provider);
      const user = result.user;

      const shouldSend = await shouldSendWelcomeEmail(user);
      if (shouldSend) {
        await sendWelcomeEmail(user.email);
      }

      setError("");
      navigate("/");
    } catch (err) {
      setError(`${providerName} login failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return alert("Please enter your email first.");
    try {
      await sendPasswordResetEmail(email);
      alert("Password reset link sent to " + email);
    } catch (error) {
      alert("Reset failed: " + error.message);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-900 dark:to-gray-800 px-4"
      >
        <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-lg rounded-2xl p-8">
          <motion.div
            key={isSignup ? "signup" : "login"}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
              {isSignup ? "Create an Account" : "Welcome Back"}
            </h2>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              {!isSignup && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  isSignup ? "Sign Up" : "Login"
                )}
              </button>
            </form>

            <div className="my-4 flex items-center gap-2">
              <hr className="flex-grow border-gray-300 dark:border-gray-600" />
              <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
              <hr className="flex-grow border-gray-300 dark:border-gray-600" />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => loginWithProvider(googleProvider, "Google")}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button
                onClick={() => loginWithProvider(facebookProvider, "Facebook")}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </>
                )}
              </button>
            </div>

            <p className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                {isSignup ? "Login" : "Sign Up"}
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
