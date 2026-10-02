// register.worker.ts
import { buildRegistrationPayload } from './register';

self.onmessage = async (e: MessageEvent<{ email: string; password: string }>) => {
  try {
    const payload = await buildRegistrationPayload(e.data.email, e.data.password);
    self.postMessage({ ok: true, payload });
  } catch (err) {
    // Temporarily send the error message back so we can debug
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};