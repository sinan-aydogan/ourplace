import * as SQLite from 'expo-sqlite';
import type {
  Brand,
  Vehicle,
  VehicleTypeRecord,
  VehicleTransaction,
  ExpenseType,
  IncomeType,
  Expense,
  Income,
  User,
  CreateVehicleInput,
  CreateTransactionInput,
  CreateExpenseInput,
  CreateIncomeInput,
  CreateExpenseTypeInput,
  CreateIncomeTypeInput,
  UpdateVehicleInput,
  VehicleWithBrand,
  TransactionWithDetails,
  EnergyStation,
  Company,
  Customer,
  Currency,
} from '@/types/database';

const DB_NAME = 'cockpit.db';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Users table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        subscription_plan TEXT NOT NULL DEFAULT 'free',
        default_currency TEXT NOT NULL DEFAULT 'TRY',
        subscription_expiry TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration: Add default_currency column if it doesn't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE users ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'TRY';
      `);
    } catch (e) {
      // Column might already exist, ignore
    }

    // Currencies table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS currencies (
        code TEXT PRIMARY KEY
      );
    `);

    // Insert default currencies
    await this.db.execAsync(`
      INSERT OR IGNORE INTO currencies (code) VALUES ('TRY'), ('USD'), ('EUR');
    `);

    // Vehicle Types table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS vehicle_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name_key TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Insert default vehicle types
    await this.db.execAsync(`
      INSERT OR IGNORE INTO vehicle_types (id, name_key) VALUES
      (1, 'car'),
      (2, 'motorcycle'),
      (3, 'truck'),
      (4, 'bus');
    `);

    // Brands table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        vehicle_type TEXT NOT NULL
      );
    `);

    // Vehicles table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        vehicle_type_id INTEGER NOT NULL DEFAULT 1,
        brand_id INTEGER,
        custom_brand_name TEXT,
        model TEXT,
        production_year TEXT,
        license_plate TEXT,
        fuel_type TEXT NOT NULL,
        is_income_generating INTEGER NOT NULL DEFAULT 0,
        purchase_date TEXT,
        purchase_price REAL,
        purchase_currency TEXT DEFAULT 'USD',
        sale_date TEXT,
        sale_price REAL,
        sale_currency TEXT DEFAULT 'USD',
        image_uri TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (brand_id) REFERENCES brands(id),
        FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id)
      );
    `);

    // Migration: Add vehicle_type_id column if it doesn't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicles ADD COLUMN vehicle_type_id INTEGER NOT NULL DEFAULT 1;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }

    // Expense Types table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS expense_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0,
        user_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Income Types table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS income_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0,
        user_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Vehicle Transactions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS vehicle_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        default_currency TEXT NOT NULL DEFAULT 'USD',
        foreign_currency TEXT,
        exchange_rate REAL,
        expense_type_id INTEGER,
        income_type_id INTEGER,
        energy_station_id INTEGER,
        customer_id INTEGER,
        company_id INTEGER,
        description TEXT,
        transaction_date TEXT NOT NULL,
        odometer_reading INTEGER,
        receipt_image_uri TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (expense_type_id) REFERENCES expense_types(id),
        FOREIGN KEY (income_type_id) REFERENCES income_types(id),
        FOREIGN KEY (energy_station_id) REFERENCES energy_stations(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      );
    `);

    // Migration: Add missing columns if they don't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicle_transactions ADD COLUMN default_currency TEXT NOT NULL DEFAULT 'USD';
      `);
    } catch (e) {
      // Column might already exist, ignore
    }
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicle_transactions ADD COLUMN foreign_currency TEXT;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicle_transactions ADD COLUMN exchange_rate REAL;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicle_transactions ADD COLUMN energy_station_id INTEGER;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicle_transactions ADD COLUMN customer_id INTEGER;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }
    try {
      await this.db.execAsync(`
        ALTER TABLE vehicle_transactions ADD COLUMN company_id INTEGER;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }

    // Expenses table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        expense_type_id INTEGER NOT NULL,
        fuel_unit_price REAL,
        notes TEXT,
        FOREIGN KEY (transaction_id) REFERENCES vehicle_transactions(id),
        FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
      );
    `);

    // Migration: Add fuel_unit_price column if it doesn't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE expenses ADD COLUMN fuel_unit_price REAL;
      `);
    } catch (e) {
      // Column might already exist, ignore
    }

    // Incomes table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS incomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        income_type_id INTEGER NOT NULL,
        notes TEXT,
        FOREIGN KEY (transaction_id) REFERENCES vehicle_transactions(id),
        FOREIGN KEY (income_type_id) REFERENCES income_types(id)
      );
    `);

    // Energy Stations table (for fuel purchases)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS energy_stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        geo_coordinate TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Companies table (for expense sources)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        geo_coordinate TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Customers table (for income sources)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        geo_coordinate TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // User Limits table (for tracking free tier limits)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        limit_type TEXT NOT NULL,
        remaining_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, limit_type)
      );
    `);

    // User Clicks table (for tracking user interactions)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        click_type TEXT NOT NULL,
        triggered BOOLEAN NOT NULL DEFAULT 0,
        triggered_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Ad Triggers table (for tracking ad displays)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS ad_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        trigger_type TEXT NOT NULL,
        click_type TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Create indexes for better query performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_vehicle_id ON vehicle_transactions(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON vehicle_transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_expenses_transaction_id ON expenses(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_incomes_transaction_id ON incomes(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_energy_stations_user_id ON energy_stations(user_id);
      CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
      CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_limits_user_id ON user_limits(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_clicks_user_id ON user_clicks(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_clicks_created_at ON user_clicks(created_at);
      CREATE INDEX IF NOT EXISTS idx_ad_triggers_user_id ON ad_triggers(user_id);
      CREATE INDEX IF NOT EXISTS idx_ad_triggers_created_at ON ad_triggers(created_at);
    `);
  }

  // User operations
  async createUser(email?: string): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO users (email, subscription_plan) VALUES (?, ?)',
      [email || null, 'free']
    );

    const user = await this.db.getFirstAsync<User>(
      'SELECT * FROM users WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async getUser(id: number): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<User>('SELECT * FROM users WHERE id = ?', [id]);
  }

  async getFirstUser(): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<User>('SELECT * FROM users ORDER BY id LIMIT 1');
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) throw new Error('No fields to update');

    fields.push('updated_at = datetime("now")');
    values.push(id);

    await this.db.runAsync(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const user = await this.db.getFirstAsync<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!user) throw new Error('User not found');
    return user;
  }

  // Vehicle operations
  async getVehicleTypes(): Promise<VehicleTypeRecord[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<VehicleTypeRecord>(
      'SELECT * FROM vehicle_types ORDER BY id'
    );
  }

  async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `INSERT INTO vehicles (
        user_id, name, vehicle_type_id, brand_id, custom_brand_name, model, production_year,
        license_plate, fuel_type, is_income_generating, purchase_date,
        purchase_price, purchase_currency, sale_date, sale_price,
        sale_currency, image_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.user_id,
        input.name,
        input.vehicle_type_id || 1,
        input.brand_id || null,
        input.custom_brand_name || null,
        input.model || null,
        input.production_year || null,
        input.license_plate || null,
        input.fuel_type,
        input.is_income_generating ? 1 : 0,
        input.purchase_date || null,
        input.purchase_price || null,
        input.purchase_currency || 'USD',
        input.sale_date || null,
        input.sale_price || null,
        input.sale_currency || 'USD',
        input.image_uri || null,
      ]
    );

    const vehicle = await this.db.getFirstAsync<Vehicle>(
      'SELECT * FROM vehicles WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!vehicle) throw new Error('Failed to create vehicle');
    return vehicle;
  }

  async updateVehicle(input: UpdateVehicleInput): Promise<Vehicle> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(input).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'is_income_generating') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    fields.push('updated_at = datetime("now")');
    values.push(input.id);

    await this.db.runAsync(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const vehicle = await this.db.getFirstAsync<Vehicle>(
      'SELECT * FROM vehicles WHERE id = ?',
      [input.id]
    );

    if (!vehicle) throw new Error('Vehicle not found');
    return vehicle;
  }

  async getVehicle(id: number): Promise<VehicleWithBrand | null> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getFirstAsync<VehicleWithBrand>(
      `SELECT v.*, 
        COALESCE(b.name, v.custom_brand_name) as brand_name,
        vt.name_key as vehicle_type_name_key
      FROM vehicles v
      LEFT JOIN brands b ON v.brand_id = b.id
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE v.id = ?`,
      [id]
    );
  }

  async getUserVehicles(userId: number): Promise<VehicleWithBrand[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<VehicleWithBrand>(
      `SELECT v.*,
        COALESCE(b.name, v.custom_brand_name) as brand_name,
        vt.name_key as vehicle_type_name_key
      FROM vehicles v
      LEFT JOIN brands b ON v.brand_id = b.id
      LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
      WHERE v.user_id = ? AND v.is_active = 1
      ORDER BY v.created_at DESC`,
      [userId]
    );
  }

  async deleteVehicle(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Soft delete
    await this.db.runAsync(
      'UPDATE vehicles SET is_active = 0, updated_at = datetime("now") WHERE id = ?',
      [id]
    );
  }

  // Transaction operations
  async createTransaction(input: CreateTransactionInput): Promise<VehicleTransaction> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `INSERT INTO vehicle_transactions (
        vehicle_id, transaction_type, amount, currency, default_currency,
        foreign_currency, exchange_rate, expense_type_id, income_type_id,
        energy_station_id, customer_id, company_id, description,
        transaction_date, odometer_reading, receipt_image_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.vehicle_id,
        input.transaction_type,
        input.amount,
        input.currency,
        input.default_currency,
        input.foreign_currency || null,
        input.exchange_rate || null,
        input.expense_type_id || null,
        input.income_type_id || null,
        input.energy_station_id || null,
        input.customer_id || null,
        input.company_id || null,
        input.description || null,
        input.transaction_date,
        input.odometer_reading || null,
        input.receipt_image_uri || null,
      ]
    );

    const transaction = await this.db.getFirstAsync<VehicleTransaction>(
      'SELECT * FROM vehicle_transactions WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!transaction) throw new Error('Failed to create transaction');
    return transaction;
  }

  async getVehicleTransactions(
    vehicleId: number,
    limit?: number,
    offset?: number
  ): Promise<TransactionWithDetails[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (!vehicleId) return [];

    try {
      let query = `
        SELECT vt.*,
          v.name as vehicle_name,
          et.name as expense_type_name,
          it.name as income_type_name,
          e.fuel_unit_price as fuel_unit_price
        FROM vehicle_transactions vt
        LEFT JOIN vehicles v ON vt.vehicle_id = v.id
        LEFT JOIN expense_types et ON vt.expense_type_id = et.id
        LEFT JOIN income_types it ON vt.income_type_id = it.id
        LEFT JOIN expenses e ON vt.id = e.transaction_id
        WHERE vt.vehicle_id = ?
        ORDER BY vt.transaction_date DESC, vt.created_at DESC
      `;

      const params: any[] = [vehicleId];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }

      return await this.db.getAllAsync<TransactionWithDetails>(query, params);
    } catch (error) {
      console.error('Failed to get vehicle transactions:', error);
      return [];
    }
  }

  // Expense operations
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO expenses (transaction_id, expense_type_id, fuel_unit_price, notes) VALUES (?, ?, ?, ?)',
      [
        input.transaction_id,
        input.expense_type_id,
        input.fuel_unit_price || null,
        input.notes || null
      ]
    );

    const expense = await this.db.getFirstAsync<Expense>(
      'SELECT * FROM expenses WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!expense) throw new Error('Failed to create expense');
    return expense;
  }

  async getExpenseTypes(userId?: number): Promise<ExpenseType[]> {
    if (!this.db) throw new Error('Database not initialized');

    if (userId) {
      return await this.db.getAllAsync<ExpenseType>(
        `SELECT * FROM expense_types 
         WHERE (is_custom = 0 OR user_id = ?) AND is_active = 1 
         ORDER BY is_custom ASC, name ASC`,
        [userId]
      );
    }

    return await this.db.getAllAsync<ExpenseType>(
      'SELECT * FROM expense_types WHERE is_custom = 0 AND is_active = 1 ORDER BY name ASC'
    );
  }

  async createExpenseType(input: CreateExpenseTypeInput): Promise<ExpenseType> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO expense_types (name, is_custom, user_id, is_active) VALUES (?, 1, ?, 1)',
      [input.name, input.user_id]
    );

    const expenseType = await this.db.getFirstAsync<ExpenseType>(
      'SELECT * FROM expense_types WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!expenseType) throw new Error('Failed to create expense type');
    return expenseType;
  }

  async updateExpenseType(id: number, name: string): Promise<ExpenseType> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE expense_types SET name = ? WHERE id = ?',
      [name, id]
    );

    const expenseType = await this.db.getFirstAsync<ExpenseType>(
      'SELECT * FROM expense_types WHERE id = ?',
      [id]
    );

    if (!expenseType) throw new Error('Expense type not found');
    return expenseType;
  }

  async deleteExpenseType(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if there are any expenses using this type
    const expenses = await this.db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM expenses WHERE expense_type_id = ?',
      [id]
    );

    const hasExpenses = expenses[0]?.count > 0;

    if (hasExpenses) {
      // Soft delete - set is_active to 0
      await this.db.runAsync(
        'UPDATE expense_types SET is_active = 0 WHERE id = ?',
        [id]
      );
    } else {
      // Hard delete - completely remove
      await this.db.runAsync(
        'DELETE FROM expense_types WHERE id = ?',
        [id]
      );
    }
  }

  async getExpenseTypeById(id: number): Promise<ExpenseType | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<ExpenseType>(
      'SELECT * FROM expense_types WHERE id = ?',
      [id]
    );
  }

  // Income operations
  async createIncome(input: CreateIncomeInput): Promise<Income> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO incomes (transaction_id, income_type_id, notes) VALUES (?, ?, ?)',
      [input.transaction_id, input.income_type_id, input.notes || null]
    );

    const income = await this.db.getFirstAsync<Income>(
      'SELECT * FROM incomes WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!income) throw new Error('Failed to create income');
    return income;
  }

  async getIncomeTypes(userId?: number): Promise<IncomeType[]> {
    if (!this.db) throw new Error('Database not initialized');

    if (userId) {
      return await this.db.getAllAsync<IncomeType>(
        `SELECT * FROM income_types 
         WHERE (is_custom = 0 OR user_id = ?) AND is_active = 1 
         ORDER BY is_custom ASC, name ASC`,
        [userId]
      );
    }

    return await this.db.getAllAsync<IncomeType>(
      'SELECT * FROM income_types WHERE is_custom = 0 AND is_active = 1 ORDER BY name ASC'
    );
  }

  async createIncomeType(input: CreateIncomeTypeInput): Promise<IncomeType> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO income_types (name, is_custom, user_id, is_active) VALUES (?, 1, ?, 1)',
      [input.name, input.user_id]
    );

    const incomeType = await this.db.getFirstAsync<IncomeType>(
      'SELECT * FROM income_types WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!incomeType) throw new Error('Failed to create income type');
    return incomeType;
  }

  async updateIncomeType(id: number, name: string): Promise<IncomeType> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE income_types SET name = ? WHERE id = ?',
      [name, id]
    );

    const incomeType = await this.db.getFirstAsync<IncomeType>(
      'SELECT * FROM income_types WHERE id = ?',
      [id]
    );

    if (!incomeType) throw new Error('Income type not found');
    return incomeType;
  }

  async deleteIncomeType(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if there are any incomes using this type
    const incomes = await this.db.getAllAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM incomes WHERE income_type_id = ?',
      [id]
    );

    const hasIncomes = incomes[0]?.count > 0;

    if (hasIncomes) {
      // Soft delete - set is_active to 0
      await this.db.runAsync(
        'UPDATE income_types SET is_active = 0 WHERE id = ?',
        [id]
      );
    } else {
      // Hard delete - completely remove
      await this.db.runAsync(
        'DELETE FROM income_types WHERE id = ?',
        [id]
      );
    }
  }

  async getIncomeTypeById(id: number): Promise<IncomeType | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<IncomeType>(
      'SELECT * FROM income_types WHERE id = ?',
      [id]
    );
  }

  // Brand operations
  async getBrands(): Promise<Brand[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Brand>('SELECT * FROM brands ORDER BY name ASC');
  }

  // Currency operations
  async getCurrencies(): Promise<{ code: string }[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<{ code: string }>('SELECT * FROM currencies ORDER BY code ASC');
  }

  // Utility methods

  async getVehicleById(id: number): Promise<Vehicle | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<Vehicle>(
      'SELECT * FROM vehicles WHERE id = ? AND is_active = 1',
      [id]
    );
  }

  // Source operations
  async createEnergyStation(input: { user_id: number; name: string; geo_coordinate?: string | null }): Promise<EnergyStation> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO energy_stations (user_id, name, geo_coordinate, is_active) VALUES (?, ?, ?, 1)',
      [input.user_id, input.name, input.geo_coordinate || null]
    );

    const station = await this.db.getFirstAsync<EnergyStation>(
      'SELECT * FROM energy_stations WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!station) throw new Error('Failed to create energy station');
    return station;
  }

  async createCompany(input: { user_id: number; name: string; geo_coordinate?: string | null }): Promise<Company> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO companies (user_id, name, geo_coordinate, is_active) VALUES (?, ?, ?, 1)',
      [input.user_id, input.name, input.geo_coordinate || null]
    );

    const company = await this.db.getFirstAsync<Company>(
      'SELECT * FROM companies WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!company) throw new Error('Failed to create company');
    return company;
  }

  async createCustomer(input: { user_id: number; name: string; geo_coordinate?: string | null }): Promise<Customer> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO customers (user_id, name, geo_coordinate, is_active) VALUES (?, ?, ?, 1)',
      [input.user_id, input.name, input.geo_coordinate || null]
    );

    const customer = await this.db.getFirstAsync<Customer>(
      'SELECT * FROM customers WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!customer) throw new Error('Failed to create customer');
    return customer;
  }

  async getEnergyStations(userId: number): Promise<EnergyStation[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<EnergyStation>(
      'SELECT * FROM energy_stations WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
      [userId]
    );
  }

  async getCompanies(userId: number): Promise<Company[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Company>(
      'SELECT * FROM companies WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
      [userId]
    );
  }

  async getCustomers(userId: number): Promise<Customer[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Customer>(
      'SELECT * FROM customers WHERE user_id = ? AND is_active = 1 ORDER BY name ASC',
      [userId]
    );
  }

  async getTransactionsByVehicle(vehicleId: number): Promise<VehicleTransaction[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<VehicleTransaction>(
      'SELECT * FROM vehicle_transactions WHERE vehicle_id = ?',
      [vehicleId]
    );
  }

  async getIncomesByTransaction(transactionId: number): Promise<Income[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Income>(
      'SELECT * FROM incomes WHERE transaction_id = ?',
      [transactionId]
    );
  }


  async getExpensesByTransaction(transactionId: number): Promise<Expense[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Expense>(
      'SELECT * FROM expenses WHERE transaction_id = ?',
      [transactionId]
    );
  }

  async deleteTransaction(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'DELETE FROM vehicle_transactions WHERE id = ?',
      [id]
    );
  }

  async deleteExpense(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'DELETE FROM expenses WHERE id = ?',
      [id]
    );
  }

  async deleteIncome(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'DELETE FROM incomes WHERE id = ?',
      [id]
    );
  }

  async getLastFuelTransaction(vehicleId: number): Promise<TransactionWithDetails | null> {
    if (!this.db) throw new Error('Database not initialized');
    if (!vehicleId || vehicleId <= 0) return null;
    
    try {
      // First, get all expense transactions for this vehicle
      const transactions = await this.db.getAllAsync<TransactionWithDetails>(
        `SELECT vt.*, 
          et.name as expense_type_name, 
          it.name as income_type_name,
          e.fuel_unit_price as fuel_unit_price
         FROM vehicle_transactions vt
         LEFT JOIN expense_types et ON vt.expense_type_id = et.id
         LEFT JOIN income_types it ON vt.income_type_id = it.id
         LEFT JOIN expenses e ON vt.id = e.transaction_id
         WHERE vt.vehicle_id = ? 
         AND vt.transaction_type = 'expense' 
         ORDER BY vt.transaction_date DESC, vt.created_at DESC`,
        [vehicleId]
      );

      // Filter for fuel transactions in JavaScript to avoid SQL null issues
      const fuelTransaction = transactions.find(t => {
        const expenseTypeName = t.expense_type_name || '';
        const lowerName = expenseTypeName.toLowerCase();
        return lowerName.includes('fuel') || lowerName.includes('yakıt');
      });

      return fuelTransaction || null;
    } catch (error) {
      console.error('Failed to get last fuel transaction:', error);
      return null;
    }
  }

  async getLastIncomeTransaction(vehicleId: number): Promise<TransactionWithDetails | null> {
    if (!this.db) throw new Error('Database not initialized');
    if (!vehicleId) return null;
    
    try {
      return await this.db.getFirstAsync<TransactionWithDetails>(
        `SELECT vt.*, et.name as expense_type_name, it.name as income_type_name
         FROM vehicle_transactions vt
         LEFT JOIN expense_types et ON vt.expense_type_id = et.id
         LEFT JOIN income_types it ON vt.income_type_id = it.id
         WHERE vt.vehicle_id = ? AND vt.transaction_type = 'income'
         ORDER BY vt.transaction_date DESC, vt.created_at DESC
         LIMIT 1`,
        [vehicleId]
      );
    } catch (error) {
      console.error('Failed to get last income transaction:', error);
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM incomes;
      DELETE FROM expenses;
      DELETE FROM vehicle_transactions;
      DELETE FROM vehicles;
      DELETE FROM income_types;
      DELETE FROM expense_types;
      DELETE FROM brands;
      DELETE FROM users;
    `);
  }

  // User Limits operations
  async initializeUserLimits(userId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const limits = [
      { type: 'vehicle_add', count: 1 },
      { type: 'expense_type_add', count: 2 },
      { type: 'income_type_add', count: 2 },
    ];

    for (const limit of limits) {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO user_limits (user_id, limit_type, remaining_count) 
         VALUES (?, ?, ?)`,
        [userId, limit.type, limit.count]
      );
    }
  }

  async getUserLimit(userId: number, limitType: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const limit = await this.db.getFirstAsync<{ remaining_count: number }>(
      'SELECT remaining_count FROM user_limits WHERE user_id = ? AND limit_type = ?',
      [userId, limitType]
    );
    return limit?.remaining_count ?? 0;
  }

  async decrementUserLimit(userId: number, limitType: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `UPDATE user_limits SET remaining_count = remaining_count - 1, updated_at = datetime('now')
       WHERE user_id = ? AND limit_type = ? AND remaining_count > 0`,
      [userId, limitType]
    );
  }

  async incrementUserLimit(userId: number, limitType: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `UPDATE user_limits SET remaining_count = remaining_count + 1, updated_at = datetime('now')
       WHERE user_id = ? AND limit_type = ?`,
      [userId, limitType]
    );
  }

  // User Clicks operations
  async trackClick(
    userId: number,
    clickType: string,
    triggered: boolean = false,
    triggeredBy?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT INTO user_clicks (user_id, click_type, triggered, triggered_by) 
       VALUES (?, ?, ?, ?)`,
      [userId, clickType, triggered ? 1 : 0, triggeredBy || null]
    );
  }

  async getClickCount(
    userId: number,
    clickType: string,
    sinceMinutes?: number
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    let query = 'SELECT COUNT(*) as count FROM user_clicks WHERE user_id = ? AND click_type = ?';
    const params: any[] = [userId, clickType];

    if (sinceMinutes) {
      query += ` AND created_at >= datetime('now', '-${sinceMinutes} minutes')`;
    }

    const result = await this.db.getFirstAsync<{ count: number }>(query, params);
    return result?.count ?? 0;
  }

  // Ad Triggers operations
  async recordAdTrigger(
    user_id: number,
    triggerType: string,
    clickType?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      `INSERT INTO ad_triggers (user_id, trigger_type, click_type) 
       VALUES (?, ?, ?)`,
      [user_id, triggerType, clickType || null]
    );
  }

  async hasRecentAdTrigger(userId: number, withinMinutes: number = 5): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ad_triggers 
       WHERE user_id = ? AND created_at >= datetime('now', '-${withinMinutes} minutes')`,
      [userId]
    );
    return (result?.count ?? 0) > 0;
  }
}

export const db = new DatabaseService();
