import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en/translation.json';
import tr from '@/locales/tr/translation.json';
import de from '@/locales/de/translation.json';
import es from '@/locales/es/translation.json';
import fr from '@/locales/fr/translation.json';
import pt from '@/locales/pt/translation.json';
import zh from '@/locales/zh/translation.json';
import it from '@/locales/it/translation.json';

const LANGUAGE_KEY = '@cockpit:language';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  zh: { translation: zh },
  it: { translation: it },
};

const supportedLanguages = ['en', 'tr', 'de', 'es', 'fr', 'pt', 'zh', 'it'];

const getDeviceLanguage = (): string => {
  try {
    const locale = Localization.getLocales()[0];
    const languageCode = locale?.languageCode || 'en';
    
    // Check if device language is supported
    if (supportedLanguages.includes(languageCode)) {
      return languageCode;
    }
    
    // Default to English if device language is not supported
    return 'en';
  } catch (error) {
    console.error('Failed to get device language:', error);
    return 'en'; // Default to English if detection fails
  }
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
  try {
    const savedLanguage = await getSavedLanguage();
    const deviceLanguage = getDeviceLanguage();
    // Use saved language if exists, otherwise use device language, fallback to English
    const initialLanguage = savedLanguage || deviceLanguage || 'en';

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
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Fallback initialization with English
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        compatibilityJSON: 'v4',
        interpolation: {
          escapeValue: false,
        },
      });
  }
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
