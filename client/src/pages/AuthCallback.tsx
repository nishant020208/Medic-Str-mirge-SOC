import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from '../ui/Toast';
import { SEO } from '../components/SEO';
import { Button } from '../ui/Button';
import { useAuthStore } from '../store/authStore';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from Supabase after the OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!session?.user) {
          throw new Error('No user session found');
        }

        const { id, email } = session.user;
        const access_token = session.access_token;

        // Send the user info and access token to our backend
        const res = await fetch('/api/auth/google-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: JSON.stringify({ id, email, access_token }),
        });

        const resData = await res.json();

        if (!res.ok) {
          throw new Error(resData.error || 'Failed to establish session');
        }

        // Set the user in our auth store (which will be backed by Express session)
        setUser(resData.user);
        toast.success(`Welcome back, ${resData.user.email}`, 'Sanctum Veil Opened');

        // Redirect to home or shop based on role
        if (resData.user.role === 'pharmacist') {
          navigate('/dashboard');
        } else {
          navigate('/shop');
        }
      } catch (err: any) {
        console.error('Google callback error:', err);
        setError(err.message || 'An unknown error occurred');
        toast.error(err.message || 'Authentication failed', 'Auth Error');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="font-cinzel text-lg">Processing your sanctuary entry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
        <SEO
          title="Authentication Error | MediStore Sanctuary"
          description="Failed to authenticate devotee session in the sanctuary."
          noindex={true}
        />
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-surface-2 border border-danger text-accent-text flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
          </div>
          <h1 className="font-cinzel text-2xl font-bold text-text mb-4">Authentication Failed</h1>
          <p className="text-lg text-text-muted mb-6">{error}</p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/login')}
            className="w-full max-w-xs"
          >
            Try Again
          </Button>
          <div className="mt-6 text-xs text-text-muted">
            Or <span className="font-cinzel text-accent-text font-bold hover:underline cursor-pointer" onClick={() => navigate('/register')}>
              create an account
            </span>
          </div>
        </div>
      </div>
    );
  }

  // This should not be reached if loading and error are handled, but just in case
  return null;
};