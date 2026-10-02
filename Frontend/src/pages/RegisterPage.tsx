import { useRef, useState } from 'react';
import { ShieldCheck, Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import Loading from '../components/svg/loading';
import '../styles/LoginStyles.css';
import client from '@/api/client';
import RegisterWorker from '../crypto/register.worker.ts?worker';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function RegisterPage() {
    const navigate = useNavigate()

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [searchParams] = useSearchParams();
    const refCode = searchParams.get('ref');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const workerRef = useRef<Worker | null>(null);

    async function handleRegister() {
        try {
            if (!workerRef.current) {
                workerRef.current = new RegisterWorker();
            }

            const worker = workerRef.current;

            const result = await new Promise<{ ok: boolean; payload?: object; error?: string }>((resolve, reject) => {
                worker.onmessage = (e) => resolve(e.data);
                worker.onerror = (e) => reject(e);
                worker.postMessage({ email, password });
            });

            if (!result.ok) {
                console.error('Worker error:', result.error); // ← tells you the real cause
                throw new Error('Registration failed.');
            }

            if (!result.ok) throw new Error('Registration failed.');

            setPassword('');
            setConfirmPassword('');

            const res = await client.post('user/register', { ...result.payload, referralCode: refCode });

            setIsSubmitted(true);
            setLoading(false);
            return res.data;
        } catch {
            setError(1)
            setLoading(false);
            setErrorMessage('Something went wrong.')
        }
    }

    if (isSubmitted) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
                    <h2>Check your email!</h2>
                    <p style={{ color: 'var(--muted-foreground)', marginTop: 8 }}>
                        We sent a verification link to <strong>{email}</strong>. Please click the link in that email to activate your account.
                    </p>
                    <button
                        style={{
                            marginTop: '3rem',
                            color: 'var(--primary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            textAlign: 'center'
                        }}
                        onClick={() => {
                            // Navigate to registration page
                            navigate('/login')
                        }}
                    >
                        Go To Login
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
        // Check if password has correct length and complexity
        if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            setError(2);
            setErrorMessage('Password does not meet complexity requirements.');
            return;
        }
        if (password !== confirmPassword) {
            setError(3);
            setErrorMessage('Passwords do not match.');
            return;
        }

        // Check if email is correct
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError(1);
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        if (error != 0) { return; }

        setError(0);
        setLoading(true);

        setTimeout(() => {
            handleRegister();
        }, 2000);
    };

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
                            'radial-gradient(circle at 30% 60%, rgba(37, 152, 25, 0.28) 0%, transparent 60%)',
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
                        { value: '14', label: 'Items secured' },
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
                            Create an account
                        </h2>
                        <p
                            style={{
                                fontSize: '0.83rem',
                                color: 'var(--muted-foreground)',
                            }}
                        >
                            Enter details to create your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: ".5rem" }}>
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
                                Email
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error == 1) setError(0);
                                    }}
                                    placeholder="jeffjeffersen@example.com"
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
                                        letterSpacing: 'normal',
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
                                        border: error
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

                        {/* Confirm Password field */}
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
                                Confirm Master Password
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (error == 3) setError(0);
                                    }}
                                    placeholder="Confirm master password"
                                    autoFocus
                                    className="password-input"
                                    style={{
                                        paddingTop: 12,
                                        paddingBottom: 12,
                                        fontSize: '0.9rem',
                                        fontFamily: showConfirmPassword ? 'JetBrains Mono, monospace' : 'Inter, sans-serif',
                                        backgroundColor: 'var(--card)',
                                        color: 'var(--foreground)',
                                        border: error
                                            ? '1.5px solid #ef4444'
                                            : '1.5px solid var(--border)',
                                        letterSpacing: showConfirmPassword ? '0.04em' : 'normal',
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
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="password-toggle-btn"
                                    style={{ color: 'var(--muted-foreground)' }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                                    }}
                                >
                                    {showConfirmPassword ? <EyeOff className="icon-sm" /> : <Eye className="icon-sm" />}
                                </button>
                            </div>
                            {error == 3 && (
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
                                    Registering...
                                </>
                            ) : (
                                <>
                                    Register Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Registration */}
                    <p
                        className="text-center mt-6"
                        style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}
                    >
                        Have an account?{' '}
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
                                navigate('/login');
                            }}
                        >
                            Login
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}