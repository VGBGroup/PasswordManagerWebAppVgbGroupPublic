import type { DecryptedOutCredential } from '@/interfaces/decryptedCredential'; // adjust import path

export async function encryptCredential(
  dataKey: CryptoKey,
  item: DecryptedOutCredential
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(item));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, encoded);

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}