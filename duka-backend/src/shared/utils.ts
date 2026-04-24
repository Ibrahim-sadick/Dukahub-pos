export const normalizeTzPhone255 = (raw: string) => {
  const digits = String(raw || '').replace(/[^0-9]/g, '');
  if (!digits) return '';

  const local = (() => {
    if (digits.startsWith('255')) return digits.slice(3);
    if (digits.startsWith('0')) return digits.slice(1);
    return digits;
  })().replace(/^0+/, '');

  if (local.length !== 9) return '';
  if (!(local.startsWith('6') || local.startsWith('7'))) return '';
  return `255${local}`;
};

export const startOfDay = (value: string | Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value: string | Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};
