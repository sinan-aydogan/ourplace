import * as SQLite from 'expo-sqlite';
import type {
  Brand,
  Vehicle,
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
        subscription_expiry TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

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
        FOREIGN KEY (brand_id) REFERENCES brands(id)
      );
    `);

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
        expense_type_id INTEGER,
        income_type_id INTEGER,
        description TEXT,
        transaction_date TEXT NOT NULL,
        odometer_reading INTEGER,
        receipt_image_uri TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (expense_type_id) REFERENCES expense_types(id),
        FOREIGN KEY (income_type_id) REFERENCES income_types(id)
      );
    `);

    // Expenses table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        expense_type_id INTEGER NOT NULL,
        notes TEXT,
        FOREIGN KEY (transaction_id) REFERENCES vehicle_transactions(id),
        FOREIGN KEY (expense_type_id) REFERENCES expense_types(id)
      );
    `);

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
  async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `INSERT INTO vehicles (
        user_id, name, brand_id, custom_brand_name, model, production_year,
        license_plate, fuel_type, is_income_generating, purchase_date,
        purchase_price, purchase_currency, sale_date, sale_price,
        sale_currency, image_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.user_id,
        input.name,
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
        COALESCE(b.name, v.custom_brand_name) as brand_name
      FROM vehicles v
      LEFT JOIN brands b ON v.brand_id = b.id
      WHERE v.id = ?`,
      [id]
    );
  }

  async getUserVehicles(userId: number): Promise<VehicleWithBrand[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync<VehicleWithBrand>(
      `SELECT v.*,
        COALESCE(b.name, v.custom_brand_name) as brand_name
      FROM vehicles v
      LEFT JOIN brands b ON v.brand_id = b.id
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
        vehicle_id, transaction_type, amount, currency, expense_type_id,
        income_type_id, description, transaction_date, odometer_reading,
        receipt_image_uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.vehicle_id,
        input.transaction_type,
        input.amount,
        input.currency,
        input.expense_type_id || null,
        input.income_type_id || null,
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

    let query = `
      SELECT vt.*,
        v.name as vehicle_name,
        et.name as expense_type_name,
        it.name as income_type_name
      FROM vehicle_transactions vt
      LEFT JOIN vehicles v ON vt.vehicle_id = v.id
      LEFT JOIN expense_types et ON vt.expense_type_id = et.id
      LEFT JOIN income_types it ON vt.income_type_id = it.id
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
  }

  // Expense operations
  async createExpense(input: CreateExpenseInput): Promise<Expense> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO expenses (transaction_id, expense_type_id, notes) VALUES (?, ?, ?)',
      [input.transaction_id, input.expense_type_id, input.notes || null]
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
}

export const db = new DatabaseService();
