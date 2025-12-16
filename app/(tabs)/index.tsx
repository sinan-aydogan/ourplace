import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
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
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { ChevronDownIcon, CloseIcon, Icon } from '@/components/ui/icon';
import { Plus, Minus } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Fab, FabIcon } from '@/components/ui/fab';
import { MenuIcon } from '@/components/ui/icon';
import { Edit2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { db } from '@/services/database';
import type { TransactionWithDetails, Currency } from '@/types/database';

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedVehicle, user } = useApp();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelUnitPrice, setFuelUnitPrice] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [totalTransactions, setTotalTransactions] = useState(0);
  
  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithDetails | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOdometer, setEditOdometer] = useState('');
  const [editFuelUnitPrice, setEditFuelUnitPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editExchangeRate, setEditExchangeRate] = useState('');
  const [lastFuelTransaction, setLastFuelTransaction] = useState<TransactionWithDetails | null>(null);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const defaultCurrency = user?.default_currency || 'TRY';

  useEffect(() => {
    if (user) {
      setSelectedCurrency(defaultCurrency);
    }
  }, [user, defaultCurrency]);

  useEffect(() => {
    if (selectedVehicle) {
      loadTransactions();
    }
  }, [selectedVehicle]);

  const loadCurrencies = async () => {
    try {
      const currencyList = await db.getCurrencies();
      setCurrencies(currencyList);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const loadTransactions = async (loadMore = false) => {
    if (!selectedVehicle || !selectedVehicle.id) return;
    
    try {
      const offset = loadMore ? transactions.length : 0;
      const newTransactions = await db.getVehicleTransactions(
        selectedVehicle.id,
        5,
        offset
      );
      
      if (loadMore) {
        setTransactions([...transactions, ...newTransactions]);
      } else {
        setTransactions(newTransactions);
      }
      
      // Load last fuel transaction for odometer placeholder
      const lastFuel = await db.getLastFuelTransaction(selectedVehicle.id);
      setLastFuelTransaction(lastFuel);
      
      setShowMore(newTransactions.length === 5);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      // Set empty array on error to prevent UI issues
      if (!loadMore) {
        setTransactions([]);
      }
    }
  };

  // Calculate fuel efficiency metrics
  const calculateFuelMetrics = (currentTransaction: TransactionWithDetails, index: number) => {
    // Only for fuel expenses
    if (currentTransaction.transaction_type !== 'expense' || 
        !currentTransaction.expense_type_name?.toLowerCase().includes('fuel') &&
        !currentTransaction.expense_type_name?.toLowerCase().includes('yakıt')) {
      return null;
    }

    if (!currentTransaction.odometer_reading) return null;

    // Find previous fuel transaction with odometer
    let previousFuelTransaction = null;
    for (let i = index + 1; i < transactions.length; i++) {
      const prevTx = transactions[i];
      if (prevTx.transaction_type === 'expense' && 
          (prevTx.expense_type_name?.toLowerCase().includes('fuel') ||
           prevTx.expense_type_name?.toLowerCase().includes('yakıt')) &&
          prevTx.odometer_reading) {
        previousFuelTransaction = prevTx;
        break;
      }
    }

    if (!previousFuelTransaction || !previousFuelTransaction.odometer_reading) return null;

    const kmDriven = currentTransaction.odometer_reading - previousFuelTransaction.odometer_reading;
    if (kmDriven <= 0) return null;

    // Cost per km
    const costPerKm = currentTransaction.amount / kmDriven;

    // Calculate liters consumed and L/100km if unit price is available
    let litersPer100km = null;
    if (currentTransaction.fuel_unit_price && currentTransaction.fuel_unit_price > 0) {
      const litersConsumed = currentTransaction.amount / currentTransaction.fuel_unit_price;
      litersPer100km = (litersConsumed / kmDriven) * 100;
    }

    return {
      kmDriven,
      costPerKm,
      litersPer100km,
    };
  };

  const handleQuickFuel = async () => {
    if (!selectedVehicle || !user || !amount || !selectedCurrency) return;
    
    // Check if exchange rate is required but not provided
    const isForeignCurrency = selectedCurrency && selectedCurrency !== defaultCurrency;
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
      
      // Get Fuel expense type
      const expenseTypes = await db.getExpenseTypes();
      const fuelType = expenseTypes.find(t => t.name === 'Fuel');
      
      if (!fuelType) {
        console.error('Fuel expense type not found');
        return;
      }

      // Create transaction
      const transaction = await db.createTransaction({
        vehicle_id: selectedVehicle.id,
        transaction_type: 'expense',
        amount: parseFloat(amount),
        currency: selectedCurrency,
        default_currency: defaultCurrency,
        foreign_currency: isForeignCurrency ? selectedCurrency : null,
        exchange_rate: isForeignCurrency ? parseFloat(exchangeRate) : null,
        expense_type_id: fuelType.id,
        description: description || null,
        transaction_date: new Date().toISOString(),
        odometer_reading: odometer ? parseInt(odometer) : null,
      });

      // Create expense record
      await db.createExpense({
        transaction_id: transaction.id,
        expense_type_id: fuelType.id,
        fuel_unit_price: fuelUnitPrice ? parseFloat(fuelUnitPrice) : null,
        notes: description || null,
      });

      // Reset form
      setAmount('');
      setDescription('');
      setOdometer('');
      setFuelUnitPrice('');
      setExchangeRate('');
      setSelectedCurrency(defaultCurrency); // Reset to default
      
      // Reload transactions
      await loadTransactions();
    } catch (error) {
      console.error('Failed to add fuel expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction: TransactionWithDetails) => {
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditDescription(transaction.description || '');
    setEditOdometer(transaction.odometer_reading?.toString() || '');
    setEditFuelUnitPrice(transaction.fuel_unit_price?.toString() || '');
    setEditCurrency(transaction.currency);
    setEditExchangeRate(transaction.exchange_rate?.toString() || '');
    setShowEditModal(true);
  };

  // Handle update transaction
  const handleUpdateTransaction = async () => {
    if (!editingTransaction || !user || !editAmount) return;
    
    const isForeignCurrency = editCurrency && editCurrency !== defaultCurrency;
    if (isForeignCurrency && !editExchangeRate) {
      alert(t('validation.required') + ': ' + t('transactions.exchangeRate'));
      return;
    }
    
    try {
      setLoading(true);

      // Update transaction
      await db.updateTransaction(editingTransaction.id, {
        amount: parseFloat(editAmount),
        currency: editCurrency,
        foreign_currency: isForeignCurrency ? editCurrency : null,
        exchange_rate: isForeignCurrency ? parseFloat(editExchangeRate) : null,
        description: editDescription || null,
        odometer_reading: editOdometer ? parseInt(editOdometer) : null,
      });

      // Update expense if it's a fuel transaction
      if (editingTransaction.expense_type_name?.toLowerCase().includes('fuel') ||
          editingTransaction.expense_type_name?.toLowerCase().includes('yakıt')) {
        // Find expense record
        const expenses = await db.getExpensesByTransaction(editingTransaction.id);
        if (expenses.length > 0) {
          await db.updateExpense(expenses[0].id, {
            fuel_unit_price: editFuelUnitPrice ? parseFloat(editFuelUnitPrice) : null,
            notes: editDescription || null,
          });
        }
      }

      // Close modal and reload
      setShowEditModal(false);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Empty state - no vehicles
  if (!selectedVehicle) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Box className="flex-1 bg-background-0">
          <VStack className="flex-1 justify-center items-center p-6" space="xl">
            <Heading size="xl" className="text-center">
              {t('vehicles.firstVehiclePrompt')}
            </Heading>
            <Button
              size="lg"
              onPress={() => router.push('/vehicles/create')}
            >
              <ButtonText>{t('vehicles.addNew')}</ButtonText>
            </Button>
          </VStack>
          
          <Fab
            className="bottom-6 right-6"
            size="lg"
            onPress={() => router.push('/drawer')}
          >
            <FabIcon as={MenuIcon} />
          </Fab>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-50" style={{ marginBottom: -25 }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack className="p-4" space="lg">
          {/* Vehicle Header with Image Background */}
          {(() => {
            const getDefaultImage = (vehicleTypeId: number) => {
              const imageMap: { [key: number]: any } = {
                1: require('@/assets/images/vehicle_images/car.png'),
                2: require('@/assets/images/vehicle_images/motorcycle.png'),
                3: require('@/assets/images/vehicle_images/truck.png'),
                4: require('@/assets/images/vehicle_images/bus.png'),
              };
              return imageMap[vehicleTypeId] || imageMap[1];
            };

            const imageSource = selectedVehicle.image_uri
              ? { uri: selectedVehicle.image_uri }
              : getDefaultImage(selectedVehicle.vehicle_type_id || 1);

            return (
              <Box className="rounded-2xl overflow-hidden shadow-xl">
                <ImageBackground
                  source={imageSource}
                  style={{ width: '100%', minHeight: 200 }}
                  resizeMode="cover"
                >
                  {/* Dark overlay for better text readability */}
                  <Box className="bg-black/70 p-6" style={{ minHeight: 200, position: 'relative' }}>
                    {/* Vehicle Type Badge - Top Right */}
                    {selectedVehicle.vehicle_type_name_key && (
                      <Box style={{ position: 'absolute', top: 16, right: 16 }}>
                        <Box className="bg-primary-500 px-3 py-1.5 rounded-lg">
                          <Text className="text-xs font-semibold text-white">
                            {t(`vehicles.vehicleType_${selectedVehicle.vehicle_type_name_key}`)}
                          </Text>
                        </Box>
                      </Box>
                    )}
                    
                    <VStack space="md">
                      <VStack space="xs">
                        <Text className="text-xs text-white/90 uppercase tracking-wider font-semibold">
                          {t('vehicles.selectVehicle')}
                        </Text>
                        <Heading size="3xl" className="text-white font-bold">
                          {selectedVehicle.name}
                        </Heading>
                      </VStack>
                      
                      <VStack space="xs">
                        {selectedVehicle.brand_name && (
                          <HStack space="sm" className="items-center">
                            <Text className="text-lg text-white/95 font-semibold">
                              {selectedVehicle.brand_name}
                              {selectedVehicle.model && ` ${selectedVehicle.model}`}
                            </Text>
                            {selectedVehicle.production_year && (
                              <Text className="text-sm text-white/80">
                                ({selectedVehicle.production_year})
                              </Text>
                            )}
                          </HStack>
                        )}
                        
                        {selectedVehicle.license_plate && (
                          <HStack className="items-center mt-2">
                            <Box className="bg-white px-3 py-1.5 rounded-lg">
                              <Text className="text-base font-bold text-typography-900 tracking-wider">
                                {selectedVehicle.license_plate}
                              </Text>
                            </Box>
                          </HStack>
                        )}
                      </VStack>
                    </VStack>
                  </Box>
                </ImageBackground>
              </Box>
            );
          })()}

          {/* Quick Fuel Form with modern styling */}
          <Card className="p-5 shadow-lg bg-white dark:bg-background-900">
            <VStack space="lg">
              <HStack className="items-center" space="sm">
                <Box className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center">
                  <Text className="text-2xl">⛽</Text>
                </Box>
                <Heading size="lg" className="font-semibold">{t('expenses.quickFuel')}</Heading>
              </HStack>
              
              <VStack space="md">
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
                    // Reset exchange rate when currency changes
                    if (value === user?.default_currency) {
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
                    placeholder={t('fuel.unitPrice')}
                    value={fuelUnitPrice}
                    onChangeText={setFuelUnitPrice}
                    keyboardType="numeric"
                    className="text-base"
                  />
                </Input>

                {/* Odometer Reading with +/- buttons */}
                <HStack space="sm" alignItems="center">
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
                    <ButtonIcon as={Plus} size={12} />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    isDisabled={!odometer || (lastFuelTransaction?.odometer_reading && parseInt(odometer) - 100 <= lastFuelTransaction.odometer_reading)}
                    onPress={() => {
                      const currentValue = parseInt(odometer);
                      if (currentValue > 100) {
                        setOdometer((currentValue - 100).toString());
                      }
                    }}
                    className="rounded-full h-6 w-6 p-0 flex-none"
                  >
                    <ButtonIcon as={Minus} size={12} />
                  </Button>
                </HStack>

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
                  onPress={handleQuickFuel}
                  isDisabled={!amount || loading}
                  className="rounded-xl shadow-md"
                >
                  <ButtonText className="font-semibold text-base">
                    {loading ? t('common.loading') : t('common.add')}
                  </ButtonText>
                </Button>
              </VStack>
            </VStack>
          </Card>

          {/* Recent Transactions with modern cards */}
          <VStack space="md">
            <HStack className="justify-between items-center px-1">
              <Heading size="lg" className="font-bold">{t('transactions.recentTransactions')}</Heading>
              <Text className="text-sm text-typography-500">{transactions.length} {t('transactions.items')}</Text>
            </HStack>
            
            {transactions.length === 0 ? (
              <Card className="p-8 shadow-sm bg-background-0">
                <VStack space="sm" className="items-center">
                  <Text className="text-4xl">📝</Text>
                  <Text className="text-center text-typography-500 text-base">
                    {t('transactions.noTransactions')}
                  </Text>
                </VStack>
              </Card>
            ) : (
              <VStack space="sm">
                {transactions.map((transaction, index) => {
                  const fuelMetrics = calculateFuelMetrics(transaction, index);
                  
                  return (
                  <Card key={transaction.id} className="p-4 shadow-md bg-white dark:bg-background-900 border-l-4 border-l-primary-500">
                    <VStack space="sm">
                      <HStack className="justify-between items-center">
                        <HStack space="sm" className="flex-1 items-center">
                          <Box className="w-12 h-12 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: transaction.transaction_type === 'income' 
                                ? 'rgba(34, 197, 94, 0.1)' 
                                : 'rgba(239, 68, 68, 0.1)'
                            }}
                          >
                            <Text className="text-2xl">
                              {transaction.transaction_type === 'income' ? '💰' : '💸'}
                            </Text>
                          </Box>
                          <VStack space="xs" className="flex-1">
                            <Text className="font-semibold text-base">
                              {(transaction.expense_type_name?.toLowerCase() === 'fuel' 
                                ? t('fuel.fuel') 
                                : transaction.expense_type_name) || transaction.income_type_name}
                            </Text>
                            {transaction.description && (
                              <Text className="text-sm text-typography-500" numberOfLines={1}>
                                {transaction.description}
                              </Text>
                            )}
                            {transaction.fuel_unit_price && (
                              <Text className="text-xs text-typography-400">
                                ⛽ {transaction.fuel_unit_price.toFixed(2)} {transaction.currency}/L
                              </Text>
                            )}
                            <HStack space="sm" className="items-center">
                              <Text className="text-xs text-typography-400">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                              </Text>
                              {transaction.odometer_reading && (
                                <>
                                  <Text className="text-xs text-typography-400">•</Text>
                                  <Text className="text-xs text-typography-700 font-semibold">
                                    {transaction.odometer_reading.toLocaleString()} km
                                  </Text>
                                </>
                              )}
                            </HStack>
                          </VStack>
                        </HStack>
                        <VStack className="items-end" space="xs">
                          <Text
                            className={`font-bold text-lg ${
                              transaction.transaction_type === 'income'
                                ? 'text-success-600'
                                : 'text-error-600'
                            }`}
                          >
                            {transaction.transaction_type === 'income' ? '+' : '-'}
                            {transaction.amount}
                          </Text>
                          <Text className="text-xs text-typography-400">{transaction.currency}</Text>
                          {/* Edit button for fuel transactions */}
                          {(transaction.expense_type_name?.toLowerCase().includes('fuel') ||
                            transaction.expense_type_name?.toLowerCase().includes('yakıt')) && (
                            <Button
                              size="xs"
                              variant="link"
                              onPress={() => handleEditTransaction(transaction)}
                            >
                              <ButtonIcon as={Edit2} size="sm" className="text-primary-600" />
                            </Button>
                          )}
                        </VStack>
                      </HStack>
                      
                      {/* Fuel Metrics */}
                      {fuelMetrics && (
                        <Box className="bg-background-50 dark:bg-background-800 p-3 rounded-lg mt-2">
                          <HStack space="lg" className="justify-around">
                            <VStack space="xs" className="items-center">
                              <Text className="text-xs text-typography-500 uppercase">🛣️ {t('fuel.distance')}</Text>
                              <Text className="font-extrabold text-base text-primary-600">
                                {fuelMetrics.kmDriven.toLocaleString()} km
                              </Text>
                            </VStack>
                            <VStack space="xs" className="items-center">
                              <Text className="text-xs text-typography-500 uppercase">💵 {t('fuel.costPerKm')}</Text>
                              <Text className="font-bold text-sm text-error-600">
                                {fuelMetrics.costPerKm.toFixed(2)} {transaction.currency}/km
                              </Text>
                            </VStack>
                            {fuelMetrics.litersPer100km && (
                              <VStack space="xs" className="items-center">
                                <Text className="text-xs text-typography-500 uppercase">⛽ {t('fuel.consumption')}</Text>
                                <Text className="font-bold text-sm text-warning-600">
                                  {fuelMetrics.litersPer100km.toFixed(2)} L/100km
                                </Text>
                              </VStack>
                            )}
                          </HStack>
                        </Box>
                      )}
                    </VStack>
                  </Card>
                  );
                })}
                
                {showMore && (
                  <Button
                    variant="outline"
                    size="lg"
                    onPress={() => loadTransactions(true)}
                    className="rounded-xl border-2"
                  >
                    <ButtonText className="font-semibold">{t('transactions.loadMore')}</ButtonText>
                  </Button>
                )}
              </VStack>
            )}
          </VStack>

          {/* Bottom padding for FAB */}
          <Box className="h-20" />
        </VStack>
      </ScrollView>

      {/* Edit Transaction Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">{t('transactions.editTransaction')}</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Input variant="outline">
                <InputField
                  placeholder={t('transactions.amount')}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="numeric"
                />
              </Input>

              <Select
                selectedValue={editCurrency || defaultCurrency}
                onValueChange={(value) => {
                  setEditCurrency(value);
                  if (value === defaultCurrency) {
                    setEditExchangeRate('');
                  }
                }}
              >
                <SelectTrigger variant="outline">
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

              {editCurrency && editCurrency !== defaultCurrency && (
                <Input variant="outline" className="border-2 border-error-300 bg-error-50">
                  <InputField
                    placeholder={t('transactions.exchangeRate', {
                      currency: editCurrency,
                      defaultCurrency: defaultCurrency
                    })}
                    value={editExchangeRate}
                    onChangeText={setEditExchangeRate}
                    keyboardType="numeric"
                  />
                </Input>
              )}

              <Input variant="outline">
                <InputField
                  placeholder={t('fuel.unitPrice')}
                  value={editFuelUnitPrice}
                  onChangeText={setEditFuelUnitPrice}
                  keyboardType="numeric"
                />
              </Input>

              <Input variant="outline">
                <InputField
                  placeholder={t('transactions.odometerReading')}
                  value={editOdometer}
                  onChangeText={setEditOdometer}
                  keyboardType="numeric"
                />
              </Input>

              <Input variant="outline">
                <InputField
                  placeholder={t('transactions.description')}
                  value={editDescription}
                  onChangeText={setEditDescription}
                />
              </Input>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md" className="w-full">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setShowEditModal(false)}
              >
                <ButtonText>{t('common.cancel')}</ButtonText>
              </Button>
              <Button
                className="flex-1"
                onPress={handleUpdateTransaction}
                isDisabled={!editAmount || loading}
              >
                <ButtonText>{loading ? t('common.loading') : t('common.save')}</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modern FAB with shadow */}
      <Fab
        className="bottom-6 right-6 shadow-2xl"
        size="lg"
        onPress={() => router.push('/drawer')}
      >
        <FabIcon as={MenuIcon} />
      </Fab>
    </Box>
    </SafeAreaView>
  );
}
