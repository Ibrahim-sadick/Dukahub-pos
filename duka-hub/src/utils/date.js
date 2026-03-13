import { getActiveLocale } from '../i18n';

export const formatDisplayDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (isNaN(d)) return raw;
  try {
    const locale = getActiveLocale();
    const parts = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(d);
    const byType = parts.reduce((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
    const day = byType.day || String(d.getDate()).padStart(2, '0');
    const month = String(byType.month || '').toLowerCase() || d.toLocaleString(locale, { month: 'short' }).toLowerCase();
    const year = byType.year || String(d.getFullYear());
    return `${day}-${month}-${year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const locale = getActiveLocale();
    const month = d.toLocaleString(locale, { month: 'short' }).toLowerCase();
    const year = String(d.getFullYear());
    return `${day}-${month}-${year}`;
  }
};

export const toISODate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
};
