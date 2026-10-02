// components/Modal/TwoFactor.tsx
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import client from '@/api/client';
import { Toggle } from '../SecondaryPages/Settings';

type Stage = 'closed' | 'intro' | 'scanning' | 'showing-codes' | 'confirm-disable';

export function TwoFactorSettings({ enabled, onStatusChange }: { enabled: boolean, onStatusChange: (enabled: boolean) => void }) {
    const [stage, setStage] = useState<Stage>('closed');
    const [otpauthUrl, setOtpauthUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    function closeModal() {
        setStage('closed');
        setCode('');
        setError('');
        // Only clear secrets if setup wasn't completed — recovery codes screen closing means "done"
        if (recoveryCodes.length === 0) {
            setOtpauthUrl('');
            setSecret('');
        }
    }

    async function startSetup() {
        setError('');
        setLoading(true);
        try {
            const { data } = await client.post('user/2fa/setup');
            setOtpauthUrl(data.otpAuthUrl);
            setSecret(data.secret);
            setStage('scanning');
        } catch {
            setError('Could not start setup. Try again.');
        } finally {
            setLoading(false);
        }
    }

    async function confirmCode() {
        setError('');
        setLoading(true);
        try {
            const { data } = await client.post('user/2fa/enable', { code });
            setRecoveryCodes(data.recoveryCodes);
            setStage('showing-codes');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid code. Try again.');
        } finally {
            setLoading(false);
        }
    }

    async function disable2FA() {
        setError('');

        if (!code || code.length !== 6) {
            setError('Please enter a valid 6-digit 2FA code.');
            return;
        }

        setLoading(true);

        try {
            await client.post('user/2fa/verify-authenticated', {
                code: code,
            });

            const { data } = await client.post('user/2fa/disable', { code });

            if (data && data.success === false) {
                setError(data.message || 'Invalid code. Could not disable 2FA.');
                return;
            }

            finishAndClose(false);
        } catch (err: any) {
            // Extract string message instead of passing the full error object
            setError(err.response?.data?.message || err.message || 'Failed to disable 2FA. Try again.');
        } finally {
            setLoading(false);
        }
    }

    function finishAndClose(newStatus: boolean) {
        setStage('closed');
        setRecoveryCodes([]);
        setOtpauthUrl('');
        setSecret('');
        setCode('');
        onStatusChange(newStatus);
        // window.location.reload(); // simplest way to refresh twofa_enabled from settings; swap for a refetch if you have one
    }

    function copySecret() {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <>
            {/* Trigger */}
            <Toggle
                checked={enabled}
                onChange={() => {
                    if (enabled) {
                        setStage('confirm-disable');
                    } else {
                        setStage('intro');
                    }
                }}
            />

            {/* Modal */}
            {stage !== 'closed' && (
                <div
                    onClick={closeModal}
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: 16,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: 12, padding: 24, width: '100%', maxWidth: 400,
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                                {stage === 'intro' && 'Enable Two-Factor Authentication'}
                                {stage === 'scanning' && 'Scan QR Code'}
                                {stage === 'showing-codes' && 'Save Your Recovery Codes'}
                                {stage === 'confirm-disable' && 'Disable Two-Factor Authentication'}
                            </h2>
                            {stage !== 'showing-codes' && (
                                <button
                                    onClick={closeModal}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {stage === 'intro' && (
                            <>
                                <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 20 }}>
                                    You'll scan a QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.)
                                    and confirm a code to turn this on.
                                </p>
                                <button
                                    onClick={startSetup}
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'var(--primary)',
                                        color: 'var(--primary-foreground)', border: 'none', borderRadius: 8,
                                        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                                    }}
                                >
                                    {loading ? 'Starting…' : 'Continue'}
                                </button>
                            </>
                        )}

                        {stage === 'scanning' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                    <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
                                        <QRCodeSVG value={otpauthUrl} size={180} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', marginBottom: 6 }}>
                                        Can't scan? Enter this key manually:
                                    </p>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--muted)',
                                        borderRadius: 6, padding: '8px 10px',
                                    }}>
                                        <code style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', flex: 1, wordBreak: 'break-all', color: 'var(--foreground)' }}>
                                            {secret}
                                        </code>
                                        <button onClick={copySecret} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <label style={{
                                    display: 'block', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace',
                                    color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
                                }}>
                                    Enter 6-digit code
                                </label>
                                <input
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value); if (error) setError(''); }}
                                    placeholder="123456"
                                    autoFocus
                                    inputMode="numeric"
                                    maxLength={6}
                                    style={{
                                        width: '100%', padding: '10px 12px', fontSize: '0.9rem', textAlign: 'center',
                                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em',
                                        backgroundColor: 'var(--background)', color: 'var(--foreground)',
                                        border: error ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
                                        borderRadius: 8, marginBottom: 8, boxSizing: 'border-box',
                                    }}
                                />
                                {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: 12 }}>{error}</p>}

                                <button
                                    onClick={confirmCode}
                                    disabled={loading || code.length !== 6}
                                    style={{
                                        width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'var(--primary)',
                                        color: 'var(--primary-foreground)', border: 'none', borderRadius: 8,
                                        cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
                                        opacity: (loading || code.length !== 6) ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? 'Verifying…' : 'Confirm & Enable'}
                                </button>
                            </>
                        )}

                        {stage === 'showing-codes' && (
                            <>
                                <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 16 }}>
                                    Store these somewhere safe. Each code works once, if you lose access to your authenticator app.
                                    <strong style={{ color: 'var(--foreground)' }}> They won't be shown again.</strong>
                                </p>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                                    backgroundColor: 'var(--muted)', borderRadius: 8, padding: 14, marginBottom: 20,
                                }}>
                                    {recoveryCodes.map((c) => (
                                        <code key={c} style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--foreground)' }}>
                                            {c}
                                        </code>
                                    ))}
                                </div>
                                <button
                                    onClick={() => finishAndClose(true)}
                                    style={{
                                        width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'var(--primary)',
                                        color: 'var(--primary-foreground)', border: 'none', borderRadius: 8, cursor: 'pointer',
                                    }}
                                >
                                    I've saved these — Done
                                </button>
                            </>
                        )}

                        {stage === 'confirm-disable' && (
                            <>
                                <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: 16 }}>
                                    Enter a code from your authenticator app to confirm disabling 2FA.
                                </p>
                                <label style={{
                                    display: 'block', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace',
                                    color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
                                }}>
                                    Enter 6-digit code
                                </label>
                                <input
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value); if (error) setError(''); }}
                                    placeholder="123456"
                                    autoFocus
                                    inputMode="numeric"
                                    maxLength={6}
                                    style={{
                                        width: '100%', padding: '10px 12px', fontSize: '0.9rem', textAlign: 'center',
                                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em',
                                        backgroundColor: 'var(--background)', color: 'var(--foreground)',
                                        border: error ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
                                        borderRadius: 8, marginBottom: 8, boxSizing: 'border-box',
                                    }}
                                />
                                {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: 12 }}>{error}</p>}

                                <button
                                    onClick={disable2FA}
                                    disabled={loading || code.length !== 6}
                                    style={{
                                        width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 600,
                                        fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#ef4444',
                                        color: '#fff', border: 'none', borderRadius: 8,
                                        cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
                                        opacity: (loading || code.length !== 6) ? 0.6 : 1, marginBottom: 8,
                                    }}
                                >
                                    {loading ? 'Disabling…' : 'Confirm & Disable 2FA'}
                                </button>
                                <button
                                    onClick={closeModal}
                                    style={{
                                        width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 500,
                                        fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'transparent',
                                        color: 'var(--muted-foreground)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}