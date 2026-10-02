import { create } from 'zustand'
import { clearCryptoKey, getCryptoKey, saveCryptoKey } from './crypto/cryptoDb';

interface AuthState {
  token: string | null;
  userId: string | null;
  displayName: string | null;
  dataKey: CryptoKey | null;
  isHydrating: boolean; // Tracks if we are still reading the key from IndexedDB
  initAuth: () => Promise<void>;
  setAuth: (token: string, userId: string, displayName: string, dataKey: CryptoKey) => Promise<void>;
  logout: () => Promise<void>;
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  try {
    // Split the JWT (header.payload.signature) and grab the payload
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode the base64 string
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const { exp } = JSON.parse(jsonPayload);
    
    // JWT expiration is in seconds, Date.now() is in milliseconds
    return Date.now() >= exp * 1000;
  } catch (error) {
    // If decoding fails, assume the token is corrupt/invalid
    return true;
  }
}

const initialToken = localStorage.getItem('token');
const tokenIsValid = initialToken && !isTokenExpired(initialToken);

if (!tokenIsValid) {
  // Clean up stale localStorage data if the token is invalid/expired
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('displayName');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  displayName: localStorage.getItem('displayName'),
  dataKey: null,
  isHydrating: true,

  initAuth: async () => {
    const token = get().token;
    
    // If there's no token, or the token is expired, don't bother looking for a key
    if (!token) {
      set({ isHydrating: false });
      return;
    }

    try {
      const key = await getCryptoKey();
      if (key) {
        set({ dataKey: key, isHydrating: false });
      } else {
        // Token exists but key is missing (corrupted state) -> Force logout
        await get().logout();
      }
    } catch (e) {
      await get().logout();
    }
  },

  setAuth: async (token, userId, displayName, dataKey) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('displayName', displayName);
    
    // Securely save the actual CryptoKey object
    await saveCryptoKey(dataKey); 
    
    set({ token, userId, displayName, dataKey });
  },

  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('displayName');
    
    // Wipe the key from IndexedDB
    await clearCryptoKey(); 
    
    set({ token: null, userId: null, displayName: null, dataKey: null, isHydrating: false });
  }
}))