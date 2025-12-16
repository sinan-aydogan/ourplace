import { Platform } from 'react-native';

// AdMob App ID
export const ADMOB_APP_ID = 'ca-app-pub-1104751304978372~6544635071';

// Ad Unit IDs
export const AD_UNITS = {
  REWARDED: 'ca-app-pub-1104751304978372/6353063384',
  BANNER: 'ca-app-pub-1104751304978372/3726900049',
  INTERSTITIAL: 'ca-app-pub-1104751304978372/7900473998',
};

// Check if native module is available (without requiring the ads module)
const isNativeModuleAvailable = (): boolean => {
  if (Platform.OS === 'web') {
    return false;
  }
  
  try {
    const ReactNative = require('react-native');
    // Try to access the native module registry
    if (ReactNative.NativeModules && 'RNGoogleMobileAdsModule' in ReactNative.NativeModules) {
      return true;
    }
    // Also check TurboModules (but don't use getEnforcing as it throws)
    if (ReactNative.TurboModuleRegistry) {
      try {
        // Use get() instead of getEnforcing() to avoid throwing
        const module = ReactNative.TurboModuleRegistry.get('RNGoogleMobileAdsModule');
        return module !== null && module !== undefined;
      } catch {
        return false;
      }
    }
    return false;
  } catch {
    // If we can't check, assume it's not available (safer)
    return false;
  }
};

// Initialize AdMob (only on native platforms with native module available)
export const initializeAdMob = async () => {
  // Skip on web platform
  if (Platform.OS === 'web') {
    console.log('AdMob skipped on web platform');
    return;
  }

  // Check if native module is available
  if (!isNativeModuleAvailable()) {
    console.log('AdMob native module not available (expected in Expo Go, requires development build)');
    return;
  }

  try {
    // Dynamic import to avoid loading on web
    let adsModule: any;
    
    try {
      adsModule = require('react-native-google-mobile-ads');
    } catch (requireError: any) {
      // Check if it's the TurboModuleRegistry error
      if (requireError?.message?.includes('TurboModuleRegistry') || 
          requireError?.message?.includes('RNGoogleMobileAdsModule')) {
        console.log('AdMob native module not available (expected in Expo Go, requires development build)');
      } else {
        console.log('AdMob module require failed:', requireError);
      }
      return;
    }
    
    // Check if module was loaded
    if (!adsModule) {
      console.log('AdMob module not available');
      return;
    }
    
    // The package exports both default and MobileAds
    // MobileAds is a function that returns the ads instance
    const MobileAds = adsModule?.MobileAds || adsModule?.default;
    
    if (MobileAds && typeof MobileAds === 'function') {
      const mobileAds = MobileAds();
      if (mobileAds && typeof mobileAds.initialize === 'function') {
        await mobileAds.initialize();
        console.log('AdMob initialized successfully');
      } else {
        console.warn('AdMob initialize method not found');
      }
    } else {
      console.warn('AdMob MobileAds not found, skipping initialization');
    }
  } catch (error: any) {
    // Check if it's a module not found error (expected in Expo Go)
    if (error?.message?.includes('TurboModuleRegistry') || 
        error?.message?.includes('RNGoogleMobileAdsModule')) {
      console.log('AdMob native module not available (expected in Expo Go, requires development build)');
    } else {
      console.error('Failed to initialize AdMob:', error);
    }
    // Don't throw - allow app to continue without ads
  }
};

