import { useTranslations } from 'next-intl';
import type { TranslationKeys } from '@/types/translations';

export function useAppTranslation() {
  const t = useTranslations();
  
  const translate = (
    key: TranslationKeys,
    params?: Record<string, string | number>
  ): string => {
    try {
      return t(key, params);
    } catch (error) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  };

  return { t: translate };
} 