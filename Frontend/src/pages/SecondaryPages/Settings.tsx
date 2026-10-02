// web app
import { useState } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Lock,
  Download,
  Upload,
  Trash2,
  CreditCard,
  Sparkles,
} from 'lucide-react';

import styles from '../../styles/SecondaryStyles/Settings.module.css';
import { TwoFactorSettings } from '../Modal/TwoFactor';
export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      type="button"
      className={styles.toggleButton}
      style={{
        width: 40,
        height: 24,
        backgroundColor: checked ? 'var(--primary)' : 'var(--muted)',
      }}
    >
      <span
        className={styles.toggleSub}
        style={{
          width: 16,
          height: 16,
          backgroundColor: checked ? 'var(--secondary)' : 'var(--primary)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          /* 4px when off, 20px when on */
          transform: checked ? 'translateX(20px)' : 'translateX(4px)',
        }}
      />
    </button>
  );
}

type SettingKey =
  | 'biometric'
  | 'autoLock'
  | 'clipboardClear'
  | 'notifications'
  | 'hidePasswords';

interface SettingItem {
  key: SettingKey;
  label: string;
  desc: string;
}

const securitySettings: SettingItem[] = [
  // { key: 'biometric', label: 'Biometric Unlock', desc: 'Use Face ID or Touch ID to unlock' },
  { key: 'autoLock', label: 'Auto-Lock Vault', desc: 'Lock after period of inactivity' },
  { key: 'clipboardClear', label: 'Clipboard Auto-Clear', desc: 'Erase clipboard after 30 seconds' },
  { key: 'hidePasswords', label: 'Hide Passwords by Default', desc: 'Mask values in detail view' },
];

const notifSettings: SettingItem[] = [
  {
    key: 'notifications',
    label: 'Security Alerts',
    desc: 'Get notified about breaches and weak passwords',
  },
];

const timeoutOptions = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  // { label: '1 hour', value: 60 },
];

interface SettingsProps {
  setTwofaEnabled: (b: boolean) => void;
  setClipboardClear: (b: boolean) => void;
  setHideCredentials: (b: boolean) => void;
  setAutoLock: (b: boolean) => void;
  setAutoLockNumb: (n: number) => void;
  setSecurityAlerts: (b: boolean) => void;
  setAccountEditModalVisibility: (b: boolean) => void;

  autoLock: boolean;
  autoLockNumb: number;
  hide_credentials: boolean;
  clipboard_clear: boolean;
  twofa_enabled: boolean;
  security_alerts: boolean;

  initials: string,
  displayName: string,
  email: string | null,
  avatarColor: string,
  setImportModal: (b: boolean) => void,
  setExportModal: (b: boolean) => void,
  setDeleteModalOpen: (b: boolean) => void,

  isSubscribed?: boolean;
  subscriptionPlan?: string;
  subscriptionEndDate: Date | null;
  onUpgrade?: () => void;
  onManageSubscription?: () => void;
  referralCode: string;
}

