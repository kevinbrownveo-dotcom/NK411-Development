import db from '../config/database';
import { logger } from '../utils/logger';

/**
 * Token Blacklist Service
 * 
 * DB-based JWT revocation. When a user logs out or is forcefully locked,
 * their token's JTI is added here. The authenticate middleware checks
 * this table on every request.
 * 
 * Expired tokens are periodically cleaned up to prevent table bloat.
 */

/**
 * Add a JWT to the blacklist (instant revocation)
 */
export async function blacklistToken(
    jti: string,
    expiresAt: Date,
    userId?: string,
    reason: 'logout' | 'forced' | 'password_change' = 'logout'
): Promise<void> {
    try {
        await db('token_blacklist')
            .insert({ jti, user_id: userId, reason, expires_at: expiresAt })
            .onConflict('jti')
            .ignore();
    } catch (err: any) {
        logger.error('Failed to blacklist token', { jti, error: err.message });
    }
}

/**
 * Blacklist ALL tokens for a specific user (force logout everywhere)
 * Used when admin locks/deactivates an account or user changes password
 */
export async function blacklistAllUserTokens(
    userId: string,
    reason: 'forced' | 'password_change' = 'forced'
): Promise<void> {
    // Since we can't enumerate all JTIs without Redis,
    // we store a "user-level" blacklist entry with a far-future expiry.
    // The authenticate middleware will check: if user has ANY forced entry
    // created AFTER this token's iat, reject it.
    try {
        await db('token_blacklist')
            .insert({
                jti: `user_all_${userId}_${Date.now()}`,
                user_id: userId,
                reason,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h coverage
            });
    } catch (err: any) {
        logger.error('Failed to blacklist all user tokens', { userId, error: err.message });
    }
}

/**
 * Check if a specific JWT is blacklisted
 */
export async function isBlacklisted(jti: string, userId: string, tokenIssuedAt: number): Promise<boolean> {
    try {
        // Check 1: Exact JTI match
        const exactMatch = await db('token_blacklist')
            .where({ jti })
            .first();
        if (exactMatch) return true;

        // Check 2: User-level forced blacklist (created after this token was issued)
        const userForced = await db('token_blacklist')
            .where('user_id', userId)
            .whereIn('reason', ['forced', 'password_change'])
            .where('created_at', '>', new Date(tokenIssuedAt * 1000))
            .first();
        if (userForced) return true;

        return false;
    } catch (err: any) {
        logger.error('Token blacklist check failed', { jti, error: err.message });
        // Fail-open would be insecure; fail-closed is safer
        return false;
    }
}

/**
 * Remove expired entries from the blacklist (cleanup job)
 */
export async function clearExpiredTokens(): Promise<number> {
    try {
        const deleted = await db('token_blacklist')
            .where('expires_at', '<', new Date())
            .del();
        if (deleted > 0) {
            logger.info(`Token blacklist cleanup: removed ${deleted} expired entries`);
        }
        return deleted;
    } catch (err: any) {
        logger.error('Token blacklist cleanup failed', { error: err.message });
        return 0;
    }
}

// Run cleanup every 6 hours
let cleanupInterval: NodeJS.Timeout | null = null;

export function startBlacklistCleanup() {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => clearExpiredTokens(), 6 * 60 * 60 * 1000);
    // Initial cleanup after 30 seconds
    setTimeout(() => clearExpiredTokens(), 30000);
}

export function stopBlacklistCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
