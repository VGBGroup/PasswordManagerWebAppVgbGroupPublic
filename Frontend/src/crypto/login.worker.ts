// crypto/login.worker.ts
import { buildLoginPayload } from './login';

interface LoginWorkerInput {
  email: string;
  masterPassword: string;
  challenge: string;
  kdf: {
    KdfSalt: string;
    KdfMemoryKib: number;
    KdfIterations: number;
    KdfParallelism: number;
  };
}

self.onmessage = async (e: MessageEvent<LoginWorkerInput>) => {
  try {
    const { signature, encKey } = await buildLoginPayload(
      e.data.masterPassword,
      e.data.challenge,
      e.data.kdf
    );
    self.postMessage({ ok: true, signature, encKey });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};