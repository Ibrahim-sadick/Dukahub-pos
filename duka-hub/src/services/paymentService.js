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

const fetchJsonWithTimeout = async (url, init, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs || 0)));
  try {
    const res = await fetch(url, { ...(init || {}), signal: controller.signal });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { res, data };
  } catch (err) {
    const msg = String(err?.name || '') === 'AbortError' ? 'Payment request timeout. Please try again.' : String(err?.message || err || '');
    throw new Error(msg || 'Payment request failed');
  } finally {
    window.clearTimeout(timer);
  }
};

export const initiatePayment = async (phoneNumber, amount, providerInput) => {
  const phone = String(phoneNumber || '').trim();
  const digits = phone.replace(/[^0-9]/g, '');
  const localDigits = digits.startsWith('255')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits.length === 9
        ? digits
        : digits;
  const msisdn255 = localDigits ? `255${localDigits}` : digits;
  const phonePlus = msisdn255 ? `+${msisdn255}` : phone;
  const phone0 = localDigits ? `0${localDigits}` : digits;
  const amt = String(amount ?? '').trim();
  const providerRaw = String(providerInput ?? '').trim().toLowerCase();
  const providerMap = { mpesa: 'mpesa', mixx: 'mixx', airtel: 'airtel', halopesa: 'halopesa', selcom: 'selcom' };
  const networkMap = { mpesa: 'vodacom', mixx: 'tigo', airtel: 'airtel', halopesa: 'halotel', selcom: 'selcom' };
  const provider = providerRaw ? String(providerMap[providerRaw] || providerRaw).trim() : '';
  const network = providerRaw ? String(networkMap[providerRaw] || providerRaw).trim() : '';
  const baseUrl = 'https://service.dukahub.co.tz/api/pay';

  const buildParams = () => {
    const params = new URLSearchParams();
    params.set('amount', amt);
    params.set('currency', 'TZS');
    params.set('channel', 'mobile_money');
    params.set('type', 'mobile_money');
    if (msisdn255) {
      params.set('phoneNumber', phonePlus);
      params.set('phone', phonePlus);
      params.set('msisdn', msisdn255);
      params.set('mobile', msisdn255);
      params.set('customerPhone', msisdn255);
    }
    if (phonePlus) {
      params.set('phoneNumberPlus', phonePlus);
      params.set('phonePlus', phonePlus);
    }
    if (phone0) {
      params.set('phoneNumberLocal', phone0);
      params.set('phoneLocal', phone0);
    }
    if (provider) {
      params.set('provider', provider);
      params.set('paymentProvider', provider);
    }
    if (network) {
      params.set('operator', network);
      params.set('network', network);
      params.set('telco', network);
    }
    if (providerRaw) params.set('providerRaw', providerRaw);
    params.set('_', String(Date.now()));
    return params;
  };

  log('initiate.request', { phoneNumber: maskPhone(msisdn255 || phone), amount: amt, provider: provider || providerRaw || '' });

  const params = buildParams();
  const { res, data } = await fetchJsonWithTimeout(
    baseUrl,
    {
      method: 'POST',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params
    },
    15000
  );
  log('initiate.response', { ok: res.ok, status: res.status, body: data });
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Payment initiation failed (${res.status})`;
    throw new Error(message);
  }
  return data;
};

export const verifyPayment = async (reference) => {
  const ref = String(reference || '').trim();
  if (!ref) throw new Error('Payment verification failed');
  const url = `https://service.dukahub.co.tz/api/payment/status?reference=${encodeURIComponent(ref)}&_=${Date.now()}`;
  log('verify.request', { reference: ref });
  const { res, data } = await fetchJsonWithTimeout(url, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } }, 12000);
  log('verify.response', { ok: res.ok, status: res.status, body: data });
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Payment verification failed (${res.status})`;
    throw new Error(message);
  }
  return data;
};
