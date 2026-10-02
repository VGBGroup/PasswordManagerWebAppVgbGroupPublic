import styles from '../../styles/SecondaryStyles/Audit.module.css';

export function ScoreRing({ score }: { score: number }) {
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#60a5fa' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  return (
    <div className={styles.relative} style={{ width: 140, height: 140 }}>
      <svg
        width="140"
        height="140"
        viewBox="0 0 100 100"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="7"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div
        className={styles.scoreText}
        style={{ pointerEvents: 'none' }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '2rem',
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span
          style={{
            fontSize: '0.68rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--muted-foreground)',
            marginTop: 2,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}