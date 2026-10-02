import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function MobileBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // Don't show on auth pages
    const isAuthPage = ['/login', '/register', '/verify-email'].includes(window.location.pathname);
    // Check if user already dismissed it (localStorage)
    const dismissed = localStorage.getItem('mobileBannerDismissed') === 'true';

    if (isMobile && !isAuthPage && !dismissed) {
      setShowBanner(true);
    }
  }, [location.pathname]);

  const handleDownload = () => {
    // Redirect to your Play Store link or a download page
    window.location.href = 'https://play.google.com/store/apps/details?id=com.vgbgroup.v2vault';
  };

  const handleDismiss = () => {
    localStorage.setItem('mobileBannerDismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 20,
    }}>
      <h2 style={{ color: '#22C55E', marginBottom: 8 }}>📱 Get the App!</h2>
      <p style={{ color: '#fff', textAlign: 'center', marginBottom: 20 }}>
        The mobile app gives you a better experience.
      </p>
      <button
        onClick={handleDownload}
        style={{
          backgroundColor: '#22C55E',
          color: '#fff',
          border: 'none',
          padding: '14px 40px',
          borderRadius: 8,
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        Download Now
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#8E96A3',
          fontSize: '0.8rem',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Continue to Web Version
      </button>
    </div>
  );
}