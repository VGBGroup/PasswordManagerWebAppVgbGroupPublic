import { useRef, useState } from 'react';
import { ShieldCheck, Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Loading from '../components/svg/loading';
import '../styles/LoginStyles.css';

import LoginWorker from '../crypto/login.worker.ts?worker'
import client from '@/api/client';
import { useAuthStore } from '@/auth';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
    const navigate = useNavigate()

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const encKeyRef = useRef<CryptoKey | null>(null);
    const derivedEncKeyRef = useRef<CryptoKey | null>(null);

    const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);
    const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [tfaError, setTfaError] = useState('');

    const setAuth = useAuthStore(s => s.setAuth)

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    async function unwrapAndFinish(token: string, wrappedDataKeyB64: string, wrappedDataKeyIvB64: string) {
        const wrappedKeyBytes = Uint8Array.from(atob(wrappedDataKeyB64), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
        const ivBytes = Uint8Array.from(atob(wrappedDataKeyIvB64), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

        encKeyRef.current = await crypto.subtle.unwrapKey(
            'raw',
            wrappedKeyBytes,
            derivedEncKeyRef.current!,
            { name: 'AES-GCM', iv: ivBytes },
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        await setAuth(token, email, 'X', encKeyRef.current);
    }

    async function handleLogin() {
        if (!email) {
            setError(1);
            setErrorMessage('Please enter your email.');
            return;
        }
        if (!password) {
            setError(2);
            setErrorMessage('Please enter your master password.');
            return;
        }
        setError(0);
        setLoading(true);

        const startTime = Date.now();
        const minimumLoadingTime = 1500; // 1.5 seconds minimum feel

        try {
            // Step 1 — request challenge + KDF params
            const { data: challengeData } = await client.post('user/login', { email });
            // challengeData: { Challenge, KdfAlgorithm, KdfSalt, KdfMemoryKib, KdfIterations, KdfParallelism }

            // Step 2 — derive keys and sign challenge in worker½
            if (!workerRef.current) {
                workerRef.current = new LoginWorker();
            }
            const worker = workerRef.current;

            const capturedPassword = password; // snapshot before any state changes
            setPassword(''); // clear password from state immediately for security

            const result = await new Promise<{ ok: boolean; signature?: string; encKey?: CryptoKey; error?: string }>(
                (resolve, reject) => {
                    worker.onmessage = (e) => resolve(e.data);
                    worker.onerror = (e) => {
                        console.error('Login worker error:', e.message);
                        reject(e);
                    };
                    worker.postMessage({
                        email,
                        masterPassword: capturedPassword,
                        challenge: challengeData.challenge,
                        kdf: {
                            KdfSalt: challengeData.kdfSalt,
                            KdfMemoryKib: challengeData.kdfMemoryKib,
                            KdfIterations: challengeData.kdfIterations,
                            KdfParallelism: challengeData.kdfParallelism,
                        },
                    });
                }
            );

            if (!result.ok) {
                console.error('Worker error:', result.error); // see the real error
                throw new Error('Login failed.');
            }

            derivedEncKeyRef.current = result.encKey!;

            // Step 3 — send signature to server
            const { data: verifyData } = await client.post('user/verifylogin', {
                email,
                challenge: challengeData.challenge,
                signature: result.signature,
            });

            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < minimumLoadingTime) {
                await delay(minimumLoadingTime - elapsedTime);
            }

            if (verifyData.requiresTwoFactor) {
                setLoading(false);
                setPreAuthToken(verifyData.preAuthToken);
                setAwaitingTwoFactor(true);
                return; // vault key stays unwrapped, JWT not issued yet
            }

            await unwrapAndFinish(verifyData.token, verifyData.wrappedDataKey, verifyData.wrappedDataKeyIv);
            setLoading(false);
            navigate('/dashboard');
            
        } catch (err: any) {
            // Calculate remaining time to pad out the successful animation
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < minimumLoadingTime) {
                await delay(minimumLoadingTime - elapsedTime);
            }
            setLoading(false);
            console.error('Login error:', err);
            setError(2);
            setErrorMessage(err.message || 'Login failed. Please try again.');
            // Extract custom backend 401 message
            const message = err.response?.data?.message || err.response?.data || err.message || 'Login failed. Please try again.';
            setErrorMessage(message);
        }
    }

    async function handleTwoFactorSubmit() {
        if (!twoFactorCode || !preAuthToken) return;
        setTfaError('');
        setLoading(true);
        const startTime = Date.now();
        const minimumLoadingTime = 800;

        try {
            const { data: tfaData } = await client.post('user/2fa/verify', {
                preAuthToken,
                code: twoFactorCode,
            });
            // tfaData: { token, wrappedDataKey, wrappedDataKeyIv }

            await unwrapAndFinish(tfaData.token, tfaData.wrappedDataKey, tfaData.wrappedDataKeyIv);

            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < minimumLoadingTime) await delay(minimumLoadingTime - elapsedTime);

            setLoading(false);
            navigate('/dashboard');
        } catch (err: any) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < minimumLoadingTime) await delay(minimumLoadingTime - elapsedTime);
            setLoading(false);
            const message = err.response?.data?.message || err.response?.data || 'Invalid code. Please try again.';
            setTfaError(message);
        }
    }

    return (
        <div
            className="container"
            style={{ backgroundColor: 'var(--background)', fontFamily: 'Inter, sans-serif' }}
        >
            {/* Left panel — branding */}
            <div
                className="left-panel"
                style={{ backgroundColor: 'var(--card)', borderRight: '1px solid var(--border)' }}
            >
                {/* Background grid decoration */}
                <div
                    className="bg-decoration"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle at 30% 60%, rgba(34,197,94,0.06) 0%, transparent 60%)',
                    }}
                />
                <div
                    className="bg-decoration"
                    style={{
                        backgroundImage: `linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Logo */}
                <div className="logo-container">
                    <div
                        className="logo"
                        style={{ backgroundColor: 'var(--primary)' }}
                    >
                        <ShieldCheck size={23} style={{ color: 'var(--primary-foreground)' }} />
                    </div>
                    <span
                        style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--foreground)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        V2 Vault
                    </span>
                </div>

                {/* Main copy */}
                <div className="relative">
                    <div
                        className="lock-logo"
                        style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.15)' }}
                    >
                        <Lock size={32} className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                    </div>
                    <h1
                        style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: 'var(--foreground)',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.2,
                            marginBottom: 16,
                        }}
                    >
                        Your passwords,
                        <br />
                        <span style={{ color: 'var(--primary)' }}>secured.</span>
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', lineHeight: 1.7 }}>
                        End-to-end encrypted vault. Only you hold the key — not us, not anyone else.
                    </p>

                    {/* Feature bullets */}
                    <div className="bullet-container">
                        {[
                            'AES-256 end-to-end encryption',
                            'Zero-knowledge architecture',
                            'Cross-device sync in real time',
                        ].map((feat) => (
                            <div key={feat} className="bullet-row">
                                <div
                                    className="bullets"
                                    style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}
                                >
                                    <div
                                        className="bullets-inner"
                                        style={{ backgroundColor: 'var(--primary)' }}
                                    />
                                </div>
                                <span style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
                                    {feat}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats footer */}
                <div className="footer">
                    {[
                        { value: '4', label: 'Sections' },
                        { value: '256', label: 'Bit encryption' },
                        { value: '99.9%', label: 'Uptime' },
                    ].map(({ value, label }) => (
                        <div key={label}>
                            <p
                                style={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    lineHeight: 1,
                                }}
                            >
                                {value}
                            </p>
                            <p
                                style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--muted-foreground)',
                                    marginTop: 3,
                                }}
                            >
                                {label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Get the mobile app */}
                <div
                    style={{
                        marginTop: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '1rem',
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <div
                        style={{
                            padding: 8,
                            backgroundColor: '#ffffff',
                            borderRadius: 10,
                            flexShrink: 0,
                            display: 'flex',
                            lineHeight: 0,
                        }}
                    >
                        <QRCodeSVG
                            value="https://play.google.com/store/apps/details?id=com.vgbgroup.v2vault"
                            size={72}
                            bgColor="#ffffff"
                            fgColor="#030213"
                        />
                    </div>
                    <div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 4 }}>
                            Get the mobile app
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                            Scan with your phone camera to download V2 Vault for Android.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="form-panel">
                <div className="form-content">
                    {/* Mobile logo */}
                    <div className="logo-container-mobile">
                        <div
                            className="logo"
                            style={{ backgroundColor: 'var(--primary)' }}
                        >
                            <ShieldCheck size={23} style={{ color: 'var(--primary-foreground)' }} />
                        </div>
                        <span
                            style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            V2 Vault
                        </span>
                    </div>

                    {/* Avatar / greeting */}
                    <div className="greeting-container">
                        <div
                            className="avatar"
                            style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}
                        >
                            <span
                                style={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                }}
                            >
                                V2
                            </span>
                        </div>
                        <div>
                            <p
                                style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                }}
                            >
                                Welcome back!
                            </p>
                            <p
                                style={{
                                    fontSize: '0.72rem',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    color: 'var(--muted-foreground)',
                                }}
                            >
                                Unlock your vault to access your passwords.
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.025em',
                                lineHeight: 1.2,
                                marginBottom: 8,
                            }}
                        >
                            Unlock your vault
                        </h2>
                        <p
                            style={{
                                fontSize: '0.83rem',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            Enter your master password to continue.
                        </p>
                    </div>

                    {awaitingTwoFactor ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleTwoFactorSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: ".5rem" }}>
                            <div className="password-field">
                                <label style={{
                                    display: 'block', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace',
                                    color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
                                }}>
                                    Authenticator Code
                                </label>
                                <input
                                    value={twoFactorCode}
                                    onChange={(e) => { setTwoFactorCode(e.target.value); if (tfaError) setTfaError(''); }}
                                    placeholder="123456"
                                    autoFocus
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="password-input"
                                    style={{
                                        paddingTop: 12, paddingBottom: 12, fontSize: '0.9rem',
                                        fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        border: tfaError ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
                                        letterSpacing: '0.15em', textAlign: 'center',
                                    }}
                                />
                                {tfaError && (
                                    <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                                        {tfaError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="submit-btn"
                                style={{
                                    paddingTop: 13, paddingBottom: 13, fontSize: '0.875rem',
                                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.02em',
                                    backgroundColor: loading ? 'rgba(34,197,94,0.6)' : 'var(--primary)',
                                    color: 'var(--primary-foreground)', cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {loading ? (<><div className="animate-spin"><Loading size={24} /></div>Verifying…</>) : (<>Verify <ArrowRight className="w-4 h-4" /></>)}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setAwaitingTwoFactor(false); setTwoFactorCode(''); setTfaError(''); derivedEncKeyRef.current = null; }}
                                style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', marginTop: 4 }}
                            >
                                ← Back to login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: ".5rem" }}>
                            {/* Email field */}
                            <div className="password-field">
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
                                    Email Address
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error == 1) setError(0);
                                        }}
                                        placeholder="jeffjeffsersen@gmail.com"
                                        autoFocus
                                        className="password-input"
                                        style={{
                                            paddingTop: 12,
                                            paddingBottom: 12,
                                            fontSize: '0.9rem',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            backgroundColor: 'var(--card)',
                                            color: 'var(--foreground)',
                                            border: error == 1
                                                ? '1.5px solid #ef4444'
                                                : '1.5px solid var(--border)',
                                            letterSpacing: '0.04em',
                                        }}
                                        onFocus={(e) => {
                                            if (!error)
                                                (e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.4)';
                                        }}
                                        onBlur={(e) => {
                                            if (!error)
                                                (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
                                        }}
                                    />
                                </div>
                                {error == 1 && (
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#ef4444',
                                            marginTop: 6,
                                            fontFamily: 'JetBrains Mono, monospace',
                                        }}
                                    >
                                        {errorMessage}
                                    </p>
                                )}
                            </div>

                            {/* Password field */}
                            <div className="password-field">
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
                                    Master Password
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error == 2) setError(0);
                                        }}
                                        placeholder="Enter master password"
                                        autoFocus
                                        className="password-input"
                                        style={{
                                            paddingTop: 12,
                                            paddingBottom: 12,
                                            fontSize: '0.9rem',
                                            fontFamily: showPassword ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                                            backgroundColor: 'var(--card)',
                                            color: 'var(--foreground)',
                                            border: error == 2
                                                ? '1.5px solid #ef4444'
                                                : '1.5px solid var(--border)',
                                            letterSpacing: showPassword ? '0.04em' : 'normal',
                                        }}
                                        onFocus={(e) => {
                                            if (!error)
                                                (e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.4)';
                                        }}
                                        onBlur={(e) => {
                                            if (!error)
                                                (e.target as HTMLInputElement).style.borderColor = 'var(--border)';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="password-toggle-btn"
                                        style={{ color: 'var(--muted-foreground)' }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                                        }}
                                    >
                                        {showPassword ? <EyeOff className="icon-sm" /> : <Eye className="icon-sm" />}
                                    </button>
                                </div>
                                {error == 2 && (
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#ef4444',
                                            marginTop: 6,
                                            fontFamily: 'JetBrains Mono, monospace',
                                        }}
                                    >
                                        {errorMessage}
                                    </p>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="submit-btn"
                                style={{
                                    paddingTop: 13,
                                    paddingBottom: 13,
                                    fontSize: '0.875rem',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontWeight: 600,
                                    letterSpacing: '0.02em',
                                    backgroundColor: loading ? 'rgba(34,197,94,0.6)' : 'var(--primary)',
                                    color: 'var(--primary-foreground)',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading)
                                        (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                                }}
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin"><Loading size={24} /></div>
                                        Unlocking…
                                    </>
                                ) : (
                                    <>
                                        Unlock Vault
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: ".5rem" }}>
                        {/* Registration */}
                        <p
                            className="text-center mt-6"
                            style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}
                        >
                            Create Account{' '}
                            <button
                                style={{
                                    color: 'var(--primary)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                }}
                                onClick={() => {
                                    // Navigate to registration page
                                    navigate('/register')
                                }}
                            >
                                Register
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}