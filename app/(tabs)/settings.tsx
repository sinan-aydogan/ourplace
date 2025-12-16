import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from '@/components/ui/select';
import { ChevronDownIcon } from '@/components/ui/icon';
import { useApp } from '@/contexts/AppContext';
import { db } from '@/services/database';
import { changeLanguage, getCurrentLanguage, getSupportedLanguages } from '@/services/i18n';
import type { Currency } from '@/types/database';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useApp();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(getCurrentLanguage());
  const supportedLanguages = getSupportedLanguages();

  useEffect(() => {
    loadCurrencies();
    setSelectedLanguage(getCurrentLanguage());
  }, []);

  useEffect(() => {
    if (user) {
      setSelectedCurrency(user.default_currency || 'TRY');
    }
  }, [user]);

  const loadCurrencies = async () => {
    try {
      const currencyList = await db.getCurrencies();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!user) return;
    
    try {
      await db.updateUser(user.id, { default_currency: newCurrency });
      setSelectedCurrency(newCurrency);
      await refreshUser();
      Alert.alert(t('common.success'), t('settings.currencyUpdated'));
    } catch (error) {
      console.error('Failed to update currency:', error);
      Alert.alert(t('common.error'), 'Failed to update currency');
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await changeLanguage(newLanguage);
      setSelectedLanguage(newLanguage);
      Alert.alert(t('common.success'), t('settings.languageUpdated'));
    } catch (error) {
      console.error('Failed to change language:', error);
      Alert.alert(t('common.error'), 'Failed to change language');
    }
  };

  // Her dilin kendi dilindeki adı (native name)
  const languageNativeNames: Record<string, string> = {
    en: 'English',
    tr: 'Türkçe',
    de: 'Deutsch',
    es: 'Español',
    fr: 'Français',
    pt: 'Português',
    zh: '中文',
    it: 'Italiano',
  };

  // Bayrak emojileri
  const languageFlags: Record<string, string> = {
    en: '🇬🇧',
    tr: '🇹🇷',
    de: '🇩🇪',
    es: '🇪🇸',
    fr: '🇫🇷',
    pt: '🇵🇹',
    zh: '🇨🇳',
    it: '🇮🇹',
  };

  const getLanguageName = (code: string): string => {
    return languageNativeNames[code] || code.toUpperCase();
  };

  const getLanguageFlag = (code: string): string => {
    return languageFlags[code] || '';
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-50" style={{ marginBottom: -25 }}>
        <ScrollView>
          <VStack className="p-4" space="lg">
            <Heading size="2xl" className="font-bold">{t('settings.title')}</Heading>
            
            {/* Language Settings */}
            <Card className="p-5 shadow-md">
              <VStack space="md">
                <VStack space="xs">
                  <Text className="text-sm text-typography-500 uppercase font-semibold">
                    {t('settings.language')}
                  </Text>
                  <Text className="text-xs text-typography-400">
                    {t('settings.languageDescription')}
                  </Text>
                </VStack>
                
                <Select
                  selectedValue={selectedLanguage}
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger variant="outline" className="border-2 border-background-200 rounded-xl">
                    <SelectInput 
                      placeholder={t('settings.language')}
                      value={`${getLanguageFlag(selectedLanguage)} ${getLanguageName(selectedLanguage)}`}
                    />
                    <SelectIcon className="mr-3" as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      {supportedLanguages.map((lang) => (
                        <SelectItem
                          key={lang}
                          label={`${getLanguageFlag(lang)} ${getLanguageName(lang)}`}
                          value={lang}
                        />
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </VStack>
            </Card>
            
            {/* Currency Settings */}
            <Card className="p-5 shadow-md">
              <VStack space="md">
                <VStack space="xs">
                  <Text className="text-sm text-typography-500 uppercase font-semibold">
                    {t('settings.defaultCurrency')}
                  </Text>
                  <Text className="text-xs text-typography-400">
                    Default currency for transactions and reports
                  </Text>
                </VStack>
                
                <Select
                  selectedValue={selectedCurrency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger variant="outline" className="border-2 border-background-200 rounded-xl">
                    <SelectInput placeholder={t('settings.defaultCurrency')} />
                    <SelectIcon className="mr-3" as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      {currencies.map((currency) => (
                        <SelectItem
                          key={currency.code}
                          label={currency.code}
                          value={currency.code}
                        />
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </VStack>
            </Card>
          </VStack>
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}
