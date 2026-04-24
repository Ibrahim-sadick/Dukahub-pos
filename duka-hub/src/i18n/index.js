import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const localGet = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(String(key || ''));
    if (raw == null) return fallback;
    return safeJsonParse(raw, fallback);
  } catch {
    return fallback;
  }
};

const getCurrentUser = () => {
  return localGet('currentUser', null);
};

const getBusinessIdForUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'staff') return String(user?.businessId || '');
  return String(user?.id || '');
};

const normalizeLang = (lang) => {
  const v = String(lang || '').trim();
  return v || 'en';
};

const rtlLangs = new Set(['ar', 'he', 'fa', 'ur']);

const translations = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.plans': 'Plans',
    'nav.sales': 'Sales',
    'nav.stocks': 'Products & Store',
    'nav.purchases': 'Purchases',
    'nav.expenses': 'Expenses',
    'nav.damageStocks': 'Damage Stocks',
    'nav.reports': 'Reports',
    'nav.staff': 'Staff',
    'nav.accounting': 'Accounting (Light)',
    'nav.banking': 'Banking',
    'nav.planning': 'Planning & Control',
    'nav.notifications': 'Notifications',
    'nav.activity': 'Activity',
    'nav.integrations': 'Integrations',
    'nav.settings': 'Settings',
    'top.searchPlaceholder': 'Search for data, pages, or actions',
    'top.profile': 'Profile',
    'top.logout': 'Logout'
    ,
    'common.export': 'Export',
    'common.noMatches': 'No matches',
    'common.menu': 'Menu',
    'lock.title': 'Subscription required',
    'lock.notActive': 'Subscription not active',
    'lock.expired': 'Subscription expired',
    'lock.trialNotActive': 'Trial not active',
    'lock.trialEnded': 'Trial ended',
    'lock.paymentPending': 'Payment pending',
    'lock.inactive': 'Subscription inactive',
    'lock.close': 'Close',
    'lock.choosePlan': 'Choose plan',
    'lock.body': 'Your system is locked until payment is completed. Choose a plan to unlock.',
    'submenu.salesOrder': 'Sales Order',
    'submenu.salesHistory': 'Sales History',
    'submenu.customers': 'Customers',
    'submenu.creditSales': 'Credit Sales',
    'submenu.returnsRefunds': 'Damaged Stocks',
    'submenu.products': 'Products',
    'submenu.store': 'Store',
    'submenu.stockValuations': 'Stock Valuations',
    'submenu.purchaseOrder': 'Purchase Order',
    'submenu.purchaseHistory': 'Purchase History',
    'submenu.suppliers': 'Suppliers',
    'submenu.allExpenses': 'All Expenses',
    'submenu.expensesRecord': 'Expenses Record',
    'submenu.expensesAnalytics': 'Expenses Analytics',
    'submenu.expenseCategories': 'Expense Categories',
    'submenu.fixedCosts': 'Fixed Costs (Rent, Salary)',
    'submenu.variableCosts': 'Variable Costs',
    'submenu.salesReports': 'Sales Reports',
    'submenu.inventoryReports': 'Inventory Reports',
    'submenu.productionReports': 'Purchase Reports',
    'submenu.expenseReports': 'Expense Reports',
    'submenu.profitLoss': 'Profit & Loss',
    'submenu.performanceKpis': 'Performance KPIs',
    'submenu.staffRegister': 'Staff Register',
    'submenu.staffList': 'Staff List',
    'submenu.rolesPermissions': 'Roles & Permissions',
    'submenu.incomeOverview': 'Income Overview',
    'submenu.expenseOverview': 'Expense Overview',
    'submenu.stockValue': 'Stock Value',
    'submenu.periodClosing': 'Period Closing',
    'submenu.auditTrail': 'Audit Trail',
    'submenu.bankAccounts': 'Bank Accounts',
    'submenu.bankTransfers': 'Bank Transfers',
    'submenu.bankReconciliation': 'Bank Reconciliation',
    'submenu.productionPlanning': 'Production Planning',
    'submenu.feedForecasting': 'Feed Forecasting',
    'submenu.purchasePlanning': 'Purchase Planning',
    'submenu.alertsReminders': 'Alerts & Reminders',
    'submenu.lowStockAlerts': 'Low Stock Alerts',
    'submenu.expiryAlerts': 'Expiry Alerts (Medicine)',
    'submenu.paymentDueAlerts': 'Payment Due Alerts',
    'submenu.subscription': 'Subscription',
    'submenu.systemLogs': 'System Logs',
    'submenu.mobileMoney': 'Mobile Money',
    'submenu.smsWhatsapp': 'SMS / WhatsApp',
    'submenu.exportIntegration': 'Export (Excel / PDF)',
    'submenu.systemPreferences': 'System Preferences',
    'prefs.headerTitle': 'System Preferences',
    'prefs.headerSubtitle': 'Enterprise settings for your POS',
    'prefs.connected': 'Connected',
    'prefs.saveChanges': 'Save Changes',
    'prefs.toastSaved': 'Saved changes',
    'prefs.tab.general': 'General',
    'prefs.tab.sales': 'Sales',
    'prefs.tab.inventory': 'Inventory',
    'prefs.tab.notifications': 'Notifications',
    'prefs.tab.localization': 'Localization',
    'prefs.tab.appearance': 'Appearance',
    'prefs.tab.security': 'Security',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'prefs.loginRequired': 'Please login to view System Preferences.',
    'prefs.toastAppearanceLocked': 'Appearance is locked by admin',
    'prefs.common.recommended': 'Recommended',
    'prefs.card.defaults.title': 'Defaults',
    'prefs.card.defaults.subtitle': 'Set global defaults for new sales and reports',
    'prefs.general.timezone.label': 'Timezone',
    'prefs.general.timezone.desc': 'Controls time on receipts and reports.',
    'prefs.general.dateFormat.label': 'Date Format',
    'prefs.general.dateFormat.desc': 'How dates are displayed across the system.',
    'prefs.card.operations.title': 'Operations',
    'prefs.card.operations.subtitle': 'Enterprise features across stores',
    'prefs.general.enableMultiStore.label': 'Enable Multi-Store',
    'prefs.general.enableMultiStore.desc': 'Manage multiple branches in one account.',
    'prefs.general.enableMultiStore.tip': 'For advanced setups with multiple outlets',
    'prefs.card.taxPricing.title': 'Tax & Pricing',
    'prefs.card.taxPricing.subtitle': 'Control taxes, discounts, and receipts',
    'prefs.sales.enableTax.label': 'Enable Tax',
    'prefs.sales.enableTax.desc': 'Apply tax to taxable items at checkout.',
    'prefs.sales.defaultTaxRate.label': 'Default Tax Rate',
    'prefs.sales.defaultTaxRate.desc': 'Preset tax rate to apply when tax is enabled.',
    'prefs.sales.defaultTaxRate.tip': 'Preset rates (no custom input)',
    'prefs.sales.allowDiscounts.label': 'Allow Discounts',
    'prefs.sales.allowDiscounts.desc': 'Enable discounts during sale.',
    'prefs.sales.requireApprovalForRefund.label': 'Require Approval for Refund',
    'prefs.sales.requireApprovalForRefund.desc': 'Protect refunds with manager approval.',
    'prefs.sales.requireApprovalForRefund.tip': 'Recommended for audit control',
    'prefs.card.automation.title': 'Automation',
    'prefs.card.automation.subtitle': 'Reduce steps at the point of sale',
    'prefs.sales.autoPrintReceipt.label': 'Auto Print Receipt',
    'prefs.sales.autoPrintReceipt.desc': 'Automatically print after checkout.',
    'prefs.sales.autoSendSmsReceipt.label': 'Auto Send SMS Receipt',
    'prefs.sales.autoSendSmsReceipt.desc': 'Send receipt SMS to the customer if enabled.',
    'prefs.sales.autoSendSmsReceipt.tip': 'Requires SMS integration',
    'prefs.sales.allowNegativeStock.label': 'Allow Negative Stock',
    'prefs.sales.allowNegativeStock.desc': 'Permit selling items below zero stock.',
    'prefs.sales.allowNegativeStock.tip': 'Risky: can create inventory mismatches',
    'prefs.sales.allowNegativeStock.confirmTitle': 'Enable negative stock?',
    'prefs.sales.allowNegativeStock.confirmMsg': 'This is a risky setting. It may cause inventory mismatches and audit issues.',
    'prefs.card.stockTracking.title': 'Stock Tracking',
    'prefs.card.stockTracking.subtitle': 'Inventory behaviors across sales and batches',
    'prefs.inventory.enableLowStockAlerts.label': 'Enable Low Stock Alerts',
    'prefs.inventory.enableLowStockAlerts.desc': 'Get alerts when stock is low.',
    'prefs.inventory.defaultReorderLevel.label': 'Default Reorder Level',
    'prefs.inventory.defaultReorderLevel.desc': 'Default threshold for low-stock warnings.',
    'prefs.inventory.trackExpiryDates.label': 'Track Expiry Dates',
    'prefs.inventory.trackExpiryDates.desc': 'Track expiry for perishable items.',
    'prefs.inventory.trackExpiryDates.tip': 'Advanced tracking',
    'prefs.inventory.trackBatchNumbers.label': 'Track Batch Numbers',
    'prefs.inventory.trackBatchNumbers.desc': 'Enable batch traceability.',
    'prefs.inventory.trackBatchNumbers.tip': 'Recommended for compliance',
    'prefs.inventory.autoDeductStockOnSale.label': 'Auto Deduct Stock on Sale',
    'prefs.inventory.autoDeductStockOnSale.desc': 'Deduct inventory automatically after checkout.',
    'prefs.card.alerts.title': 'Alerts',
    'prefs.card.alerts.subtitle': 'Keep your team informed',
    'prefs.notifications.sendLowStockSms.label': 'Send Low Stock SMS',
    'prefs.notifications.sendLowStockSms.desc': 'Send SMS alert on low stock.',
    'prefs.notifications.sendLowStockSms.tip': 'Requires SMS integration',
    'prefs.notifications.sendDailySalesReport.label': 'Send Daily Sales Report',
    'prefs.notifications.sendDailySalesReport.desc': 'Get daily summary notification.',
    'prefs.notifications.notifyNewSale.label': 'New Sale Notification',
    'prefs.notifications.notifyNewSale.desc': 'Notify when a new sale is completed.',
    'prefs.notifications.notifyNewPurchase.label': 'New Purchase Notification',
    'prefs.notifications.notifyNewPurchase.desc': 'Notify when a new purchase is recorded.',
    'prefs.notifications.sendEmailAlerts.label': 'Send Email Alerts',
    'prefs.notifications.sendEmailAlerts.desc': 'Receive alerts via email.',
    'prefs.notifications.sendWhatsAppAlerts.label': 'Send WhatsApp Alerts',
    'prefs.notifications.sendWhatsAppAlerts.desc': 'Receive alerts via WhatsApp.',
    'prefs.notifications.sendWhatsAppAlerts.tip': 'Requires WhatsApp integration',
    'prefs.card.localization.title': 'Language & Formats',
    'prefs.card.localization.subtitle': 'Localization for your region',
    'prefs.localization.language.label': 'Language',
    'prefs.localization.language.desc': 'Change system language for menus and labels.',
    'prefs.localization.numberFormat.label': 'Number Format',
    'prefs.localization.numberFormat.desc': 'How numbers are displayed in the UI.',
    'prefs.localization.decimalPlaces.label': 'Decimal Places',
    'prefs.localization.decimalPlaces.desc': 'Decimals to display for prices and totals.',
    'prefs.localization.currencySymbolPosition.label': 'Currency Symbol Position',
    'prefs.localization.currencySymbolPosition.desc': 'Choose where the currency appears around amounts.',
    'prefs.card.appearance.title': 'Appearance',
    'prefs.card.appearance.subtitle': 'Light mode only',
    'prefs.appearance.lockedNote': 'Dark mode and system theme are disabled. The app always uses light mode.',
    'prefs.appearance.lightMode': 'Light Mode',
    'prefs.card.security.title': 'Session & Access',
    'prefs.card.security.subtitle': 'Security policies for staff operations',
    'prefs.security.sessionTimeout.label': 'Session Timeout',
    'prefs.security.sessionTimeout.desc': 'Auto-logout after inactivity.',
    'prefs.security.requirePinForDelete.label': 'Require Password for Delete',
    'prefs.security.requirePinForDelete.desc': 'Require password to delete records and accounts.',
    'prefs.security.requirePinForRefund.label': 'Require PIN for Refund',
    'prefs.security.requirePinForRefund.desc': 'Require PIN to refund sales.',
    'prefs.security.enableTwoFactorAuthentication.label': 'Enable Two-Factor Authentication',
    'prefs.security.enableTwoFactorAuthentication.desc': 'Add an extra verification layer for admin.',
    'prefs.security.enableTwoFactorAuthentication.tip': 'Advanced security'
    ,
    'prefs.inventory.defaultReorderLevel.opt5': '5 units',
    'prefs.inventory.defaultReorderLevel.opt10': '10 units',
    'prefs.inventory.defaultReorderLevel.opt25': '25 units',
    'prefs.inventory.defaultReorderLevel.opt50': '50 units',
    'prefs.localization.currencySymbolPosition.before': 'Before amount (TZS 1,000)',
    'prefs.localization.currencySymbolPosition.after': 'After amount (1,000 TZS)',
    'prefs.security.sessionTimeout.opt15': '15 minutes',
    'prefs.security.sessionTimeout.opt30': '30 minutes',
    'prefs.security.sessionTimeout.opt60': '60 minutes',
    'prefs.security.sessionTimeout.opt120': '2 hours'
  },
  sw: {
    'nav.dashboard': 'Dashibodi',
    'nav.plans': 'Mipango',
    'nav.sales': 'Mauzo',
    'nav.stocks': 'Bidhaa & Ghala',
    'nav.purchases': 'Manunuzi',
    'nav.expenses': 'Gharama',
    'nav.damageStocks': 'Stoo Iliyoharibika',
    'nav.reports': 'Ripoti',
    'nav.staff': 'Wafanyakazi',
    'nav.accounting': 'Uhasibu (Rahisi)',
    'nav.banking': 'Benki',
    'nav.planning': 'Mipango & Udhibiti',
    'nav.notifications': 'Arifa',
    'nav.activity': 'Shughuli',
    'nav.integrations': 'Muunganisho',
    'nav.settings': 'Mipangilio',
    'top.searchPlaceholder': 'Tafuta data, kurasa, au vitendo',
    'top.profile': 'Wasifu',
    'top.logout': 'Toka',
    'common.export': 'Hamisha',
    'common.noMatches': 'Hakuna matokeo',
    'common.menu': 'Menyu',
    'lock.title': 'Usajili unahitajika',
    'lock.notActive': 'Usajili haupo',
    'lock.expired': 'Usajili umeisha',
    'lock.trialNotActive': 'Jaribio halipo',
    'lock.trialEnded': 'Jaribio limeisha',
    'lock.paymentPending': 'Malipo yanasubiri',
    'lock.inactive': 'Usajili haujawezeshwa',
    'lock.close': 'Funga',
    'lock.choosePlan': 'Chagua mpango',
    'lock.body': 'Mfumo umefungwa hadi malipo yakamilike. Chagua mpango kufungua.',
    'submenu.salesOrder': 'Oda ya Mauzo',
    'submenu.salesHistory': 'Historia ya Mauzo',
    'submenu.customers': 'Wateja',
    'submenu.creditSales': 'Mauzo ya Mkopo',
    'submenu.returnsRefunds': 'Stoo Iliyoharibika',
    'submenu.products': 'Bidhaa',
    'submenu.store': 'Ghala',
    'submenu.stockValuations': 'Thamani ya Stoo',
    'submenu.purchaseOrder': 'Oda ya Manunuzi',
    'submenu.purchaseHistory': 'Historia ya Manunuzi',
    'submenu.suppliers': 'Wasambazaji',
    'submenu.allExpenses': 'Gharama Zote',
    'submenu.expensesRecord': 'Rekodi za Gharama',
    'submenu.expensesAnalytics': 'Uchambuzi wa Gharama',
    'submenu.expenseCategories': 'Makundi ya Gharama',
    'submenu.fixedCosts': 'Gharama za Kudumu (Kodi, Mishahara)',
    'submenu.variableCosts': 'Gharama Zinazobadilika',
    'submenu.salesReports': 'Ripoti za Mauzo',
    'submenu.inventoryReports': 'Ripoti za Stoo',
    'submenu.productionReports': 'Ripoti za Manunuzi',
    'submenu.expenseReports': 'Ripoti za Gharama',
    'submenu.profitLoss': 'Faida & Hasara',
    'submenu.performanceKpis': 'Viashiria vya Utendaji',
    'submenu.staffRegister': 'Usajili wa Wafanyakazi',
    'submenu.staffList': 'Orodha ya Wafanyakazi',
    'submenu.rolesPermissions': 'Majukumu & Ruhusa',
    'submenu.incomeOverview': 'Muhtasari wa Mapato',
    'submenu.expenseOverview': 'Muhtasari wa Gharama',
    'submenu.stockValue': 'Thamani ya Stoo',
    'submenu.periodClosing': 'Kufunga Kipindi',
    'submenu.auditTrail': 'Rekodi ya Ukaguzi',
    'submenu.bankAccounts': 'Akaunti za Benki',
    'submenu.bankTransfers': 'Uhamisho wa Benki',
    'submenu.bankReconciliation': 'Usawazishaji wa Benki',
    'submenu.productionPlanning': 'Mipango ya Uzalishaji',
    'submenu.feedForecasting': 'Makadirio ya Chakula',
    'submenu.purchasePlanning': 'Mipango ya Manunuzi',
    'submenu.alertsReminders': 'Arifa & Vikumbusho',
    'submenu.lowStockAlerts': 'Arifa za Stoo Kidogo',
    'submenu.expiryAlerts': 'Arifa za Mwisho wa Muda (Dawa)',
    'submenu.paymentDueAlerts': 'Arifa za Malipo',
    'submenu.subscription': 'Malipo / Mpango',
    'submenu.systemLogs': 'Rekodi za Mfumo',
    'submenu.mobileMoney': 'Pesa ya Simu',
    'submenu.smsWhatsapp': 'SMS / WhatsApp',
    'submenu.exportIntegration': 'Hamisha (Excel / PDF)',
    'submenu.systemPreferences': 'Mapendeleo ya Mfumo',
    'prefs.headerTitle': 'Mapendeleo ya Mfumo',
    'prefs.headerSubtitle': 'Mipangilio ya biashara kwa POS yako',
    'prefs.connected': 'Imeunganishwa',
    'prefs.saveChanges': 'Hifadhi Mabadiliko',
    'prefs.toastSaved': 'Mabadiliko yamehifadhiwa',
    'prefs.tab.general': 'Jumla',
    'prefs.tab.sales': 'Mauzo',
    'prefs.tab.inventory': 'Stoo',
    'prefs.tab.notifications': 'Arifa',
    'prefs.tab.localization': 'Lugha',
    'prefs.tab.appearance': 'Muonekano',
    'prefs.tab.security': 'Usalama',
    'common.close': 'Funga',
    'common.cancel': 'Ghairi',
    'common.confirm': 'Thibitisha',
    'prefs.loginRequired': 'Tafadhali ingia ili kuona Mapendeleo ya Mfumo.',
    'prefs.toastAppearanceLocked': 'Muonekano umefungwa na msimamizi',
    'prefs.common.recommended': 'Inapendekezwa',
    'prefs.card.defaults.title': 'Chaguo-msingi',
    'prefs.card.defaults.subtitle': 'Weka chaguo-msingi kwa mauzo na ripoti mpya',
    'prefs.general.timezone.label': 'Kanda ya Saa',
    'prefs.general.timezone.desc': 'Hudhibiti muda kwenye risiti na ripoti.',
    'prefs.general.dateFormat.label': 'Muundo wa Tarehe',
    'prefs.general.dateFormat.desc': 'Jinsi tarehe zinavyooneshwa kwenye mfumo.',
    'prefs.card.operations.title': 'Uendeshaji',
    'prefs.card.operations.subtitle': 'Vipengele vya biashara kwenye matawi',
    'prefs.general.enableMultiStore.label': 'Wezesha Matawi Mengi',
    'prefs.general.enableMultiStore.desc': 'Dhibiti matawi mengi kwenye akaunti moja.',
    'prefs.general.enableMultiStore.tip': 'Kwa mipangilio ya hali ya juu yenye maduka mengi',
    'prefs.card.taxPricing.title': 'Kodi & Bei',
    'prefs.card.taxPricing.subtitle': 'Dhibiti kodi, punguzo, na risiti',
    'prefs.sales.enableTax.label': 'Wezesha Kodi',
    'prefs.sales.enableTax.desc': 'Tumia kodi kwenye bidhaa zinazotozwa wakati wa malipo.',
    'prefs.sales.defaultTaxRate.label': 'Kiwango Chaguo-msingi cha Kodi',
    'prefs.sales.defaultTaxRate.desc': 'Kiwango cha kodi cha kutumia wakati kodi imewezeshwa.',
    'prefs.sales.defaultTaxRate.tip': 'Viwango vilivyowekwa (hakuna kuingiza kingine)',
    'prefs.sales.allowDiscounts.label': 'Ruhusu Punguzo',
    'prefs.sales.allowDiscounts.desc': 'Wezesha punguzo wakati wa mauzo.',
    'prefs.sales.requireApprovalForRefund.label': 'Hitaji Idhini ya Marejesho',
    'prefs.sales.requireApprovalForRefund.desc': 'Linda marejesho kwa idhini ya meneja.',
    'prefs.sales.requireApprovalForRefund.tip': 'Inapendekezwa kwa udhibiti wa ukaguzi',
    'prefs.card.automation.title': 'Otomatiki',
    'prefs.card.automation.subtitle': 'Punguza hatua kwenye sehemu ya mauzo',
    'prefs.sales.autoPrintReceipt.label': 'Chapisha Risiti Kiotomatiki',
    'prefs.sales.autoPrintReceipt.desc': 'Chapisha baada ya malipo kukamilika.',
    'prefs.sales.autoSendSmsReceipt.label': 'Tuma Risiti kwa SMS Kiotomatiki',
    'prefs.sales.autoSendSmsReceipt.desc': 'Tuma SMS ya risiti kwa mteja ikiwa imewezeshwa.',
    'prefs.sales.autoSendSmsReceipt.tip': 'Inahitaji muunganisho wa SMS',
    'prefs.sales.allowNegativeStock.label': 'Ruhusu Stoo Kuwa Hasi',
    'prefs.sales.allowNegativeStock.desc': 'Ruhusu kuuza bidhaa ikiwa stoo iko chini ya sifuri.',
    'prefs.sales.allowNegativeStock.tip': 'Hatari: inaweza kusababisha tofauti kwenye stoo',
    'prefs.sales.allowNegativeStock.confirmTitle': 'Wezesha stoo hasi?',
    'prefs.sales.allowNegativeStock.confirmMsg': 'Hii ni mipangilio hatarishi. Inaweza kusababisha tofauti za stoo na masuala ya ukaguzi.',
    'prefs.card.stockTracking.title': 'Ufuatiliaji wa Stoo',
    'prefs.card.stockTracking.subtitle': 'Tabia za stoo kwenye mauzo na makundi',
    'prefs.inventory.enableLowStockAlerts.label': 'Wezesha Arifa za Stoo Kidogo',
    'prefs.inventory.enableLowStockAlerts.desc': 'Pata arifa stoo inapokuwa kidogo.',
    'prefs.inventory.defaultReorderLevel.label': 'Kiwango Chaguo-msingi cha Kuagiza Tena',
    'prefs.inventory.defaultReorderLevel.desc': 'Kizingiti chaguo-msingi cha arifa za stoo kidogo.',
    'prefs.inventory.trackExpiryDates.label': 'Fuatilia Mwisho wa Muda',
    'prefs.inventory.trackExpiryDates.desc': 'Fuatilia bidhaa zinazoisha muda (zinazoharibika).',
    'prefs.inventory.trackExpiryDates.tip': 'Ufuatiliaji wa hali ya juu',
    'prefs.inventory.trackBatchNumbers.label': 'Fuatilia Namba za Batch',
    'prefs.inventory.trackBatchNumbers.desc': 'Wezesha ufuatiliaji wa batch.',
    'prefs.inventory.trackBatchNumbers.tip': 'Inapendekezwa kwa utii wa kanuni',
    'prefs.inventory.autoDeductStockOnSale.label': 'Punguza Stoo Kiotomatiki Wakati wa Mauzo',
    'prefs.inventory.autoDeductStockOnSale.desc': 'Punguza stoo moja kwa moja baada ya malipo.',
    'prefs.card.alerts.title': 'Arifa',
    'prefs.card.alerts.subtitle': 'Wajulishe wafanyakazi wako',
    'prefs.notifications.sendLowStockSms.label': 'Tuma SMS ya Stoo Kidogo',
    'prefs.notifications.sendLowStockSms.desc': 'Tuma arifa ya SMS stoo inapokuwa kidogo.',
    'prefs.notifications.sendLowStockSms.tip': 'Inahitaji muunganisho wa SMS',
    'prefs.notifications.sendDailySalesReport.label': 'Tuma Ripoti ya Mauzo ya Kila Siku',
    'prefs.notifications.sendDailySalesReport.desc': 'Pata arifa ya muhtasari wa kila siku.',
    'prefs.notifications.notifyNewSale.label': 'Arifa ya Mauzo Mapya',
    'prefs.notifications.notifyNewSale.desc': 'Arifu mauzo mapya yanapokamilika.',
    'prefs.notifications.notifyNewPurchase.label': 'Arifa ya Manunuzi Mapya',
    'prefs.notifications.notifyNewPurchase.desc': 'Arifu manunuzi mapya yanaporekodiwa.',
    'prefs.notifications.sendEmailAlerts.label': 'Tuma Arifa kwa Barua Pepe',
    'prefs.notifications.sendEmailAlerts.desc': 'Pokea arifa kupitia barua pepe.',
    'prefs.notifications.sendWhatsAppAlerts.label': 'Tuma Arifa kwa WhatsApp',
    'prefs.notifications.sendWhatsAppAlerts.desc': 'Pokea arifa kupitia WhatsApp.',
    'prefs.notifications.sendWhatsAppAlerts.tip': 'Inahitaji muunganisho wa WhatsApp',
    'prefs.card.localization.title': 'Lugha & Miundo',
    'prefs.card.localization.subtitle': 'Mipangilio ya eneo lako',
    'prefs.localization.language.label': 'Lugha',
    'prefs.localization.language.desc': 'Badilisha lugha ya mfumo kwa menyu na lebo.',
    'prefs.localization.numberFormat.label': 'Muundo wa Namba',
    'prefs.localization.numberFormat.desc': 'Jinsi namba zinavyooneshwa kwenye mfumo.',
    'prefs.localization.decimalPlaces.label': 'Idadi ya Desimali',
    'prefs.localization.decimalPlaces.desc': 'Desimali za kuonesha kwenye bei na jumla.',
    'prefs.localization.currencySymbolPosition.label': 'Mahali pa Alama ya Sarafu',
    'prefs.localization.currencySymbolPosition.desc': 'Chagua sarafu ionekane wapi kwenye kiasi.',
    'prefs.card.appearance.title': 'Muonekano',
    'prefs.card.appearance.subtitle': 'Mwanga tu',
    'prefs.appearance.lockedNote': 'Dark mode na mfumo wa theme vimezimwa. App hutumia mwanga tu.',
    'prefs.appearance.lightMode': 'Mwanga',
    'prefs.card.security.title': 'Kikao & Ufikiaji',
    'prefs.card.security.subtitle': 'Sera za usalama kwa shughuli za wafanyakazi',
    'prefs.security.sessionTimeout.label': 'Muda wa Kikao',
    'prefs.security.sessionTimeout.desc': 'Toka kiotomatiki baada ya kutotumika.',
    'prefs.security.requirePinForDelete.label': 'Hitaji Nenosiri kwa Kufuta',
    'prefs.security.requirePinForDelete.desc': 'Hitaji nenosiri kufuta rekodi na akaunti.',
    'prefs.security.requirePinForRefund.label': 'Hitaji PIN kwa Marejesho',
    'prefs.security.requirePinForRefund.desc': 'Hitaji PIN kurejesha mauzo.',
    'prefs.security.enableTwoFactorAuthentication.label': 'Wezesha Uthibitisho wa Hatua Mbili',
    'prefs.security.enableTwoFactorAuthentication.desc': 'Ongeza ulinzi wa ziada kwa msimamizi.',
    'prefs.security.enableTwoFactorAuthentication.tip': 'Usalama wa hali ya juu'
    ,
    'prefs.inventory.defaultReorderLevel.opt5': 'Vitengo 5',
    'prefs.inventory.defaultReorderLevel.opt10': 'Vitengo 10',
    'prefs.inventory.defaultReorderLevel.opt25': 'Vitengo 25',
    'prefs.inventory.defaultReorderLevel.opt50': 'Vitengo 50',
    'prefs.localization.currencySymbolPosition.before': 'Kabla ya kiasi (TZS 1,000)',
    'prefs.localization.currencySymbolPosition.after': 'Baada ya kiasi (1,000 TZS)',
    'prefs.security.sessionTimeout.opt15': 'Dakika 15',
    'prefs.security.sessionTimeout.opt30': 'Dakika 30',
    'prefs.security.sessionTimeout.opt60': 'Dakika 60',
    'prefs.security.sessionTimeout.opt120': 'Saa 2'
  },
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.plans': 'Abonnements',
    'nav.sales': 'Ventes',
    'nav.stocks': 'Produits & Stock',
    'nav.purchases': 'Achats',
    'nav.expenses': 'Dépenses',
    'nav.damageStocks': 'Stock endommagé',
    'nav.reports': 'Rapports',
    'nav.staff': 'Personnel',
    'nav.accounting': 'Comptabilité (Léger)',
    'nav.banking': 'Banque',
    'nav.planning': 'Planification & Contrôle',
    'nav.notifications': 'Notifications',
    'nav.integrations': 'Intégrations',
    'nav.settings': 'Paramètres',
    'top.searchPlaceholder': 'Rechercher des données, pages ou actions',
    'top.profile': 'Profil',
    'top.logout': 'Déconnexion',
    'common.export': 'Exporter',
    'common.noMatches': 'Aucun résultat',
    'common.menu': 'Menu',
    'lock.title': 'Abonnement requis',
    'lock.close': 'Fermer',
    'lock.choosePlan': 'Choisir un plan',
    'lock.body': 'Le système est verrouillé jusqu’au paiement. Choisissez un plan pour déverrouiller.',
    'submenu.salesOrder': 'Bon de commande',
    'submenu.salesHistory': 'Historique des ventes',
    'submenu.customers': 'Clients',
    'submenu.creditSales': 'Ventes à crédit',
    'submenu.returnsRefunds': 'Stock endommagé',
    'submenu.products': 'Produits',
    'submenu.store': 'Stock',
    'submenu.stockValuations': 'Valorisation du stock',
    'submenu.purchaseOrder': 'Commande d’achat',
    'submenu.purchaseHistory': 'Historique des achats',
    'submenu.suppliers': 'Fournisseurs',
    'submenu.bankAccounts': 'Comptes bancaires',
    'submenu.bankTransfers': 'Virements bancaires',
    'submenu.bankReconciliation': 'Rapprochement bancaire',
    'submenu.systemPreferences': 'Préférences système',
    'submenu.subscription': 'Abonnement',
    'prefs.headerTitle': 'Préférences système',
    'prefs.headerSubtitle': 'Paramètres d’entreprise pour votre POS',
    'prefs.connected': 'Connecté',
    'prefs.saveChanges': 'Enregistrer',
    'prefs.toastSaved': 'Modifications enregistrées',
    'prefs.tab.general': 'Général',
    'prefs.tab.sales': 'Ventes',
    'prefs.tab.inventory': 'Stock',
    'prefs.tab.notifications': 'Notifications',
    'prefs.tab.localization': 'Localisation',
    'prefs.tab.appearance': 'Apparence',
    'prefs.tab.security': 'Sécurité'
  },
  ar: {
    'nav.dashboard': 'لوحة التحكم',
    'nav.plans': 'الاشتراكات',
    'nav.sales': 'المبيعات',
    'nav.stocks': 'المنتجات والمخزن',
    'nav.purchases': 'المشتريات',
    'nav.expenses': 'المصروفات',
    'nav.damageStocks': 'المخزون التالف',
    'nav.reports': 'التقارير',
    'nav.staff': 'الموظفون',
    'nav.accounting': 'المحاسبة (خفيفة)',
    'nav.planning': 'التخطيط والتحكم',
    'nav.notifications': 'الإشعارات',
    'nav.integrations': 'التكاملات',
    'nav.settings': 'الإعدادات',
    'top.searchPlaceholder': 'ابحث عن بيانات أو صفحات أو إجراءات',
    'top.profile': 'الملف الشخصي',
    'top.logout': 'تسجيل الخروج',
    'common.export': 'تصدير',
    'common.noMatches': 'لا توجد نتائج',
    'common.menu': 'القائمة',
    'lock.title': 'الاشتراك مطلوب',
    'lock.close': 'إغلاق',
    'lock.choosePlan': 'اختر خطة',
    'lock.body': 'تم قفل النظام حتى تكتمل عملية الدفع. اختر خطة لفتح النظام.',
    'submenu.salesOrder': 'طلب مبيعات',
    'submenu.salesHistory': 'سجل المبيعات',
    'submenu.customers': 'العملاء',
    'submenu.creditSales': 'مبيعات بالآجل',
    'submenu.returnsRefunds': 'المخزون التالف',
    'submenu.products': 'المنتجات',
    'submenu.store': 'المخزن',
    'submenu.stockValuations': 'تقييم المخزون',
    'submenu.purchaseOrder': 'طلب شراء',
    'submenu.purchaseHistory': 'سجل المشتريات',
    'submenu.suppliers': 'الموردون',
    'submenu.systemPreferences': 'تفضيلات النظام',
    'submenu.subscription': 'الاشتراك',
    'prefs.headerTitle': 'تفضيلات النظام',
    'prefs.headerSubtitle': 'إعدادات المؤسسة لنظام نقاط البيع',
    'prefs.connected': 'متصل',
    'prefs.saveChanges': 'حفظ التغييرات',
    'prefs.toastSaved': 'تم حفظ التغييرات',
    'prefs.tab.general': 'عام',
    'prefs.tab.sales': 'المبيعات',
    'prefs.tab.inventory': 'المخزون',
    'prefs.tab.notifications': 'الإشعارات',
    'prefs.tab.localization': 'اللغة',
    'prefs.tab.appearance': 'المظهر',
    'prefs.tab.security': 'الأمان'
  }
};

