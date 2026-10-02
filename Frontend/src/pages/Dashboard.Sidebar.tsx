// import { useState } from 'react';
import styles from '../styles/HomeStyles.module.css';

import {
  Settings,
  AlertTriangle,
  LayoutGrid,
  Sun,
  Moon,
  Lock,
  CreditCard,
  Globe,
  Star,
  Folder,
  SlidersHorizontal,
} from 'lucide-react';
import type { DecryptedInCredential } from '@/interfaces/decryptedCredential';
import type { CategoriesInDto } from '@/interfaces/category';

interface SidebarProps {
  isDark: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
  setDarkMode: (dark: boolean) => void;
  logout: () => void;
  username: string | null;
  items: DecryptedInCredential[];
  activeTypeCategory: string | null;
  activeCategory: number | null;
  setActiveCategory: (s: number | null) => void;
  setActiveTypeCategory: (s: string | null) => void;
  setCategoryModalVisibility: (b: boolean) => void;
  categories: CategoriesInDto[];
  alert: boolean,
  weakCount: number,
  initials: string,
  avatarColor: string,
  displayName: string,
}

const navItems = [
  { view: 'vault' as 'vault', icon: LayoutGrid, label: 'Vault' },
  // { view: 'generator' as 'generator', icon: Zap, label: 'Generator' },
  { view: 'audit' as 'audit', icon: AlertTriangle, label: 'Security Audit', alert: true },
  { view: 'settings' as 'settings', icon: Settings, label: 'Settings' },
];

const types = [
  { id: 'all' as string, icon: LayoutGrid, label: 'All Items' },
  { id: 'favorites' as string, icon: Star, label: 'Favorites' },
  { id: 'login' as string, icon: Globe, label: 'Logins' },
  { id: 'card' as string, icon: CreditCard, label: 'Cards' },
  { id: 'identity' as string, icon: Globe, label: 'Identities' },
  // { id: 'note' as string, icon: Globe, label: 'Secure Notes' },
];

