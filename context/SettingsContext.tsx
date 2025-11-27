import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

type Language = 'en' | 'ar';
type Currency = 'SAR' | 'AED' | 'QAR' | 'USD' | 'GBP' | 'EUR';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  t: (key: keyof typeof translations['en']) => string;
  formatCurrency: (amount: number) => string;
  direction: 'ltr' | 'rtl';
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Mock exchange rates relative to SAR (Base)
const EXCHANGE_RATES: Record<Currency, number> = {
  SAR: 1,
  AED: 0.98,
  QAR: 0.97,
  USD: 0.266,
  GBP: 0.21,
  EUR: 0.25,
};

export const SettingsProvider = ({ children }: { children?: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('rentalpro_language') as Language) || 'en';
  });
  
  const [currency, setCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('rentalpro_currency') as Currency) || 'SAR';
  });

  useEffect(() => {
    localStorage.setItem('rentalpro_language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem('rentalpro_currency', currency);
  }, [currency]);

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  const formatCurrency = (amount: number) => {
    const rate = EXCHANGE_RATES[currency];
    const convertedAmount = amount * rate;
    
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(convertedAmount);
  };

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <SettingsContext.Provider value={{ language, setLanguage, currency, setCurrency, t, formatCurrency, direction }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};