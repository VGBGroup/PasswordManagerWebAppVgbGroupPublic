// components/Modal/ImportCredentials.tsx
import { useState, useRef } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';
import client from '@/api/client';
import { useAuthStore } from '@/auth';
import { useToast } from '@/pages/popups/ToastProvider';
import { parseChromeCSV, parseOwnExportCSV } from '@/functions/importCredentials';
import { encryptCredential } from '@/functions/encryptCredential';

type ImportMode = 'unencrypted' | 'own-export';

interface Category {
  recordId: number;
  name: string; // adjust if your categories DTO differs
}

export function ImportCredentialsModal({
  open,
  onClose,
  categories,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onImported: () => void;
}) {
  const [mode, setMode] = useState<ImportMode>('unencrypted');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dataKey = useAuthStore((s) => s.dataKey); // confirm this matches your store's real field name
  const { showToast } = useToast();

  if (!open) return null;

  async function handleImport() {
    if (!file || categoryId === '') {
      showToast('Select a file and a category.', 'warning');
      return;
    }
    if (!dataKey) {
      showToast('Vault key not available. Please log in again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      let payload: { categoryRecordId: number; credentials: any[] };

      if (mode === 'own-export') {
        const rows = parseOwnExportCSV(text);
        payload = {
          categoryRecordId: categoryId,
          credentials: rows.map((r) => ({
            ciphertext: r.ciphertext,
            iv: r.iv,
            favourite: r.favourite,
            hideUsername: r.hideUsername,
            color: '#22c55e', // not carried in the export CSV today
          })),
        };
      } else {
        const rows = parseChromeCSV(text, categoryId);
        const encryptedRows = await Promise.all(
          rows.map(async (item) => {
            const fullItem = { ...item, updatedAt: new Date().toISOString() };
            const { ciphertext, iv } = await encryptCredential(dataKey, fullItem);
            return {
              ciphertext,
              iv,
              favourite: item.favourite,
              hideUsername: item.hideUsername,
              color: item.color,
            };
          })
        );
        payload = { categoryRecordId: categoryId, credentials: encryptedRows };
      }

      const { data } = await client.post('credentials/import', payload);
      showToast(`Imported ${data.imported} credential(s).`, 'success');
      onImported();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Import failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--foreground)' }}>Import Credentials</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setMode('unencrypted')}
            style={{
              flex: 1, padding: '10px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace',
              borderRadius: 8, cursor: 'pointer',
              border: mode === 'unencrypted' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              backgroundColor: mode === 'unencrypted' ? 'rgba(34,197,94,0.1)' : 'transparent',
              color: mode === 'unencrypted' ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            Unencrypted CSV
          </button>
          <button
            onClick={() => setMode('own-export')}
            style={{
              flex: 1, padding: '10px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace',
              borderRadius: 8, cursor: 'pointer',
              border: mode === 'own-export' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
              backgroundColor: mode === 'own-export' ? 'rgba(34,197,94,0.1)' : 'transparent',
              color: mode === 'own-export' ? 'var(--primary)' : 'var(--muted-foreground)',
            }}
          >
            My Export
          </button>
        </div>

        {mode === 'own-export' && (
          <div style={{
            display: 'flex', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: 10, marginBottom: 16,
          }}>
            <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.4 }}>
              Only works if this CSV was exported from this same account — it's encrypted with your current vault key.
            </p>
          </div>
        )}

        <label style={{
          display: 'block', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        }}>
          Import into category
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          style={{
            width: '100%', padding: '10px 12px', fontSize: '0.85rem', marginBottom: 16,
            backgroundColor: 'var(--background)', color: 'var(--foreground)',
            border: '1px solid var(--border)', borderRadius: 8, boxSizing: 'border-box',
          }}
        >
          <option value="">Select a category…</option>
          {categories.map((c) => (
            <option key={c.recordId} value={c.recordId}>{c.name}</option>
          ))}
        </select>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '1.5px dashed var(--border)', borderRadius: 8, padding: 24,
            textAlign: 'center', cursor: 'pointer', marginBottom: 16,
          }}
        >
          <Upload size={20} style={{ color: 'var(--muted-foreground)', marginBottom: 8 }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground)' }}>
            {file ? file.name : 'Click to select a .csv file'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={loading || !file || categoryId === ''}
          style={{
            width: '100%', padding: '12px', fontSize: '0.875rem', fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)', border: 'none', borderRadius: 8,
            cursor: (loading || !file || categoryId === '') ? 'not-allowed' : 'pointer',
            opacity: (loading || !file || categoryId === '') ? 0.6 : 1,
          }}
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  );
}