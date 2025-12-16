import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/services/database';
import { seedDatabase } from '@/services/seed-data';
import { initializeI18n } from '@/services/i18n';
import { initializeAdMob } from '@/services/admob';
import { LimitService } from '@/services/limitService';
import type { User, Vehicle, VehicleWithBrand } from '@/types/database';

const THEME_KEY = '@cockpit:theme';
const SELECTED_VEHICLE_KEY = '@cockpit:selectedVehicle';
const DB_INITIALIZED_KEY = '@cockpit:dbInitialized';

type ThemeMode = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface AppContextType {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  
  // Theme
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
  
  // Vehicle
  selectedVehicle: VehicleWithBrand | null;
  setSelectedVehicle: (vehicle: VehicleWithBrand | null) => void;
  userVehicles: VehicleWithBrand[];
  refreshVehicles: () => Promise<void>;
  
  // Loading
  isLoading: boolean;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const systemColorScheme = useNativeColorScheme();
  
  const [user, setUser] = useState<User | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [selectedVehicle, setSelectedVehicleState] = useState<VehicleWithBrand | null>(null);
  const [userVehicles, setUserVehicles] = useState<VehicleWithBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate actual color scheme based on theme mode
  const colorScheme: ColorScheme = 
    themeMode === 'system' 
      ? systemColorScheme || 'light' 
      : themeMode as ColorScheme;

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);

      // Initialize i18n
      await initializeI18n();

      // Initialize AdMob
      await initializeAdMob();

      // Initialize database
      await db.init();

      // Check if database has been seeded
      const dbInitialized = await AsyncStorage.getItem(DB_INITIALIZED_KEY);
      if (!dbInitialized) {
        await seedDatabase();
        await AsyncStorage.setItem(DB_INITIALIZED_KEY, 'true');
      }

      // Get or create user
      let currentUser = await db.getFirstUser();
      if (!currentUser) {
        currentUser = await db.createUser();
        // Initialize limits for new user
        await LimitService.initializeLimits(currentUser.id);
      } else {
        // Ensure limits exist for existing user (migration)
        const vehicleLimit = await LimitService.getRemainingCount(currentUser.id, 'vehicle_add');
        if (vehicleLimit === 0) {
          await LimitService.initializeLimits(currentUser.id);
        }
      }
      setUser(currentUser);

      // Load saved theme
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeModeState(savedTheme as ThemeMode);
      }

      // Load vehicles
      const vehicles = await db.getUserVehicles(currentUser.id);
      setUserVehicles(vehicles);

      // Load selected vehicle
      if (vehicles.length > 0) {
        const savedVehicleId = await AsyncStorage.getItem(SELECTED_VEHICLE_KEY);
        if (savedVehicleId) {
          const vehicle = vehicles.find(v => v.id === parseInt(savedVehicleId));
          setSelectedVehicleState(vehicle || vehicles[0]);
        } else {
          setSelectedVehicleState(vehicles[0]);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const setSelectedVehicle = async (vehicle: VehicleWithBrand | null) => {
    setSelectedVehicleState(vehicle);
    try {
      if (vehicle) {
        await AsyncStorage.setItem(SELECTED_VEHICLE_KEY, vehicle.id.toString());
      } else {
        await AsyncStorage.removeItem(SELECTED_VEHICLE_KEY);
      }
    } catch (error) {
      console.error('Failed to save selected vehicle:', error);
    }
  };

  const refreshVehicles = async () => {
    if (!user) return;
    
    try {
      const vehicles = await db.getUserVehicles(user.id);
      setUserVehicles(vehicles);

      // Update selected vehicle if it still exists
      if (selectedVehicle) {
        const updatedVehicle = vehicles.find(v => v.id === selectedVehicle.id);
        if (updatedVehicle) {
          setSelectedVehicleState(updatedVehicle);
        } else if (vehicles.length > 0) {
          setSelectedVehicle(vehicles[0]);
        } else {
          setSelectedVehicle(null);
        }
      } else if (vehicles.length > 0) {
        setSelectedVehicle(vehicles[0]);
      }
    } catch (error) {
      console.error('Failed to refresh vehicles:', error);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const updatedUser = await db.getUser(user.id);
      if (updatedUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AppContextType = {
    user,
    setUser,
    refreshUser,
    themeMode,
    colorScheme,
    setThemeMode,
    selectedVehicle,
    setSelectedVehicle,
    userVehicles,
    refreshVehicles,
    isLoading,
    isInitialized,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