export function Sidebar({
  setActiveView,
  activeView,
  isDark,
  setDarkMode,
  logout,
  items,
  activeTypeCategory,
  setActiveTypeCategory,
  activeCategory,
  setActiveCategory,
  setCategoryModalVisibility,
  categories,
  alert,
  weakCount,
  initials,
  avatarColor,
  displayName,
}: SidebarProps) {

  const counts: Record<string, number> = {
    all: items.length,
    favorites: items.filter((i) => i.favourite).length,
    login: items.filter((i) => i.type === 'login').length,
    card: items.filter((i) => i.type === 'card').length,
    identity: items.filter((i) => i.type === 'identity').length,
    // note: items.filter((i) => i.type === 'note').length,
  };

  return (
    <div
      className={styles['left-panel']}
      style={{ backgroundColor: 'var(--sidebar)', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Navigation */}
      <nav className={styles.sidebar}>
        {navItems.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => {
              setActiveView(view);
              // Crucial fix: Reset filters when changing main views to avoid stuck filter states
              if (view !== 'vault') {
                setActiveCategory(null);
                setActiveTypeCategory('all');
              }
            }}
            className={styles.navButton}
            style={{
              backgroundColor:
                activeView === view ? 'rgba(34,197,94,0.1)' : 'transparent',
              color:
                activeView === view
                  ? 'var(--primary)'
                  : 'var(--muted-foreground)',
            }}
            onMouseEnter={(e) => {
              if (activeView !== view) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--sidebar-accent)';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--sidebar-foreground)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== view) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'transparent';
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--muted-foreground)';
              }
            }}
          >
            <Icon size={20} className="w-4 h-4 shrink-0" />
            <span style={{ fontSize: '1rem' }}>{label}</span>
            {alert && weakCount > 0 && view === 'audit' && (
              <span
                className={styles.alert}
                style={{
                  backgroundColor: '#f59e0b20',
                  color: '#f59e0b',
                  fontSize: '0.9rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                }}
              >
                {weakCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div
        className="mx-5 my-2"
        style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '.5rem' }}
      />

      {/* TypeView */}
      {activeView === 'vault' && (
        <div className={styles.TypeView} style={{ scrollbarWidth: 'none' }}>
          <div>
            <p
              className="px-3 mb-1.5"
              style={{
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                paddingInline: '.2rem',
                marginBottom: '1rem',
                paddingTop: '.5rem'
              }}
            >
              TYPES
            </p>
            {types.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTypeCategory(id);
                  setActiveCategory(null);
                }}
                className={styles.TypeButton}
                style={{
                  backgroundColor:
                    activeTypeCategory === id && activeView === 'vault'
                      ? 'rgba(34,197,94,0.1)'
                      : 'transparent',
                  color:
                    activeTypeCategory === id && activeView === 'vault'
                      ? 'var(--primary)'
                      : 'var(--muted-foreground)',
                }}
                onMouseEnter={(e) => {
                  if (!(activeTypeCategory === id && activeView === 'vault')) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'var(--sidebar-accent)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'var(--sidebar-foreground)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(activeTypeCategory === id && activeView === 'vault')) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      'var(--muted-foreground)';
                  }
                }}
              >
                <Icon size={20} className="w-3.5 h-3.5 shrink-0" />
                <span style={{ fontSize: '1rem' }}>{label}</span>
                <span
                  className="ml-auto"
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--muted-foreground)',
                    marginLeft: 'auto',
                    paddingRight: '.3srem'
                  }}
                >
                  {counts[id] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div>
            <div className={styles.sectionHeader}>
              <p
                className="px-3 mt-5 mb-1.5"
                style={{
                  fontSize: '0.8rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--muted-foreground)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                CATEGORIES
              </p>
              <button
                onClick={() => setCategoryModalVisibility(true)}
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
                <SlidersHorizontal size={15} className="w-3.5 h-3.5" />
              </button>
            </div>

            {categories.map((category) => (
              <button
                onClick={() => {
                  setActiveCategory(category.recordId);
                  setActiveTypeCategory(null);
                }}
                key={category.recordId}
                className={styles.TypeButton}
                style={{
                  backgroundColor:
                    activeCategory === category.recordId && activeView === 'vault'
                      ? 'rgba(34,197,94,0.1)'
                      : 'transparent',
                  color:
                    activeCategory === category.recordId && activeView === 'vault'
                      ? 'var(--primary)'
                      : 'var(--muted-foreground)',
                }}
                onMouseEnter={(e) => {
                  if (!(activeCategory === category.recordId && activeView === 'vault')) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--sidebar-accent)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-foreground)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(activeCategory === category.recordId && activeView === 'vault')) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-foreground)';
                  }
                }}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" />
                <span style={{ fontSize: '0.83rem' }}>{category.name}</span>

                <span
                  className="ml-auto"
                  style={{
                    fontSize: '0.9rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--muted-foreground)',
                    marginLeft: 'auto',
                    paddingRight: '.3srem'
                  }}
                >
                  {items.filter((i) => i.categoryRecordId === category.recordId).length ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div
        className={styles.bottomContainer}
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className={styles.account}>
          <div
            className={styles.logo}
            style={{ backgroundColor: avatarColor }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--primary)',
              }}
            >
              {initials}
            </span>
          </div>
          <div className={styles.info} style={{containerType: 'inline-size'}}>
            <p
              className="truncate"
              style={{
                fontSize: 'clamp(0.75rem, 8cqw, 0.9rem)',
                color: 'var(--sidebar-foreground)',
                fontWeight: 500,
              }}
            >
              {displayName}
            </p>
            <p
              className="truncate"
              style={{
                fontSize: '0.8rem',
                color: 'var(--muted-foreground)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Connected
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!isDark)}
            className={styles.button}
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--sidebar-accent)';
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--sidebar-foreground)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'transparent';
              (e.currentTarget as HTMLButtonElement).style.color =
                'var(--muted-foreground)';
            }}
          >
            {isDark ? <Sun size={23} className="w-3.5 h-3.5" /> : <Moon size={23} className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={logout}
          className={styles.lockButton}
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'rgba(220,38,38,0.08)';
            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'transparent';
            (e.currentTarget as HTMLButtonElement).style.color =
              'var(--muted-foreground)';
          }}
        >
          <Lock className="w-3.5 h-3.5" />
          <span style={{ fontSize: '1rem' }}>Lock Vault</span>
        </button>
      </div>
    </div>
  );
}