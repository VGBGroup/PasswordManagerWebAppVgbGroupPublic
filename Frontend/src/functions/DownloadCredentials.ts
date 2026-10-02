import client from "@/api/client";
import type { ToastType } from "@/pages/popups/ToastProvider";

let downloading = false;

// Define column schemas for both export types
const ENCRYPTED_COLUMNS = [
  { label: "Record ID", key: "recordId" },
  { label: "Ciphertext", key: "ciphertext" },
  { label: "IV", key: "iv" },
  { label: "Category ID", key: "categoryRecordId" },
  { label: "Hide Username", key: "hideUsername" },
  { label: "Favourite", key: "favourite" },
  { label: "Updated At", key: "updatedAt" },
  { label: "Created At", key: "createdAt" },
];

const UNENCRYPTED_COLUMNS = [
  { label: "Name", key: "name" },
  { label: "Username", key: "username" },
  { label: "Password", key: "password" },
  { label: "URL", key: "url" },
  { label: "Notes", key: "notes" },
  { label: "Category ID", key: "categoryRecordId" },
  { label: "Favourite", key: "favourite" },
  { label: "Updated At", key: "updatedAt" },
  { label: "Created At", key: "createdAt" },
];

export async function downloadCredentials(
  showToast: (message: string, type?: ToastType) => void,
  options: { encrypted: boolean; twoFactorCode?: string },
  dataKey?: CryptoKey, // Pass the unwrapped WebCrypto symmetric key from state/context
) {
  if (downloading) return;
  downloading = true;

  showToast("Preparing download...", "info");

  try {
    // 1. Verify 2FA if unencrypted export is selected
    if (!options.encrypted && options.twoFactorCode) {
      await client.post("user/2fa/verify-authenticated", {
        code: options.twoFactorCode,
      });
    }

    // 2. Request credentials from server
    const response = await client.get("credentials", {
      params: { encrypted: options.encrypted },
    });

    const credentials = response.data;

    if (!Array.isArray(credentials) || credentials.length === 0) {
      showToast("No credentials found to export.", "warning");
      return;
    }

    let exportData = credentials;
    let columns = ENCRYPTED_COLUMNS;

    // 3. Handle unencrypted decryption
    if (!options.encrypted) {
      columns = UNENCRYPTED_COLUMNS;

      if (!dataKey) {
        throw new Error(
          "Encryption key is required to perform unencrypted export.",
        );
      }

      // Decrypt each record's ciphertext into plain text fields
      exportData = await Promise.all(
        credentials.map(async (item) => {
          const decryptedFields = await decryptRecordPayload(
            item.ciphertext,
            item.iv,
            dataKey,
          );
          return {
            ...item,
            ...decryptedFields,
            // Ensure 'name' is populated from 'title' for UNENCRYPTED_COLUMNS
            name: decryptedFields.name || decryptedFields.title || "",
          };
        }),
      );
    }

    // 4. Generate CSV
    const csvData = convertToCSV(exportData, columns);
    const blob = new Blob(["\uFEFF" + csvData], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const filename = `credentials_${options.encrypted ? "encrypted" : "unencrypted"}_${Date.now()}.csv`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Downloaded successfully!", "success");
  } catch (error) {
    throw error;
  } finally {
    downloading = false;
  }
}

// AES-GCM decryption helper for client-side unwrapping
async function decryptRecordPayload(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey,
) {
  try {
    const ciphertext = Uint8Array.from(atob(ciphertextBase64), (c) =>
      c.charCodeAt(0),
    );
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const decodedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedString); // Returns { title, username, password, url, notes }
  } catch (e) {
    console.error("Failed to decrypt record payload:", e);
    return {
      title: "Decryption Error",
      username: "",
      password: "",
      url: "",
      notes: "",
    };
  }
}

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" || typeof val === "boolean") return String(val);

  const str = String(val);
  const needsQuoting = /[",\n\r]/.test(str);
  if (!needsQuoting) return str;

  return `"${str.replace(/"/g, '""')}"`;
}

function convertToCSV(
  data: Record<string, any>[],
  columns: { label: string; key: string }[],
): string {
  if (!data || data.length === 0) return "";

  const headers = columns.map((col) => csvEscape(col.label)).join(",");
  const rows = data.map((row) =>
    columns.map((col) => csvEscape(row[col.key])).join(","),
  );

  return ["sep=,", headers, ...rows].join("\r\n");
}
