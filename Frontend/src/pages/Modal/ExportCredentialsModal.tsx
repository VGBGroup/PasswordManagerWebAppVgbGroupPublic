// components/Modal/ExportCredentialsModal.tsx
import { useState } from 'react';
import { Download, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/pages/popups/ToastProvider';
import { downloadCredentials } from '@/functions/DownloadCredentials';
import { useAuthStore } from '@/auth';

type ExportMode = 'encrypted' | 'unencrypted';

interface ExportCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  twofaEnabled: boolean;
}

export function ExportCredentialsModal({
  open,
  onClose,
  twofaEnabled,
}: ExportCredentialsModalProps) {
  const [mode, setMode] = useState<ExportMode>('encrypted');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tfaError, setTfaError] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const { dataKey } = useAuthStore();

  if (!open) return null;

  function handleClose() {
    setTwoFactorCode('');
    setTfaError('');
    onClose();
  }

  // Safely extract string message from error object or ASP.NET ProblemDetails
  function parseErrorMessage(err: any): string {
    const data = err?.response?.data;
    if (!data) return err?.message || 'An unexpected error occurred.';
    if (typeof data === 'string') return data;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.title && typeof data.title === 'string') return data.title;
    if (data.errors && typeof data.errors === 'object') {
      const firstError = Object.values(data.errors).flat()[0];
      if (typeof firstError === 'string') return firstError;
    }
    return 'Invalid 2FA code or request failed.';
  }

  async function handleExport() {
    setTfaError('');

    if (mode === 'unencrypted') {
      if (!twofaEnabled) {
        showToast('Two-Factor Authentication must be enabled on your account to export unencrypted data.', 'error');
        return;
      }
      if (!twoFactorCode || twoFactorCode.length !== 6) {
        setTfaError('Please enter a valid 6-digit 2FA code.');
        return;
      }
      if (!dataKey) {
        showToast('Vault encryption key is unavailable. Please re-authenticate and try again.', 'error');
        return;
      }
    }

    setLoading(true);

    try {
      await downloadCredentials(showToast, {
        encrypted: mode === 'encrypted',
        twoFactorCode: mode === 'unencrypted' ? twoFactorCode : undefined,
      }, dataKey ?? undefined);

      handleClose();
    } catch (err: any) {
      const message = parseErrorMessage(err);

      if (mode === 'unencrypted') {
        setTfaError(message);
      } else {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 24,
          width: '100%',
          maxWidth: 420,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Export Credentials
          </h2>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => {
              setMode('encrypted');
              setTfaError('');
            }}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.8rem',
              fontFamily: 'JetBrains Mono, monospace',
              borderRadius: 8,
              cursor: 'pointer',
              border: mode === 'encrypted' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              backgroundColor: mode === 'encrypted' ? 'rgba(34,197,94,0.1)' : 'transparent',
              color: mode === 'encrypted' ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            Encrypted CSV
          </button>
          <button
            onClick={() => setMode('unencrypted')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '0.8rem',
              fontFamily: 'JetBrains Mono, monospace',
              borderRadius: 8,
              cursor: 'pointer',
              border: mode === 'unencrypted' ? '1.5px solid #f59e0b' : '1px solid var(--border)',
              backgroundColor: mode === 'unencrypted' ? 'rgba(245,158,11,0.1)' : 'transparent',
              color: mode === 'unencrypted' ? '#f59e0b' : 'var(--muted-foreground)',
            }}
          >
            Unencrypted CSV
          </button>
        </div>

        {/* Mode Explanations & 2FA Verification */}
        {mode === 'unencrypted' ? (
          <>
            <div
              style={{
                display: 'flex',
                gap: 8,
                backgroundColor: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
                Unencrypted exports expose plain-text credentials. Security verification via your 2FA code is required to proceed.
              </p>
            </div>

            <label
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              2FA Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => {
                setTwoFactorCode(e.target.value.replace(/\D/g, ''));
                if (tfaError) setTfaError('');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '1rem',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.2em',
                textAlign: 'center',
                marginBottom: tfaError ? 6 : 16,
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                border: tfaError ? '1px solid #ef4444' : '1px solid var(--border)',
                borderRadius: 8,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {tfaError && (
              <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: 16 }}>
                {tfaError}
              </p>
            )}
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: 8,
              backgroundColor: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 16,
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
              Your export file will be encrypted using your current vault key.
            </p>
          </div>
        )}

        {/* Export Submit Button */}
        <button
          onClick={handleExport}
          disabled={loading || (mode === 'unencrypted' && twoFactorCode.length !== 6)}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
            backgroundColor: mode === 'unencrypted' ? '#f59e0b' : 'var(--primary)',
            color: mode === 'unencrypted' ? '#000' : 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 8,
            cursor: loading || (mode === 'unencrypted' && twoFactorCode.length !== 6) ? 'not-allowed' : 'pointer',
            opacity: loading || (mode === 'unencrypted' && twoFactorCode.length !== 6) ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Download size={16} />
          {loading ? 'Verifying & Exporting…' : 'Export File'}
        </button>
      </div>
    </div>
  );
}