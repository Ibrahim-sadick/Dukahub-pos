export const defaultBusinessSettings = {
  general: {
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
  },
  profile: {}
} as const;

type SettingsLike = {
  general?: unknown | null;
  sales?: unknown | null;
  inventory?: unknown | null;
  notifications?: unknown | null;
  localization?: unknown | null;
  appearance?: unknown | null;
  security?: unknown | null;
  profile?: unknown | null;
};

export const mergeSettings = (settings?: SettingsLike | null) => ({
  ...defaultBusinessSettings,
  ...(settings
    ? {
        general: settings.general ?? defaultBusinessSettings.general,
        sales: settings.sales ?? defaultBusinessSettings.sales,
        inventory: settings.inventory ?? defaultBusinessSettings.inventory,
        notifications: settings.notifications ?? defaultBusinessSettings.notifications,
        localization: settings.localization ?? defaultBusinessSettings.localization,
        appearance: settings.appearance ?? defaultBusinessSettings.appearance,
        security: settings.security ?? defaultBusinessSettings.security,
        profile: settings.profile ?? defaultBusinessSettings.profile
      }
    : {})
});
