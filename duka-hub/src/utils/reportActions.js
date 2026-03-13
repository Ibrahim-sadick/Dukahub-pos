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

