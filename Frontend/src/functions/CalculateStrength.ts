export function calculateStrength(password: string): 'weak' | 'fair' | 'strong' | 'very-strong' | 'null' {
    // Check if there is a password and if not
    if (!password) return 'null';
    
    const lowerPassword = password.toLowerCase();
    const len = password.length;

    // 1. SMART REMAINDER CHECK
    const commonWords = ['password', 'qwerty', 'letmein', 'admin', 'welcome', 'login'];
    let isFakePassphrase = false;

    for (const word of commonWords) {
        if (lowerPassword.includes(word)) {
            // Strip the common word out to see what the user added to "pad" it
            const remainder = lowerPassword.replace(word, '');
            
            // If nothing is left, OR what's left is just a predictable tail of numbers/symbols (under 12 chars)
            if (remainder.length === 0 || /^[0-9!@#$%^&*()_+=\-[\]{};':",./<>?|\\`~]{1,11}$/.test(remainder)) {
                isFakePassphrase = true;
                break;
            }
        }
    }

    if (isFakePassphrase) return 'weak';

    // 2. Pure sequential numbers clamp (e.g., "1234567890")
    if (/^[0-9]+$/.test(password) && len < 12) return 'weak';

    // 3. Standard Metrics Scoring
    let score = 0;
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (len >= 16) score++;

    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // 4. Pattern Penalties
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeats like "aaa"
    if (hasSequentialChars(password)) score -= 1; // Sequences like "abc" / "123"

    // 5. Mapping
    if (score <= 2) return 'weak';
    if (score <= 4) return 'fair';
    if (score <= 5) return 'strong';
    return 'very-strong';
}

function hasSequentialChars(str: string): boolean {
    for (let i = 0; i < str.length - 2; i++) {
        const char1 = str.charCodeAt(i);
        const char2 = str.charCodeAt(i + 1);
        const char3 = str.charCodeAt(i + 2);
        if ((char2 === char1 + 1 && char3 === char2 + 1) || 
            (char2 === char1 - 1 && char3 === char2 - 1)) {
            return true;
        }
    }
    return false;
}