export function SettingsView({
  setTwofaEnabled, setClipboardClear, setHideCredentials, setAutoLock, setAutoLockNumb, setSecurityAlerts, setAccountEditModalVisibility,
  autoLock, autoLockNumb, hide_credentials, clipboard_clear, twofa_enabled, security_alerts,
  initials, displayName, email, avatarColor,
  setImportModal, setExportModal, setDeleteModalOpen,
  isSubscribed, subscriptionPlan, subscriptionEndDate, onUpgrade, onManageSubscription, referralCode
}: SettingsProps) {

  const [upgrading, setUpgrading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Track toggle states locally for instant UI response
  const [settings, setSettings] = useState<Record<SettingKey, boolean>>({
    biometric: false,
    autoLock: autoLock,
    clipboardClear: clipboard_clear,
    notifications: security_alerts,
    hidePasswords: hide_credentials,
  });

  // Handle toggles and sync them with your parent state callbacks
  const handleToggle = (key: SettingKey) => {
    const nextValue = !settings[key];
    setSettings((s) => ({ ...s, [key]: nextValue }));

    // Dispatching changes up to parent state handlers
    if (key === 'autoLock') setAutoLock(nextValue);
    if (key === 'clipboardClear') setClipboardClear(nextValue);
    if (key === 'hidePasswords') setHideCredentials(nextValue);
    if (key === 'notifications') setSecurityAlerts(nextValue);
  };

  const handleTimeoutChange = (minutes: number) => {
    setAutoLockNumb(minutes);
  };

  const sectionStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
  };

  const labelStyle = {
    fontSize: '0.8rem',
    fontFamily: 'JetBrains Mono, monospace',
    color: 'var(--muted-foreground)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  return (
    <div
      className={styles.container}
      style={{
        backgroundColor: 'var(--background)',
        fontFamily: 'Inter, sans-serif',
        scrollbarWidth: 'none',
      }}
    >
      <div className={styles.subContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconDiv} style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              Settings
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
              Manage your vault preferences
            </p>
          </div>
        </div>

        {/* Account card */}
        <div className={styles.card} style={sectionStyle}>
          <p style={labelStyle}>Account</p>
          <div className={styles.container}>
            <div className={styles.iconDiv} style={{ backgroundColor: `${avatarColor}22`, border: `2px solid ${avatarColor}40` }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                {initials}
              </span>
            </div>
            <div className={styles.infoContainer}>
              <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--foreground)' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)', marginTop: 2 }}>
                {email}
              </p>
              <div className={styles.flex}>
                <Shield size={17} className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>
                  {/* Premium · Sync enabled */}
                  Sync enabled
                </span>
              </div>
            </div>
            <button
              onClick={() => setAccountEditModalVisibility(true)}
              className={styles.button}
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--primary)',
                backgroundColor: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Subscription & Billing Card */}
        <div className={styles.card} style={sectionStyle}>
          <p style={labelStyle}>
            <CreditCard className="w-3.5 h-3.5" />
            Subscription & Billing
          </p>

          <div
            className={styles.item}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  {isSubscribed ? (subscriptionPlan === "Trialing" ? "Trialing" : "Pro Member") : "Free Tier"}
                </p>
                {isSubscribed && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--primary)',
                      backgroundColor: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    ACTIVE
                  </span>
                )}
                {subscriptionEndDate && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--primary)',
                      backgroundColor: 'rgba(120, 155, 133, 0.1)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginLeft: '8px'
                    }}
                  >
                    Ends: {subscriptionEndDate.toLocaleDateString()}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                {isSubscribed && subscriptionPlan !== "Trialing"
                  ? 'Your plan automatically renews. Manage payment methods or cancel anytime.'
                  : subscriptionPlan === "Trialing"
                    ? 'You are currently on a trial period. Upgrade to Pro to keep all features.'
                    : 'Your plan automatically renews. Manage payment methods or cancel anytime.'
                }
              </p>
            </div>

            {(isSubscribed && subscriptionPlan !== "Trialing") ? (
              <button
                onClick={onManageSubscription}
                className={styles.button}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--muted)',
                  border: '1px solid var(--border)',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Manage Billing
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (upgrading) return;
                  setUpgrading(true);
                  try {
                    await onUpgrade?.();
                  } catch (error) {
                    console.error('Upgrade failed:', error);
                  } finally {
                    setUpgrading(false);
                  }
                }}
                className={styles.button}
                disabled={upgrading}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--primary-foreground)',
                  backgroundColor: upgrading ? 'var(--muted)' : '#3fb66b',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  opacity: upgrading ? 0.6 : 1,
                }}
              >
                {upgrading ? (
                  <span className="inline-block animate-spin">⟳</span>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {upgrading ? 'Processing...' : 'Upgrade to Pro'}
              </button>
            )}
          </div>

          {/* ─── Referral Section ─── */}
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              backgroundColor: 'var(--muted)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: 2 }}>
                  Share & Earn
                </p>
                <p style={{ fontSize: '0.68rem', color: 'var(--muted-foreground)' }}>
                  Get <strong style={{ color: 'var(--primary)' }}>1 free month</strong> for every friend who upgrades.
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: 'var(--card)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  border: '1px solid var(--border)',
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--muted-foreground)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {referralLink}
                </span>
                <button
                  // In the button onClick:
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--primary)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security settings */}
        <div className={styles.card} style={sectionStyle}>
          <p style={labelStyle}>
            <Shield className="w-3.5 h-3.5" />
            Security
          </p>
          <div style={{ gap: '1rem', display: 'grid' }}>
            {/* Two-Factor gets its own row, driven by real backend state, not the generic toggle */}
            <div className={styles.item}>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--foreground)' }}>
                  Two-Factor Authentication
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                  Require 2FA on every login
                </p>
              </div>
              <TwoFactorSettings enabled={twofa_enabled} onStatusChange={setTwofaEnabled} />
            </div>

            {securitySettings.map(({ key, label, desc }) => (
              <div key={key} className={styles.item}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--foreground)' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {desc}
                  </p>
                </div>
                <Toggle checked={settings[key]} onChange={() => handleToggle(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Auto-lock timeout (Conditional Render based on autoLock being active) */}
        {settings.autoLock && (
          <div className={styles.card} style={sectionStyle}>
            <p style={labelStyle}>
              <Lock className="w-3.5 h-3.5" />
              Auto-Lock Timeout
            </p>
            <div className={styles.autoLockDiv}>
              {timeoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTimeoutChange(opt.value)}
                  className={styles.button}
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: autoLockNumb === opt.value ? 'var(--primary)' : 'var(--muted-foreground)',
                    backgroundColor: autoLockNumb === opt.value ? 'rgba(34,197,94,0.1)' : 'var(--muted)',
                    border: autoLockNumb === opt.value ? '1px solid rgba(34,197,94,0.25)' : '1px solid transparent',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className={styles.card} style={sectionStyle}>
          <p style={labelStyle}>
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </p>
          <div className="space-y-4">
            {notifSettings.map(({ key, label, desc }) => (
              <div key={key} className={styles.item}>
                <div>
                  <p style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--foreground)' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {desc}
                  </p>
                </div>
                <Toggle checked={settings[key]} onChange={() => handleToggle(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Data management */}
        <div className={styles.card} style={sectionStyle}>
          <p style={labelStyle}>Data Management</p>
          <div style={{ gap: '1rem', display: 'grid' }}>
            {[
              { icon: Download, label: 'Export Vault', desc: 'Download encrypted backup', action: () => setExportModal(true) },//downloadCredentials(showToast), },
              { icon: Upload, label: 'Import Passwords', desc: 'From CSV, 1Password, Bitwarden', action: () => { setImportModal(true) } }
            ].map(({ icon: Icon, label, desc, action }) => (
              <button
                onClick={action}
                key={label}
                className={styles.dataManagementButton}
                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--muted)'; }}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted-foreground)' }}>{desc}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => setDeleteModalOpen(true)}
              className={styles.dataManagementButton}
              style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.05)'; }}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Delete Account</p>
                <p style={{ fontSize: '0.72rem', color: '#ef444480' }}>Permanently erase all data</p>
              </div>
            </button>
          </div>
        </div>

        {/* Version */}
        <p style={{ textAlign: 'center', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted-foreground)' }}>
          V2 Vault v1.0.1 · End-to-end encrypted
        </p>
      </div>

    </div>
  );
}