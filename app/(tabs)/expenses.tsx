import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import {
  Menu,
  MenuItem,
  MenuItemLabel,
} from '@/components/ui/menu';
import { Icon, ChevronDownIcon } from '@/components/ui/icon';
import { Checkbox, CheckboxIndicator, CheckboxIcon, CheckboxLabel } from '@/components/ui/checkbox';
import { CheckIcon, MoreVertical, Plus, Minus } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { db } from '@/services/database';
import { AddSourceModal } from '@/components/AddSourceModal';
import type { TransactionWithDetails, ExpenseType, EnergyStation, Company, Currency } from '@/types/database';

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { selectedVehicle, user } = useApp();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [odometer, setOdometer] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [selectedExpenseType, setSelectedExpenseType] = useState<number | null>(null);
  const [selectedEnergyStation, setSelectedEnergyStation] = useState<number | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [energyStations, setEnergyStations] = useState<EnergyStation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [expenses, setExpenses] = useState<TransactionWithDetails[]>([]);
  const [allExpenses, setAllExpenses] = useState<TransactionWithDetails[]>([]); // Unfiltered expenses
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [includeFuel, setIncludeFuel] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [lastFuelTransaction, setLastFuelTransaction] = useState<TransactionWithDetails | null>(null);

  // Check if expense type is fuel related
  const isFuelExpense = expenseTypes.find(t => t.id === selectedExpenseType)?.name.toLowerCase().includes('fuel') || 
                        expenseTypes.find(t => t.id === selectedExpenseType)?.name.toLowerCase().includes('yakıt');

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
    const currentTotal = allExpenses
      .filter(e => {
        const date = new Date(e.transaction_date);
        return date >= start && date <= end;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    // Last month total
    const lastMonthTotal = allExpenses
      .filter(e => {
        const date = new Date(e.transaction_date);
        return date >= lastMonth.start && date <= lastMonth.end;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      currentTotal,
      lastMonthTotal,
      dateRange: { start, end },
      currency: user?.default_currency || 'TRY'
    };
  };

  // Apply filters to expenses
  const applyFilters = () => {
    const { start, end } = getDateRange();
    
    let filtered = allExpenses.filter(e => {
      const date = new Date(e.transaction_date);
      const inDateRange = date >= start && date <= end;
      
      // Fuel filter
      const isFuel = e.expense_type_name?.toLowerCase().includes('fuel') || 
                     e.expense_type_name?.toLowerCase().includes('yakıt');
      const fuelCheck = includeFuel || !isFuel;
      
      // Category filter
      const categoryCheck = selectedCategories.length === 0 || 
                           (e.expense_type_id !== null && selectedCategories.includes(e.expense_type_id));
      
      return inDateRange && fuelCheck && categoryCheck;
    });
    
    setExpenses(filtered);
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
    loadExpenseTypes();
    loadEnergyStations();
    loadCompanies();
    if (selectedVehicle) {
      loadExpenses();
    }
  }, [selectedVehicle]);

  // Refresh when screen gains focus (e.g., after adding fuel elsewhere)
  useFocusEffect(
    useCallback(() => {
      if (selectedVehicle) {
        loadExpenses();
      }
    }, [selectedVehicle])
  );

  // Apply filters whenever filter options change
  useEffect(() => {
    applyFilters();
  }, [dateFilter, customStartDate, customEndDate, includeFuel, selectedCategories, allExpenses]);

  const loadCurrencies = async () => {
    try {
      const currencyList = await db.getCurrencies();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const loadExpenseTypes = async () => {
    try {
      const types = await db.getExpenseTypes(user?.id);
      setExpenseTypes(types);
      if (types.length > 0 && !selectedExpenseType) {
        setSelectedExpenseType(types[0].id);
      }
    } catch (error) {
      console.error('Failed to load expense types:', error);
    }
  };

  const loadEnergyStations = async () => {
    if (!user) return;
    try {
      const stations = await db.getEnergyStations(user.id);
      setEnergyStations(stations);
    } catch (error) {
      console.error('Failed to load energy stations:', error);
    }
  };

  const loadCompanies = async () => {
    if (!user) return;
    try {
      const comps = await db.getCompanies(user.id);
      setCompanies(comps);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadExpenses = async (loadMore = false) => {
    if (!selectedVehicle) return;
    
    try {
      const offset = loadMore ? allExpenses.length : 0;
      const allTransactions = await db.getVehicleTransactions(
        selectedVehicle.id,
        100, // Load more transactions for filtering
        offset
      );
      
      // Filter only expenses
      const expenseTransactions = allTransactions.filter(
        t => t.transaction_type === 'expense'
      );
      
      if (loadMore) {
        setAllExpenses([...allExpenses, ...expenseTransactions]);
      } else {
        setAllExpenses(expenseTransactions);
      }
      
      // Load last fuel transaction for odometer placeholder
      const lastFuel = await db.getLastFuelTransaction(selectedVehicle.id);
      setLastFuelTransaction(lastFuel);
      
      setShowMore(expenseTransactions.length === 100);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    }
  };

  const handleAddExpense = async () => {
    if (!selectedVehicle || !user || !amount || !selectedExpenseType) return;
    
    // Use user's default currency if none selected
    const currencyToUse = selectedCurrency || defaultCurrency;
    
    // Check if exchange rate is required but not provided
    const isForeignCurrency = currencyToUse !== defaultCurrency;
    if (isForeignCurrency && !exchangeRate) {
      alert(t('validation.required') + ': ' + t('transactions.exchangeRate'));
      return;
    }
    
    // Validate odometer reading
    if (odometer) {
      const currentOdometer = parseInt(odometer);
      const lastFuelTransaction = await db.getLastFuelTransaction(selectedVehicle.id);
      
      if (lastFuelTransaction && lastFuelTransaction.odometer_reading) {
        if (currentOdometer <= lastFuelTransaction.odometer_reading) {
          alert(t('validation.odometerMustBeGreater', { lastKm: lastFuelTransaction.odometer_reading }));
          return;
        }
      }
    }
    
    try {
      setLoading(true);

      // Create transaction
      const transaction = await db.createTransaction({
        vehicle_id: selectedVehicle.id,
        transaction_type: 'expense',
        amount: parseFloat(amount),
        currency: currencyToUse,
        default_currency: user.default_currency,
        foreign_currency: isForeignCurrency ? currencyToUse : null,
        exchange_rate: isForeignCurrency ? parseFloat(exchangeRate) : null,
        expense_type_id: selectedExpenseType,
        energy_station_id: selectedEnergyStation,
        company_id: selectedCompany,
        description: description || null,
        transaction_date: new Date().toISOString(),
        odometer_reading: odometer ? parseInt(odometer) : null,
      });

      // Create expense record
      await db.createExpense({
        transaction_id: transaction.id,
        expense_type_id: selectedExpenseType,
        notes: description || null,
      });

      // Reset form
      setAmount('');
      setDescription('');
      setOdometer('');
      setExchangeRate('');
      setSelectedCurrency(defaultCurrency);
      setSelectedEnergyStation(null);
      setSelectedCompany(null);
      
      // Reload expenses
      await loadExpenses();
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
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
            <HStack space="md" className="px-1 items-center">
              <Text className="text-3xl">💸</Text>
              <VStack space="xs" className="flex-1">
                <Heading size="2xl" className="font-bold" numberOfLines={1}>{t('expenses.title')}</Heading>
                <Text className="text-typography-500" numberOfLines={1}>Track your vehicle expenses</Text>
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
                <Text className="text-3xl font-bold text-error-600">
                  {calculateSummary().currentTotal.toFixed(2)} {calculateSummary().currency}
                </Text>
                <Text className="text-sm text-typography-400">
                  {t('expenses.lastMonth')}: {calculateSummary().lastMonthTotal.toFixed(2)} {calculateSummary().currency}
                </Text>
              </VStack>
            </Card>

            {/* Quick Expense Form with modern styling */}
            <Card className="p-5 shadow-lg bg-white dark:bg-background-900">
              <VStack space="lg">
                <Heading size="md" className="font-semibold">{t('expenses.addExpense')}</Heading>
                
                {/* Expense Type */}
                <VStack space="xs">
                  <Text className="font-semibold text-sm text-typography-700">{t('expenses.expenseType')} *</Text>
                  <Select
                    selectedValue={selectedExpenseType?.toString() || ''}
                    onValueChange={(value) => setSelectedExpenseType(parseInt(value))}
                  >
                    <SelectTrigger className="border-2 border-background-200 rounded-xl">
                      <SelectInput 
                        placeholder={t('expenses.expenseType')}
                        value={expenseTypes.find(t => t.id === selectedExpenseType)?.name}
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
                          {expenseTypes.map((type) => (
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

                {/* Energy Station (for fuel) or Company */}
                {isFuelExpense ? (
                  <HStack space="sm">
                    <VStack space="xs" className="flex-1">
                      <Text className="font-semibold text-sm text-typography-700">{t('expenses.energyStation')}</Text>
                      <Select
                        selectedValue={selectedEnergyStation?.toString() || ''}
                        onValueChange={(value) => setSelectedEnergyStation(parseInt(value))}
                      >
                        <SelectTrigger className="border-2 border-background-200 rounded-xl">
                          <SelectInput 
                            placeholder={t('expenses.selectEnergyStation')}
                            value={energyStations.find(s => s.id === selectedEnergyStation)?.name}
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
                              {energyStations.map((station) => (
                                <SelectItem
                                  key={station.id}
                                  label={station.name}
                                  value={station.id.toString()}
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
                      onPress={() => setShowStationModal(true)}
                      className="mt-5 w-12 h-12 rounded-xl"
                    >
                      <ButtonText className="text-xl">+</ButtonText>
                    </Button>
                  </HStack>
                ) : (
                  <HStack space="sm" className="items-center">
                    <VStack space="xs" className="flex-1">
                      <Text className="font-semibold text-sm text-typography-700">{t('expenses.company')}</Text>
                      <Select
                        selectedValue={selectedCompany?.toString() || ''}
                        onValueChange={(value) => setSelectedCompany(parseInt(value))}
                      >
                        <SelectTrigger className="border-2 border-background-200 rounded-xl">
                          <SelectInput 
                            placeholder={t('expenses.selectCompany')}
                            value={companies.find(c => c.id === selectedCompany)?.name}
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
                              {companies.map((company) => (
                                <SelectItem
                                  key={company.id}
                                  label={company.name}
                                  value={company.id.toString()}
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
                      onPress={() => setShowCompanyModal(true)}
                      className="rounded-full h-6 w-6 p-0 flex-none -mb-6"
                    >
                      <ButtonIcon as={Plus} size="xs" />
                    </Button>
                  </HStack>
                )}

                {/* Odometer Reading with +/- buttons */}
                <HStack space="sm" className="items-center">
                  <VStack className="flex-1">
                    <Input variant="outline" className={`border-2 rounded-xl ${odometer && lastFuelTransaction?.odometer_reading && parseInt(odometer) < lastFuelTransaction.odometer_reading ? 'border-error-500' : 'border-background-200'}`}>
                      <InputField
                        placeholder={lastFuelTransaction?.odometer_reading ? `>${lastFuelTransaction.odometer_reading.toLocaleString()}` : t('transactions.odometerReading')}
                        value={odometer}
                        onChangeText={setOdometer}
                        keyboardType="numeric"
                        className="text-base"
                      />
                    </Input>
                    {odometer && lastFuelTransaction?.odometer_reading && parseInt(odometer) < lastFuelTransaction.odometer_reading && (
                      <Text className="text-error-500 text-xs mt-1">Son km'den daha küçük olamaz</Text>
                    )}
                  </VStack>
                  <Button
                    size="lg"
                    variant="outline"
                    onPress={() => {
                      const currentValue = odometer ? parseInt(odometer) : (lastFuelTransaction?.odometer_reading || 0);
                      setOdometer((currentValue + 100).toString());
                    }}
                    className="rounded-full h-6 w-6 p-0 flex-none"
                  >
                    <ButtonIcon as={Plus} size="xs" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    isDisabled={!odometer || !!(lastFuelTransaction?.odometer_reading && parseInt(odometer) - 100 <= lastFuelTransaction.odometer_reading)}
                    onPress={() => {
                      const currentValue = parseInt(odometer);
                      if (currentValue > 100) {
                        setOdometer((currentValue - 100).toString());
                      }
                    }}
                    className="rounded-full h-6 w-6 p-0 flex-none"
                  >
                    <ButtonIcon as={Minus} size="xs" />
                  </Button>
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
                    <SelectInput placeholder={t('transactions.currency')} />
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

                {/* Exchange Rate Input - Only show if foreign currency selected */}
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
                      className="text-base"
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
                  onPress={handleAddExpense}
                  isDisabled={!amount || !selectedExpenseType || loading}
                  className="rounded-xl shadow-md"
                >
                  <ButtonText className="font-semibold text-base">
                    {loading ? t('common.loading') : t('common.add')}
                  </ButtonText>
                </Button>
              </VStack>
            </Card>

            {/* Expenses List */}
            <VStack space="md">
              <HStack className="justify-between items-center px-1">
                <Heading size="lg" className="font-bold">Recent Expenses</Heading>
                <HStack space="sm" className="items-center">
                  <Text className="text-sm text-typography-500">{expenses.length} items</Text>
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
                      <Text className="font-semibold text-sm">{t('expenses.dateRange')}</Text>
                      <HStack space="xs">
                        <Button
                          size="sm"
                          variant={dateFilter === 'weekly' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('weekly')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('expenses.weekly')}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant={dateFilter === 'monthly' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('monthly')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('expenses.monthly')}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant={dateFilter === 'yearly' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('yearly')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('expenses.yearly')}</ButtonText>
                        </Button>
                        <Button
                          size="sm"
                          variant={dateFilter === 'custom' ? 'solid' : 'outline'}
                          onPress={() => setDateFilter('custom')}
                          className="flex-1"
                        >
                          <ButtonText className="text-xs">{t('expenses.custom')}</ButtonText>
                        </Button>
                      </HStack>
                    </VStack>

                    {/* Fuel Toggle */}
                    <HStack space="sm" className="items-center">
                      <Checkbox
                        value="fuel"
                        isChecked={includeFuel}
                        onChange={() => setIncludeFuel(!includeFuel)}
                        size="sm"
                      >
                        <CheckboxIndicator>
                          <CheckboxIcon as={CheckIcon} />
                        </CheckboxIndicator>
                        <CheckboxLabel className="ml-2">{t('expenses.includeFuel')}</CheckboxLabel>
                      </Checkbox>
                    </HStack>

                    {/* Expense Categories Filter */}
                    <VStack space="xs">
                      <Text className="font-semibold text-sm">{t('expenses.categories')}</Text>
                      <VStack space="xs">
                        {expenseTypes.map((type) => (
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
              
              {expenses.length === 0 ? (
                <Card className="p-8 shadow-sm">
                  <VStack space="sm" className="items-center">
                    <Text className="text-4xl">💸</Text>
                    <Text className="text-center text-typography-500 text-base">
                      {t('transactions.noTransactions')}
                    </Text>
                  </VStack>
                </Card>
              ) : (
                <VStack space="sm">
                  {expenses.map((expense) => (
                    <Card key={expense.id} className="p-4 shadow-md bg-white dark:bg-background-900 border-l-4 border-l-error-500">
                      <HStack className="justify-between items-center">
                        <HStack space="sm" className="flex-1 items-center">
                          <Box className="w-12 h-12 rounded-full bg-error-100 dark:bg-error-900/30 items-center justify-center">
                            <Text className="text-2xl">💸</Text>
                          </Box>
                          <VStack space="xs" className="flex-1">
                            <Text className="font-semibold text-base">
                              {expense.expense_type_name}
                            </Text>
                            {expense.description && (
                              <Text className="text-sm text-typography-500" numberOfLines={1}>
                                {expense.description}
                              </Text>
                            )}
                            <HStack space="sm" className="items-center flex-wrap">
                              <Text className="text-xs text-typography-400">
                                {new Date(expense.transaction_date).toLocaleDateString()}
                              </Text>
                              {expense.odometer_reading && (
                                <>
                                  <Text className="text-xs text-typography-400">•</Text>
                                  <Text className="text-xs text-typography-400">
                                    📍 {expense.odometer_reading.toLocaleString()} km
                                  </Text>
                                </>
                              )}
                            </HStack>
                            {(expense.energy_station_name || expense.company_name) && (
                              <Text className="text-xs text-typography-500">
                                🏢 {expense.energy_station_name || expense.company_name}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                        <VStack className="items-end">
                          <Text className="font-bold text-error-600 text-lg">
                            -{expense.amount}
                          </Text>
                          <Text className="text-xs text-typography-400">{expense.currency}</Text>
                        </VStack>
                      </HStack>
                    </Card>
                  ))}
                  
                  {showMore && (
                    <Button
                      variant="outline"
                      size="lg"
                      onPress={() => loadExpenses(true)}
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

      {/* Modals */}
      <AddSourceModal
        isOpen={showStationModal}
        onClose={() => setShowStationModal(false)}
        sourceType="energy_station"
        onSuccess={(station) => {
          loadEnergyStations();
          setSelectedEnergyStation(station.id);
        }}
      />

      <AddSourceModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        sourceType="company"
        onSuccess={(company) => {
          loadCompanies();
          setSelectedCompany(company.id);
        }}
      />
    </SafeAreaView>
  );
}
