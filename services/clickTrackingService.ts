import { db } from './database';
import { useInterstitialAd } from '@/components/ads/InterstitialAd';

export type ClickType =
  | 'vehicle_add'
  | 'fuel_add'
  | 'expense_add'
  | 'income_add'
  | 'expense_type_add'
  | 'income_type_add'
  | 'navigation'
  | 'submit';

export class ClickTrackingService {
  /**
   * Track a user click/interaction
   */
  static async trackClick(
    userId: number,
    clickType: ClickType,
    triggered: boolean = false,
    triggeredBy?: string
  ): Promise<void> {
    await db.trackClick(userId, clickType, triggered, triggeredBy);
  }

  /**
   * Check if interstitial ad should be shown based on click patterns
   */
  static async shouldShowInterstitialAd(
    userId: number,
    clickType: ClickType
  ): Promise<boolean> {
    // Don't trigger for rewarded ad types
    if (['vehicle_add', 'expense_type_add', 'income_type_add'].includes(clickType)) {
      return false;
    }

    // Check if user has seen an ad in the last 5 minutes
    const hasRecentAd = await db.hasRecentAdTrigger(userId, 5);
    if (hasRecentAd) {
      return false;
    }

    // Check specific rules
    if (clickType === 'fuel_add') {
      const count = await db.getClickCount(userId, 'fuel_add');
      return count % 3 === 0 && count > 0;
    }

    if (clickType === 'navigation') {
      const count = await db.getClickCount(userId, 'navigation');
      return count % 10 === 0 && count > 0;
    }

    if (clickType === 'submit') {
      const count = await db.getClickCount(userId, 'submit');
      return count % 6 === 0 && count > 0;
    }

    return false;
  }

  /**
   * Track click and potentially show interstitial ad
   */
  static async trackClickAndShowAd(
    userId: number,
    clickType: ClickType,
    showInterstitial: () => Promise<void>
  ): Promise<boolean> {
    // Track the click first
    const shouldShow = await this.shouldShowInterstitialAd(userId, clickType);
    await this.trackClick(userId, clickType, shouldShow, shouldShow ? 'interstitial' : undefined);

    if (shouldShow) {
      await showInterstitial();
      await db.recordAdTrigger(userId, 'interstitial', clickType);
      return true;
    }

    return false;
  }
}

