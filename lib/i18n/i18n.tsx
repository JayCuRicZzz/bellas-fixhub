'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import th from './th.json';
import en from './en.json';
import km from './km.json';
import my from './my.json';

type Lang = 'th' | 'en' | 'km' | 'my';
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
  { code: 'km', label: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'my', label: 'မြန်မာ', flag: '🇲🇲' },
];

const translations: Record<Lang, Translation> = { th, en, km, my };

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
    if (saved && ['th', 'en', 'km', 'my'].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  }, []);

  const toggleLang = useCallback(() => {
    const order: Lang[] = ['th', 'en', 'km', 'my'];
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
    PENDING: { th: 'รอดำเนินการ', en: 'Pending', km: 'កំពុងរង់ចាំ', my: 'စောင့်ဆိုင်းဆဲ' },
    IN_PROGRESS: { th: 'กำลังดำเนินการ', en: 'In Progress', km: 'កំពុងដំណើរការ', my: 'လုပ်ဆောင်ဆဲ' },
    RESOLVED: { th: 'เสร็จสิ้น', en: 'Resolved', km: 'បានដោះស្រាយ', my: 'ပြီးစီး' },
    APPROVED: { th: 'อนุมัติแล้ว', en: 'Approved', km: 'បានយល់ព្រម', my: 'အတည်ပြုပြီး' },
    REJECTED: { th: 'ถูกตีกลับ', en: 'Rejected', km: 'បានបដិសេធ', my: 'ငြင်းပယ်' },
    FLAGGED: { th: 'แจ้งไม่เรียบร้อย', en: 'Flagged', km: 'បានដាក់ស្លាក', my: 'အလံတင်' },
    CANCELLED: { th: 'ยกเลิก', en: 'Cancelled', km: 'បោះបង់', my: 'ပယ်ဖျက်' },
    PAUSED: { th: 'พักงาน', en: 'Paused', km: 'ផ្អាក', my: 'ခေတ္တရပ်' },
  };
  return statusMap[status]?.[lang] || status;
}

export function tBranch(code: string, lang: Lang): string {
  const branchMap: Record<string, Record<Lang, string>> = {
    BV: { th: 'บูทีค วิคตอรี่', en: 'Boutique Victory', km: 'Boutique Victory', my: 'Boutique Victory' },
    BP: { th: 'บูทีค พัทยา', en: 'Boutique Pattaya', km: 'Boutique Pattaya', my: 'Boutique Pattaya' },
    BC: { th: 'บูทีค เชียงใหม่', en: 'Boutique Chiang Mai', km: 'Boutique Chiang Mai', my: 'Boutique Chiang Mai' },
    BE: { th: 'บูทีค เอเชียทีค', en: 'Boutique Asiatique', km: 'Boutique Asiatique', my: 'Boutique Asiatique' },
    BM: { th: 'บูทีค ภูเก็ต', en: 'Boutique Phuket', km: 'Boutique Phuket', my: 'Boutique Phuket' },
    BB: { th: 'บูทีค บางนา', en: 'Boutique Bangna', km: 'Boutique Bangna', my: 'Boutique Bangna' },
    GB: { th: 'แกรนด์ บูทีค', en: 'Grand Boutique', km: 'Grand Boutique', my: 'Grand Boutique' },
  };
  return branchMap[code]?.[lang] || code;
}
