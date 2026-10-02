import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

interface AutoLockContextType {
  isLocked: boolean;
  setAutoLockAuto: (b: boolean) => void;
  lockVault: () => void;
  updateTimeout: (ms: number, enabled: boolean) => void;
}

const AutoLockContext = createContext<AutoLockContextType | undefined>(undefined);

export function AutoLockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false);
  const [auto_lock, setAutoLockAuto] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState<number>(0); 
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ isLocked, timeoutMs, isEnabled, auto_lock });

  // Sync ref values instantly to read runtime parameter updates accurately
  useEffect(() => {
    stateRef.current = { isLocked, timeoutMs, isEnabled, auto_lock };
  }, [isLocked, timeoutMs, isEnabled, auto_lock]);

  const lockVault = () => {
    setIsLocked(true);
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText('').catch(() => {});
    }
  };

  const resetTimer = () => {
    // Fix: extract properties purely out of stateRef to avoid closure trapping
    const { isLocked: locked, timeoutMs: duration, isEnabled: active, auto_lock: globallyEnabled } = stateRef.current;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Safety exit conditions if settings disable parameters
    if (locked || !active || !globallyEnabled || duration <= 0) return;

    timeoutRef.current = setTimeout(() => {
      lockVault();
    }, duration);
  };

  // Fixed signature parameters to match Dashboard calls
  const updateTimeout = (ms: number, enabled: boolean) => {
    setTimeoutMs(ms);
    setIsEnabled(enabled);
  };

  // Re-start or reset timers when configuration state properties alter
  useEffect(() => {
    resetTimer();
  }, [timeoutMs, isEnabled, auto_lock]);

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimer();

    resetTimer();
    activityEvents.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, []);

  const contextValue: AutoLockContextType = {
    isLocked,
    setAutoLockAuto,
    lockVault,
    updateTimeout,
  };

  const ProviderComponent = AutoLockContext.Provider;

  return (
    <ProviderComponent value={contextValue}>
      {children}
    </ProviderComponent>
  );
}

export function useAutoLock() {
  const context = useContext(AutoLockContext);
  if (!context) {
    throw new Error('useAutoLock must be used within an AutoLockProvider');
  }
  return context;
}