const enc = new TextEncoder();

const toBase64 = (bytes) => {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
};

const fromBase64 = (b64) => {
  const bin = atob(String(b64 || ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};

const timingSafeEqual = (a, b) => {
  const aa = String(a || '');
  const bb = String(b || '');
  if (aa.length !== bb.length) return false;
  let res = 0;
  for (let i = 0; i < aa.length; i += 1) res |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return res === 0;
};

export const hashPassword = async (password, opts) => {
  const pass = String(password || '');
  if (!pass) throw new Error('Password is required');
  const iterations = Number(opts?.iterations || 150000);
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: Number.isFinite(iterations) ? iterations : 150000 },
    keyMaterial,
    256
  );
  return {
    v: 1,
    alg: 'pbkdf2-sha256',
    iterations: Number.isFinite(iterations) ? iterations : 150000,
    salt: toBase64(saltBytes),
    hash: toBase64(new Uint8Array(bits))
  };
};

export const verifyPasswordAndUpgrade = async (stored, password) => {
  const pass = String(password || '');
  if (!pass) return { ok: false, upgraded: null };
  if (!stored) return { ok: false, upgraded: null };

  if (typeof stored === 'string') {
    const ok = timingSafeEqual(stored, pass);
    if (!ok) return { ok: false, upgraded: null };
    const upgraded = await hashPassword(pass);
    return { ok: true, upgraded };
  }

  if (typeof stored !== 'object') return { ok: false, upgraded: null };
  if (stored?.alg !== 'pbkdf2-sha256') return { ok: false, upgraded: null };

  const iterations = Number(stored?.iterations || 0);
  const saltBytes = fromBase64(stored?.salt || '');
  const expected = String(stored?.hash || '');
  if (!Number.isFinite(iterations) || iterations <= 0 || !expected || !saltBytes?.length) return { ok: false, upgraded: null };

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, keyMaterial, 256);
  const actual = toBase64(new Uint8Array(bits));
  return { ok: timingSafeEqual(expected, actual), upgraded: null };
};

