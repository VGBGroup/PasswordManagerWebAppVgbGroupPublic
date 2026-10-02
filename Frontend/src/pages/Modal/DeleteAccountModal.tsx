// components/Modal/DeleteAccountModal.tsx
import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { useToast } from '@/pages/popups/ToastProvider';
import client from '@/api/client';

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  twofaEnabled: boolean;
}

export function DeleteAccountModal({
  open,
  onClose,
  twofaEnabled,
}: DeleteAccountModalProps) {
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  if (!open) return null;

  function handleClose() {
    setTwoFactorCode('');
    setConfirmationText('');
    setError('');
    onClose();
  }

  function parseErrorMessage(err: any): string {
    const data = err?.response?.data;
    if (!data) return err?.message || 'An unexpected error occurred.';
    if (typeof data === 'string') return data;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.title && typeof data.title === 'string') return data.title;
    return 'Failed to delete account.';
  }

  async function handleDelete() {
    setError('');

    if (confirmationText.toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    if (twofaEnabled && (!twoFactorCode || twoFactorCode.length !== 6)) {
      setError('Please enter a valid 6-digit 2FA code.');
      return;
    }

    setLoading(true);

    try {
      // 1. Verify 2FA code if enabled
      if (twofaEnabled) {
        await client.post('user/2fa/verify-authenticated', {
          code: twoFactorCode,
        });
      }

      // 2. Perform Account Deletion
      await client.delete('user/account');

      showToast('Account permanently deleted.', 'info');
      handleClose();

      // Clear local storage / session and redirect to login
      localStorage.clear();
      window.location.href = '/login';
    } catch (err: any) {
      setError(parseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const isButtonDisabled =
    loading ||
    confirmationText.toUpperCase() !== 'DELETE' ||
    (twofaEnabled && twoFactorCode.length !== 6);

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 20,
          padding: 24,
          width: '100%',
          maxWidth: 420,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={20} style={{ color: '#ef4444' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>
              Delete Account
            </h2>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Box */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            backgroundColor: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
            This action is <strong style={{ color: '#ef4444' }}>irreversible</strong>. All stored passwords, encryption keys, and account settings will be permanently destroyed.
          </p>
        </div>

        {/* Text Confirmation */}
        <div style={{ marginBottom: 16 }}>
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
            Type "DELETE" to confirm
          </label>
          <input
            type="text"
            placeholder="DELETE"
            value={confirmationText}
            onChange={(e) => {
              setConfirmationText(e.target.value);
              if (error) setError('');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.9rem',
              fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* 2FA Input (Required if 2FA is active) */}
        {twofaEnabled && (
          <div style={{ marginBottom: 16 }}>
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
              2FA Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => {
                setTwoFactorCode(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '1rem',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.2em',
                textAlign: 'center',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                border: error ? '1px solid #ef4444' : '1px solid var(--border)',
                borderRadius: 8,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Error display */}
        {error && (
          <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: 16 }}>
            {error}
          </p>
        )}

        {/* Action Button */}
        <button
          onClick={handleDelete}
          disabled={isButtonDisabled}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
            backgroundColor: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
            opacity: isButtonDisabled ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Trash2 size={16} />
          {loading ? 'Deleting Account…' : 'Permanently Delete Account'}
        </button>
      </div>
    </div>
  );
}