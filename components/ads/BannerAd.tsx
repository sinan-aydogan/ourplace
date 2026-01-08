import React from 'react';
import { Platform, View } from 'react-native';
import { AD_UNITS } from '@/services/admob';

interface BannerAdComponentProps {
  adUnitId?: string;
  size?: any;
  className?: string;
}

export function BannerAdComponent({
  adUnitId = AD_UNITS.BANNER,
  size,
  className,
}: BannerAdComponentProps) {
  // Skip on web platform
  if (Platform.OS === 'web') {
    return null;
  }

  let BannerAd: any;
  let BannerAdSize: any;

  try {
    const adsModule = require('react-native-google-mobile-ads');
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
  } catch (error) {
    console.warn('AdMob module not available:', error);
    return null;
  }

  const bannerSize = size || BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

  return (
    <View className={className}>
      <BannerAd
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => console.error('BannerAd failed to load:', error)}
      />
    </View>
  );
}

