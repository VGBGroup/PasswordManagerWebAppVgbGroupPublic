// utils/breachCheck.ts
export async function checkPasswordBreach(plaintextPassword: string): Promise<boolean> {
  // 1. Encode the password to UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintextPassword);

  // 2. SHA-1 hash the password using the Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  // 3. Split into prefix (first 5 chars) and suffix (the rest)
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);

  // 4. Fetch from HIBP (ONLY THE PREFIX leaves the browser!)
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();

  // 5. Check if the suffix exists in the response
  const lines = text.split('\n');
  return lines.some(line => line.split(':')[0] === suffix);
}