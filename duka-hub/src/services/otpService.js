const isDev = process.env.NODE_ENV !== 'production';

const log = (event, payload) => {
  if (!isDev) return;
  try {
    console.log(`[otp] ${event}`, payload);
  } catch {}
};

const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(body || {})
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { res, data };
};

export const sendOtp = async ({ phone, otp }) => {
  const payload = { phone: String(phone || '').trim(), otp: String(otp || '').trim() };
  log('send.request', { phone: payload.phone ? `****${payload.phone.slice(-4)}` : '', otp: payload.otp ? '******' : '' });

  const primaryUrl = 'https://mpira.online/api/sendotp';
  const secondaryUrl = 'https://mpira.online/api/send-otp';

  const first = await postJson(primaryUrl, payload);
  log('send.response', { url: primaryUrl, ok: first.res.ok, status: first.res.status, body: first.data });
  if (first.res.ok) return first.data;

  const shouldFallback = first.res.status === 404 || first.res.status === 405;
  if (shouldFallback) {
    const second = await postJson(secondaryUrl, payload);
    log('send.response', { url: secondaryUrl, ok: second.res.ok, status: second.res.status, body: second.data });
    if (second.res.ok) return second.data;
    const message = (second.data && (second.data.message || second.data.error)) || `OTP request failed (${second.res.status})`;
    throw new Error(message);
  }

  const message = (first.data && (first.data.message || first.data.error)) || `OTP request failed (${first.res.status})`;
  throw new Error(message);
};
