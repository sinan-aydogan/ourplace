import React, { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button, ButtonText } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { useReportData } from '@/hooks/useReportData';

type DateRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [selectedRange, setSelectedRange] = useState<DateRange>('monthly');
  const [refreshing, setRefreshing] = useState(false);

  const translateCategoryName = (name: string): string => {
    const lowerName = name?.toLowerCase() || '';
    if (lowerName === 'fuel' || lowerName === 'yakıt') {
      return t('fuel.fuel');
    }
    return name;
  };
  const { 
    period,
    totalIncome, 
    totalExpense, 
    netProfit, 
    currency,
    expenseByCategory,
    incomeByCategory,
    lastPeriodIncome,
    lastPeriodExpense,
    lastPeriodProfit,
    loading,
    refresh 
  } = useReportData(selectedRange);

  const onRefresh = async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('tr-TR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  };

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const renderSummaryCard = (
    label: string,
    amount: number,
    previousAmount: number,
    textColor: string
  ) => {
    const change = getChangePercentage(amount, previousAmount);
    const isPositive = change >= 0;

    return (
      <Card className="flex-1 p-4 bg-background-50">
        <VStack space="xs">
          <Text className="text-xs text-typography-500 font-semibold">{label}</Text>
          <Heading size="lg" className={textColor}>
            {formatCurrency(amount)}
          </Heading>
          <HStack space="xs" className="items-center">
            <Text className={`text-xs font-semibold ${isPositive ? 'text-success-600' : 'text-error-600'}`}>
              {isPositive ? '+' : ''}{change}%
            </Text>
            <Text className="text-xs text-typography-400">
              vs {t('reports.lastPeriod')}
            </Text>
          </HStack>
        </VStack>
      </Card>
    );
  };

  const renderCategoryBreakdown = (
    title: string,
    categories: typeof expenseByCategory,
    isExpense: boolean
  ) => {
    if (categories.length === 0) {
      return (
        <VStack space="sm">
          <Heading size="md" className="text-typography-900">{title}</Heading>
          <Text className="text-typography-500 text-center py-4">
            {t('reports.noData')}
          </Text>
        </VStack>
      );
    }

    return (
      <VStack space="sm">
        <Heading size="md" className="text-typography-900">{title}</Heading>
        <VStack space="xs">
          {categories.map((category) => {
            const percentage = isExpense 
              ? (category.amount / totalExpense) * 100
              : (category.amount / totalIncome) * 100;

            return (
              <VStack key={category.id} space="xs">
                <HStack className="justify-between items-center">
                  <VStack space="xs" className="flex-1">
                    <Text className="font-semibold text-sm text-typography-900">
                      {translateCategoryName(category.name)}
                    </Text>
                    <Text className="text-xs text-typography-500">
                      {category.count} {t('reports.transactions')}
                    </Text>
                  </VStack>
                  <Text className="font-bold text-sm">
                    {formatCurrency(category.amount)}
                  </Text>
                </HStack>
                <Box className="h-2 bg-background-200 rounded-full overflow-hidden">
                  <Box 
                    className={`h-full rounded-full ${isExpense ? 'bg-error-500' : 'bg-success-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </Box>
                <Divider />
              </VStack>
            );
          })}
        </VStack>
      </VStack>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-0">
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <VStack className="p-4" space="lg">
            {/* Header */}
            <VStack space="xs">
              <Heading size="2xl" className="text-typography-900">
                {t('reports.title')}
              </Heading>
              <Text className="text-typography-500">{period}</Text>
            </VStack>

            {/* Time Period Selector */}
            <HStack space="sm" className="flex-wrap">
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((range) => (
                <Button
                  key={range}
                  onPress={() => setSelectedRange(range)}
                  variant={selectedRange === range ? 'solid' : 'outline'}
                  className={`flex-1 min-w-[90px] ${
                    selectedRange === range ? 'bg-primary-600' : ''
                  }`}
                >
                  <ButtonText className="text-xs font-semibold">
                    {t(`reports.${range}`)}
                  </ButtonText>
                </Button>
              ))}
            </HStack>

            {loading ? (
              <VStack space="md" className="justify-center items-center py-8">
                <Text className="text-typography-500">{t('common.loading')}</Text>
              </VStack>
            ) : (
              <>
                {/* Summary Cards */}
                <VStack space="md">
                  <HStack space="sm">
                    {renderSummaryCard(
                      t('reports.income'),
                      totalIncome,
                      lastPeriodIncome,
                      'text-success-600'
                    )}
                    {renderSummaryCard(
                      t('reports.expense'),
                      totalExpense,
                      lastPeriodExpense,
                      'text-error-600'
                    )}
                  </HStack>
                  
                  <Card className="p-4 bg-background-50">
                    <VStack space="xs">
                      <Text className="text-xs text-typography-500 font-semibold">
                        {t('reports.netProfit')}
                      </Text>
                      <Heading 
                        size="lg" 
                        className={netProfit >= 0 ? 'text-success-600' : 'text-error-600'}
                      >
                        {formatCurrency(netProfit)}
                      </Heading>
                      <HStack space="xs" className="items-center">
                        <Text 
                          className={`text-xs font-semibold ${
                            netProfit >= lastPeriodProfit ? 'text-success-600' : 'text-error-600'
                          }`}
                        >
                          {getChangePercentage(netProfit, lastPeriodProfit) >= 0 ? '+' : ''}
                          {getChangePercentage(netProfit, lastPeriodProfit)}%
                        </Text>
                        <Text className="text-xs text-typography-400">
                          vs {t('reports.lastPeriod')}
                        </Text>
                      </HStack>
                    </VStack>
                  </Card>
                </VStack>

                <Divider className="my-4" />

                {/* Category Breakdown */}
                <VStack space="lg">
                  {totalExpense > 0 && renderCategoryBreakdown(
                    t('reports.expenseByCategory'),
                    expenseByCategory,
                    true
                  )}

                  {totalIncome > 0 && renderCategoryBreakdown(
                    t('reports.incomeByCategory'),
                    incomeByCategory,
                    false
                  )}

                  {totalExpense === 0 && totalIncome === 0 && (
                    <VStack space="md" className="justify-center items-center py-8">
                      <Text className="text-typography-500">
                        {t('reports.noTransactions')}
                      </Text>
                    </VStack>
                  )}
                </VStack>
              </>
            )}
          </VStack>
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}
