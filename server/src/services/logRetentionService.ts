import db from '../config/database';
import { logger } from '../utils/logger';

/**
 * Log Retention Service
 * 
 * Periodically reviews the log_retention_policies table and deletes
 * old logs from audit_log, security_event_log, application_log, and integration_log.
 * Temporarily disables immutability triggers during cleanup to allow deletion of expired records.
 */

// IMMUTABLE TABLES that require trigger disable/enable for retention
const IMMUTABLE_TABLES: Record<string, string> = {
    'audit_log': 'trg_audit_log_immutable',
    'security_event_log': 'trg_security_event_immutable',
};

// WHITELIST of allowed tables for retention cleanup to prevent SQL injection
const ALLOWED_LOG_TABLES = [
    'audit_log',
    'security_event_log',
    'application_log',
    'integration_log'
];

export async function runLogRetentionCleanup(): Promise<void> {
    logger.info('Starting Log Retention Cleanup job...');
    try {
        const policies = await db('rr_system.log_retention_policies');

        for (const policy of policies) {
            const { log_table, retention_days } = policy;

            // SQL Injection protection: validate table name against whitelist
            if (!ALLOWED_LOG_TABLES.includes(log_table)) {
                logger.error(`Security Alert: Unauthorized log table in retention policy: ${log_table}`);
                continue;
            }

            // Calculate cutoff date (current date - retention_days)
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retention_days);

            logger.info(`Retention check for table: ${log_table} (older than ${cutoffDate.toISOString()})`);

            await db.transaction(async (trx) => {
                let deletedCount = 0;
                const triggerName = IMMUTABLE_TABLES[log_table];

                try {
                    // 1. If immutable, temporarily disable protection for authorized cleanup
                    if (triggerName) {
                        await trx.raw(`ALTER TABLE rr_system.${log_table} DISABLE TRIGGER ${triggerName}`);
                    }

                    // 2. Perform deletion
                    deletedCount = await trx(`rr_system.${log_table}`)
                        .where('created_at', '<', cutoffDate)
                        .del();

                    // 3. Re-enable protection immediately
                    if (triggerName) {
                        await trx.raw(`ALTER TABLE rr_system.${log_table} ENABLE TRIGGER ${triggerName}`);
                    }

                    // 4. Update last_cleanup timestamp
                    await trx('rr_system.log_retention_policies')
                        .where({ id: policy.id })
                        .update({ last_cleanup: new Date() });

                    if (deletedCount > 0) {
                        logger.info(`Retention cleanup: Deleted ${deletedCount} old records from ${log_table}`);
                    } else {
                        logger.debug(`Retention cleanup: No expired records in ${log_table}`);
                    }

                } catch (error: any) {
                    // Ensure trigger is re-enabled on error
                    if (triggerName) {
                        await trx.raw(`ALTER TABLE rr_system.${log_table} ENABLE TRIGGER ${triggerName}`).catch(() => { });
                    }
                    throw error; // Rollback transaction
                }
            });
        }

        logger.info('Log Retention Cleanup job finished successfully.');
    } catch (err: any) {
        logger.error('Log Retention Cleanup job failed', { error: err.message, stack: err.stack });
    }
}

// ── Background Job Setup ─────────────────────────────────

// Run every 24 hours (86,400,000 ms)
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

let intervalId: NodeJS.Timeout | null = null;

export function startLogRetentionJob() {
    if (intervalId) return; // Already running
    logger.info('Log Retention background job initialized (runs daily).');

    // Define an async wrapper so setInterval doesn't drop promises
    const run = async () => {
        await runLogRetentionCleanup();
    };

    // Run first cleanup 10 seconds after startup
    setTimeout(run, 10000);

    // Schedule subsequent cleanups
    intervalId = setInterval(run, CLEANUP_INTERVAL_MS);
}

export function stopLogRetentionJob() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('Log Retention background job stopped.');
    }
}
