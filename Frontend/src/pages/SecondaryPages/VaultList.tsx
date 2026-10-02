import styles from '../../styles/SecondaryStyles/VaultStyles.module.css';

import { Search, Plus, SlidersHorizontal, Star, Shield } from 'lucide-react';
import { CredentialDetails } from './CredentialDetails';
import type { DecryptedInCredential } from '@/interfaces/decryptedCredential';

interface VaultListProps {
    items: DecryptedInCredential[];
    selectedItemId: number | null;
    setSelectedItemId: (id: number) => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    selectedItem: DecryptedInCredential;
    setCredentials: React.Dispatch<React.SetStateAction<DecryptedInCredential[]>>;
    setCredentialModalVisibility: (q: boolean) => void;
    setDeleteModalVisibilty: (q: boolean) => void;
    setEditModalVisibility: (q: boolean) => void;
    clipboard_clear: boolean;
    hide_credentials: boolean;
    setCategoryModalVisibility: (b: boolean) => void;
    activeSelection: string;
}

function StrengthDots({ strength }: { strength: DecryptedInCredential['strength'] }) {
    const levels: Record<string, number> = { weak: 1, fair: 2, strong: 3, 'very-strong': 4 };
    const colors: Record<string, string> = {
        weak: '#ef4444',
        fair: '#f59e0b',
        strong: '#60a5fa',
        'very-strong': '#22c55e',
    };
    const n = levels[strength];
    const color = colors[strength];
    return (
        <div className={styles.inner}>
            {[1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className={styles.dots}
                    style={{ backgroundColor: i <= n ? color : 'var(--border)' }}
                />
            ))}
        </div>
    );
}

function ItemAvatar({ name, color }: { name: string; color: string }) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const textColor = luminance > 1 ? '#1a2e1f' : color;

    return (
        <div
            className={styles.logo}
            style={{
                backgroundColor: `${color}22`,
                border: `1px solid ${color}30`,
            }}
        >
            <span
                style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: textColor,
                }}
            >
                {name.charAt(0).toUpperCase()}
            </span>
        </div>
    );
}

export function VaultList({
    items,
    selectedItemId,
    setSelectedItemId,
    searchQuery,
    setSearchQuery,
    selectedItem,
    setCredentials,
    setCredentialModalVisibility,
    setDeleteModalVisibilty,
    setEditModalVisibility,
    clipboard_clear,
    hide_credentials,
    setCategoryModalVisibility,
    activeSelection
    // activeCategory,
}: VaultListProps) {

    // Check if selected items is inside the selected items list
    const hasCorrectSelectedItem = items.find(({ recordId }) => recordId === selectedItemId);

    return (
        <div
            className={styles.container}
            style={{
                borderRight: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            <div className={styles.selection}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.sectionHeader}>
                        <h2
                            style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'var(--foreground)',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {activeSelection}
                        </h2>
                        <div className={styles.sectionHolder}>
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
                                <SlidersHorizontal size={20} className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setCredentialModalVisibility(true)}
                                className={styles.button}
                                style={{ color: 'var(--primary)', backgroundColor: 'rgba(34,197,94,0.08)' }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(34,197,94,0.08)';
                                }}
                            >
                                <Plus size={20} className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className={styles.searchSection}>
                        <Search
                            size={15}
                            style={{ position: 'absolute', color: 'var(--muted-foreground)', marginLeft: '.7rem' }}
                        />
                        <input
                            type="text"
                            placeholder="Search vault..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchbar}
                            onFocus={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = 'rgba(34,197,94,0.3)';
                            }}
                            onBlur={(e) => {
                                (e.target as HTMLInputElement).style.borderColor = 'transparent';
                            }}
                        />
                    </div>
                </div>

                {/* Count */}
                <div style={{ paddingTop: '1rem' }}>
                    <span
                        style={{
                            fontSize: '.8rem',
                            fontFamily: 'JetBrains Mono, monospace',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                </div>

                {/* List */}
                <div className={styles.listContainer} style={{ scrollbarWidth: 'none' }}>
                    {items.length === 0 ? (
                        <div className={styles.emptyList}>
                            <Shield
                                className="w-12 h-12 mb-3"
                                size={50}
                                style={{ color: 'var(--border)', opacity: 0.5 }}
                            />
                            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                                No items found
                            </p>
                        </div>
                    ) : (
                        items.map((item) => {
                            const isSelected = selectedItemId === item.recordId;
                            return (
                                <button
                                    key={item.recordId}
                                    onClick={() => setSelectedItemId(item.recordId)}
                                    className={styles.button}
                                    style={{
                                        backgroundColor: isSelected ? 'rgba(34,197,94,0.08)' : 'transparent',
                                        border: isSelected ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <ItemAvatar name={item.name} color={item.color} />
                                    <div className={styles.buttonContainer}>
                                        <div className={styles.TitleContainer}>
                                            <span
                                                className={styles.title}
                                                style={{
                                                    fontSize: '1rem',
                                                    fontWeight: 500,
                                                    color: 'var(--foreground)',
                                                }}
                                            >
                                                {item.name}
                                            </span>
                                            {item.favourite && (
                                                <Star size={15} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                            )}
                                        </div>
                                        <p
                                            className="truncate mt-0.5"
                                            style={{
                                                marginTop: '.2rem',
                                                fontSize: '0.75rem',
                                                color: 'var(--muted-foreground)',
                                                fontFamily: 'JetBrains Mono, monospace',
                                            }}
                                        >
                                            {item.username}
                                        </p>
                                        <div className={styles.security}>
                                            <StrengthDots strength={item.strength} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {(hasCorrectSelectedItem &&
                <CredentialDetails hide_credentials={hide_credentials} clipboard_clear={clipboard_clear} item={selectedItem} setCredentials={setCredentials} setDeleteModalVisibilty={setDeleteModalVisibilty} setEditModalVisibility={setEditModalVisibility} />
            )}
        </div>
    );
}
