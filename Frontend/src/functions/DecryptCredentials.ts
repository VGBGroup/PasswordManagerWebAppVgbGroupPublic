import type { DecryptedInCredential } from "@/interfaces/decryptedCredential";

export async function decryptCredential(
    ciphertext: string,
    iv: string,
    encKey: CryptoKey
): Promise<DecryptedInCredential | null> {
    try {
        const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
        const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBytes },
            encKey,
            ciphertextBytes
        );

        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
        return null; // tampered or wrong key — skip silently
    }
}