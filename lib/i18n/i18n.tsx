'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import th from './th.json';
import en from './en.json';
import de from './de.json';
import my from './my.json';

type Lang = 'th' | 'en' | 'de' | 'my';
type Translation = typeof th;

interface I18nContextType {
  lang: Lang;
  t: Translation;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'my', label: 'မြန်မာ', flag: '🇲🇲' },
];

const translations: Record<Lang, Translation> = { th, en, de, my };

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
    if (saved && ['th', 'en', 'de', 'my'].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  }, []);

  const toggleLang = useCallback(() => {
    const order: Lang[] = ['th', 'en', 'de', 'my'];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
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
    PENDING: { th: 'รอดำเนินการ', en: 'Pending', de: 'Ausstehend', my: 'စောင့်ဆိုင်းဆဲ' },
    IN_PROGRESS: { th: 'กำลังดำเนินการ', en: 'In Progress', de: 'In Bearbeitung', my: 'လုပ်ဆောင်ဆဲ' },
    RESOLVED: { th: 'เสร็จสิ้น', en: 'Resolved', de: 'Erledigt', my: 'ပြီးစီး' },
    APPROVED: { th: 'อนุมัติแล้ว', en: 'Approved', de: 'Genehmigt', my: 'အတည်ပြုပြီး' },
    REJECTED: { th: 'ถูกตีกลับ', en: 'Rejected', de: 'Abgelehnt', my: 'ငြင်းပယ်' },
    FLAGGED: { th: 'แจ้งไม่เรียบร้อย', en: 'Flagged', de: 'Markiert', my: 'အလံတင်' },
    CANCELLED: { th: 'ยกเลิก', en: 'Cancelled', de: 'Storniert', my: 'ပယ်ဖျက်' },
    PAUSED: { th: 'พักงาน', en: 'Paused', de: 'Pausiert', my: 'ခေတ္တရပ်' },
  };
  return statusMap[status]?.[lang] || status;
}

export function tBranch(code: string, lang: Lang): string {
  const branchMap: Record<string, Record<Lang, string>> = {
    BV: { th: 'บูทีค วิคตอรี่', en: 'Boutique Victory', de: 'Boutique Victory', my: 'Boutique Victory' },
    BP: { th: 'บูทีค พัทยา', en: 'Boutique Pattaya', de: 'Boutique Pattaya', my: 'Boutique Pattaya' },
    BC: { th: 'บูทีค เชียงใหม่', en: 'Boutique Chiang Mai', de: 'Boutique Chiang Mai', my: 'Boutique Chiang Mai' },
    BE: { th: 'บูทีค เอเชียทีค', en: 'Boutique Asiatique', de: 'Boutique Asiatique', my: 'Boutique Asiatique' },
    BM: { th: 'บูทีค ภูเก็ต', en: 'Boutique Phuket', de: 'Boutique Phuket', my: 'Boutique Phuket' },
    BB: { th: 'บูทีค บางนา', en: 'Boutique Bangna', de: 'Boutique Bangna', my: 'Boutique Bangna' },
    GB: { th: 'แกรนด์ บูทีค', en: 'Grand Boutique', de: 'Grand Boutique', my: 'Grand Boutique' },
  };
  return branchMap[code]?.[lang] || code;
}
