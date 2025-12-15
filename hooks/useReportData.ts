import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { db } from '@/services/database';
import type { TransactionWithDetails } from '@/types/database';

export interface CategoryBreakdown {
  id: number;
  name: string;
  amount: number;
  count: number;
  currency: string;
}

export interface ReportData {
  period: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  currency: string;
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
  lastPeriodIncome: number;
  lastPeriodExpense: number;
  lastPeriodProfit: number;
  loading: boolean;
  error: string | null;
}

type DateRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

export function useReportData(
  dateRange: DateRange = 'monthly',
  customRange?: CustomDateRange
) {
  const { t, i18n } = useTranslation();
  const { selectedVehicle, user } = useApp();
  const [reportData, setReportData] = useState<ReportData>({
    period: '',
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    currency: user?.default_currency || 'TRY',
    expenseByCategory: [],
    incomeByCategory: [],
    lastPeriodIncome: 0,
    lastPeriodExpense: 0,
    lastPeriodProfit: 0,
    loading: true,
    error: null,
  });

  const getDateRange = (range: DateRange, custom?: CustomDateRange) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (custom) {
          return { start: custom.startDate, end: custom.endDate };
        }
        break;
    }

    return { start, end };
  };

  const getLastPeriodRange = (range: DateRange) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
      case 'daily':
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        start.setDate(now.getDate() - now.getDay() - 7);
        end.setDate(now.getDate() - now.getDay() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setMonth(now.getMonth() - 1, 1);
        end.setMonth(now.getMonth(), 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        return null;
    }

    return { start, end };
  };

  const aggregateData = (transactions: TransactionWithDetails[], start: Date, end: Date) => {
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseCategoryMap = new Map<number, CategoryBreakdown>();
    const incomeCategoryMap = new Map<number, CategoryBreakdown>();

    transactions.forEach((transaction) => {
      const txDate = new Date(transaction.transaction_date);
      if (txDate >= start && txDate <= end) {
        if (transaction.transaction_type === 'expense') {
          totalExpense += transaction.amount;

          const categoryId = transaction.expense_type_id || 0;
          const categoryName = transaction.expense_type_name || 'Unknown';

          if (expenseCategoryMap.has(categoryId)) {
            const existing = expenseCategoryMap.get(categoryId)!;
            existing.amount += transaction.amount;
            existing.count += 1;
          } else {
            expenseCategoryMap.set(categoryId, {
              id: categoryId,
              name: categoryName,
              amount: transaction.amount,
              count: 1,
              currency: transaction.currency,
            });
          }
        } else if (transaction.transaction_type === 'income') {
          totalIncome += transaction.amount;

          const categoryId = transaction.income_type_id || 0;
          const categoryName = transaction.income_type_name || 'Unknown';

          if (incomeCategoryMap.has(categoryId)) {
            const existing = incomeCategoryMap.get(categoryId)!;
            existing.amount += transaction.amount;
            existing.count += 1;
          } else {
            incomeCategoryMap.set(categoryId, {
              id: categoryId,
              name: categoryName,
              amount: transaction.amount,
              count: 1,
              currency: transaction.currency,
            });
          }
        }
      }
    });

    return {
      totalIncome,
      totalExpense,
      expenseByCategory: Array.from(expenseCategoryMap.values()).sort(
        (a, b) => b.amount - a.amount
      ),
      incomeByCategory: Array.from(incomeCategoryMap.values()).sort(
        (a, b) => b.amount - a.amount
      ),
    };
  };

  const loadReportData = async () => {
    if (!selectedVehicle || !user) {
      setReportData((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setReportData((prev) => ({ ...prev, loading: true, error: null }));

      // Get current period data
      const currentRange = getDateRange(dateRange, customRange);
      const transactions = await db.getVehicleTransactions(selectedVehicle.id, 1000, 0);

      const currentData = aggregateData(
        transactions,
        currentRange.start,
        currentRange.end
      );

      // Get last period data for comparison
      const lastRange = getLastPeriodRange(dateRange);
      let lastPeriodData = {
        totalIncome: 0,
        totalExpense: 0,
      };

      if (lastRange) {
        const result = aggregateData(transactions, lastRange.start, lastRange.end);
        lastPeriodData = {
          totalIncome: result.totalIncome,
          totalExpense: result.totalExpense,
        };
      }

      const netProfit = currentData.totalIncome - currentData.totalExpense;
      const lastPeriodProfit = lastPeriodData.totalIncome - lastPeriodData.totalExpense;

      // Format period string
      const periodString = formatPeriodString(dateRange, currentRange.start);

      setReportData({
        period: periodString,
        totalIncome: currentData.totalIncome,
        totalExpense: currentData.totalExpense,
        netProfit,
        currency: user.default_currency || 'TRY',
        expenseByCategory: currentData.expenseByCategory,
        incomeByCategory: currentData.incomeByCategory,
        lastPeriodIncome: lastPeriodData.totalIncome,
        lastPeriodExpense: lastPeriodData.totalExpense,
        lastPeriodProfit,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load report data:', error);
      setReportData((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load report data',
      }));
    }
  };

  const formatPeriodString = (range: DateRange, date: Date): string => {
    const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
    
    switch (range) {
      case 'daily':
        return date.toLocaleDateString(locale);
      case 'weekly':
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
        const startDay = date.toLocaleDateString(locale, { day: 'numeric' });
        const endDay = weekEnd.toLocaleDateString(locale, { day: 'numeric' });
        const monthName = date.toLocaleDateString(locale, { month: 'short' });
        return `${startDay} - ${endDay} ${monthName}`;
      case 'monthly':
        return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      case 'yearly':
        return date.toLocaleDateString(locale, { year: 'numeric' });
      case 'custom':
        return t('reports.customPeriod');
      default:
        return '';
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedVehicle, dateRange, customRange, user]);

  const refresh = () => {
    loadReportData();
  };

  return {
    ...reportData,
    refresh,
  };
}
