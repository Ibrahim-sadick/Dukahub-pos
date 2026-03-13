import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { RiLock2Line } from 'react-icons/ri';

const getCurrentUser = () => {
  try {
    const local = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (local) return local;
  } catch {}
  try {
    const session = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (session) return session;
  } catch {}
  return null;
};

const Toggle = ({ label, description, checked, onChange, danger, disabled, tooltip }) => {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className={danger ? 'text-base font-semibold text-red-700' : 'text-base font-semibold text-gray-900'} title={tooltip || ''}>
            {label}
          </div>
          {tooltip ? (
            <div
              className={danger ? 'w-5 h-5 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-extrabold flex items-center justify-center' : 'w-5 h-5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-extrabold flex items-center justify-center'}
              title={tooltip}
            >
              ?
            </div>
          ) : null}
        </div>
        {description ? <div className="mt-2 text-sm text-gray-600">{description}</div> : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={
          disabled
            ? 'relative w-14 h-8 rounded-full bg-gray-200 border border-gray-200 opacity-60 cursor-not-allowed transition duration-200'
            : checked
              ? danger
                ? 'relative w-14 h-8 rounded-full bg-red-600 border border-red-600 transition duration-200'
                : 'relative w-14 h-8 rounded-full bg-green-600 border border-green-600 transition duration-200'
              : danger
                ? 'relative w-14 h-8 rounded-full bg-red-50 border border-red-200 transition duration-200'
                : 'relative w-14 h-8 rounded-full bg-gray-100 border border-gray-200 transition duration-200'
        }
      >
        <span
          className={
            checked
              ? 'absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-6'
              : 'absolute top-0.5 left-0.5 w-7 h-7 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0'
          }
        />
      </button>
    </div>
  );
};

