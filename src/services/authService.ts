export class AuthService {
  static SESSION_KEY = 'HOSTEL_APARTMENT_AUTH_USER_V1';

  static async sha256(text: string): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.crypto && crypto.subtle) {
        const data = new TextEncoder().encode(String(text));
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
    } catch (e) {
      console.warn('SubtleCrypto failed, using JS fallback:', e);
    }

    // Fallback SHA-256 in pure JS
    return this.sha256Js(text);
  }

  private static sha256Js(ascii: string): string {
    function rightRotate(value: number, amount: number) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words: number[] = [];
    const asciiLength = ascii[lengthProperty] * 8;
    const hash: number[] = [];
    const k: number[] = [];
    let primeCounter = 0;
    const isPrime: Record<number, boolean> = {};

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isPrime[candidate]) {
        for (i = candidate * candidate; i < 311; i += candidate) {
          isPrime[i] = true;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    const asciiBytes = new TextEncoder().encode(ascii);
    for (i = 0; i < asciiBytes.length; i++) {
      words[i >> 2] |= asciiBytes[i] << (24 - (i % 4) * 8);
    }
    words[asciiBytes.length >> 2] |= 0x80 << (24 - (asciiBytes.length % 4) * 8);
    words[(((asciiBytes.length + 8) >> 6) + 1) * 16 - 1] = asciiLength;

    for (let pos = 0; pos < words.length; pos += 16) {
      const w = words.slice(pos, pos + 16);
      const oldHash = [...hash];
      for (i = 0; i < 64; i++) {
        if (i >= 16) {
          const w15 = w[i - 15];
          const w2 = w[i - 2];
          const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
          const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        const a = hash[0], e = hash[4];
        const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
        const t2 = (s0 + maj) | 0;
        const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & hash[5]) ^ (~e & hash[6]);
        const t1 = (hash[7] + s1 + ch + k[i] + (w[i] || 0)) | 0;

        hash[7] = hash[6];
        hash[6] = hash[5];
        hash[5] = hash[4];
        hash[4] = (hash[3] + t1) | 0;
        hash[3] = hash[2];
        hash[2] = hash[1];
        hash[1] = hash[0];
        hash[0] = (t1 + t2) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        result += ((hash[i] >> (j * 8)) & 255).toString(16).padStart(2, '0');
      }
    }
    return result;
  }

  static getLoggedInUser() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  static setLoggedInUser(user: any) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.SESSION_KEY);
    }
  }

  static logout() {
    this.setLoggedInUser(null);
  }
}
