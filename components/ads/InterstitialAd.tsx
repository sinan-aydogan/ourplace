import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AD_UNITS } from '@/services/admob';

interface InterstitialAdComponentProps {
  adUnitId?: string;
  onAdClosed?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
}

export function InterstitialAdComponent({
  adUnitId = AD_UNITS.INTERSTITIAL,
  onAdClosed,
  onAdFailedToLoad,
}: InterstitialAdComponentProps) {
  const [interstitial, setInterstitial] = useState<any>(null);

  useEffect(() => {
    // Skip on web platform
    if (Platform.OS === 'web') {
      return;
    }

    let InterstitialAd: any;
    let AdEventType: any;
    
    try {
      const adsModule = require('react-native-google-mobile-ads');
      InterstitialAd = adsModule.InterstitialAd;
      AdEventType = adsModule.AdEventType;
    } catch (error) {
      console.warn('AdMob module not available:', error);
      return;
    }

    const interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('Interstitial ad loaded');
    });

    const unsubscribeClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('Interstitial ad closed');
      onAdClosed?.();
      // Reload for next time
      interstitialAd.load();
    });

    const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
      console.error('Interstitial ad error:', error);
      onAdFailedToLoad?.(error);
    });

    interstitialAd.load();
    setInterstitial(interstitialAd);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [adUnitId, onAdClosed, onAdFailedToLoad]);

  return null;
}

// Hook version for easier usage
export function useInterstitialAd(
  adUnitId: string = AD_UNITS.INTERSTITIAL,
  onAdClosed?: () => void
) {
  const [interstitial, setInterstitial] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Skip on web platform
    if (Platform.OS === 'web') {
      return;
    }

    let InterstitialAd: any;
    let AdEventType: any;
    
    try {
      const adsModule = require('react-native-google-mobile-ads');
      InterstitialAd = adsModule.InterstitialAd;
      AdEventType = adsModule.AdEventType;
    } catch (error) {
      console.warn('AdMob module not available:', error);
      return;
    }

    const interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });

    const unsubscribeClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      onAdClosed?.();
      // Reload for next time
      setIsLoading(true);
      interstitialAd.load();
    });

    const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Interstitial ad error:', error);
      setIsLoaded(false);
      setIsLoading(false);
    });

    setIsLoading(true);
    interstitialAd.load();
    setInterstitial(interstitialAd);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [adUnitId, onAdClosed]);

  const show = async () => {
    if (interstitial && isLoaded) {
      await interstitial.show();
    }
  };

  return { show, isLoaded, isLoading };
}

