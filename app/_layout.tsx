import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { Slot, usePathname } from 'expo-router';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { View, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInterstitialAd } from '@/components/ads/InterstitialAd';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Ignore error - this can happen during reloads or if keep-awake fails */
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Handle unhandled promise rejections (like keep awake errors)
  useEffect(() => {
    // Web platform - handle unhandled promise rejections
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const errorMessage = event.reason?.message || String(event.reason || '');
        // Ignore keep awake errors (harmless web platform warnings)
        if (errorMessage?.includes('keep awake') || errorMessage?.includes('keep-awake')) {
          event.preventDefault();
          return;
        }
      };

      if (window.addEventListener) {
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
      }
    }
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme, isLoading, isInitialized } = useApp();
  const pathname = usePathname();
  const [navCount, setNavCount] = useState(0);
  const { show: showInterstitial, isLoaded } = useInterstitialAd();
  const isFirstMount = useRef(true);

  // Load navigation count from storage on mount
  useEffect(() => {
    const loadCount = async () => {
      try {
        const storedCount = await AsyncStorage.getItem('navigation_count');
        if (storedCount) {
          const count = parseInt(storedCount, 10);
          console.log('Loaded navigation count:', count);
          setNavCount(count);
        }
      } catch (error) {
        console.error('Failed to load navigation count:', error);
      }
    };
    loadCount();
  }, []);

  // Increment count on navigation changes
  useEffect(() => {
    // Skip the first execution on mount (which would double count or count initial load)
    // Actually, usePathname returns the current path immediately.
    // We want to count *changes*.

    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Don't simplify return here, as we might want to count the initial load as 1 view?
      // Usually "navigation changes" implies moving FROM somewhere TO somewhere. 
      // Let's assume user wants to count page views essentially.
      // But for safety against reload loops, maybe we just proceed.
      // Let's stick to standard practice: increment on change.
    }

    if (pathname) {
      setNavCount((prev) => {
        const newCount = prev + 1;
        AsyncStorage.setItem('navigation_count', newCount.toString()).catch(console.error);
        console.log(`Navigation count updated: ${newCount} (Path: ${pathname})`);
        return newCount;
      });
    }
  }, [pathname]);

  // Check limit and show ad
  useEffect(() => {
    if (navCount >= 10 && isLoaded) {
      console.log('Navigation count reached limit (10). Showing Interstitial Ad.');
      showInterstitial().then(() => {
        console.log('Ad shown. Resetting count.');
        setNavCount(0);
        AsyncStorage.setItem('navigation_count', '0').catch(console.error);
      }).catch((err) => {
        console.error('Error showing interstitial:', err);
        // Even if ad fails, should we reset? Probably yes to avoid stuck loop.
        // But let's maybe keep it high so it tries again next time? 
        // Better to reset to avoid annoyance if ad fails consistently.
        setNavCount(0);
        AsyncStorage.setItem('navigation_count', '0').catch(console.error);
      });
    }
  }, [navCount, isLoaded, showInterstitial]);

  if (isLoading || !isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GluestackUIProvider mode={colorScheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Slot />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
