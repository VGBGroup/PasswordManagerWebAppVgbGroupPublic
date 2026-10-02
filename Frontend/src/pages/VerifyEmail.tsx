// pages/VerifyEmailPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '@/api/client';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const verifiedRef = useRef(false); // Prevents duplicate calls in StrictMode

  useEffect(() => {
    if (verifiedRef.current) return;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    verifiedRef.current = true;

    client.get(`user/verify-email?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Your email has been successfully verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      });
  }, [searchParams]);

  const isMobile = () => {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  const handleContinue = () => {
    const onMobile = isMobile();
    const appScheme = 'v2vault://dashboard'; // Replace with your app's deep link scheme

    if (onMobile) {
      // Try to open the app
      const start = Date.now();
      window.location.href = appScheme;

      // Fallback: after a short delay, if the app didn't open, go to web login
      setTimeout(() => {
        const elapsed = Date.now() - start;
        if (elapsed < 2500) {
          // If the app opened, the timer will be paused or the page hidden.
          // If we're still here, app didn't open – navigate to login.
          window.location.href = '/login';
        }
      }, 3000);
    } else {
      navigation.navigate('/login');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        {status === 'verifying' && <p style={{ color: 'var(--muted-foreground)' }}>Verifying your email…</p>}
        {status === 'success' && (
          <>
            <h2 style={{ color: 'var(--foreground)', marginBottom: 12 }}>Email verified!</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: 20 }}>{message}</p>
            <button
              onClick={handleContinue}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '1rem',
                textDecoration: 'underline',
              }}
            >
              Continue to login
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 style={{ color: '#ef4444', marginBottom: 12 }}>Verification failed</h2>
            <p style={{ color: 'var(--muted-foreground)' }}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}