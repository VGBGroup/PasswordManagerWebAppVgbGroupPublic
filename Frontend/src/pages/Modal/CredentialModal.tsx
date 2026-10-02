import { useEffect, useState } from 'react';
import { X, Eye, EyeOff, RefreshCw, Star, Globe, CreditCard, Check, User } from 'lucide-react';
import styles from '../../styles/Modals/CredentialStyles.module.css';
import { calculateStrength } from '@/functions/CalculateStrength';
import type { DecryptedOutCredential } from '@/interfaces/decryptedCredential';
import type { CategoriesInDto } from '@/interfaces/category';
import { useToast } from '../popups/ToastProvider';

function genPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const STRENGTH_CONFIG: Record<string, { label: string; color: string; width: string }> = {
    weak: { label: 'Weak', color: '#ef4444', width: '25%' },
    fair: { label: 'Fair', color: '#f59e0b', width: '50%' },
    strong: { label: 'Strong', color: '#60a5fa', width: '75%' },
    'very-strong': { label: 'Very Strong', color: '#22c55e', width: '100%' },
};

const TYPES: { id: string; label: string; icon: React.ElementType }[] = [
    { id: 'login', label: 'Login', icon: Globe },
    { id: 'card', label: 'Card', icon: CreditCard },
    // { id: 'note', label: 'Note', icon: FileText },
    { id: 'identity', label: 'Identity', icon: User },
];

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
}: {
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    mono?: boolean;
}) {
    return (
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...inputStyle, fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif' }}
            onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.35)')}
            onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'transparent')}
        />
    );
}

interface AddItemModalProps {
    onSave: (item: Omit<DecryptedOutCredential, 'id'>) => void;
    onClose: () => void;
    modalTitle: string;
    currentData?: DecryptedOutCredential;
    categories?: CategoriesInDto[];
    setCategoryOpen: (b: boolean) => void;
    activeTypeCategory?: string;
}

