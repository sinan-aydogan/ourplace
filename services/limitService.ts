import { db } from './database';
import type { User } from '@/types/database';

export type LimitType = 'vehicle_add' | 'expense_type_add' | 'income_type_add';

export class LimitService {
  /**
   * Initialize default limits for a new user
   */
  static async initializeLimits(userId: number): Promise<void> {
    await db.initializeUserLimits(userId);
  }

  /**
   * Check if user has remaining limit for a specific action
   */
  static async hasLimit(userId: number, limitType: LimitType): Promise<boolean> {
    const remaining = await db.getUserLimit(userId, limitType);
    return remaining > 0;
  }

  /**
   * Get remaining count for a limit type
   */
  static async getRemainingCount(
    userId: number,
    limitType: LimitType
  ): Promise<number> {
    return await db.getUserLimit(userId, limitType);
  }

  /**
   * Use one limit (decrement)
   */
  static async useLimit(userId: number, limitType: LimitType): Promise<void> {
    await db.decrementUserLimit(userId, limitType);
  }

  /**
   * Grant one limit (increment) - used after watching rewarded ad
   */
  static async grantLimit(userId: number, limitType: LimitType): Promise<void> {
    await db.incrementUserLimit(userId, limitType);
  }
}

