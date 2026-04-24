import React, { useMemo } from 'react';
import { formatDisplayDate } from '../utils/date';

const toNumber = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const money2 = (v) => {
  const n = toNumber(v);
  try {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

export default function SalesOrderPrint({
  companyDetails,
  salesOrderNumber,
  invoiceNumber,
  date,
  dueDate,
  billToName,
  billToAddress,
  shipToName,
  shipToAddress,
  items,
  notes,
  subtotal,
  taxRate,
  taxTotal,
  total,
  currencyLabel,
  exchangeRate,
  convertedCurrencyLabel
}) {
  const details = companyDetails && typeof companyDetails === 'object' ? companyDetails : {};
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const cur = (currencyLabel || 'TZS').toString().trim() || 'TZS';
  const convCur = (convertedCurrencyLabel || 'TZS').toString().trim() || 'TZS';
  const exRate = toNumber(exchangeRate);
  const showConverted = cur !== convCur && exRate > 0;

  const _subtotal = toNumber(subtotal);
  const _tax = toNumber(taxTotal != null ? taxTotal : ((_subtotal * toNumber(taxRate)) / 100));
  const _total = toNumber(total == null ? _subtotal + _tax : total);
  const convertedTotal = showConverted ? _total * exRate : 0;

  const companyName = String(details.companyName || details.name || '').trim();
  const logoSrc = String(details.logo || details.logoPreview || '').trim();
  const poNumber = String(salesOrderNumber || '').trim();
  const balanceDueText = `${cur} ${money2(_total)}`;

  return (
    <div className="so-print w-full bg-white">
      <div className="px-12 py-10">
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0">
            {logoSrc ? <img src={logoSrc} alt="" className="h-20 w-auto object-contain" /> : null}
            <div className="mt-6 text-[20px] font-semibold text-gray-900">{companyName || '—'}</div>
          </div>

          <div className="min-w-[380px] text-right">
            <div className="flex items-end justify-end gap-3">
              <div className="w-[3px] h-[44px] bg-gray-900" />
              <div>
                <div className="text-[46px] leading-none font-semibold tracking-wide text-gray-900">INVOICE</div>
                <div className="mt-2 text-[18px] text-gray-600 font-medium"># {String(invoiceNumber || '').trim() || '—'}</div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3 text-[14px]">
              <div className="text-gray-600">Date:</div>
              <div className="text-gray-900 font-medium">{date ? formatDisplayDate(date) : '—'}</div>
              <div className="text-gray-600">Due Date:</div>
              <div className="text-gray-900 font-medium">{dueDate ? formatDisplayDate(dueDate) : '—'}</div>
              <div className="text-gray-600">PO Number:</div>
              <div className="text-gray-900 font-medium">{poNumber || '—'}</div>
            </div>

            <div className="mt-5 bg-gray-100 rounded-md px-6 py-4 flex items-center justify-between gap-4">
              <div className="text-[16px] font-semibold text-gray-900">Balance Due:</div>
              <div className="text-[18px] font-semibold text-gray-900">{balanceDueText}</div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-start justify-between gap-10">
          <div className="flex-1 grid grid-cols-2 gap-12">
            <div>
              <div className="text-[13px] font-medium text-gray-600">Bill To:</div>
              <div className="mt-2 text-[14px] font-semibold text-gray-900">{String(billToName || '').trim() || '—'}</div>
              {String(billToAddress || '').trim() ? (
                <div className="mt-1 text-[13px] text-gray-700 whitespace-pre-line">{String(billToAddress || '').trim()}</div>
              ) : null}
            </div>
            <div>
              <div className="text-[13px] font-medium text-gray-600">Ship To:</div>
              <div className="mt-2 text-[14px] font-semibold text-gray-900">{String(shipToName || '').trim() || '—'}</div>
              {String(shipToAddress || '').trim() ? (
                <div className="mt-1 text-[13px] text-gray-700 whitespace-pre-line">{String(shipToAddress || '').trim()}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-md overflow-hidden border border-gray-200">
          <div className="bg-gray-900 text-white text-[13px] font-medium grid grid-cols-[1fr_120px_160px_160px] px-6 py-3">
            <div>Item</div>
            <div className="text-right">Quantity</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Amount</div>
          </div>
          <div className="divide-y divide-gray-200">
            {safeItems.length ? (
              safeItems.map((it, idx) => {
                const qty = toNumber(it?.qty);
                const rate = toNumber(it?.rate ?? it?.price);
                const amount = toNumber(it?.amount ?? it?.total ?? qty * rate);
                const name = String(it?.item || it?.name || '').trim() || '—';
                const desc = String(it?.description || it?.desc || it?.note || '').trim();
                return (
                  <div key={`${idx}-${name}`} className="grid grid-cols-[1fr_120px_160px_160px] px-6 py-4 text-[13px] text-gray-900">
                    <div className="break-words">
                      <div className="font-semibold">{name}</div>
                      {desc ? <div className="mt-1 text-[12px] text-gray-600">{desc}</div> : null}
                    </div>
                    <div className="text-right">{money2(qty)}</div>
                    <div className="text-right">{cur} {money2(rate)}</div>
                    <div className="text-right">{cur} {money2(amount)}</div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-6 text-[13px] text-gray-600">No items</div>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-start justify-between gap-10">
          <div className="flex-1" />
          <div className="min-w-[360px] text-[14px]">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="text-gray-600 text-right">Subtotal:</div>
              <div className="text-gray-900 text-right">{cur} {money2(_subtotal)}</div>
              <div className="text-gray-600 text-right">Tax ({toNumber(taxRate) ? `${money2(toNumber(taxRate))}%` : '0%'}):</div>
              <div className="text-gray-900 text-right">{cur} {money2(_tax)}</div>
              <div className="text-gray-600 text-right">Total:</div>
              <div className="text-gray-900 text-right font-semibold">{cur} {money2(_total)}</div>
            </div>
            {showConverted ? (
              <div className="mt-5 text-[12px] text-gray-600">
                <div className="flex items-center justify-between">
                  <div>Exchange Rate</div>
                  <div className="text-gray-900">USD/TZS {money2(exRate)}</div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div>Total ({convCur})</div>
                  <div className="text-gray-900">{convCur} {money2(convertedTotal)}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {String(notes || '').trim() ? (
          <div className="mt-10 text-[12px] text-gray-700 whitespace-pre-line">{String(notes || '').trim()}</div>
        ) : null}
      </div>
    </div>
  );
}
