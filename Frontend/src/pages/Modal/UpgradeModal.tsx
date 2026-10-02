import React from 'react';
import { X, Crown } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import styles from '@/styles/Modals/UpgradeModal.module.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  upgradeUrl: string;
  currentLimit: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  message,
  upgradeUrl,
}) => {
  const { setActiveView } = useUIStore();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    // If it's a full URL (Stripe or external), redirect
    if (upgradeUrl.startsWith('http')) {
      window.location.href = upgradeUrl;
    } else {
      // Otherwise, switch to settings view in the SPA
      setActiveView('settings');
      onClose(); // Close the modal after navigation
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={20} />
        </button>
        <div className={styles.icon}>
          <Crown size={48} className="text-amber-500" />
        </div>
        <h2 className={styles.title}>Upgrade to Pro</h2>
        <p className={styles.message}>Free tier limit reached. Upgrade to Pro!</p>
        <p className={styles.details}>
          {message}
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleUpgrade}>
            Upgrade Now
          </button>
          <button className={styles.secondaryButton} onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};