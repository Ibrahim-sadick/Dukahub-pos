export const downloadCsvFile = (filename, rows) => {
  const safeName = String(filename || 'report.csv').trim() || 'report.csv';
  const content = (Array.isArray(rows) ? rows : [])
    .map((r) => (Array.isArray(r) ? r : []).map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadExcelFile = (filename, options = {}) => {
  const safeNameRaw = String(filename || 'report.xls').trim() || 'report.xls';
  const safeName = safeNameRaw.toLowerCase().endsWith('.xls') ? safeNameRaw : `${safeNameRaw}.xls`;
  const title = String(options?.title || '').trim();
  const subtitle = String(options?.subtitle || '').trim();
  const rows = Array.isArray(options?.rows) ? options.rows : [];
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const colCount = Math.max(
    1,
    rows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0)
  );
  const titleRow = title
    ? `<tr><th colspan="${colCount}" style="text-align:center;font-weight:700;font-size:14px;padding:10px 8px;">${esc(title)}</th></tr>`
    : '';
  const subtitleRow = subtitle
    ? `<tr><td colspan="${colCount}" style="text-align:center;font-size:14px;padding:6px 8px;color:#374151;">${esc(subtitle)}</td></tr>`
    : '';
  const tableRows = rows
    .map((r, idx) => {
      const cells = (Array.isArray(r) ? r : []).map((c) => {
        const tag = idx === 0 ? 'th' : 'td';
        const base =
          idx === 0
            ? 'font-weight:700;background:#f3f4f6;color:#111827;'
            : 'font-weight:400;color:#111827;';
        return `<${tag} style="${base}border:1px solid #d1d5db;padding:8px 10px;font-size:14px;vertical-align:top;">${esc(c)}</${tag}>`;
      });
      const padded = cells.concat(
        Array.from({ length: Math.max(0, colCount - cells.length) }).map(
          () => `<${idx === 0 ? 'th' : 'td'} style="border:1px solid #d1d5db;padding:8px 10px;font-size:14px;"></${idx === 0 ? 'th' : 'td'}>`
        )
      );
      return `<tr>${padded.join('')}</tr>`;
    })
    .join('');
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${esc(title || safeName)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <table>
    ${titleRow}
    ${subtitleRow}
    ${titleRow || subtitleRow ? `<tr><td colspan="${colCount}" style="height:10px;"></td></tr>` : ''}
    ${tableRows}
  </table>
</body>
</html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.click();
  URL.revokeObjectURL(url);
};

export const printWithTitle = (title) => {
  const prev = document.title;
  const next = String(title || '').trim();
  if (next) document.title = next;
  const cleanup = () => {
    document.title = prev;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 4000);
};
