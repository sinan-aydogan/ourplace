import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en/translation.json';
import tr from '@/locales/tr/translation.json';

const LANGUAGE_KEY = '@cockpit:language';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: en }, // TODO: Add German translations
  fr: { translation: en }, // TODO: Add French translations
  bg: { translation: en }, // TODO: Add Bulgarian translations
  it: { translation: en }, // TODO: Add Italian translations
};

const supportedLanguages = ['en', 'tr', 'de', 'fr', 'bg', 'it'];

const getDeviceLanguage = (): string => {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode || 'en';
  
  // Check if device language is supported
  if (supportedLanguages.includes(languageCode)) {
    return languageCode;
  }
  
  return 'en'; // Default to English
};

const getSavedLanguage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    console.error('Failed to get saved language:', error);
    return null;
  }
};

const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Failed to save language:', error);
  }
};

export const initializeI18n = async (): Promise<void> => {
  const savedLanguage = await getSavedLanguage();
  const deviceLanguage = getDeviceLanguage();
  const initialLanguage = savedLanguage || deviceLanguage;

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
    });
};

export const changeLanguage = async (language: string): Promise<void> => {
  if (!supportedLanguages.includes(language)) {
    console.warn(`Language ${language} is not supported`);
    return;
  }

  await i18n.changeLanguage(language);
  await saveLanguage(language);
};

export const getCurrentLanguage = (): string => {
  return i18n.language;
};

export const getSupportedLanguages = () => supportedLanguages;

export default i18n;
