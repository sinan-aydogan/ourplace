import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AD_UNITS } from '@/services/admob';

// Hook version for easier usage
export function useRewardedAd(
  adUnitId: string = AD_UNITS.REWARDED,
  onRewarded?: () => void
) {
  const [rewarded, setRewarded] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Skip on web platform
    if (Platform.OS === 'web') {
      return;
    }

    let RewardedAd: any;
    let RewardedAdEventType: any;
    
    try {
      const adsModule = require('react-native-google-mobile-ads');
      RewardedAd = adsModule.RewardedAd;
      RewardedAdEventType = adsModule.RewardedAdEventType;
    } catch (error) {
      console.warn('AdMob module not available:', error);
      return;
    }

    const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsLoaded(true);
      setIsLoading(false);
    });

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onRewarded?.();
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        setIsLoaded(false);
        // Reload for next time
        setIsLoading(true);
        rewardedAd.load();
      }
    );

    setIsLoading(true);
    rewardedAd.load();
    setRewarded(rewardedAd);

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, [adUnitId, onRewarded]);

  const show = async () => {
    if (rewarded && isLoaded) {
      await rewarded.show();
    }
  };

  return { show, isLoaded, isLoading };
}
