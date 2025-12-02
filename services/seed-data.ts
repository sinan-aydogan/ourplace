import { db } from './database';
import type { Brand, ExpenseType, IncomeType } from '@/types/database';

export const seedBrands = async (): Promise<void> => {
  const brands = [
    // Cars
    { name: 'Toyota', vehicle_type: 'car' },
    { name: 'Honda', vehicle_type: 'car' },
    { name: 'Ford', vehicle_type: 'car' },
    { name: 'Volkswagen', vehicle_type: 'car' },
    { name: 'BMW', vehicle_type: 'car' },
    { name: 'Mercedes-Benz', vehicle_type: 'car' },
    { name: 'Audi', vehicle_type: 'car' },
    { name: 'Hyundai', vehicle_type: 'car' },
    { name: 'Kia', vehicle_type: 'car' },
    { name: 'Nissan', vehicle_type: 'car' },
    { name: 'Chevrolet', vehicle_type: 'car' },
    { name: 'Mazda', vehicle_type: 'car' },
    { name: 'Subaru', vehicle_type: 'car' },
    { name: 'Tesla', vehicle_type: 'car' },
    { name: 'Volvo', vehicle_type: 'car' },
    { name: 'Renault', vehicle_type: 'car' },
    { name: 'Peugeot', vehicle_type: 'car' },
    { name: 'Fiat', vehicle_type: 'car' },
    { name: 'Opel', vehicle_type: 'car' },
    { name: 'Seat', vehicle_type: 'car' },
    { name: 'Skoda', vehicle_type: 'car' },
    { name: 'Dacia', vehicle_type: 'car' },
    
    // Trucks
    { name: 'Ford Trucks', vehicle_type: 'truck' },
    { name: 'Mercedes-Benz Trucks', vehicle_type: 'truck' },
    { name: 'Volvo Trucks', vehicle_type: 'truck' },
    { name: 'Scania', vehicle_type: 'truck' },
    { name: 'MAN', vehicle_type: 'truck' },
    { name: 'Iveco', vehicle_type: 'truck' },
    { name: 'DAF', vehicle_type: 'truck' },
    { name: 'Renault Trucks', vehicle_type: 'truck' },
    
    // Motorcycles
    { name: 'Honda Motorcycles', vehicle_type: 'motorcycle' },
    { name: 'Yamaha', vehicle_type: 'motorcycle' },
    { name: 'Suzuki', vehicle_type: 'motorcycle' },
    { name: 'Kawasaki', vehicle_type: 'motorcycle' },
    { name: 'Harley-Davidson', vehicle_type: 'motorcycle' },
    { name: 'BMW Motorrad', vehicle_type: 'motorcycle' },
    { name: 'Ducati', vehicle_type: 'motorcycle' },
    { name: 'KTM', vehicle_type: 'motorcycle' },
    { name: 'Aprilia', vehicle_type: 'motorcycle' },
    { name: 'Triumph', vehicle_type: 'motorcycle' },
    
    // Other
    { name: 'Other Brand', vehicle_type: 'other' },
  ];

  const dbInstance = (db as any).db;
  if (!dbInstance) throw new Error('Database not initialized');

  for (const brand of brands) {
    await dbInstance.runAsync(
      'INSERT OR IGNORE INTO brands (name, vehicle_type) VALUES (?, ?)',
      [brand.name, brand.vehicle_type]
    );
  }
};

export const seedExpenseTypes = async (): Promise<void> => {
  const expenseTypes = [
    'Oil Change', // Yağ Değişimi
    'Brake Pad Replacement', // Balata Değişimi
    'Tire Replacement', // Lastik Değişimi
    'Battery Replacement', // Akü Değişimi
    'General Maintenance', // Genel Bakım
    'Fuel', // Yakıt
    'Insurance', // Sigorta
    'Road Tax', // MTV
    'Parking Fee', // Park Ücreti
    'Toll Fee', // Köprü/Otoyol Ücreti
    'Car Wash', // Araç Yıkama
    'Air Filter Replacement', // Hava Filtresi Değişimi
    'Cabin Filter Replacement', // Kabin Filtresi Değişimi
    'Transmission Service', // Şanzıman Bakımı
    'Coolant Change', // Antifriz Değişimi
    'Windshield Repair', // Cam Tamiri
    'Paint Work', // Boya İşlemi
    'Bodywork Repair', // Kaporta Tamiri
    'Detailing', // Detaylı Temizlik
    'Registration Fee', // Tescil Ücreti
  ];

  const dbInstance = (db as any).db;
  if (!dbInstance) throw new Error('Database not initialized');

  for (const type of expenseTypes) {
    await dbInstance.runAsync(
      'INSERT OR IGNORE INTO expense_types (name, is_custom, user_id, is_active) VALUES (?, 0, NULL, 1)',
      [type]
    );
  }
};

export const seedIncomeTypes = async (): Promise<void> => {
  const incomeTypes = [
    'Ride Service', // Taşıma Hizmeti
    'Rental Income', // Kiralama Geliri
    'Delivery Service', // Teslimat Hizmeti
    'Taxi/Uber Service', // Taksi/Uber
    'Other Service', // Diğer Hizmet
    'Freight Transport', // Nakliye
    'Passenger Transport', // Yolcu Taşımacılığı
    'Courier Service', // Kurye Hizmeti
  ];

  const dbInstance = (db as any).db;
  if (!dbInstance) throw new Error('Database not initialized');

  for (const type of incomeTypes) {
    await dbInstance.runAsync(
      'INSERT OR IGNORE INTO income_types (name, is_custom, user_id, is_active) VALUES (?, 0, NULL, 1)',
      [type]
    );
  }
};

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('Seeding database...');
    await seedBrands();
    await seedExpenseTypes();
    await seedIncomeTypes();
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Failed to seed database:', error);
    throw error;
  }
};
