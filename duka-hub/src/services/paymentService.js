const isDev = process.env.NODE_ENV !== 'production';

const maskPhone = (raw) => {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return `****${digits}`;
  return `****${digits.slice(-4)}`;
};

const log = (event, payload) => {
  if (!isDev) return;
  try {
    // eslint-disable-next-line no-console
    console.log(`[payment] ${event}`, payload);
  } catch {}
};

export const initiatePayment = async (phoneNumber, amount) => {
  const phone = String(phoneNumber || '').trim();
  const amt = String(amount ?? '').trim();
  const url = `https://mpira.online/api/pay?phoneNumber=${encodeURIComponent(phone)}&amount=${encodeURIComponent(amt)}`;
  log('initiate.request', { phoneNumber: maskPhone(phone), amount: amt });
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  log('initiate.response', { ok: res.ok, status: res.status, body: data });
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Payment initiation failed (${res.status})`;
    throw new Error(message);
  }
  return data;
};

export const verifyPayment = async (reference) => {
  const ref = String(reference || '').trim();
  const url = `https://mpira.online/api/payment/status?reference=${encodeURIComponent(ref)}`;
  log('verify.request', { reference: ref });
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  log('verify.response', { ok: res.ok, status: res.status, body: data });
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Payment verification failed (${res.status})`;
    throw new Error(message);
  }
  return data;
};
