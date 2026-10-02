import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './auth';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { RegisterPage } from './pages/RegisterPage';
import './index.css';
import { ToastProvider, useToast } from './pages/popups/ToastProvider';
import { registerToastHandler, registerUpgradeModalHandler } from './api/client';
import { VerifyEmailPage } from './pages/VerifyEmail';
import { UpgradeModal } from './pages/Modal/UpgradeModal';
import { MobileBanner } from '@/components/MobileBanner';

function ToastBridge() {
  const { showToast } = useToast();
  useEffect(() => {
    registerToastHandler((msg) => showToast(msg, 'error'));
  }, [showToast]);
  return null;
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const token = useAuthStore(s => s.token);
  const isHydrating = useAuthStore(s => s.isHydrating);
  const initAuth = useAuthStore(s => s.initAuth);

  // ── Upgrade modal state ──
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [upgradeUrl, setUpgradeUrl] = useState('');
  const [upgradeLimit, setUpgradeLimit] = useState(5);

  const closeUpgradeModal = () => setUpgradeModalOpen(false);

  // ── Register the upgrade modal handler (once) ──
  useEffect(() => {
    registerUpgradeModalHandler((message, url, limit) => {
      setUpgradeMessage(message);
      setUpgradeUrl(url);
      setUpgradeLimit(limit);
      setUpgradeModalOpen(true);
    });
  }, []);

  // ── Dark mode sync ──
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // ── Auth hydration ──
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isHydrating) {
    return <div className="loading-screen">Securing session...</div>;
  }

  return (
    <ToastProvider>
      <ToastBridge />
      <BrowserRouter>
        <MobileBanner />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            path="/dashboard"
            element={
              token ? (
                <Dashboard isDark={isDark} setIsDark={setIsDark} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global upgrade modal – shown on any 402 needsUpgrade response */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={closeUpgradeModal}
        message={upgradeMessage}
        upgradeUrl={upgradeUrl}
        currentLimit={upgradeLimit}
      />
    </ToastProvider>
  );
}