export function AddCredentialModal({ onSave, onClose, modalTitle, currentData, categories, setCategoryOpen, activeTypeCategory }: AddItemModalProps) {
    const { showToast } = useToast();

    const [category, setCategory] = useState<CategoriesInDto | null>(null);
    const [type, setType] = useState<string>('login');

    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [favorite, setFavorite] = useState(false);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hideUsername, setHideUsername] = useState(false)
    // Card fields
    const [cardHolder, setCardHolder] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    // Identity fields
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    const strength = calculateStrength(password);
    const strengthConfig = STRENGTH_CONFIG[strength];

    const validate = () => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Name is required';
        if (type === 'login' && !username.trim()) e.username = 'Username is required';
        if (!categories || categories.length === 0) {
            e.category = 'Category is required';
            // Open category tab
            setCategoryOpen(true);
        }
        setErrors(e);
        if (Object.keys(e).length > 0) {
            showToast(
                `Error: ${e.name || e.username || e.category}`,
                'error'
            );
        }
        return Object.keys(e).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;

        const tagList = tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const item: DecryptedOutCredential = {
            name: name.trim(),
            username:
                type === 'card'
                    ? cardHolder || '—'
                    : type === 'identity'
                        ? username
                        : username,
            password:
                type === 'card'
                    ? cardCvv
                    : password,

            cardNumber: cardNumber,
            cardExpiry: cardExpiry,

            website: url.trim(),
            favourite: favorite,
            type: type,
            updatedAt: new Date().toISOString().split('T')[0],
            strength,
            notes: notes.trim(),
            tags: tagList,
            color: selectedColor,
            hideUsername: hideUsername,
            categoryRecordId: category?.recordId ?? 0,

            phoneNumber: phone.trim(),
            address: address.trim(),
        };
        // Close window
        onClose();
        onSave(item);
    };

    useEffect(() => {
        if (currentData && categories) {
            // EDIT MODE: Populate fields with existing data
            setName(currentData.name || '');
            setUsername(currentData.username || '');
            setPassword(currentData.password || '');
            setUrl(currentData.website || '');
            setNotes(currentData.notes || '');
            if (Array.isArray(currentData.tags)) {
                setTags(currentData.tags.join(', ')); // e.g., ['work', 'personal'] -> "work, personal"
            } else {
                setTags('');
            }
            // Card fields
            setCardCvv(currentData.password || '');
            setCardNumber(currentData.cardNumber || '');
            setCardHolder(currentData.username || '');
            setCardExpiry(currentData.cardExpiry || '');
            //

            // Identity fields
            setPhone(currentData.phoneNumber || '');
            setAddress(currentData.address || '');

            setFavorite(currentData.favourite || false);
            setSelectedColor(currentData.color || COLORS[0]);
            setHideUsername(currentData.hideUsername || false);
            setType(currentData.type);
            const exactCategory = categories.find((c) => c.recordId === currentData.categoryRecordId);
            setCategory(exactCategory || categories[0] || null);
        } else if (categories && categories.length == 1) {
            setCategory(categories[0])

            const matchingType = TYPES.find(({ id }) => id === activeTypeCategory);
            if (matchingType)
                setType(matchingType.id);
        } else {
            // CREATE MODE: Reset all fields to default blank values
            setType('login');
            setName('');
            setUsername('');
            setPassword('');
            setUrl('');
            setNotes('');
            setTags('');
            setFavorite(false);
            setSelectedColor(COLORS[0]);
            setHideUsername(false);
            setCardHolder('');
            setCardNumber('');
            setCardExpiry('');

            if (categories) {
                setCategory(categories[0] || null);
            }
        }

        setErrors({}); // Always clear stale validation errors
    }, [currentData, categories]);

    const isCustomColorActive = !COLORS.includes(selectedColor);

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
                            Fill in the details to save to your vault
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

                {/* Category tabs */}
                <div
                    className={styles.category}
                    style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--muted)' }}
                >
                    {TYPES.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setType(id)}
                            className={styles.button}
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: type === id ? 'var(--primary)' : 'var(--muted-foreground)',
                                backgroundColor:
                                    type === id ? 'rgba(34,197,94,0.12)' : 'transparent',
                                border: type === id ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent',
                            }}
                        >
                            <Icon size={15} className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Scrollable form body */}
                <div className={styles.body} style={{ scrollbarWidth: 'none' }}>

                    {/* Name + favorite */}
                    <Field label="Name*">
                        <div className={styles.fieldContainer}>
                            <div className={styles.field}>
                                <TextInput
                                    placeholder={
                                        type === 'login' ? 'e.g. GitHub'
                                            : type === 'card' ? 'e.g. Visa Business'
                                                : type === 'note' ? 'e.g. SSH Keys'
                                                    : 'e.g. Alex Morgan'
                                    }
                                    value={name}
                                    onChange={setName}
                                />
                            </div>
                            <button
                                onClick={() => setFavorite(!favorite)}
                                className={styles.buttonStar}
                                style={{
                                    backgroundColor: favorite ? 'rgba(245,158,11,0.12)' : 'var(--muted)',
                                    border: favorite ? '1.5px solid rgba(245,158,11,0.3)' : '1.5px solid transparent',
                                }}
                                title="Mark as favorite"
                            >
                                <Star
                                    size={15}
                                    style={{
                                        color: favorite ? '#f59e0b' : 'var(--muted-foreground)',
                                        fill: favorite ? '#f59e0b' : 'none',
                                    }}
                                />
                            </button>
                        </div>
                        {errors.name && (
                            <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                                {errors.name}
                            </p>
                        )}
                    </Field>

                    {/* Avatar color */}
                    <Field label="Icon Color">
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

                    {/* ── Login fields ── */}
                    {type === 'login' && (
                        <>
                            <Field label="Username / Email *">
                                <div className={styles.relative}>
                                    <input
                                        type={!hideUsername ? 'text' : 'password'}
                                        placeholder="you@example.com"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        style={{
                                            ...inputStyle,
                                            paddingRight: 80,
                                            fontFamily: 'JetBrains Mono, monospace',
                                            letterSpacing: !hideUsername ? '0.04em' : 'normal',
                                        }}
                                    />
                                    <div className={styles.button}>
                                        <button
                                            type="button"
                                            onClick={() => setHideUsername(!hideUsername)}
                                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                                            style={{ color: 'var(--muted-foreground)' }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; }}
                                        >
                                            {!hideUsername ? <EyeOff size={18} className="w-3.5 h-3.5" /> : <Eye size={18} className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {errors.username && (
                                        <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                                            {errors.username}
                                        </p>
                                    )}
                                </div>
                            </Field>

                            <Field label="Password">
                                <div className={styles.relative}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter or generate a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{
                                            ...inputStyle,
                                            paddingRight: 80,
                                            fontFamily: 'JetBrains Mono, monospace',
                                            letterSpacing: showPassword ? '0.04em' : 'normal',
                                        }}
                                        onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.35)')}
                                        onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'transparent')}
                                    />
                                    <div className={styles.button}>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                                            style={{ color: 'var(--muted-foreground)' }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; }}
                                        >
                                            {showPassword ? <EyeOff size={18} className="w-3.5 h-3.5" /> : <Eye size={18} className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPassword(genPassword())}
                                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                                            style={{ color: 'var(--muted-foreground)' }}
                                            title="Generate password"
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; }}
                                        >
                                            <RefreshCw size={18} className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                {password && (
                                    <div className={styles.bar}>
                                        <div
                                            className={styles.innerbar}
                                            style={{ height: 3, backgroundColor: 'var(--border)' }}
                                        >
                                            <div
                                                className={styles.colorBar}
                                                style={{ width: strengthConfig.width, backgroundColor: strengthConfig.color }}
                                            />
                                        </div>
                                        <span
                                            style={{
                                                fontFamily: 'JetBrains Mono, monospace',
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: strengthConfig.color,
                                                minWidth: 60,
                                                textAlign: 'right',
                                            }}
                                        >
                                            {strengthConfig.label}
                                        </span>
                                    </div>
                                )}
                            </Field>

                            <Field label="Website URL">
                                <TextInput placeholder="github.com" value={url} onChange={setUrl} mono />
                            </Field>
                        </>
                    )}

                    {/* ── Card fields ── */}
                    {type === 'card' && (
                        <>
                            <Field label="Cardholder Name">
                                <TextInput
                                    placeholder="Alex Morgan"
                                    value={cardHolder}
                                    onChange={setCardHolder}
                                />
                            </Field>

                            <Field label="Card Number">
                                <TextInput
                                    placeholder="0000 0000 0000 0000"
                                    value={cardNumber}
                                    onChange={(val) => {
                                        // Strip all non-digits, chunk into groups of 4, max 19 chars (16 digits + 3 spaces)
                                        const cleaned = val.replace(/\D/g, '');
                                        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
                                        setCardNumber(formatted.slice(0, 19));
                                    }}
                                    mono
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Expiry Date">
                                    <TextInput
                                        placeholder="MM/YY"
                                        value={cardExpiry}
                                        onChange={(val) => {
                                            // Strip non-digits
                                            const cleaned = val.replace(/\D/g, '');
                                            let formatted = cleaned;

                                            // Automatically drop a slash after MM
                                            if (cleaned.length > 2) {
                                                formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
                                            }

                                            setCardExpiry(formatted.slice(0, 5)); // Limit to MM/YY (5 chars)
                                        }}
                                        mono
                                    />
                                </Field>
                            </div>

                            <Field label="CVV">
                                <TextInput
                                    placeholder="000"
                                    value={cardCvv}
                                    onChange={(val) => {
                                        // Only numbers up to 3 or 4 digits max
                                        const cleaned = val.replace(/\D/g, '');
                                        setCardCvv(cleaned.slice(0, 4));
                                    }}
                                    mono
                                />
                            </Field>
                        </>
                    )}

                    {/* ── Identity fields ── */}
                    {type === 'identity' && (
                        <>
                            <Field label="Email">
                                <TextInput placeholder="you@example.com" value={username} onChange={setUsername} mono />
                            </Field>
                            <Field label="Code">
                                <div className={styles.relative}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter or generate a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{
                                            ...inputStyle,
                                            paddingRight: 80,
                                            fontFamily: 'JetBrains Mono, monospace',
                                            letterSpacing: showPassword ? '0.04em' : 'normal',
                                        }}
                                        onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.35)')}
                                        onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = 'transparent')}
                                    />
                                    <div className={styles.button}>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                                            style={{ color: 'var(--muted-foreground)' }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)'; }}
                                        >
                                            {showPassword ? <EyeOff size={18} className="w-3.5 h-3.5" /> : <Eye size={18} className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </Field>
                            <Field label="Phone">
                                <TextInput placeholder="+1 (555) 000-0000" value={phone} onChange={setPhone} mono />
                            </Field>
                            <Field label="Address">
                                <TextInput placeholder="123 Main St, City, State" value={address} onChange={setAddress} />
                            </Field>
                        </>
                    )}

                    {/* Notes — all categories */}
                    <Field label="Notes">
                        <textarea
                            placeholder="Add any additional notes…"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            style={{
                                ...inputStyle,
                                resize: 'none',
                                lineHeight: 1.6,
                            }}
                            onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = 'rgba(34,197,94,0.35)')}
                            onBlur={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = 'transparent')}
                        />
                    </Field>

                    {/* Tags */}
                    <Field label="Tags (comma-separated)">
                        <TextInput placeholder="work, dev, personal" value={tags} onChange={setTags} />
                    </Field>
                </div>

                {/* Footer */}
                <div
                    className={styles.footer}
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    {/* LEFT SIDE: Category Selector Selector Button */}
                    <select
                        value={category?.recordId}
                        onChange={(e) => setCategory((categories ?? []).find((c) => String(c.recordId) === e.target.value) ?? null)}
                        className={styles.button} // Reuses your button layout styles
                        style={{
                            fontSize: '0.83rem',
                            fontWeight: 500,
                            color: 'var(--foreground)',
                            backgroundColor: 'var(--muted)',
                            border: '1px solid var(--border)',
                            paddingRight: '1.5rem', // Extra space so the text doesn't hit the arrow
                            cursor: 'pointer',
                            outline: 'none',
                            borderRadius: '0.375rem'
                        }}
                    >
                        {(categories ?? []).map((c) => (
                            <option value={c.recordId} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    {errors.category && (
                        <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                            {errors.category}
                        </p>
                    )}
                    <div className={styles.footer} style={{ borderTop: 'transparent' }}>
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
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                        >
                            Save to Vault
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}