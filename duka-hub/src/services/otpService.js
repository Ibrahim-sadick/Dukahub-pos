const isDev = process.env.NODE_ENV !== 'production';
const DEFAULT_TIMEOUT_MS = 25000;

const log = (event, payload) => {
  if (!isDev) return;
  try {
    // eslint-disable-next-line no-console
    console.log(`[otp] ${event}`, payload);
  } catch {}
};

const maskPhone = (raw) => {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length <= 4 ? `****${digits}` : `****${digits.slice(-4)}`;
};

const parseJsonSafe = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const sanitizeUrl = (raw) => {
  const value = String(raw || '')
    .trim()
    .replace(/[`'"]/g, '')
    .replace(/\s+/g, '');
  return /^https?:\/\//i.test(value) ? value : '';
};

const postOtp = async (url, body, mode = 'form', timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs || 0)));
  try {
    const headers = { Accept: 'application/json, text/plain, */*' };
    let requestBody = null;

    if (mode === 'json') {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body || {});
    } else {
      const params = new URLSearchParams();
      Object.entries(body && typeof body === 'object' ? body : {}).forEach(([key, value]) => {
        if (value == null) return;
        params.set(String(key), String(value));
      });
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = params;
    }

    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      headers,
      body: requestBody,
      signal: controller.signal
    });
    const data = await parseJsonSafe(res);
    return { res, data };
  } catch (err) {
    const isTimeout = String(err?.name || '') === 'AbortError';
    const e = new Error(isTimeout ? 'OTP request timed out. Please try again.' : 'Unable to reach the OTP service. Please try again.');
    e.code = isTimeout ? 'OTP_TIMEOUT' : 'OTP_NETWORK_ERROR';
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
};

const normalizeDigits = (raw) => String(raw || '').replace(/[^0-9]/g, '');

const normalizeTzPhone = (raw) => {
  const digits = normalizeDigits(raw);
  if (!digits) return null;
  const local = (() => {
    if (digits.startsWith('255')) return digits.slice(3);
    if (digits.startsWith('0')) return digits.slice(1);
    return digits;
  })().replace(/^0+/, '');
  if (local.length !== 9) return null;
  if (!(local.startsWith('6') || local.startsWith('7'))) return null;
  return { local, msisdn255: `255${local}`, plus255: `+255${local}`, local0: `0${local}` };
};

const extractGatewayError = (data) => {
  if (!data) return '';
  if (typeof data === 'string') {
    const text = data.trim();
    if (/fail|error|invalid|denied|timeout/i.test(text)) return text;
    return '';
  }
  if (typeof data !== 'object') return '';
  const status = String(data.status || data.state || data.result || '').trim().toLowerCase();
  const msg = String(data.message || data.detail || '').trim();
  const err = String(data.error || data.errors?.message || '').trim();
  const nestedMessage = String(data.response?.message || data.response?.error || '').trim();
  const nestedStatus = String(data.response?.status || data.response?.state || data.response?.result || '').trim().toLowerCase();
  const nestedCode = Number(data.response?.code);
  if (status && !['sent', 'success', 'ok', 'queued', 'accepted'].includes(status)) {
    return msg || err || `OTP failed (${status})`;
  }
  if (Number.isFinite(nestedCode) && nestedCode === 102) return nestedMessage || 'OTP provider has insufficient balance';
  if (nestedStatus && !['sent', 'success', 'ok', 'queued', 'accepted'].includes(nestedStatus)) {
    return nestedMessage || `OTP failed (${nestedStatus})`;
  }
  if (msg && /fail|error|invalid|denied|timeout/i.test(msg)) return msg;
  if (nestedMessage && /fail|error|invalid|denied|timeout|insufficient balance/i.test(nestedMessage)) return nestedMessage;
  if (err) return err;
  return '';
};

const isSuccessfulResponse = (res, data) => {
  if (!res?.ok) return false;
  if (data == null) return true;
  if (typeof data === 'string') return !/fail|error|invalid|denied|timeout/i.test(data);
  if (typeof data !== 'object') return true;

  if (data.success === true || data.sent === true || data.delivered === true) return true;

  const status = String(data.status || data.state || data.result || '').trim().toLowerCase();
  if (['sent', 'success', 'ok', 'queued', 'accepted'].includes(status)) return true;

  if (data.response?.successful === true || data.response?.success === true) return true;
  if (String(data.response?.message || '').trim() && /fail|error|invalid|denied|timeout|insufficient balance/i.test(String(data.response?.message || '').trim())) {
    return false;
  }
  if (Number(data.response?.code) === 102) return false;
  if (data.data?.success === true || data.data?.sent === true) return true;

  const message = String(data.message || data.detail || '').trim();
  if (message && /sent|queued|accepted|success/i.test(message) && !/fail|error|invalid|denied|timeout/i.test(message)) {
    return true;
  }

  return Object.keys(data).length === 0;
};

const getCandidateUrls = () => {
  const envUrl = sanitizeUrl(process.env.REACT_APP_OTP_URL);
  const defaultUrl = 'https://service.dukahub.co.tz/api/send-otp';
  const list = [envUrl, sanitizeUrl(defaultUrl)].filter(Boolean);
  return list.filter((url, index) => list.indexOf(url) === index);
};

export const sendOtp = async ({ phone, otp }) => {
  const otpCode = String(otp || '').trim();
  const parsed = normalizeTzPhone(phone);
  if (!parsed || otpCode.length !== 6) throw new Error('Invalid OTP request');
  const phoneValue = parsed.msisdn255;
  const payload = {
    phone: phoneValue,
    phoneNumber: `+${phoneValue}`,
    msisdn: phoneValue,
    mobile: phoneValue,
    customerPhone: phoneValue,
    otp: otpCode,
    code: otpCode
  };
  const urls = getCandidateUrls();
  let lastError = null;

  log('send.request', { phone: maskPhone(phoneValue), endpoints: urls.length });

  for (const url of urls) {
    for (const mode of ['form', 'json']) {
      const isLastAttempt = url === urls[urls.length - 1] && mode === 'json';
      try {
        const out = await postOtp(url, payload, mode, DEFAULT_TIMEOUT_MS);
        log('send.response', { url, mode, ok: out.res.ok, status: out.res.status, body: out.data });

        const gatewayError = extractGatewayError(out.data);
        if (gatewayError) throw new Error(gatewayError);
        if (isSuccessfulResponse(out.res, out.data)) return out.data;

        const message = String((out.data && (out.data.message || out.data.error || out.data.detail)) || '').trim();
        throw new Error(message || `OTP request failed (${out.res.status})`);
      } catch (err) {
        lastError = err;
        log('send.error', { url, mode, code: err?.code || '', message: String(err?.message || '') });

        if (String(err?.code || '') === 'OTP_TIMEOUT') {
          throw err;
        }

        if (!isLastAttempt) continue;
      }
    }
  }

  throw new Error(String(lastError?.message || 'Failed to send OTP. Please try again.'));
};
