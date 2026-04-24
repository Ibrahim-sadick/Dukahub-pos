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

export default function InvoicePrint({
  companyName,
  logoUrl,
  companyDetails,
  invoiceNumber,
  date,
  dueDate,
  poNumber,
  billTo,
  shipTo,
  items,
  taxRate,
  shipping,
  subtotal,
  tax,
  total,
  balanceDue,
  currencyLabel,
  exchangeRate,
  exchangeLabel,
  convertedCurrencyLabel
}) {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const _subtotal = toNumber(subtotal);
  const _tax = toNumber(tax);
  const _shipping = toNumber(shipping);
  const computedTotal = _subtotal + _tax + _shipping;
  const computedBalanceDue = balanceDue == null ? computedTotal : toNumber(balanceDue);
  const headerInvoiceNo = (invoiceNumber || '').toString().trim() || '—';
  const displayCompany = (companyName || '').toString().trim() || 'Company';
  const cur = (currencyLabel || 'TZS').toString().trim() || 'TZS';
  const details = companyDetails && typeof companyDetails === 'object' ? companyDetails : {};
  const companyLines = [
    details.poBox ? `P.O. Box: ${details.poBox}` : '',
    details.email ? `Email: ${details.email}` : '',
    details.phone ? `Phone: ${details.phone}` : '',
    details.fax ? `Fax: ${details.fax}` : '',
    details.tin ? `TIN: ${details.tin}` : '',
    details.location ? `Location: ${details.location}` : '',
    details.website ? `Website: ${details.website}` : '',
  ].filter(Boolean);
  const exRate = toNumber(exchangeRate);
  const exLabel = (exchangeLabel || `${cur}/TZS`).toString().trim() || `${cur}/TZS`;
  const convCur = (convertedCurrencyLabel || 'TZS').toString().trim() || 'TZS';
  const showConverted = cur !== convCur && exRate > 0;
  const convertedTotal = showConverted ? (toNumber(total == null ? computedTotal : total) * exRate) : 0;
  const convertedBalance = showConverted ? (computedBalanceDue * exRate) : 0;

  return (
    <div className="invoice-print w-full bg-white">
      <div className="pl-0 pr-10 pt-6 pb-12">
        <div className="flex items-start justify-between gap-12">
          <div className="flex-1 min-w-0">
            {logoUrl ? <img src={logoUrl} alt="" className="h-20 w-auto object-contain" /> : null}
            <div className="mt-6">
              <div className="text-[34px] leading-tight font-extrabold text-gray-900 tracking-wide">{displayCompany.toUpperCase()}</div>
            </div>
            {companyLines.length ? (
              <div className="mt-2 text-[11px] text-gray-600 space-y-1">
                {companyLines.map((line) => (
                  <div key={line} className="leading-snug">{line}</div>
                ))}
              </div>
            ) : null}

            <div className="mt-7 grid grid-cols-2 gap-12 text-sm max-w-[520px]">
              <div>
                <div className="text-gray-600">Bill To:</div>
                <div className="font-extrabold text-gray-900 mt-1">{(billTo || '').toString().trim() || '—'}</div>
              </div>
              <div>
                <div className="text-gray-600">Ship To:</div>
                <div className="font-extrabold text-gray-900 mt-1">{(shipTo || '').toString().trim() || '—'}</div>
              </div>
            </div>
          </div>

          <div className="w-[420px]">
            <div className="text-right">
              <div className="text-[44px] leading-none font-light tracking-widest text-gray-900">INVOICE</div>
              <div className="text-sm text-gray-600 mt-2"># {headerInvoiceNo}</div>
            </div>

            <div className="mt-10 text-sm">
              <div className="grid grid-cols-2 gap-y-2">
                <div className="text-gray-600 text-right pr-10">Date:</div>
                <div className="text-gray-900 font-medium text-right">{date ? formatDisplayDate(date) : '—'}</div>
                <div className="text-gray-600 text-right pr-10">Due Date:</div>
                <div className="text-gray-900 font-medium text-right">{dueDate ? formatDisplayDate(dueDate) : '—'}</div>
                <div className="text-gray-600 text-right pr-10">PO Number:</div>
                <div className="text-gray-900 font-medium text-right">{(poNumber || '').toString().trim() || '—'}</div>
              </div>
            </div>

            <div className="mt-4 bg-gray-100 rounded-md px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Balance Due:</div>
                <div className="text-sm font-extrabold text-gray-900">{cur} {money2(computedBalanceDue)}</div>
              </div>
              {showConverted ? (
                <div className="mt-1 text-xs text-gray-600 text-right">
                  {convCur} {money2(convertedBalance)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="rounded-md overflow-hidden border border-gray-200">
            <div className="bg-gray-800 text-white text-sm font-semibold">
              <div className="grid grid-cols-[1fr_120px_120px_140px_160px]">
                <div className="px-7 py-3">Item</div>
                <div className="px-7 py-3 text-right border-l border-white/15">Quantity</div>
                <div className="px-7 py-3 text-right border-l border-white/15">Unit</div>
                <div className="px-7 py-3 text-right border-l border-white/15">Rate</div>
                <div className="px-7 py-3 text-right border-l border-white/15">Amount</div>
              </div>
            </div>

            <div className="bg-white">
              {safeItems.length === 0 ? (
                <div className="px-7 py-7 text-sm text-gray-600">No items</div>
              ) : (
                safeItems.map((it, idx) => {
                  const qty = toNumber(it?.qty);
                  const unit = (it?.unit || '').toString().trim();
                  const rate = toNumber(it?.rate ?? it?.price);
                  const amount = toNumber(it?.amount ?? it?.total ?? qty * rate);
                  const name = (it?.item || it?.name || '').toString().trim() || '—';
                  const desc = (it?.description || it?.desc || it?.note || '').toString().trim();
                  return (
                    <div key={`${name}-${idx}`} className="grid grid-cols-[1fr_120px_120px_140px_160px] text-sm border-t border-gray-200">
                      <div className="px-7 py-4 break-words">
                        <div className="font-semibold text-gray-900">{name}</div>
                        {desc ? <div className="mt-1 text-xs text-gray-600">{desc}</div> : null}
                      </div>
                      <div className="px-7 py-4 text-right text-gray-900">{qty ? qty.toLocaleString() : '0'}</div>
                      <div className="px-7 py-4 text-right text-gray-900">{unit || '—'}</div>
                      <div className="px-7 py-4 text-right text-gray-900">{cur} {money2(rate)}</div>
                      <div className="px-7 py-4 text-right text-gray-900">{cur} {money2(amount)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          <div className="w-[420px] text-sm">
            <div className="grid grid-cols-2 gap-y-3">
              <div className="text-gray-600 text-right pr-10">Subtotal:</div>
              <div className="text-gray-900 font-medium text-right">{cur} {money2(_subtotal)}</div>
              <div className="text-gray-600 text-right pr-10">Tax ({toNumber(taxRate)}%):</div>
              <div className="text-gray-900 font-medium text-right">{cur} {money2(_tax)}</div>
              <div className="text-gray-600 text-right pr-10">Shipping:</div>
              <div className="text-gray-900 font-medium text-right">{cur} {money2(_shipping)}</div>
              <div className="text-gray-700 text-right pr-10 mt-2 font-medium">{showConverted ? `Total (${cur}):` : 'Total:'}</div>
              <div className="text-gray-900 font-extrabold text-right mt-2">{cur} {money2(total == null ? computedTotal : total)}</div>
              {showConverted ? (
                <>
                  <div className="text-gray-600 text-right pr-10">Exchange Rate:</div>
                  <div className="text-gray-900 font-medium text-right">{exLabel} {money2(exRate)}</div>
                  <div className="text-gray-600 text-right pr-10">Total ({convCur}):</div>
                  <div className="text-gray-900 font-semibold text-right">{convCur} {money2(convertedTotal)}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
