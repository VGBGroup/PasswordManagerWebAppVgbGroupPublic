import { useAuthStore } from "@/auth";
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5142/api";

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let toastHandler: ((message: string) => void) | null = null;
export function registerToastHandler(handler: (message: string) => void) {
  toastHandler = handler;
}

type UpgradeModalHandler = (message: string, upgradeUrl: string, currentLimit: number) => void;
let upgradeModalHandler: UpgradeModalHandler | null = null;
export function registerUpgradeModalHandler(handler: UpgradeModalHandler) {
  upgradeModalHandler = handler;
}

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Kick the user out if the backend rejects the token
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthEndpoint =
      url.includes("/login") ||
      url.includes("/verify") ||
      url.includes("/register");

    // Check for 402 Payment Required with needsUpgrade
    const data = error.response?.data;
    if (error.response?.status === 402 && data?.needsUpgrade) {
      // Trigger the upgrade modal handler
      upgradeModalHandler?.(data.message, data.upgradeUrl, data.currentLimit);
      // Do NOT show a toast; the modal will handle it
      return Promise.reject(error);
    }

    // Existing 401 handling
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      useAuthStore.getState().logout();
      navigation.navigate("login");
      toastHandler?.("Your session expired. Please log in again.");
    } else if (!isAuthEndpoint) {
      const message =
        error.response?.data?.message ||
        error.response?.data ||
        "Something went wrong. Please try again.";
      toastHandler?.(message);
    }

    return Promise.reject(error);
  },
);

export default client;
