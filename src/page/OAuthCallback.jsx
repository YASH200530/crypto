import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/auth';

export default function OAuthCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { provider } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setError(`OAuth error: ${error}`);
          setStatus('error');
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setStatus('error');
          return;
        }

        // Send the authorization code to backend
        const response = await api.post(`/auth/${provider}/callback`, { code });
        const { token, user } = response.data;

        // Store token and user
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));

        setStatus('success');

        // Redirect to the original page or home
        const redirectPath = localStorage.getItem('oauthRedirect') || '/';
        localStorage.removeItem('oauthRedirect');
        
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 1500);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setError(error.response?.data?.error || 'Authentication failed');
        setStatus('error');
      }
    };

    handleOAuthCallback();
  }, [provider, searchParams]);

  const handleRetry = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-lg rounded-2xl p-8 text-center">
        {status === 'processing' && (
          <div>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Processing Login...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we complete your {provider} login.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Login Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You have been successfully logged in with {provider}.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you now...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Login Failed
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-6">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}