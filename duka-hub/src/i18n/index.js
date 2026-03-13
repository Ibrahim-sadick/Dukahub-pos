import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const readJson = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const getCurrentUser = () => {
  try {
    const local = readJson(localStorage.getItem('currentUser') || 'null', null);
    if (local) return local;
  } catch {}
  try {
    const session = readJson(sessionStorage.getItem('currentUser') || 'null', null);
    if (session) return session;
  } catch {}
  return null;
};

const getBusinessIdForUser = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'staff') return String(user?.businessId || '');
  return String(user?.id || '');
};

const getSystemPreferences = (businessId) => {
  const key = `systemPreferences:${businessId || 'default'}`;
  return readJson(localStorage.getItem(key) || 'null', null);
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
    'submenu.returnsRefunds': 'Returns & Refunds',
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
    'prefs.tab.security': 'Security'
  },
  sw: {
    'nav.dashboard': 'Dashibodi',
    'nav.plans': 'Mipango',
    'nav.sales': 'Mauzo',
    'nav.stocks': 'Bidhaa & Ghala',
    'nav.purchases': 'Manunuzi',
    'nav.expenses': 'Gharama',
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
    'submenu.returnsRefunds': 'Marejesho & Rejesho la Pesa',
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
    'prefs.tab.security': 'Usalama'
  },
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.plans': 'Abonnements',
    'nav.sales': 'Ventes',
    'nav.stocks': 'Produits & Stock',
    'nav.purchases': 'Achats',
    'nav.expenses': 'Dépenses',
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
    'submenu.returnsRefunds': 'Retours & Remboursements',
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
    'submenu.returnsRefunds': 'الإرجاع والاسترداد',
    'submenu.products': 'المنتجات',
    'submenu.store': 'المخزن',
    'submenu.stockValuations': 'تقييم المخزون',
    'submenu.purchaseOrder': 'طلب شراء',
    'submenu.purchaseHistory': 'سجل المشتريات',
    'submenu.suppliers': 'الموردون',
    'submenu.systemPreferences': 'تفضيلات النظام',
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
  const user = getCurrentUser();
  const businessId = getBusinessIdForUser(user);
  const prefs = getSystemPreferences(businessId);
  return normalizeLang(prefs?.localization?.language || 'en');
};

const applyDocumentLanguage = (lang) => {
  try {
    const normalized = normalizeLang(lang);
    document.documentElement.lang = normalized;
    const dir = rtlLangs.has(normalized.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
  } catch {}
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => resolveLanguage());

  useEffect(() => {
    applyDocumentLanguage(language);
  }, [language]);

  useEffect(() => {
    const sync = () => setLanguage(resolveLanguage());
    const onTempLanguage = (e) => {
      const next = normalizeLang(e?.detail?.language);
      setLanguage(next);
    };
    window.addEventListener('storage', sync);
    window.addEventListener('systemPreferencesUpdated', sync);
    window.addEventListener('languageChanged', onTempLanguage);
    return () => {
      window.removeEventListener('storage', sync);
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
