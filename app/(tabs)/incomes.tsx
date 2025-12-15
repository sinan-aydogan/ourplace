import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
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
  SelectScrollView
} from '@/components/ui/select';
import { Icon, ChevronDownIcon } from '@/components/ui/icon';
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '@/components/ui/checkbox';
import { CheckIcon, MoreVertical } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { db } from '@/services/database';
import { AddSourceModal } from '@/components/AddSourceModal';
import type { TransactionWithDetails, IncomeType, Customer, Currency } from '@/types/database';

export default function IncomesPage() {
  const { t } = useTranslation();
  const { selectedVehicle, user } = useApp();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [selectedIncomeType, setSelectedIncomeType] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [incomes, setIncomes] = useState<TransactionWithDetails[]>([]);
  const [allIncomes, setAllIncomes] = useState<TransactionWithDetails[]>([]); // Unfiltered incomes
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Helper: Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    if (dateFilter === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (dateFilter === 'monthly') {
      start.setDate(1); // First day of current month
    } else if (dateFilter === 'yearly') {
      start.setMonth(0, 1); // Jan 1st
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }

    return { start, end };
  };

  // Helper: Get last month's date range
  const getLastMonthRange = () => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: lastMonthStart, end: lastMonthEnd };
  };

  // Helper: Calculate summary statistics
  const calculateSummary = () => {
    const { start, end } = getDateRange();
    const lastMonth = getLastMonthRange();

    // Current period total
    const currentTotal = allIncomes
      .filter(i => {
        const date = new Date(i.transaction_date);
        return date >= start && date <= end;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    // Last month total
    const lastMonthTotal = allIncomes
      .filter(i => {
        const date = new Date(i.transaction_date);
        return date >= lastMonth.start && date <= lastMonth.end;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      currentTotal,
      lastMonthTotal,
      dateRange: { start, end },
      currency: user?.default_currency || 'TRY'
    };
  };

  // Apply filters to incomes
  const applyFilters = () => {
    const { start, end } = getDateRange();
    
    let filtered = allIncomes.filter(i => {
      const date = new Date(i.transaction_date);
      const inDateRange = date >= start && date <= end;
      
      // Category filter
      const categoryCheck = selectedCategories.length === 0 || 
                           (i.income_type_id !== null && selectedCategories.includes(i.income_type_id));
      
      return inDateRange && categoryCheck;
    });
    
    setIncomes(filtered);
  };

  // Computed default currency to handle undefined
  const defaultCurrency = user?.default_currency || 'TRY';

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (user) {
      setSelectedCurrency(defaultCurrency);
    }
  }, [user, defaultCurrency]);

  useEffect(() => {
    loadIncomeTypes();
    loadCustomers();
    if (selectedVehicle) {
      loadIncomes();
    }
  }, [selectedVehicle]);

  // Apply filters whenever filter options change
  useEffect(() => {
    applyFilters();
  }, [dateFilter, customStartDate, customEndDate, selectedCategories, allIncomes]);

  const loadCurrencies = async () => {
    try {
      const currencyList = await db.getCurrencies();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const loadIncomeTypes = async () => {
    try {
      const types = await db.getIncomeTypes(user?.id);
      setIncomeTypes(types);
      if (types.length > 0 && !selectedIncomeType) {
        setSelectedIncomeType(types[0].id);
      }
    } catch (error) {
      console.error('Failed to load income types:', error);
    }
  };

  const loadCustomers = async () => {
    if (!user) return;
    try {
      const custs = await db.getCustomers(user.id);
      setCustomers(custs);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadIncomes = async (loadMore = false) => {
    if (!selectedVehicle) return;
    
    try {
      const offset = loadMore ? allIncomes.length : 0;
      const allTransactions = await db.getVehicleTransactions(
        selectedVehicle.id,
        100, // Load more transactions for filtering
        offset
      );
      
      // Filter only incomes
      const incomeTransactions = allTransactions.filter(
        t => t.transaction_type === 'income'
      );
      
      if (loadMore) {
        setAllIncomes([...allIncomes, ...incomeTransactions]);
      } else {
        setAllIncomes(incomeTransactions);
      }
      
      setShowMore(incomeTransactions.length === 100);
    } catch (error) {
      console.error('Failed to load incomes:', error);
    }
  };

  const handleAddIncome = async () => {
    if (!selectedVehicle || !user || !amount || !selectedIncomeType) return;
    
    // Use user's default currency if none selected
    const currencyToUse = selectedCurrency || defaultCurrency;
    
    // Check if exchange rate is required but not provided
    const isForeignCurrency = currencyToUse !== defaultCurrency;
    if (isForeignCurrency && !exchangeRate) {
      alert(t('validation.required') + ': ' + t('transactions.exchangeRate'));
      return;
    }
    
    // Validate odometer readings
    if (startOdometer && endOdometer) {
      const start = parseInt(startOdometer);
      const end = parseInt(endOdometer);
      
      // End odometer must be greater than start odometer
      if (end <= start) {
        alert(t('validation.endOdometerMustBeGreater'));
        return;
      }
      
      // Check against last income's end odometer
      const lastIncome = await db.getLastIncomeTransaction(selectedVehicle.id);
      if (lastIncome && lastIncome.end_odometer) {
        if (start <= lastIncome.end_odometer) {
          alert(t('validation.startOdometerMustBeGreater', { lastKm: lastIncome.end_odometer }));
          return;
        }
      }
    }
    
    try {
      setLoading(true);

      // Create transaction
      const transaction = await db.createTransaction({
        vehicle_id: selectedVehicle.id,
        transaction_type: 'income',
        amount: parseFloat(amount),
        currency: currencyToUse,
        default_currency: user.default_currency,
        foreign_currency: isForeignCurrency ? currencyToUse : null,
        exchange_rate: isForeignCurrency ? parseFloat(exchangeRate) : null,
        income_type_id: selectedIncomeType,
        customer_id: selectedCustomer,
        description: description || null,
        transaction_date: new Date().toISOString(),
      });

      // Create income record
      await db.createIncome({
        transaction_id: transaction.id,
        income_type_id: selectedIncomeType,
        start_odometer: startOdometer ? parseInt(startOdometer) : null,
        end_odometer: endOdometer ? parseInt(endOdometer) : null,
        notes: description || null,
      });

      // Reset form
      setAmount('');
      setDescription('');
      setStartOdometer('');
      setEndOdometer('');
      setExchangeRate('');
      setSelectedCurrency(user.default_currency);
      setSelectedCustomer(null);
      
      // Reload incomes
      await loadIncomes();
    } catch (error) {
      console.error('Failed to add income:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncomes();
    setRefreshing(false);
  };

  if (!selectedVehicle) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Box className="flex-1 bg-background-0 justify-center items-center p-6">
          <Text className="text-center text-typography-500">
            {t('vehicles.noVehicles')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!selectedVehicle.is_income_generating) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Box className="flex-1 bg-background-0 justify-center items-center p-6">
          <Text className="text-center text-typography-500">
            This vehicle is not set as income-generating.
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-50">
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <VStack className="p-4" space="lg">
            {/* Modern Header */}
            <HStack space="md" alignItems="center" className="px-1">
              <Text className="text-3xl">💰</Text>
              <VStack space="xs" className="flex-1">
                <Heading size="2xl" className="font-bold" numberOfLines={1}>{t('incomes.title')}</Heading>
                <Text className="text-typography-500" numberOfLines={1}>Track your vehicle income</Text>
              </VStack>
            </HStack>

            {/* Monthly Summary Card */}
            <Card className="p-5 shadow-md bg-white dark:bg-background-900">
              <VStack space="sm">
                <Text className="text-sm text-typography-500">
                  {calculateSummary().dateRange.start.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' - '}
                  {calculateSummary().dateRange.end.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
                <Text className="text-3xl font-bold text-success-600">
                  {calculateSummary().currentTotal.toFixed(2)} {calculateSummary().currency}
                </Text>
                <Text className="text-sm text-typography-400">
                  {t('incomes.lastMonth')}: {calculateSummary().lastMonthTotal.toFixed(2)} {calculateSummary().currency}
                </Text>
              </VStack>
            </Card>

            {/* Quick Income Form with modern styling */}
            <Card className="p-5 shadow-lg bg-white dark:bg-background-900">
              <VStack space="lg">
                <Heading size="md" className="font-semibold">{t('incomes.addIncome')}</Heading>
                
                {/* Income Type */}
                <VStack space="xs">
                  <Text className="font-semibold text-sm text-typography-700">{t('incomes.incomeType')} *</Text>
                  <Select
                    selectedValue={selectedIncomeType?.toString() || ''}
                    onValueChange={(value) => setSelectedIncomeType(parseInt(value))}
                  >
                    <SelectTrigger className="border-2 border-background-200 rounded-xl">
                      <SelectInput 
                        placeholder={t('incomes.incomeType')}
                        value={incomeTypes.find(t => t.id === selectedIncomeType)?.name}
                        className="text-base"
                      />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectBackdrop />
                      <SelectContent className="max-h-[60vh]">
                        <SelectDragIndicatorWrapper>
                          <SelectDragIndicator />
                        </SelectDragIndicatorWrapper>
                        <SelectScrollView>
                          {incomeTypes.map((type) => (
                            <SelectItem
                              key={type.id}
                              label={type.name}
                              value={type.id.toString()}
                            />
                          ))}
                        </SelectScrollView>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </VStack>

                {/* Customer Selection */}
                <HStack space="sm">
                  <VStack space="xs" className="flex-1">
                    <Text className="font-semibold text-sm text-typography-700">{t('incomes.customer')}</Text>
                    <Select
                      selectedValue={selectedCustomer?.toString() || ''}
                      onValueChange={(value) => setSelectedCustomer(parseInt(value))}
                    >
                      <SelectTrigger className="border-2 border-background-200 rounded-xl">
                        <SelectInput 
                          placeholder={t('incomes.selectCustomer')}
                          value={customers.find(c => c.id === selectedCustomer)?.name}
                          className="text-base"
                        />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectBackdrop />
                        <SelectContent className="max-h-[60vh]">
                          <SelectDragIndicatorWrapper>
                            <SelectDragIndicator />
                          </SelectDragIndicatorWrapper>
                          <SelectScrollView>
                            {customers.map((customer) => (
                              <SelectItem
                                key={customer.id}
                                label={customer.name}
                                value={customer.id.toString()}
                              />
                            ))}
                          </SelectScrollView>
                        </SelectContent>
                      </SelectPortal>
                    </Select>
                  </VStack>
                  <Button
                    size="md"
                    variant="outline"
                    onPress={() => setShowCustomerModal(true)}
                    className="mt-5 w-12 h-12 rounded-xl"
                  >
                    <ButtonText className="text-xl">+</ButtonText>
                  </Button>
                </HStack>

                {/* Start & End Odometer */}
                <HStack space="sm">
                  <VStack space="xs" className="flex-1">
                    <Text className="font-semibold text-sm text-typography-700">{t('transactions.startOdometer')}</Text>
                    <Input variant="outline" className="border-2 border-background-200 rounded-xl">
                      <InputField
                        placeholder="0"
                        value={startOdometer}
                        onChangeText={setStartOdometer}
                        keyboardType="numeric"
                        className="text-base"
                      />
                    </Input>
                  </VStack>
                  <VStack space="xs" className="flex-1">
                    <Text className="font-semibold text-sm text-typography-700">{t('transactions.endOdometer')}</Text>
                    <Input variant="outline" className="border-2 border-background-200 rounded-xl">
                      <InputField
                        placeholder="0"
                        value={endOdometer}
                        onChangeText={setEndOdometer}
                        keyboardType="numeric"
                        className="text-base"
                      />
                    </Input>
                  </VStack>
                </HStack>

                <Input variant="outline" className="border-2 border-background-200 rounded-xl">
                  <InputField
                    placeholder={t('transactions.amount')}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    className="text-lg"
                  />
                </Input>

                {/* Currency Select */}
                <Select
                  selectedValue={selectedCurrency}
                  onValueChange={(value) => {
                    setSelectedCurrency(value);
                    if (value === defaultCurrency) {
                      setExchangeRate('');
                    }
                  }}
                >
                  <SelectTrigger variant="outline" className="border-2 border-background-200 rounded-xl">
                    <SelectInput placeholder={t('transactions.currency')} className="text-lg" />
                    <SelectIcon className="mr-3" as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectScrollView>
                        {currencies.map((currency) => (
                          <SelectItem
                            key={currency.code}
                            label={currency.code}
                            value={currency.code}
                          />
                        ))}
                      </SelectScrollView>
                    </SelectContent>
                  </SelectPortal>
                </Select>

                {/* Exchange Rate Input - Conditional */}
                {selectedCurrency && selectedCurrency !== defaultCurrency && (
                  <Input variant="outline" className="border-2 border-error-300 rounded-xl bg-error-50">
                    <InputField
                      placeholder={t('transactions.exchangeRate', { 
                        currency: selectedCurrency, 
                        defaultCurrency: defaultCurrency 
                      })}
                      value={exchangeRate}
                      onChangeText={setExchangeRate}
                      keyboardType="numeric"
                      className="text-lg"
                    />
                  </Input>
                )}

                <Input variant="outline" className="border-2 border-background-200 rounded-xl">
                  <InputField
                    placeholder={t('transactions.description')}
                    value={description}
                    onChangeText={setDescription}
                    className="text-base"
                  />
                </Input>

                <Button
                  size="lg"
                  onPress={handleAddIncome}
                  isDisabled={!amount || !selectedIncomeType || loading}
                  className="rounded-xl shadow-md bg-success-600"
                >
                  <ButtonText className="font-semibold text-base">
                    {loading ? t('common.loading') : t('common.add')}
                  </ButtonText>
                </Button>
              </VStack>
            </Card>

            {/* Incomes List */}
            <VStack space="md">
              <HStack className="justify-between items-center px-1">
                <Heading size="lg" className="font-bold">Recent Income</Heading>
                <HStack space="sm" className="items-center">
                  <Text className="text-sm text-typography-500">{incomes.length} items</Text>
                  <Button
                    size="sm"
                    variant="link"
                    onPress={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    <ButtonIcon as={MoreVertical} />
                  </Button>
                </HStack>
              </HStack>

              {/* Filter Menu */}
              {showFilterMenu && (
                <Card className="p-4 shadow-md bg-background-0">
                  <VStack space="md">
                    {/* Date Range Filter */}
                    <VStack space="xs">
                      <Text className="font-semibold text-sm">{t('incomes.dateRange')}</Text>
                      <HStack space="xs">
                        <Button
                          size="sm"
                          variant={dateFilter === 'weekly' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('weekly')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('incomes.weekly')}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant={dateFilter === 'monthly' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('monthly')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('incomes.monthly')}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant={dateFilter === 'yearly' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('yearly')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('incomes.yearly')}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant={dateFilter === 'custom' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('custom')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('incomes.custom')}</ButtonText>
                        </Button>
                      </HStack>
                    </VStack>

                    {/* Income Categories Filter */}
                    <VStack space="xs">
                      <Text className="font-semibold text-sm">{t('incomes.categories')}</Text>
                      <VStack space="xs">
                        {incomeTypes.map((type) => (
                          <Checkbox
                            key={type.id}
                            value={type.id.toString()}
                            isChecked={selectedCategories.includes(type.id)}
                            onChange={() => {
                              if (selectedCategories.includes(type.id)) {
                                setSelectedCategories(selectedCategories.filter(id => id !== type.id));
                              } else {
                                setSelectedCategories([...selectedCategories, type.id]);
                              }
                            }}
                            size="sm"
                          >
                            <CheckboxIndicator>
                              <CheckboxIcon as={CheckIcon} />
                            </CheckboxIndicator>
                            <CheckboxLabel className="ml-2">{type.name}</CheckboxLabel>
                          </Checkbox>
                        ))}
                      </VStack>
                    </VStack>
                  </VStack>
                </Card>
              )}
              
              {incomes.length === 0 ? (
                <Card className="p-8 shadow-sm">
                  <VStack space="sm" className="items-center">
                    <Text className="text-4xl">💰</Text>
                    <Text className="text-center text-typography-500 text-base">
                      {t('transactions.noTransactions')}
                    </Text>
                  </VStack>
                </Card>
              ) : (
                <VStack space="sm">
                  {incomes.map((income) => (
                    <Card key={income.id} className="p-4 shadow-md bg-white dark:bg-background-900 border-l-4 border-l-success-500">
                      <HStack className="justify-between items-center">
                        <HStack space="sm" className="flex-1 items-center">
                          <Box className="w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 items-center justify-center">
                            <Text className="text-2xl">💰</Text>
                          </Box>
                          <VStack space="xs" className="flex-1">
                            <Text className="font-semibold text-base">
                              {income.income_type_name}
                            </Text>
                            {income.description && (
                              <Text className="text-sm text-typography-500" numberOfLines={1}>
                                {income.description}
                              </Text>
                            )}
                            <Text className="text-xs text-typography-400">
                              {new Date(income.transaction_date).toLocaleDateString()}
                            </Text>
                          </VStack>
                        </HStack>
                        <VStack className="items-end">
                          <Text className="font-bold text-success-600 text-lg">
                            +{income.amount}
                          </Text>
                          <Text className="text-xs text-typography-400">{income.currency}</Text>
                        </VStack>
                      </HStack>
                    </Card>
                  ))}
                  
                  {showMore && (
                    <Button
                      variant="outline"
                      size="lg"
                      onPress={() => loadIncomes(true)}
                      className="rounded-xl border-2"
                    >
                      <ButtonText className="font-semibold">{t('transactions.loadMore')}</ButtonText>
                    </Button>
                  )}
                </VStack>
              )}
            </VStack>

            {/* Bottom padding */}
            <Box className="h-4" />
          </VStack>
        </ScrollView>
      </Box>

      {/* Customer Modal */}
      <AddSourceModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        sourceType="customer"
        onSuccess={(customer) => {
          loadCustomers();
          setSelectedCustomer(customer.id);
        }}
      />
    </SafeAreaView>
  );
}
