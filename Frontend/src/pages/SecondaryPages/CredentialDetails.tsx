import styles from '../../styles/SecondaryStyles/VaultStyles.module.css';
import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Edit3,
  Trash2,
  Star,
  Shield,
  Clock,
  Check,
} from 'lucide-react';
import type { DecryptedInCredential } from '@/interfaces/decryptedCredential';
import { handleToggleFavourite } from '@/functions/UpdateCredential';
import { PASSWORD_LABELS, USERNAME_LABELS } from '@/Types/CredentialDetailTypes';

function CopyButton({ text, clipboard_clear }: { text: string, clipboard_clear: boolean }) {
  const [copied, setCopied] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Check if setting allows it
      setTimeout(() => {
        if (isMounted.current) setCopied(false);
      }, 2000);

      if (clipboard_clear) {
        setTimeout(async () => {
          try {
            // Overwrite sensitive details with an empty string
            await navigator.clipboard.writeText('');
          } catch {
            // Fail silently if background execution permissions are restrictive
          }
        }, 30000); // 30 seconds security window
      }
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md transition-all"
      style={{
        color: copied ? 'var(--primary)' : 'var(--muted-foreground)',
        backgroundColor: copied ? 'rgba(34,197,94,0.1)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
        }
      }}
    >
      {copied ? <Check size={15} className="w-3.5 h-3.5" /> : <Copy size={15} className="w-3.5 h-3.5" />}
    </button>
  );
}

function StrengthBar({ strength }: { strength: DecryptedInCredential['strength'] }) {
  const config = {
    weak: { label: 'Weak', width: '25%', color: '#ef4444', textColor: '#ef4444' },
    fair: { label: 'Fair', width: '50%', color: '#f59e0b', textColor: '#f59e0b' },
    strong: { label: 'Strong', width: '75%', color: '#60a5fa', textColor: '#60a5fa' },
    'very-strong': { label: 'Very Strong', width: '100%', color: '#22c55e', textColor: '#4ade80' },
  } as const;

  const normalizedKey = (strength?.toLowerCase() || 'weak') as keyof typeof config;

  const currentConfig = config[normalizedKey] || config.weak;

  const { label, width, color, textColor } = currentConfig;

  return (
    <div className={styles.bar}>
      <div
        className={styles.inner}
        style={{ height: '3px', backgroundColor: 'var(--border)' }}
      >
        <div
          className={styles.strength}
          style={{ width, backgroundColor: color }}
        />
      </div>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.68rem',
          fontWeight: 600,
          color: textColor,
          minWidth: '64px',
          textAlign: 'right',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-1.5"
      style={{
        fontSize: '0.75rem',
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--muted-foreground)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '.5rem'
      }}
    >
      {children}
    </p>
  );
}

function FieldBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={styles.fieldBox}
      style={{
        backgroundColor: 'var(--muted)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  );
}

interface PasswordDetailProps {
  item: DecryptedInCredential | null;
  setCredentials: React.Dispatch<React.SetStateAction<DecryptedInCredential[]>>;
  setDeleteModalVisibilty: (q: boolean) => void;
  setEditModalVisibility: (q: boolean) => void;
  clipboard_clear: boolean;
  hide_credentials: boolean;
}

export function CredentialDetails({ clipboard_clear, item, setCredentials, setDeleteModalVisibilty, setEditModalVisibility, hide_credentials }: PasswordDetailProps) {
  const [showPassword, setShowPassword] = useState(!hide_credentials);
  const [showUsername, setShowUsername] = useState(!hide_credentials);
  const [showCardNumb, setShowCardNumb] = useState(false);
  const [showExpiryDate, setShowExpiryDate] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setShowPassword(!hide_credentials);
    setShowUsername(!hide_credentials);
  }, [item]);

  if (!item) {
    return (
      <div
        className="flex-1 h-full flex flex-col items-center justify-center text-center px-8"
        style={{ backgroundColor: 'var(--background)', fontFamily: 'Inter, sans-serif' }}
      >
        <Shield
          className="w-14 h-14 mb-4"
          style={{ color: 'var(--border)', opacity: 0.4 }}
        />
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Select an item to view details
        </p>
      </div>
    );
  }

  const hex = item.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const avatarTextColor = luminance > 1 ? '#1a2e1f' : item.color;

  const maskedPassword = '•'.repeat(Math.min(item.password?.length, 20));
  const maskedExpiryDate = '•'.repeat(Math.min(item.cardExpiry?.length, 4));
  const maskedCardNumb = item.cardNumber ? '•••• •••• •••• ' + item.cardNumber.slice(-4) : '';
  const maskedUsername = '•'.repeat(Math.min(item.username?.length || 8, 20));

  return (
    <div
      className={styles.credentialInfoContainer}
      style={{
        backgroundColor: 'var(--background)',
        fontFamily: 'Inter, sans-serif',
        scrollbarWidth: 'none',
      }}
    >
      {/* Header */}
      <div
        className={styles.headerContainer}
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className={styles.innerContainer}>
          <div className={styles.title}>
            <div
              className={styles.logo}
              style={{
                backgroundColor: `${item.color}20`,
                border: `1.5px solid ${item.color}28`,
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: avatarTextColor,
                }}
              >
                {item.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                }}
              >
                {item.name}
              </h1>
              {item.website ? (
                <a
                  href={`https://${item.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--muted-foreground)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted-foreground)';
                  }}
                >
                  {item.website}
                  <ExternalLink size={15} className="w-3 h-3 ml-0.5" />
                </a>
              ) : (
                <span
                  className={styles.websiteMissingContainer}
                  style={{
                    fontSize: '.8rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    backgroundColor: 'var(--muted)',
                    color: 'var(--muted-foreground)',
                    textTransform: 'capitalize',
                  }}
                >
                  {item.type}
                </span>
              )}
            </div>
          </div>

          <div className={styles.buttonContainer}>
            <button
              className={styles.button}
              style={{
                color: item.favourite ? '#f59e0b' : 'var(--muted-foreground)',
                backgroundColor: item.favourite ? 'rgba(245,158,11,0.1)' : 'transparent',
              }}
              onClick={async () => {
                if (isToggling) return;
                setIsToggling(true);
                await handleToggleFavourite(item.recordId, item.favourite, setCredentials);
                setIsToggling(false);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(245,158,11,0.1)';
                (e.currentTarget as HTMLButtonElement).style.color = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = item.favourite
                  ? 'rgba(245,158,11,0.1)'
                  : 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = item.favourite
                  ? '#f59e0b'
                  : 'var(--muted-foreground)';
              }}
            >
              <Star
                size={18}
                className="w-4 h-4"
                style={{ fill: item.favourite ? '#f59e0b' : 'none' }}
              />
            </button>
            <button
              className={styles.button}
              onClick={() => setEditModalVisibility(true)}
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
              <Edit3 size={18} className="w-4 h-4" />
            </button>
            <button
              className={styles.button}
              style={{ color: 'var(--muted-foreground)' }}
              onClick={() => setDeleteModalVisibilty(true)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(220,38,38,0.08)';
                (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
              }}
            >
              <Trash2 size={18} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className={styles.fields}>
        {/* Username */}
        <div>
          <FieldLabel>{USERNAME_LABELS[item.type]}</FieldLabel>
          <FieldBox>
            <span
              className={styles.text}
              style={{
                fontSize: '0.9rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--foreground)',
              }}
            >
              {!item.hideUsername || showUsername ? item.username : maskedUsername}
            </span>

            {item.hideUsername && (
              <button
                onClick={() => setShowUsername(!showUsername)}
                className="p-1.5 rounded-md transition-colors"
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
                {showUsername ? <EyeOff size={15} className="w-3.5 h-3.5" /> : <Eye size={15} className="w-3.5 h-3.5" />}
              </button>
            )}
            <CopyButton clipboard_clear={clipboard_clear} text={item.username} />
          </FieldBox>
        </div>

        {/* Check if type is card */}
        {item.type == 'card' && (
          <>
            <div>
              <FieldLabel>CARD NUMBER</FieldLabel>
              <FieldBox>
                <span
                  className={styles.text}
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--foreground)',
                  }}
                >
                  {showCardNumb ? item.cardNumber : maskedCardNumb}
                </span>

                <button
                  onClick={() => setShowCardNumb(!showCardNumb)}
                  className="p-1.5 rounded-md transition-colors"
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
                  {showCardNumb ? <EyeOff size={15} className="w-3.5 h-3.5" /> : <Eye size={15} className="w-3.5 h-3.5" />}
                </button>
                <CopyButton clipboard_clear={clipboard_clear} text={item.cardNumber} />
              </FieldBox>
            </div>

            <div>
              <FieldLabel>EXPRIATION DATE</FieldLabel>
              <FieldBox>
                <span
                  className={styles.text}
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--foreground)',
                  }}
                >
                  {showExpiryDate ? item.cardExpiry : maskedExpiryDate}
                </span>

                <button
                  onClick={() => setShowExpiryDate(!showExpiryDate)}
                  className="p-1.5 rounded-md transition-colors"
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
                  {showExpiryDate ? <EyeOff size={15} className="w-3.5 h-3.5" /> : <Eye size={15} className="w-3.5 h-3.5" />}
                </button>
                <CopyButton clipboard_clear={clipboard_clear} text={item.cardExpiry} />
              </FieldBox>
            </div>
          </>
        )}

        {/* Check if type is identity */}
        {item.type == 'identity' && (
          <>
            <div>
              <FieldLabel>PHONE NUMBER</FieldLabel>
              <FieldBox>
                <span
                  className={styles.text}
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--foreground)',
                  }}
                >
                  {item.phoneNumber}
                </span>
                <CopyButton clipboard_clear={clipboard_clear} text={item.phoneNumber} />
              </FieldBox>
            </div>

            <div>
              <FieldLabel>ADDRESS</FieldLabel>
              <FieldBox>
                <span
                  className={styles.text}
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--foreground)',
                  }}
                >
                  {item.address}
                </span>
                <CopyButton clipboard_clear={clipboard_clear} text={item.address} />
              </FieldBox>
            </div>
          </>
        )}

        {/* Password */}
        {item.password && (
          <div>
            <FieldLabel>{PASSWORD_LABELS[item.type]}</FieldLabel>
            <FieldBox>
              <span
                className={styles.text}
                style={{
                  fontSize: '0.85rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--foreground)',
                  letterSpacing: showPassword ? '0.04em' : '0.12em',
                }}
              >
                {showPassword ? item.password : maskedPassword}
              </span>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 rounded-md transition-colors"
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
                {showPassword ? <EyeOff size={15} className="w-3.5 h-3.5" /> : <Eye size={15} className="w-3.5 h-3.5" />}
              </button>
              <CopyButton clipboard_clear={clipboard_clear} text={item.password} />
            </FieldBox>
            <div className={styles.StrengthBar}>
              {item.type != "card" && (
                <StrengthBar strength={item.strength} />
              )}
            </div>
          </div>
        )}

        {/* Website */}
        {item.website && (
          <div>
            <FieldLabel>Website</FieldLabel>
            <FieldBox>
              <span
                className={styles.text}
                style={{
                  fontSize: '0.85rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--foreground)',
                }}
              >
                https://{item.website}
              </span>
              <a
                href={`https://${item.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--accent)';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--foreground)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted-foreground)';
                }}
              >
                <ExternalLink size={15} className="w-3.5 h-3.5" />
              </a>
              <CopyButton clipboard_clear={clipboard_clear} text={`https://${item.website}`} />
            </FieldBox>
          </div>
        )}

        {/* Notes */}
        {item.notes && (
          <div>
            <FieldLabel>Notes</FieldLabel>
            <div
              className={styles.fieldBox}
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  fontSize: '0.83rem',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.65,
                }}
              >
                {item.notes}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div>
            <FieldLabel>Tags</FieldLabel>
            <div className={styles.tagsContainer}>
              {item.tags.map((tag: any) => (
                <span
                  key={tag}
                  className={styles.tag}
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div
          className={styles.modifiedContainer}
          style={{ color: 'var(--muted-foreground)' }}
        >
          <Clock size={15} className="w-3 h-3" />
          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Modified {item.updatedAt}
          </span>
        </div>
      </div>
    </div>
  );
}