// crypto/login.ts
import { argon2id } from 'hash-wasm';

function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...bytes));
}

export async function buildLoginPayload(
  masterPassword: string,
  challenge: string,
  kdf: {
    KdfSalt: string;
    KdfMemoryKib: number;
    KdfIterations: number;
    KdfParallelism: number;
  }
) {
  // 1. Derive stretched key using KDF params from server
  const saltBytes = Uint8Array.from(atob(kdf.KdfSalt), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

  const stretched = await argon2id({
    password: masterPassword,
    salt: saltBytes,
    parallelism: kdf.KdfParallelism,
    iterations: kdf.KdfIterations,
    memorySize: kdf.KdfMemoryKib,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array<ArrayBuffer>;

  // 2. Import into HKDF
  const hkdfKey = await crypto.subtle.importKey('raw', stretched, 'HKDF', false, ['deriveKey']);

  // 3. Derive authKey — used only for signing the challenge
  const authKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('auth') },
    hkdfKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  // 4. Derive encKey — used to unwrap the data key after login
  const encKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('enc') },
    hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['unwrapKey']
  );

  // 5. Sign the challenge with authKey
  const challengeBytes = Uint8Array.from(atob(challenge), c => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  const signature = await crypto.subtle.sign('HMAC', authKey, challengeBytes);

  return {
    signature: toBase64(new Uint8Array(signature) as Uint8Array<ArrayBuffer>),
    encKey, // keep in memory — needed to unwrap the data key after verify
  };
}