const I18nContext = createContext({ language: 'en', t: (k) => k });

const resolveLanguage = () => {
  return 'en';
};

const applyDocumentLanguage = (lang) => {
  try {
    const normalized = normalizeLang(lang);
    document.documentElement.lang = normalized;
    const dir = rtlLangs.has(normalized.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
  } catch {}
};

const swWordMap = {
  dashboard: 'dashibodi',
  plans: 'mipango',
  plan: 'mpango',
  sales: 'mauzo',
  sale: 'mauzo',
  purchases: 'manunuzi',
  purchase: 'ununzi',
  expenses: 'gharama',
  expense: 'gharama',
  reports: 'ripoti',
  report: 'ripoti',
  profit: 'faida',
  loss: 'hasara',
  and: 'na',
  the: '',
  to: 'kwa',
  for: 'kwa',
  with: 'na',
  by: 'kwa',
  on: 'kwenye',
  in: 'kwenye',
  of: 'ya',
  all: 'zote',
  settings: 'mipangilio',
  system: 'mfumo',
  preferences: 'mapendeleo',
  save: 'hifadhi',
  changes: 'mabadiliko',
  change: 'badilisha',
  language: 'lugha',
  close: 'funga',
  cancel: 'ghairi',
  confirm: 'thibitisha',
  delete: 'futa',
  edit: 'hariri',
  add: 'ongeza',
  remove: 'ondoa',
  search: 'tafuta',
  from: 'kuanzia',
  date: 'tarehe',
  time: 'muda',
  customer: 'mteja',
  customers: 'wateja',
  supplier: 'msambazaji',
  suppliers: 'wasambazaji',
  staff: 'wafanyakazi',
  store: 'ghala',
  inventory: 'stoo',
  stock: 'stoo',
  movement: 'mwendo',
  opening: 'mwanzo',
  balance: 'salio',
  remaining: 'iliyobaki',
  quantity: 'kiasi',
  qty: 'kiasi',
  unit: 'kipimo',
  price: 'bei',
  amount: 'kiasi',
  total: 'jumla',
  invoice: 'ankara',
  receipt: 'risiti',
  print: 'chapisha',
  email: 'barua pepe',
  whatsapp: 'whatsapp',
  notifications: 'arifa',
  alerts: 'arifa',
  history: 'historia',
  products: 'bidhaa',
  product: 'bidhaa',
  category: 'kundi',
  enable: 'wezesha',
  disable: 'zima',
  yes: 'ndiyo',
  no: 'hapana'
};

const swEnglishSignal = new Set([
  'the',
  'and',
  'to',
  'for',
  'with',
  'by',
  'in',
  'on',
  'of',
  'sales',
  'purchases',
  'purchase',
  'expenses',
  'expense',
  'reports',
  'report',
  'settings',
  'system',
  'preferences',
  'invoice',
  'receipt',
  'stock',
  'movement',
  'balance',
  'opening'
]);

const translateToSw = (text) => {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  let hasSignal = false;
  for (const w of swEnglishSignal) {
    if (lower.includes(w)) {
      hasSignal = true;
      break;
    }
  }
  if (!hasSignal) return raw;
  const parts = raw.split(/(\s+|[.,:;!?()/\\[\]{}"“”'’\-—–])/g);
  const out = parts.map((p) => {
    if (!p) return p;
    if (!/^[A-Za-z]+$/.test(p)) return p;
    const key = p.toLowerCase();
    const mapped = swWordMap[key];
    if (mapped !== undefined) {
      if (!mapped) return '';
      const isAllCaps = p === p.toUpperCase();
      const isTitle = p[0] === p[0].toUpperCase() && p.slice(1) === p.slice(1).toLowerCase();
      if (isAllCaps) return mapped.toUpperCase();
      if (isTitle) return mapped[0].toUpperCase() + mapped.slice(1);
      return mapped;
    }
    const isProper = p[0] === p[0].toUpperCase() && p.slice(1) === p.slice(1).toLowerCase();
    if (isProper) return p;
    return '';
  });
  return out.join('').replace(/\s{2,}/g, ' ').trim();
};

const installSwDomTranslator = () => {
  const shouldSkipElement = (el) => {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest && el.closest('[data-i18n-skip="true"]')) return true;
    if (el.closest && el.closest('pre, code, script, style')) return true;
    if (el.closest && el.closest('td')) return true;
    if (el.isContentEditable) return true;
    const tag = String(el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    return false;
  };
  const translateTextNodes = (root) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (parent && !shouldSkipElement(parent)) {
        const v = String(node.nodeValue || '');
        if (/[A-Za-z]/.test(v)) {
          const next = translateToSw(v);
          if (next && next !== v) node.nodeValue = next;
        }
      }
      node = walker.nextNode();
    }
  };
  const translatePlaceholders = () => {
    const els = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    els.forEach((el) => {
      if (shouldSkipElement(el)) return;
      const ph = String(el.getAttribute('placeholder') || '');
      if (!/[A-Za-z]/.test(ph)) return;
      const next = translateToSw(ph);
      if (next && next !== ph) el.setAttribute('placeholder', next);
    });
  };
  translateTextNodes(document.body);
  translatePlaceholders();
  const obs = new MutationObserver((mutations) => {
    let needsPlaceholders = false;
    mutations.forEach((m) => {
      if (m.type === 'characterData') {
        const parent = m.target?.parentElement;
        if (parent && !shouldSkipElement(parent)) {
          const v = String(m.target.nodeValue || '');
          if (/[A-Za-z]/.test(v)) {
            const next = translateToSw(v);
            if (next && next !== v) m.target.nodeValue = next;
          }
        }
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 3) {
            const parent = n.parentElement;
            if (parent && !shouldSkipElement(parent)) {
              const v = String(n.nodeValue || '');
              if (/[A-Za-z]/.test(v)) {
                const next = translateToSw(v);
                if (next && next !== v) n.nodeValue = next;
              }
            }
          } else if (n.nodeType === 1) {
            translateTextNodes(n);
            needsPlaceholders = true;
          }
        });
      }
    });
    if (needsPlaceholders) translatePlaceholders();
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });
  return () => obs.disconnect();
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => resolveLanguage());

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  useEffect(() => {
    const base = normalizeLang(language).split('-')[0].toLowerCase();
    if (base !== 'sw') return;
    const cleanup = installSwDomTranslator();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [language]);

  useEffect(() => {
    const sync = () => {
      Promise.resolve()
        .then(async () => {
          const user = getCurrentUser();
          const businessId = getBusinessIdForUser(user);
          const prefs = localGet(`systemPreferences:${businessId || 'default'}`, null);
          const next = normalizeLang(prefs?.localization?.language || 'en');
          setLanguage(next);
        })
        .catch(() => {});
    };
    const onTempLanguage = (e) => {
      const next = normalizeLang(e?.detail?.language);
      setLanguage(next);
    };
    window.addEventListener('systemPreferencesUpdated', sync);
    window.addEventListener('languageChanged', onTempLanguage);
    sync();
    return () => {
      window.removeEventListener('systemPreferencesUpdated', sync);
      window.removeEventListener('languageChanged', onTempLanguage);
    };
  }, []);

  const t = useCallback(
    (key) => {
      const lang = normalizeLang(language);
      const base = lang.split('-')[0].toLowerCase();
      const dict = translations[lang] || translations[base] || translations.en;
      return String(dict?.[key] || translations.en?.[key] || key);
    },
    [language]
  );

  const value = useMemo(() => ({ language, t }), [language, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

export const getActiveLocale = () => {
  const lang = (() => {
    try {
      const v = String(document?.documentElement?.lang || '').trim();
      if (v) return v;
    } catch {}
    return resolveLanguage();
  })();
  const base = lang.split('-')[0].toLowerCase();
  if (base === 'sw') return 'sw-TZ';
  if (base === 'en') return 'en-GB';
  return lang;
};
