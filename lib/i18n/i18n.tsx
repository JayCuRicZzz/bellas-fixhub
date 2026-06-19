'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import th from './th.json';
import en from './en.json';

type Lang = 'th' | 'en';
type Translation = typeof th;

interface I18nContextType {
  lang: Lang;
  t: Translation;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const translations: Record<Lang, Translation> = { th, en };

const I18nContext = createContext<I18nContextType>({
  lang: 'th',
  t: th,
  setLang: () => {},
  toggleLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('th');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang;
    if (saved === 'en') setLangState('en');
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'th' ? 'en' : 'th');
  }, [lang, setLang]);

  return (
    <I18nContext.Provider value={{ lang, t: translations[lang], setLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

export function tStatus(status: string, lang: Lang): string {
  const statusMap: Record<string, Record<Lang, string>> = {
    PENDING: { th: 'รอดำเนินการ', en: 'Pending' },
    IN_PROGRESS: { th: 'กำลังดำเนินการ', en: 'In Progress' },
    RESOLVED: { th: 'เสร็จสิ้น', en: 'Resolved' },
    APPROVED: { th: 'อนุมัติแล้ว', en: 'Approved' },
    REJECTED: { th: 'ถูกตีกลับ', en: 'Rejected' },
    FLAGGED: { th: 'แจ้งไม่เรียบร้อย', en: 'Flagged' },
    CANCELLED: { th: 'ยกเลิก', en: 'Cancelled' },
  };
  return statusMap[status]?.[lang] || status;
}

export function tBranch(code: string, lang: Lang): string {
  const branchMap: Record<string, Record<Lang, string>> = {
    BV: { th: 'บูทีค วิคตอรี่', en: 'Boutique Victory' },
    BP: { th: 'บูทีค พัทยา', en: 'Boutique Pattaya' },
    BC: { th: 'บูทีค เชียงใหม่', en: 'Boutique Chiang Mai' },
    BE: { th: 'บูทีค เอเชียทีค', en: 'Boutique Asiatique' },
    BM: { th: 'บูทีค ภูเก็ต', en: 'Boutique Phuket' },
    BB: { th: 'บูทีค บางนา', en: 'Boutique Bangna' },
    GB: { th: 'แกรนด์ บูทีค', en: 'Grand Boutique' },
  };
  return branchMap[code]?.[lang] || code;
}
