import { ShieldCheck, ShieldX, AlertTriangle, ShieldAlert, ShieldOff, RefreshCw } from 'lucide-react';
import type { DecryptedInCredential } from '@/interfaces/decryptedCredential';
import styles from '../../styles/SecondaryStyles/Audit.module.css';
import { useEffect, useMemo, useState } from 'react';
import { calculateAuditMetrics } from '@/functions/CalculateScore';
import { ScoreRing } from '@/components/UI/ScoreRing';
import client from '@/api/client';
import { checkPasswordBreach } from '@/utils/breachCheck';

interface IssueRowProps {
  item: DecryptedInCredential;
  actionLabel: string;
  actionColor: string;
  actionBg: string;
  editCredential: (id: number) => void
}

function IssueRow({ item, actionLabel, actionColor, actionBg, editCredential }: IssueRowProps) {
  const hex = item.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.5 ? '#1a2e1f' : item.color;

  return (
    <div
      className={styles.issueRow}
      style={{ backgroundColor: 'var(--muted)' }}
    >
      <div
        className={styles.inner}
        style={{ backgroundColor: `${item.color}22` }}
      >
        <span
          style={{
            textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: textColor,
          }}
        >
          {item.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span
        style={{ flex: 1, fontSize: '1rem', color: 'var(--foreground)', fontWeight: 500 }}
      >
        {item.name}
      </span>
      <span
        style={{
          fontSize: '1rem',
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--muted-foreground)',
        }}
      >
        {item.username.length > 22 ? item.username.slice(0, 22) + '…' : item.username}
      </span>
      <button
        onClick={() => editCredential(item.recordId)}
        className={styles.button}
        style={{
          fontSize: '.9rem',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
          color: actionColor,
          backgroundColor: actionBg,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.75';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

interface IssueSectionProps {
  icon: React.ElementType;
  title: string;
  severity: string;
  count: number;
  items: DecryptedInCredential[];
  iconColor: string;
  iconBg: string;
  borderColor: string;
  actionLabel: string;
  emptyMessage: string;
  editCredential: (id: number) => void
}

function IssueSection({
  icon: Icon,
  title,
  severity,
  count,
  items,
  iconColor,
  iconBg,
  borderColor,
  actionLabel,
  emptyMessage,
  editCredential
}: IssueSectionProps) {
  return (
    <div
      className={styles.issueContainer}
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className={styles.header}>
        <div
          className={styles.type}
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span
          style={{ flex: 1, fontSize: '1.2rem', fontWeight: 500, color: 'var(--foreground)' }}
        >
          {title}
        </span>
        <span
          className={styles.text}
          style={{
            fontSize: '0.9rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            color: iconColor,
            backgroundColor: iconBg,
          }}
        >
          {severity}
        </span>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: iconColor,
            minWidth: '1.5rem',
            textAlign: 'right',
          }}
        >
          {count}
        </span>
      </div>

      {count > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <IssueRow
              key={item.recordId}
              item={item}
              actionLabel={actionLabel}
              actionColor={iconColor}
              actionBg={iconBg}
              editCredential={editCredential}
            />
          ))}
        </div>
      ) : (
        <div className={styles.protected} style={{ color: '#22c55e' }}>
          <ShieldCheck className="w-4 h-4" />
          <span style={{ fontSize: '0.9rem' }}>{emptyMessage}</span>
        </div>
      )}
    </div>
  );
}

interface AuditInterface {
  items: DecryptedInCredential[],
  setAlert: (b: boolean) => void,
  setWeakCount: (n: number) => void,
  setEditModalVisibility: (b: boolean) => void;
  setSelectedItemId: (id: number) => void;
  setSearchQuery: (n: string) => void;
  security_alerts: boolean;
}

