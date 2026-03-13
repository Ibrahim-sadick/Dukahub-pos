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

  const companyLines = [
    details.location ? `Address: ${details.location}` : '',
    details.branch ? `City/State: ${details.branch}` : '',
    details.poBox ? `Postal Code: ${details.poBox}` : '',
    details.email ? `Email Address: ${details.email}` : '',
    details.phone ? `Phone: ${details.phone}` : '',
    details.website ? `Website: ${details.website}` : '',
    details.tin ? `TIN: ${details.tin}` : ''
  ].filter(Boolean);

  return (
    <div className="so-print w-full bg-white">
      <div className="px-10 py-10">
        <div className="border border-gray-300">
          <div className="px-10 pt-10 pb-6">
            <div className="flex items-start justify-between gap-10">
              <div className="min-w-0">
                <div className="text-[26px] leading-tight font-extrabold text-gray-900">{(details.companyName || details.name || 'Your Company Name').toString()}</div>
                <div className="mt-3 text-sm text-gray-700 space-y-1">
                  {companyLines.length ? companyLines.map((line) => <div key={line}>{line}</div>) : null}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[44px] leading-none font-extrabold text-green-600 tracking-wide">Sales Invoice</div>
              </div>
            </div>
          </div>

          <div className="px-10 pb-10">
            <div className="bg-green-100 border border-green-200">
              <div className="px-8 py-8">
                <div className="grid grid-cols-2 gap-10 text-sm">
                  <div>
                    <div className="font-bold text-gray-900">Bill to</div>
                    <div className="mt-3 space-y-1 text-gray-800">
                      <div>{(billToName || 'Company Name').toString()}</div>
                      <div>{billToAddress ? `Address: ${(billToAddress || '').toString()}` : 'Address:'}</div>
                      {shipToName || shipToAddress ? (
                        <>
                          <div className="pt-3 font-bold text-gray-900">Ship to</div>
                          <div>{(shipToName || '').toString()}</div>
                          <div>{shipToAddress ? `Address: ${(shipToAddress || '').toString()}` : ''}</div>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-2 text-gray-900">
                    <div className="flex items-center justify-between gap-6">
                      <div className="font-bold">Invoice#:</div>
                      <div className="font-bold">{(invoiceNumber || '').toString() || '—'}</div>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <div className="font-bold">Sales Order#:</div>
                      <div className="font-bold">{(salesOrderNumber || '').toString() || '—'}</div>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <div className="font-bold">Date:</div>
                      <div className="font-bold">{date ? formatDisplayDate(date) : '—'}</div>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <div className="font-bold">Due Date:</div>
                      <div className="font-bold">{dueDate ? formatDisplayDate(dueDate) : '—'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 border border-green-200">
              <div className="bg-green-50 border-b border-green-200">
                <div className="grid grid-cols-[1fr_120px_120px_140px_160px] text-sm font-bold text-gray-900">
                  <div className="px-6 py-4">Description</div>
                  <div className="px-6 py-4 text-right">Quantity</div>
                  <div className="px-6 py-4 text-right">Unit</div>
                  <div className="px-6 py-4 text-right">Rate</div>
                  <div className="px-6 py-4 text-right">Amount</div>
                </div>
              </div>
              <div className="bg-green-50/40">
                {safeItems.length ? (
                  safeItems.map((it, idx) => {
                    const qty = toNumber(it?.qty);
                    const unit = (it?.unit || '').toString().trim();
                    const rate = toNumber(it?.rate ?? it?.price);
                    const amount = toNumber(it?.amount ?? it?.total ?? qty * rate);
                    const name = (it?.item || it?.name || '').toString().trim();
                    const desc = (it?.description || '').toString().trim();
                    const label = [name, desc].filter(Boolean).join(' - ') || 'Product or service description goes here';
                    return (
                      <div key={`${idx}-${label}`} className="grid grid-cols-[1fr_120px_120px_140px_160px] text-sm text-gray-900 border-b border-green-200/60 last:border-b-0">
                        <div className="px-6 py-4 break-words">{label}</div>
                        <div className="px-6 py-4 text-right">{money2(qty)}</div>
                        <div className="px-6 py-4 text-right">{unit || '—'}</div>
                        <div className="px-6 py-4 text-right">{money2(rate)}</div>
                        <div className="px-6 py-4 text-right">{money2(amount)}</div>
                      </div>
                    );
                  })
                ) : (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_120px_120px_140px_160px] text-sm text-gray-900 border-b border-green-200/60 last:border-b-0">
                      <div className="px-6 py-4">Product or service description goes here</div>
                      <div className="px-6 py-4 text-right">0.00</div>
                      <div className="px-6 py-4 text-right">—</div>
                      <div className="px-6 py-4 text-right">0.00</div>
                      <div className="px-6 py-4 text-right">0.00</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-10 bg-green-50/40 border border-green-200">
              <div className="grid grid-cols-2 gap-10 px-8 py-8">
                <div className="text-sm text-gray-900">
                  <div className="font-bold">Notes:</div>
                  <div className="mt-2 text-gray-800">{(notes || '').toString().trim() || 'Comments can go here.'}</div>
                </div>
                <div className="text-sm text-gray-900">
                  <div className="flex items-center justify-between py-2">
                    <div className="font-bold">Subtotal</div>
                    <div>{cur} {money2(_subtotal)}</div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="font-bold">Tax Rate</div>
                    <div>{toNumber(taxRate) ? `${money2(toNumber(taxRate))}%` : '0.00%'}</div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="font-bold">Tax</div>
                    <div>{cur} {money2(_tax)}</div>
                  </div>
                  <div className="border-t border-green-300 mt-4 pt-4 flex items-center justify-between">
                    <div className="text-lg font-extrabold">Total</div>
                    <div className="text-lg font-extrabold">{cur} {money2(_total)}</div>
                  </div>
                  {showConverted ? (
                    <div className="mt-3 text-sm text-gray-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold">Exchange Rate</div>
                        <div>USD/TZS {money2(exRate)}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="font-bold">Total ({convCur})</div>
                        <div>{convCur} {money2(convertedTotal)}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between text-sm text-blue-700">
              <div className="font-semibold">{(details.website || '').toString().trim() || ''}</div>
              <div className="text-xs text-gray-500">{details.companyName ? '' : ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
