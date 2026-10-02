// crypto/register.ts
import { argon2id } from 'hash-wasm';

const PARAMS = {
  KdfAlgorithm: 'argon2id',
  KdfMemoryKib: 65536, // Increase
  KdfIterations: 3,
  KdfParallelism: 4, // Increase
};

function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...bytes));
}

export async function buildRegistrationPayload(email: string, masterPassword: string) {
  // 1. Generate a random salt — unique per user, stored on server
  const saltBytes = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;

  // 2. Derive stretched key via Argon2id
  const stretched = await argon2id({
    password: masterPassword,
    salt: saltBytes,
    parallelism: PARAMS.KdfParallelism,
    iterations: PARAMS.KdfIterations,
    memorySize: PARAMS.KdfMemoryKib,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array<ArrayBuffer>;

  // 3. Import into HKDF
  const hkdfKey = await crypto.subtle.importKey('raw', stretched, 'HKDF', false, ['deriveKey']);

  // 4. Split into authKey and encKey via HKDF
  const authKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('auth') },
    hkdfKey, { name: 'HMAC', hash: 'SHA-256' }, true, ['sign']
  );

  const encKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode('enc') },
    hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey']
  );

  // 5. Generate a random data key — used for all vault encryption
  const dataKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );

  // 6. Wrap the data key with encKey — server stores this, can never unwrap it
  const wrapIv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;
  const wrappedDataKey = await crypto.subtle.wrapKey('raw', dataKey, encKey, { name: 'AES-GCM', iv: wrapIv });

  // 7. Export authKey raw bytes — this is the AuthVerifier the server stores
  const authVerifierBytes = await crypto.subtle.exportKey('raw', authKey) as ArrayBuffer;

  return {
    email,
    KdfAlgorithm: PARAMS.KdfAlgorithm,
    KdfSalt: toBase64(saltBytes),
    KdfMemoryKib: PARAMS.KdfMemoryKib,
    KdfIterations: PARAMS.KdfIterations,
    KdfParallelism: PARAMS.KdfParallelism,
    AuthVerifier: toBase64(new Uint8Array(authVerifierBytes) as Uint8Array<ArrayBuffer>),
    WrappedDataKey: toBase64(new Uint8Array(wrappedDataKey) as Uint8Array<ArrayBuffer>),
    WrappedDataKeyIv: toBase64(wrapIv),
  };
}