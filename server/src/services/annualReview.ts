import cron from 'node-cron';
import db from '../config/db';
import { mailService } from './mailService';
import logger from '../utils/logger';

export class AnnualReviewService {
    /**
     * Start the daily cron job (runs every midnight).
     * NK-411 Qanun §10.3 - İllik Avtomatik Review Mexanizmi
     */
    public startCron(): void {
        // Run at 00:00 every day
        cron.schedule('0 0 * * *', async () => {
            logger.info('Starting daily Annual Review compliance check...');
            try {
                await this.checkAssets();
                await this.checkRisks();
            } catch (error) {
                logger.error('Error during annual review cron job:', error);
            }
        });
        logger.info('Annual Review compliance cron job scheduled.');
    }

    /**
     * Finds assets that haven't been reviewed in over a year.
     */
    private async checkAssets(): Promise<void> {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const outdatedAssets = await db('rr_local.assets')
            .where('last_review', '<=', oneYearAgo)
            .whereIn('status', ['aktiv', 'planlaşdırılan'])
            .whereNotNull('owner_id')
            .select('id', 'asset_code', 'name', 'last_review', 'owner_id');

        if (outdatedAssets.length === 0) return;

        logger.info(`Found ${outdatedAssets.length} assets requiring annual review.`);

        // Group by owner
        const assetsByOwner: Record<string, any[]> = {};
        for (const asset of outdatedAssets) {
            if (!assetsByOwner[asset.owner_id]) assetsByOwner[asset.owner_id] = [];
            assetsByOwner[asset.owner_id].push(asset);
        }

        // Send emails
        for (const [ownerId, assets] of Object.entries(assetsByOwner)) {
            try {
                const owner = await db('rr_system.users').where({ id: ownerId }).first();
                if (!owner || !owner.email) continue;

                const assetListStr = assets.map(a => `- ${a.asset_code}: ${a.name} (Son yoxlanış: ${new Date(a.last_review).toLocaleDateString()})`).join('\n');

                await mailService.sendSystemAlert(
                    'İllik Aktiv Təftişi Tələbi (Qanun NK-411 §10.3)',
                    `Hörmətli ${owner.full_name},
          
Sahibi olduğunuz aşağıdakı aktivlərin son təftişindən 1 ildən çox vaxt keçmişdir. Zəhmət olmasa sistemə daxil olub aktivləri yenidən qiymətləndirin və onlara dair qeydlərinizi yeniləyin (Review statusunu güncəlləyin).

Aktivlər siyahısı:
${assetListStr}
          
Qeyd: Bu, NK-411 uyğunluq avtomatik bildirişidir.`
                );
            } catch (err) {
                logger.error(`Failed to send annual review email to owner ${ownerId}`, err);
            }
        }
    }

    /**
     * Finds risks that haven't been reviewed/updated in over a year.
     */
    private async checkRisks(): Promise<void> {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const outdatedRisks = await db('rr_core.risks')
            .where('updated_at', '<=', oneYearAgo)
            .whereNotIn('status', ['bağlı', 'həll_edilib', 'qəbul_edilib'])
            .whereNotNull('risk_owner_id')
            .select('id', 'risk_code', 'name', 'updated_at', 'risk_owner_id');

        if (outdatedRisks.length === 0) return;

        logger.info(`Found ${outdatedRisks.length} risks requiring annual review.`);

        const risksByOwner: Record<string, any[]> = {};
        for (const risk of outdatedRisks) {
            if (!risksByOwner[risk.risk_owner_id]) risksByOwner[risk.risk_owner_id] = [];
            risksByOwner[risk.risk_owner_id].push(risk);
        }

        // Send emails
        for (const [ownerId, risks] of Object.entries(risksByOwner)) {
            try {
                const owner = await db('rr_system.users').where({ id: ownerId }).first();
                if (!owner || !owner.email) continue;

                const riskListStr = risks.map(r => `- ${r.risk_code}: ${r.name} (Son yenilənmə: ${new Date(r.updated_at).toLocaleDateString()})`).join('\n');

                await mailService.sendSystemAlert(
                    'İllik Risk Təftişi Tələbi (Qanun NK-411 §10.3)',
                    `Hörmətli ${owner.full_name},
          
Sahibi olduğunuz aşağıdakı aktiv risklərin məlumatları 1 ildən çoxdur ki yenilənmir. Qanunvericiliyə əsasən, bu risklərin vəziyyəti mütləq illik olaraq yenidən nəzərdən keçirilməlidir.

Risklər siyahısı:
${riskListStr}
          
Qeyd: Zəhmət olmasa sistemə daxil olaraq risk emalı planını nəzərdən keçirin.`
                );
            } catch (err) {
                logger.error(`Failed to send annual risk review email to owner ${ownerId}`, err);
            }
        }
    }

    /**
     * Manual run method for testing or administrative triggers
     */
    public async runManualCheck(): Promise<void> {
        logger.info('Running manual Annual Review compliance check...');
        await this.checkAssets();
        await this.checkRisks();
    }
}

export const annualReviewService = new AnnualReviewService();