export function Audit({ items, setAlert, setWeakCount, setEditModalVisibility, setSelectedItemId, setSearchQuery, security_alerts }: AuditInterface) {
  const { atRisk, reusedItems, oldItems, totalIssues, score } = useMemo(() => {
    return calculateAuditMetrics(items);
  }, [items]);

  // Determine dynamic values for the main header badge based on security tier score
  const { shieldColor, shieldBg, HeaderIcon } = useMemo(() => {
    if (score >= 80) {
      return { shieldColor: '#22c55e60', shieldBg: 'rgba(34, 197, 84, 0.1)', HeaderIcon: ShieldCheck };
    }
    if (score >= 60) {
      return { shieldColor: '#60a5fa71', shieldBg: 'rgba(96, 165, 250, 0.1)', HeaderIcon: ShieldAlert };
    }
    if (score >= 40) {
      return { shieldColor: '#f59f0b86', shieldBg: 'rgba(245, 158, 11, 0.1)', HeaderIcon: AlertTriangle };
    }
    return { shieldColor: '#ef444462', shieldBg: 'rgba(239, 68, 68, 0.1)', HeaderIcon: ShieldX };
  }, [score]);

  const [checkingBreaches, setCheckingBreaches] = useState(false);
  const [breachedItems, setBreachedItems] = useState<DecryptedInCredential[]>([]);
  const [breachCheckDone, setBreachCheckDone] = useState(false);
  const [remainingScans, setRemainingScans] = useState<number | 'unlimited'>('unlimited');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const checkBreaches = async () => {
    // 1. Check remaining scans from backend
    try {
      const res = await client.post('/breach/scan');
      if (res.data.needsUpgrade) {
        setShowUpgradePrompt(true);
        return;
      }
      setRemainingScans(res.data.remaining);

      if (showUpgradePrompt) { return; }

      console.log('Starting breach check for', items.length, 'items...');

      setCheckingBreaches(true);
      setBreachedItems([]);

      // 2. Loop through all credentials and check each password
      const breached: DecryptedInCredential[] = [];
      for (const cred of items) {
       // Check if password exists or it is not a card
        if (cred.type == 'card' || !cred.password) {continue}
        const isBreached = await checkPasswordBreach(cred.password);
        if (isBreached) {
          breached.push(cred);
        }
      }

      setBreachedItems(breached);
      setBreachCheckDone(true);
      setCheckingBreaches(false);
    } catch {
      // If the endpoint fails, fallback to unlimited (or show error)
    }
  };

  function editCredential(id: number) {
    setEditModalVisibility(true)
    setSearchQuery('')
    setSelectedItemId(id)
  }

  useEffect(() => {
    if (totalIssues > 0 && security_alerts) {
      setAlert?.(true);
      setWeakCount?.(totalIssues);
    } else {
      setAlert?.(false);
      setWeakCount?.(0);
    }
  }, [totalIssues, setAlert, setWeakCount]);

  return (
    <div
      className={styles.container}
      style={{
        backgroundColor: 'var(--background)',
        fontFamily: 'Inter, sans-serif',
        scrollbarWidth: 'none',
      }}
    >
      <div className={styles.secondaryContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div
            className={styles.badge}
            style={{
              backgroundColor: shieldBg,
              // Pass the current color choice into the CSS module layer via a custom variable
              ['--pulse-color' as any]: shieldColor
            }}
          >
            <HeaderIcon className="w-5 h-5" style={{ color: shieldColor }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '-0.02em',
              }}
            >
              Security Audit
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted-foreground)' }}>
              Last checked:{' '}
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Score card */}
        <div
          className={styles.card}
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <ScoreRing score={score} />
          <div className={styles.flex}>
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--foreground)',
                marginBottom: 6,
              }}
            >
              Security Score
            </h2>
            <p
              style={{
                fontSize: '0.83rem',
                color: 'var(--muted-foreground)',
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              {totalIssues === 0
                ? 'Your vault is in excellent shape. All passwords are strong and unique.'
                : `Found ${totalIssues} issue${totalIssues !== 1 ? 's' : ''} across ${items.length} vault items.`}
            </p>
            <div className={styles.info}>
              {[
                { count: atRisk.length, label: 'At Risk', color: '#ef4444' },
                { count: reusedItems.length, label: 'Reused', color: '#f59e0b' },
                { count: oldItems.length, label: 'Outdated', color: '#60a5fa' },
              ].map(({ count, label, color }) => (
                <div
                  key={label}
                  className={styles.infoCard}
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '1.3rem',
                      fontWeight: 700,
                      color,
                      lineHeight: 1,
                    }}
                  >
                    {count}
                  </p>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--muted-foreground)',
                      marginTop: 4,
                    }}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Issue sections */}
        <IssueSection
          icon={ShieldX}
          title="Weak or Fair Passwords"
          severity="Critical"
          count={atRisk.length}
          items={atRisk}
          iconColor="#ef4444"
          iconBg="rgba(239,68,68,0.1)"
          borderColor="rgba(239,68,68,0.15)"
          actionLabel="Change"
          emptyMessage="No weak passwords found"
          editCredential={editCredential}
        />
        <IssueSection
          icon={AlertTriangle}
          title="Reused Passwords"
          severity="High"
          count={reusedItems.length}
          items={reusedItems}
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.1)"
          borderColor="rgba(245,158,11,0.15)"
          actionLabel="Fix"
          emptyMessage="No reused passwords found"
          editCredential={editCredential}
        />
        <IssueSection
          icon={ShieldAlert}
          title="Outdated Passwords (>1 year)"
          severity="Medium"
          count={oldItems.length}
          items={oldItems}
          iconColor="#60a5fa"
          iconBg="rgba(96,165,250,0.1)"
          borderColor="rgba(96,165,250,0.15)"
          actionLabel="Update"
          emptyMessage="All passwords are up to date"
          editCredential={editCredential}
        />

        {/* Show upgrade prompt if free tier limit reached */}
        {/* {showUpgradePrompt && (
          <div
            className={styles.issueContainer}
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid rgba(245,158,11,0.3)',
              padding: '16px',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            <AlertTriangle className="w-5 h-5 inline" style={{ color: '#f59e0b' }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--foreground)', marginTop: 4 }}>
              You've used all your free scans this month.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              Upgrade to Pro for unlimited breach scanning.
            </p>
            <button
              onClick={onUpgrade}
              className={styles.button}
              style={{
                marginTop: 8,
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#22C55E',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Upgrade to Pro
            </button>
          </div>
        )} */}

        {/* If breach check not done, show the trigger button */}
        {!breachCheckDone && !showUpgradePrompt && (
          <div
            className={styles.issueContainer}
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              padding: '16px 12px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: 12 }}>
              Check if your passwords have appeared in known data breaches.
              {typeof remainingScans === 'number' && (
                <span style={{ display: 'block', fontSize: '0.75rem', marginTop: 4 }}>
                  {remainingScans} free scans remaining this month
                </span>
              )}
            </p>
            <button
              onClick={checkBreaches}
              disabled={checkingBreaches}
              className={styles.button}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: checkingBreaches ? 'var(--muted)' : '#22C55E',
                borderRadius: '6px',
                border: 'none',
                cursor: checkingBreaches ? 'not-allowed' : 'pointer',
              }}
            >
              {checkingBreaches ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                  Checking...
                </>
              ) : (
                'Check for Breaches'
              )}
            </button>
          </div>
        )}

        {breachCheckDone && (
          <IssueSection
            icon={breachedItems.length > 0 ? ShieldX : ShieldOff}
            title="Breach Report"
            severity={breachedItems.length > 0 ? `Critical (${breachedItems.length})` : 'Secure'}
            count={breachedItems.length}
            items={breachedItems}
            iconColor={breachedItems.length > 0 ? '#ef4444' : '#22c55e'}
            iconBg={breachedItems.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'}
            borderColor={breachedItems.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'}
            actionLabel="Change"
            emptyMessage="No breached passwords found"
            editCredential={editCredential}
          />
        )}
      </div>
    </div>
  );
}