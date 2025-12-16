// Database types matching PRODUCT_REQUIREMENTS.md schema

export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'lpg';
export type TransactionType = 'purchase' | 'sale' | 'expense' | 'income';
export type SubscriptionPlan = 'free' | 'basic';

// Currencies table
export interface Currency {
  code: string; // Primary key: 'TRY', 'USD', 'EUR'
}

// Brands table
export interface Brand {
  id: number;
  name: string;
  vehicle_type: string; // Legacy field, kept for compatibility
}

// Energy Stations table (for fuel purchases)
export interface EnergyStation {
  id: number;
  user_id: number;
  name: string;
  geo_coordinate: string | null; // "lat,lng" format
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateEnergyStationInput {
  user_id: number;
  name: string;
  geo_coordinate?: string | null;
}

// Customers table (for income sources)
export interface Customer {
  id: number;
  user_id: number;
  name: string;
  geo_coordinate: string | null; // "lat,lng" format
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateCustomerInput {
  user_id: number;
  name: string;
  geo_coordinate?: string | null;
}

// Companies table (for expense sources)
export interface Company {
  id: number;
  user_id: number;
  name: string;
  geo_coordinate: string | null; // "lat,lng" format
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateCompanyInput {
  user_id: number;
  name: string;
  geo_coordinate?: string | null;
}

// Vehicles table
export interface VehicleTypeRecord {
  id: number;
  name_key: string;
  created_at: string;
}

export interface Vehicle {
  id: number;
  user_id: number;
  name: string;
  vehicle_type_id: number;
  brand_id: number | null;
  custom_brand_name: string | null;
  model: string | null;
  production_year: string | null;
  license_plate: string | null;
  fuel_type: FuelType;
  is_income_generating: boolean;
  purchase_date: string | null; // ISO date string
  purchase_price: number | null;
  purchase_currency: string;
  sale_date: string | null; // ISO date string
  sale_price: number | null;
  sale_currency: string;
  image_uri: string | null;
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateVehicleInput {
  user_id: number;
  name: string;
  vehicle_type_id: number;
  brand_id?: number | null;
  custom_brand_name?: string | null;
  model?: string | null;
  production_year?: string | null;
  license_plate?: string | null;
  fuel_type: FuelType;
  is_income_generating?: boolean;
  purchase_date?: string | null;
  purchase_price?: number | null;
  purchase_currency?: string;
  sale_date?: string | null;
  sale_price?: number | null;
  sale_currency?: string;
  image_uri?: string | null;
}

export interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  id: number;
}

// Vehicle Transactions table
export interface VehicleTransaction {
  id: number;
  vehicle_id: number;
  transaction_type: TransactionType;
  amount: number;
  currency: string; // Transaction currency (TRY, USD, EUR)
  default_currency: string; // User's default currency at time of transaction
  foreign_currency: string | null; // If different from default, same as currency
  exchange_rate: number | null; // Exchange rate if foreign currency used
  expense_type_id: number | null;
  income_type_id: number | null;
  energy_station_id: number | null; // For fuel expenses
  customer_id: number | null; // For incomes
  company_id: number | null; // For expenses
  description: string | null;
  transaction_date: string; // ISO date string
  odometer_reading: number | null;
  receipt_image_uri: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CreateTransactionInput {
  vehicle_id: number;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  default_currency: string;
  foreign_currency?: string | null;
  exchange_rate?: number | null;
  expense_type_id?: number | null;
  income_type_id?: number | null;
  energy_station_id?: number | null;
  customer_id?: number | null;
  company_id?: number | null;
  description?: string | null;
  transaction_date: string;
  odometer_reading?: number | null;
  receipt_image_uri?: string | null;
}

// Expense Types table
export interface ExpenseType {
  id: number;
  name: string;
  is_custom: boolean;
  user_id: number | null;
  is_active: boolean;
  created_at: string; // ISO timestamp
}

export interface CreateExpenseTypeInput {
  name: string;
  user_id: number;
  is_custom: boolean;
}

// Expenses table
export interface Expense {
  id: number;
  transaction_id: number;
  expense_type_id: number;
  fuel_unit_price: number | null; // Price per liter for fuel expenses
  notes: string | null;
}

export interface CreateExpenseInput {
  transaction_id: number;
  expense_type_id: number;
  fuel_unit_price?: number | null;
  notes?: string | null;
}

// Income Types table
export interface IncomeType {
  id: number;
  name: string;
  is_custom: boolean;
  user_id: number | null;
  is_active: boolean;
  created_at: string; // ISO timestamp
}

export interface CreateIncomeTypeInput {
  name: string;
  user_id: number;
  is_custom: boolean;
}

// Incomes table
export interface Income {
  id: number;
  transaction_id: number;
  income_type_id: number;
  start_odometer: number | null;
  end_odometer: number | null;
  notes: string | null;
}

export interface CreateIncomeInput {
  transaction_id: number;
  income_type_id: number;
  start_odometer?: number | null;
  end_odometer?: number | null;
  notes?: string | null;
}

// User & Subscription
export interface User {
  id: number;
  email: string | null;
  subscription_plan: SubscriptionPlan;
  default_currency: string; // Default: 'TRY'
  subscription_expiry: string | null; // ISO date string
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

// Joined types for queries
export interface VehicleWithBrand extends Vehicle {
  brand_name?: string; // From brands table or custom_brand_name
  vehicle_type_name_key?: string; // From vehicle_types table
}

export interface TransactionWithDetails extends VehicleTransaction {
  vehicle_name?: string;
  expense_type_name?: string;
  income_type_name?: string;
  energy_station_name?: string;
  customer_name?: string;
  company_name?: string;
  fuel_unit_price?: number | null; // From expenses table for fuel transactions
}

// Report types
export interface ExpenseSummary {
  expense_type: string;
  total_amount: number;
  currency: string;
  transaction_count: number;
}

export interface IncomeSummary {
  income_type: string;
  total_amount: number;
  currency: string;
  transaction_count: number;
}

export interface ProfitLossSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  currency: string;
}

export interface MonthlyReport {
  vehicle_id: number;
  vehicle_name: string;
  period: string; // YYYY-MM
  expenses: ExpenseSummary[];
  incomes: IncomeSummary[];
  summary: ProfitLossSummary;
}
