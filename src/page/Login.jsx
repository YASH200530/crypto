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
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {isSignup ? "Sign Up" : "Login"}
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
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <img src="/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>

              <button
                onClick={() => loginWithProvider(facebookProvider, "Facebook")}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <img src="/facebook.svg" alt="Facebook" className="w-5 h-5" />
                Continue with Facebook
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
