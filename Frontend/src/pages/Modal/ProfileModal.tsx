import { useEffect, useState } from 'react';
import { X, Check, Camera } from 'lucide-react';
import styles from '../../styles/Modals/CredentialStyles.module.css';
import styles2 from '../../styles/Modals/ProfileStyles.module.css';
import type { ProfileUpdateOutDto } from '@/interfaces/profile';
import { createInitials } from '@/functions/createInitials';

const COLORS = [
    '#6e40c9', '#1a7f37', '#cc6600', '#1d4ed8',
    '#b91c1c', '#7c3aed', '#15803d', '#374151',
    '#064e3b', '#5b21b6', '#92400e', '#0c4a6e',
];

interface FieldProps {
    label: string;
    children: React.ReactNode;
}
export function Field({ label, children }: FieldProps) {
    return (
        <div>
            <label
                style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--muted-foreground)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 6,
                }}
            >
                {label}
            </label>
            {children}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: '0.85rem',
    backgroundColor: 'var(--muted)',
    color: 'var(--foreground)',
    border: '1.5px solid transparent',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
};

export function TextInput({
    placeholder,
    value,
    onChange,
    mono,
    disabled,
}: {
    placeholder?: string;
    value: string | null;
    onChange?: (v: string) => void;
    mono?: boolean;
    disabled?: boolean;
}) {
    return (
        <input
            disabled={disabled || false}
            type="text"
            placeholder={placeholder}
            value={value ?? ''}
            onChange={(e) => onChange?.(e.target.value)}
            style={{ ...inputStyle, fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}
            onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.35)')}
            onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'transparent')}
        />
    );
}

interface AddItemModalProps {
    onSave: (item: Omit<ProfileUpdateOutDto, 'id'>) => void;
    onClose: () => void;
    modalTitle: string;
    userId: string | null;
    displayName: string | null;
    setInitials: (s: string) => void;
    setAvatarColor: (s: string) => void;
    avatarColor: string;
}

export function ProfileModal({ onSave, onClose, modalTitle, userId, displayName, setInitials, setAvatarColor, avatarColor }: AddItemModalProps) {
    const [local_displayName, setDisplayName] = useState('');
    const [errors] = useState<Record<string, string>>({});

    const [selectedColor, setSelectedColor] = useState(avatarColor ?? COLORS[0]);

    const isCustomColorActive = !COLORS.includes(selectedColor);

    const initials = createInitials(local_displayName);

    function handleSave() {
        if (local_displayName.length <= 0) return;

        const item: ProfileUpdateOutDto = {
            displayName: local_displayName,
            color: selectedColor
        };

        setAvatarColor(selectedColor);
        setInitials(initials);

        // Close window
        onClose();
        onSave(item);
    }

    useEffect(() => {
        setDisplayName(displayName ?? '');
    }, [])

    return (
        /* Backdrop */
        <div
            className={styles.container}
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 50 }}
        // onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Panel */}
            <div
                className={styles.inner}
                style={{
                    width: 480,
                    maxHeight: '88vh',
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                    fontFamily: 'Inter, sans-serif',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    className={styles.header}
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <div>
                        <h2
                            style={{
                                fontSize: '1.2rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {/* Add New Item */}
                            {modalTitle}
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                            Update your account information
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={styles.button}
                        style={{ color: 'var(--muted-foreground)' }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                        }}
                    >
                        <X size={18} className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable form body */}
                <div className={styles.body} style={{ scrollbarWidth: 'none' }}>
                    <div className={styles2.mainContainer}>
                        {/* Avatar */}
                        <div className={styles2.container}>
                            <div
                                className={styles2.logo}
                                style={{ backgroundColor: `${selectedColor}22`, border: `2px solid ${selectedColor}40` }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: '1.6rem',
                                        fontWeight: 700,
                                        color: selectedColor,
                                    }}
                                >
                                    {initials}
                                </span>
                            </div>
                            {/* Camera badge */}
                            <div
                                className={styles2.camera}
                                style={{ backgroundColor: 'var(--primary)', border: '2px solid var(--card)' }}
                            >
                                <Camera size={15} style={{ color: 'var(--primary-foreground)' }} />
                            </div>
                        </div>

                        {/* Avatar color */}
                        <Field label="Avatar Color">
                            <div className={styles.colorContainer}>
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedColor(c)}
                                        className={styles.button}
                                        style={{
                                            backgroundColor: c,
                                            transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                                            boxShadow: selectedColor === c ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : 'none',
                                        }}
                                    >
                                        {selectedColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                                    </button>
                                ))}

                                <label
                                    className={styles.button}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)',
                                        transform: isCustomColorActive ? 'scale(1.15)' : 'scale(1)',
                                        boxShadow: isCustomColorActive ? `0 0 0 2px var(--card), 0 0 0 4px ${selectedColor}` : 'none',

                                    }}
                                    title="Custom Color Wheel"
                                >
                                    {isCustomColorActive && <Check className="w-3.5 h-3.5 text-white" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }} />}
                                    <input
                                        type="color"
                                        value={isCustomColorActive ? selectedColor : '#ffffff'}
                                        onChange={(e) => setSelectedColor(e.target.value)}
                                        style={{
                                            position: 'absolute',
                                            opacity: 0,
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer',
                                        }}
                                    />
                                </label>
                            </div>
                        </Field>
                    </div>

                    {/* Name + favorite */}
                    <Field label="Name*">
                        <div className={styles.fieldContainer}>
                            <div className={styles.field}>
                                <TextInput
                                    placeholder="Display Name"
                                    value={local_displayName}
                                    onChange={setDisplayName}
                                    disabled={false}
                                />
                            </div>
                        </div>
                        {errors.name && (
                            <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                                {errors.name}
                            </p>
                        )}
                    </Field>

                    {/* Notes — all categories */}
                    <Field label="Email*">
                        <div className={styles.fieldContainer}>
                            <div className={styles.field}>
                                <TextInput
                                    placeholder="test@gmail.com"
                                    value={userId}
                                    disabled={true}
                                />
                            </div>
                        </div>
                        {errors.name && (
                            <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                                {errors.name}
                            </p>
                        )}
                    </Field>
                </div>

                {/* Footer */}
                <div
                    className={styles.footer}
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    <div className={styles.footer} style={{ borderTop: 'transparent', flexShrink: 0 }}>
                        <button
                            onClick={onClose}
                            className={styles.button}
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                color: 'var(--muted-foreground)',
                                backgroundColor: 'var(--muted)',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)';
                                (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className={styles.button}
                            style={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                fontFamily: 'JetBrains Mono, monospace',
                                color: 'var(--primary-foreground)',
                                backgroundColor: 'var(--primary)',
                                display: 'flex'
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}