const SelectRow = ({ label, description, value, onChange, options, tooltip }) => {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold text-gray-900" title={tooltip || ''}>
            {label}
          </div>
          {tooltip ? (
            <div className="w-5 h-5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-extrabold flex items-center justify-center" title={tooltip}>
              ?
            </div>
          ) : null}
        </div>
        {description ? <div className="mt-2 text-sm text-gray-600">{description}</div> : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-[420px] px-4 py-3 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-green-500 transition duration-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const Card = ({ title, subtitle, children, danger }) => {
  return (
    <div className={danger ? 'bg-white border border-red-200 rounded-2xl shadow-sm' : 'bg-white border border-gray-200 rounded-2xl shadow-sm'}>
      <div className={danger ? 'px-6 py-5 border-b border-red-100' : 'px-6 py-5 border-b border-gray-100'}>
        <div className={danger ? 'text-base font-semibold text-red-800' : 'text-base font-semibold text-gray-900'}>{title}</div>
        {subtitle ? <div className="mt-2 text-sm text-gray-600">{subtitle}</div> : null}
      </div>
      <div className="px-6 py-5 space-y-6">{children}</div>
    </div>
  );
};

const ThemeCard = ({ title, active, onClick, mode }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'w-full text-left p-4 rounded-2xl border border-green-400 bg-green-50 shadow-sm transition duration-200'
          : 'w-full text-left p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 shadow-sm transition duration-200'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-gray-900">{title}</div>
        {active ? <div className="px-2 py-1 rounded-full bg-green-600 text-white text-xs font-semibold">Selected</div> : null}
      </div>
      <div className="mt-2 text-sm text-gray-600">
        {mode === 'light' ? 'Bright, minimal UI for daylight.' : mode === 'dark' ? 'High-contrast UI for low light.' : 'Match your device setting.'}
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
        <div className={mode === 'dark' ? 'h-20 bg-gray-900' : 'h-20 bg-white'}>
          <div className="p-3">
            <div className={mode === 'dark' ? 'h-2.5 w-24 rounded bg-white/20' : 'h-2.5 w-24 rounded bg-gray-200'} />
            <div className="mt-2 flex items-center gap-2">
              <div className={mode === 'dark' ? 'h-7 w-7 rounded-full bg-white/15' : 'h-7 w-7 rounded-full bg-gray-200'} />
              <div className="flex-1 space-y-1">
                <div className={mode === 'dark' ? 'h-2 w-28 rounded bg-white/15' : 'h-2 w-28 rounded bg-gray-200'} />
                <div className={mode === 'dark' ? 'h-2 w-20 rounded bg-white/10' : 'h-2 w-20 rounded bg-gray-100'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

export default function SystemPreferences() {
  const { t } = useI18n();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const businessId = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    if (role === 'staff') return String(currentUser?.businessId || '');
    return String(currentUser?.id || '');
  }, [currentUser?.businessId, currentUser?.id, currentUser?.role]);

  const storageKey = useMemo(() => `systemPreferences:${businessId || 'default'}`, [businessId]);

  const defaultPrefs = useMemo(
    () => ({
      general: {
        defaultCurrency: 'TZS',
        timezone: 'Africa/Dar_es_Salaam',
        dateFormat: 'DD/MM/YYYY',
        enableMultiStore: false
      },
      sales: {
        enableTax: true,
        defaultTaxRate: '18',
        allowDiscounts: true,
        requireApprovalForRefund: true,
        autoPrintReceipt: true,
        autoSendSmsReceipt: false,
        allowNegativeStock: false
      },
      inventory: {
        enableLowStockAlerts: true,
        defaultReorderLevel: '10',
        trackExpiryDates: false,
        trackBatchNumbers: false,
        autoDeductStockOnSale: true
      },
      notifications: {
        sendLowStockSms: false,
        sendDailySalesReport: false,
        notifyNewSale: true,
        notifyNewPurchase: true,
        sendEmailAlerts: true,
        sendWhatsAppAlerts: false
      },
      localization: {
        language: 'en',
        numberFormat: '1,234.56',
        decimalPlaces: '2',
        currencySymbolPosition: 'before'
      },
      appearance: {
        themeMode: 'system'
      },
      security: {
        sessionTimeout: '30',
        requirePinForDelete: true,
        requirePinForRefund: true,
        enableTwoFactorAuthentication: false
      }
    }),
    []
  );

  const [tab, setTab] = useState('general');
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(defaultPrefs));
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });

  const integrationsConnected = useMemo(() => {
    try {
      const v = localStorage.getItem('integrationsConnected');
      if (v === 'true') return true;
    } catch {}
    try {
      const ci = JSON.parse(localStorage.getItem('companyInfo') || '{}');
      return Boolean(ci?.integrationsConnected);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = {
          ...defaultPrefs,
          ...(parsed && typeof parsed === 'object' ? parsed : {})
        };
        setPrefs(merged);
        setSavedSnapshot(JSON.stringify(merged));
        return;
      }
    } catch {}
    setPrefs(defaultPrefs);
    setSavedSnapshot(JSON.stringify(defaultPrefs));
  }, [defaultPrefs, storageKey]);

  const dirty = useMemo(() => JSON.stringify(prefs) !== savedSnapshot, [prefs, savedSnapshot]);

  const update = (path, value) => {
    if (String(path || '').startsWith('appearance.')) {
      setToast('Appearance is locked by admin');
      setTimeout(() => setToast(''), 2000);
      return;
    }
    setPrefs((prev) => {
      const next = { ...prev };
      const [a, b] = path.split('.');
      next[a] = { ...(next[a] || {}) };
      next[a][b] = value;
      return next;
    });
    if (path === 'localization.language') {
      try {
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: value } }));
      } catch {}
    }
    // theme changes disabled
  };

  const save = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    } catch {}
    setSavedSnapshot(JSON.stringify(prefs));
    setToast(t('prefs.toastSaved'));
    setTimeout(() => setToast(''), 2000);
    try {
      window.dispatchEvent(new CustomEvent('systemPreferencesUpdated'));
    } catch {}
  };

  const tabs = [
    { id: 'general', label: t('prefs.tab.general') },
    { id: 'sales', label: t('prefs.tab.sales') },
    { id: 'inventory', label: t('prefs.tab.inventory') },
    { id: 'notifications', label: t('prefs.tab.notifications') },
    { id: 'localization', label: t('prefs.tab.localization') },
    { id: 'appearance', label: t('prefs.tab.appearance') },
    { id: 'security', label: t('prefs.tab.security') }
  ];

  if (!currentUser) {
    return <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-700">Please login to view System Preferences.</div>;
  }

  return (
    <div className="w-full">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-gray-900">{t('prefs.headerTitle')}</div>
              <div className="mt-1 text-sm text-gray-600">{t('prefs.headerSubtitle')}</div>
            </div>
            {integrationsConnected ? (
              <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                {t('prefs.connected')}
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border-b lg:border-b-0 lg:border-r border-gray-200 bg-white flex flex-col">
            <div className="px-3 py-5 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {tabs.map((t) => {
                  const active = tab === t.id;
                  const lockedTab = t.id === 'appearance';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (lockedTab) return;
                        setTab(t.id);
                      }}
                      className={
                        lockedTab
                          ? 'w-full text-left px-4 py-2.5 rounded-xl text-gray-400 border border-transparent cursor-not-allowed opacity-60 flex items-center justify-between'
                          : active
                          ? 'w-full text-left px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-800 font-semibold transition duration-200'
                          : 'w-full text-left px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition duration-200'
                      }
                    >
                      <span>{t.label}</span>
                      {lockedTab ? <RiLock2Line size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className={
                  dirty
                    ? 'w-full px-6 py-3 rounded-2xl bg-green-600 text-white text-base font-semibold shadow-sm hover:bg-green-700 transition duration-200'
                    : 'w-full px-6 py-3 rounded-2xl bg-gray-200 text-gray-500 text-base font-semibold cursor-not-allowed transition duration-200'
                }
              >
                {t('prefs.saveChanges')}
              </button>
            </div>
          </div>

          <div className="bg-gray-50">
            <div className="p-8">
              {tab === 'general' ? (
                <div className="space-y-6">
                  <Card title="Defaults" subtitle="Set global defaults for new sales and reports">
                    <SelectRow
                      label="Default Currency"
                      description="Used for receipts and reporting."
                      value={prefs.general.defaultCurrency}
                      onChange={(v) => update('general.defaultCurrency', v)}
                      options={[
                        { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
                        { value: 'USD', label: 'USD — US Dollar' },
                        { value: 'KES', label: 'KES — Kenyan Shilling' }
                      ]}
                    />
                    <SelectRow
                      label="Timezone"
                      description="Controls time on receipts and reports."
                      value={prefs.general.timezone}
                      onChange={(v) => update('general.timezone', v)}
                      options={[
                        { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar es Salaam' },
                        { value: 'Africa/Nairobi', label: 'Africa/Nairobi' },
                        { value: 'UTC', label: 'UTC' }
                      ]}
                    />
                    <SelectRow
                      label="Date Format"
                      description="How dates are displayed across the system."
                      value={prefs.general.dateFormat}
                      onChange={(v) => update('general.dateFormat', v)}
                      options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                      ]}
                    />
                  </Card>

                  <Card title="Operations" subtitle="Enterprise features across stores">
                    <Toggle
                      label="Enable Multi-Store"
                      description="Manage multiple branches in one account."
                      checked={Boolean(prefs.general.enableMultiStore)}
                      onChange={(v) => update('general.enableMultiStore', Boolean(v))}
                      tooltip="For advanced setups with multiple outlets"
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'sales' ? (
                <div className="space-y-6">
                  <Card title="Tax & Pricing" subtitle="Control taxes, discounts, and receipts">
                    <Toggle
                      label="Enable Tax"
                      description="Apply tax to taxable items at checkout."
                      checked={Boolean(prefs.sales.enableTax)}
                      onChange={(v) => update('sales.enableTax', Boolean(v))}
                    />
                    <SelectRow
                      label="Default Tax Rate"
                      description="Preset tax rate to apply when tax is enabled."
                      value={prefs.sales.defaultTaxRate}
                      onChange={(v) => update('sales.defaultTaxRate', v)}
                      options={[
                        { value: '0', label: '0%' },
                        { value: '5', label: '5%' },
                        { value: '10', label: '10%' },
                        { value: '18', label: '18% (VAT)' }
                      ]}
                      tooltip="Preset rates (no custom input)"
                    />
                    <Toggle
                      label="Allow Discounts"
                      description="Enable discounts during sale."
                      checked={Boolean(prefs.sales.allowDiscounts)}
                      onChange={(v) => update('sales.allowDiscounts', Boolean(v))}
                    />
                    <Toggle
                      label="Require Approval for Refund"
                      description="Protect refunds with manager approval."
                      checked={Boolean(prefs.sales.requireApprovalForRefund)}
                      onChange={(v) => update('sales.requireApprovalForRefund', Boolean(v))}
                      tooltip="Recommended for audit control"
                    />
                  </Card>

                  <Card title="Automation" subtitle="Reduce steps at the point of sale">
                    <Toggle
                      label="Auto Print Receipt"
                      description="Automatically print after checkout."
                      checked={Boolean(prefs.sales.autoPrintReceipt)}
                      onChange={(v) => update('sales.autoPrintReceipt', Boolean(v))}
                    />
                    <Toggle
                      label="Auto Send SMS Receipt"
                      description="Send receipt SMS to the customer if enabled."
                      checked={Boolean(prefs.sales.autoSendSmsReceipt)}
                      onChange={(v) => update('sales.autoSendSmsReceipt', Boolean(v))}
                      tooltip="Requires SMS integration"
                    />
                    <Toggle
                      label="Allow Negative Stock"
                      description="Permit selling items below zero stock."
                      checked={Boolean(prefs.sales.allowNegativeStock)}
                      danger
                      tooltip="Risky: can create inventory mismatches"
                      onChange={(v) => {
                        const next = Boolean(v);
                        if (next) {
                          setConfirm({
                            open: true,
                            title: 'Enable negative stock?',
                            message: 'This is a risky setting. It may cause inventory mismatches and audit issues.',
                            onConfirm: () => {
                              update('sales.allowNegativeStock', true);
                              setConfirm({ open: false, title: '', message: '', onConfirm: null });
                            }
                          });
                          return;
                        }
                        update('sales.allowNegativeStock', false);
                      }}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'inventory' ? (
                <div className="space-y-6">
                  <Card title="Stock Tracking" subtitle="Inventory behaviors across sales and batches">
                    <Toggle
                      label="Enable Low Stock Alerts"
                      description="Get alerts when stock is low."
                      checked={Boolean(prefs.inventory.enableLowStockAlerts)}
                      onChange={(v) => update('inventory.enableLowStockAlerts', Boolean(v))}
                    />
                    <SelectRow
                      label="Default Reorder Level"
                      description="Default threshold for low-stock warnings."
                      value={prefs.inventory.defaultReorderLevel}
                      onChange={(v) => update('inventory.defaultReorderLevel', v)}
                      options={[
                        { value: '5', label: '5 units' },
                        { value: '10', label: '10 units' },
                        { value: '25', label: '25 units' },
                        { value: '50', label: '50 units' }
                      ]}
                    />
                    <Toggle
                      label="Track Expiry Dates"
                      description="Track expiry for perishable items."
                      checked={Boolean(prefs.inventory.trackExpiryDates)}
                      onChange={(v) => update('inventory.trackExpiryDates', Boolean(v))}
                      tooltip="Advanced tracking"
                    />
                    <Toggle
                      label="Track Batch Numbers"
                      description="Enable batch traceability."
                      checked={Boolean(prefs.inventory.trackBatchNumbers)}
                      onChange={(v) => update('inventory.trackBatchNumbers', Boolean(v))}
                      tooltip="Recommended for compliance"
                    />
                  </Card>

                  <Card title="Automation" subtitle="Stock updates during checkout">
                    <Toggle
                      label="Auto Deduct Stock on Sale"
                      description="Deduct inventory automatically after checkout."
                      checked={Boolean(prefs.inventory.autoDeductStockOnSale)}
                      onChange={(v) => update('inventory.autoDeductStockOnSale', Boolean(v))}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'notifications' ? (
                <div className="space-y-6">
                  <Card title="Alerts" subtitle="Keep your team informed">
                    <Toggle
                      label="Send Low Stock SMS"
                      description="Send SMS alert on low stock."
                      checked={Boolean(prefs.notifications.sendLowStockSms)}
                      onChange={(v) => update('notifications.sendLowStockSms', Boolean(v))}
                      tooltip="Requires SMS integration"
                    />
                    <Toggle
                      label="Send Daily Sales Report"
                      description="Get daily summary notification."
                      checked={Boolean(prefs.notifications.sendDailySalesReport)}
                      onChange={(v) => update('notifications.sendDailySalesReport', Boolean(v))}
                    />
                    <Toggle
                      label="New Sale Notification"
                      description="Notify when a new sale is completed."
                      checked={Boolean(prefs.notifications.notifyNewSale)}
                      onChange={(v) => update('notifications.notifyNewSale', Boolean(v))}
                    />
                    <Toggle
                      label="New Purchase Notification"
                      description="Notify when a new purchase is recorded."
                      checked={Boolean(prefs.notifications.notifyNewPurchase)}
                      onChange={(v) => update('notifications.notifyNewPurchase', Boolean(v))}
                    />
                    <Toggle
                      label="Send Email Alerts"
                      description="Receive alerts via email."
                      checked={Boolean(prefs.notifications.sendEmailAlerts)}
                      onChange={(v) => update('notifications.sendEmailAlerts', Boolean(v))}
                    />
                    <Toggle
                      label="Send WhatsApp Alerts"
                      description="Receive alerts via WhatsApp."
                      checked={Boolean(prefs.notifications.sendWhatsAppAlerts)}
                      onChange={(v) => update('notifications.sendWhatsAppAlerts', Boolean(v))}
                      tooltip="Requires WhatsApp integration"
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'localization' ? (
                <div className="space-y-6">
                  <Card title="Language & Formats" subtitle="Localization for your region">
                    <SelectRow
                      label="Language"
                      description="Change system language for menus and labels."
                      value={prefs.localization.language}
                      onChange={(v) => update('localization.language', v)}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'sw', label: 'Kiswahili' },
                        { value: 'fr', label: 'Français' },
                        { value: 'ar', label: 'العربية' }
                      ]}
                    />
                    <SelectRow
                      label="Number Format"
                      description="How numbers are displayed in the UI."
                      value={prefs.localization.numberFormat}
                      onChange={(v) => update('localization.numberFormat', v)}
                      options={[
                        { value: '1,234.56', label: '1,234.56' },
                        { value: '1.234,56', label: '1.234,56' },
                        { value: '1234.56', label: '1234.56' }
                      ]}
                    />
                    <SelectRow
                      label="Decimal Places"
                      description="Decimals to display for prices and totals."
                      value={prefs.localization.decimalPlaces}
                      onChange={(v) => update('localization.decimalPlaces', v)}
                      options={[
                        { value: '0', label: '0' },
                        { value: '2', label: '2' },
                        { value: '3', label: '3' }
                      ]}
                    />
                    <SelectRow
                      label="Currency Symbol Position"
                      description="Choose where the currency appears around amounts."
                      value={prefs.localization.currencySymbolPosition}
                      onChange={(v) => update('localization.currencySymbolPosition', v)}
                      options={[
                        { value: 'before', label: 'Before amount (TZS 1,000)' },
                        { value: 'after', label: 'After amount (1,000 TZS)' }
                      ]}
                    />
                  </Card>
                </div>
              ) : null}

              {tab === 'appearance' ? (
                <div className="space-y-6">
                  <Card title="Appearance" subtitle="Light mode only">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                      Dark mode and system theme are disabled. The app always uses light mode.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60 pointer-events-none select-none">
                      <ThemeCard
                        title="Light Mode"
                        mode="light"
                        active={prefs.appearance.themeMode === 'light'}
                        onClick={() => {}}
                      />
                    </div>
                  </Card>
                </div>
              ) : null}

              {tab === 'security' ? (
                <div className="space-y-6">
                  <Card title="Session & Access" subtitle="Security policies for staff operations">
                    <SelectRow
                      label="Session Timeout"
                      description="Auto-logout after inactivity."
                      value={prefs.security.sessionTimeout}
                      onChange={(v) => update('security.sessionTimeout', v)}
                      options={[
                        { value: '15', label: '15 minutes' },
                        { value: '30', label: '30 minutes' },
                        { value: '60', label: '60 minutes' },
                        { value: '120', label: '2 hours' }
                      ]}
                    />
                    <Toggle
                      label="Require Password for Delete"
                      description="Require password to delete records and accounts."
                      checked={Boolean(prefs.security.requirePinForDelete)}
                      onChange={(v) => update('security.requirePinForDelete', Boolean(v))}
                      tooltip="Recommended"
                    />
                    <Toggle
                      label="Require PIN for Refund"
                      description="Require PIN to refund sales."
                      checked={Boolean(prefs.security.requirePinForRefund)}
                      onChange={(v) => update('security.requirePinForRefund', Boolean(v))}
                      tooltip="Recommended"
                    />
                    <Toggle
                      label="Enable Two-Factor Authentication"
                      description="Add an extra verification layer for admin."
                      checked={Boolean(prefs.security.enableTwoFactorAuthentication)}
                      onChange={(v) => update('security.enableTwoFactorAuthentication', Boolean(v))}
                      tooltip="Advanced security"
                    />
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-4 py-3 rounded-2xl bg-gray-900 text-white shadow-xl border border-white/10 transition duration-200">
            <div className="text-sm font-semibold">{toast}</div>
          </div>
        </div>
      ) : null}

      {confirm.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })} />
          <div className="relative w-[94vw] max-w-[520px] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-gray-900">{confirm.title}</div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition duration-200"
                onClick={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })}
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <div className="text-sm text-gray-700">{confirm.message}</div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition duration-200"
                  onClick={() => setConfirm({ open: false, title: '', message: '', onConfirm: null })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition duration-200"
                  onClick={() => {
                    const fn = confirm.onConfirm;
                    if (typeof fn === 'function') fn();
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
