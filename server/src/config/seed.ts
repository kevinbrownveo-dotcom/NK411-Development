import bcrypt from 'bcryptjs';
import db from './database';
import { logger } from '../utils/logger';

async function seed() {
  try {
    logger.info('Seeding database...');

    // Admin istifadəçi yarat
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    const users = [
      {
        email: 'admin@risk-registry.az',
        password_hash: passwordHash,
        full_name: 'Sistem Administratoru',
        role: 'admin',
        department: 'İT Təhlükəsizlik',
        position: 'Baş Administrator',
      },
      {
        email: 'risk.manager@risk-registry.az',
        password_hash: passwordHash,
        full_name: 'Risk Meneceri',
        role: 'risk_manager',
        department: 'İT Təhlükəsizlik',
        position: 'Risk Meneceri',
      },
      {
        email: 'auditor@risk-registry.az',
        password_hash: passwordHash,
        full_name: 'Auditor',
        role: 'auditor',
        department: 'Daxili Audit',
        position: 'İT Auditoru',
      },
      {
        email: 'asset.owner@risk-registry.az',
        password_hash: passwordHash,
        full_name: 'Aktiv Sahibi',
        role: 'asset_owner',
        department: 'İKT',
        position: 'Şöbə Müdiri',
      },
      {
        email: 'incident@risk-registry.az',
        password_hash: passwordHash,
        full_name: 'İnsident Koordinatoru',
        role: 'incident_coordinator',
        department: 'SOC',
        position: 'SOC Analitik',
      },
      {
        email: 'dxeit@risk-registry.az',
        password_hash: passwordHash,
        full_name: 'DXƏIT Nümayəndəsi',
        role: 'dxeit_rep',
        department: 'DXƏIT',
        position: 'Nümayəndə',
      },
    ];

    for (const user of users) {
      const exists = await db('users').where({ email: user.email }).first();
      if (!exists) {
        await db('users').insert(user);
        logger.info(`İstifadəçi yaradıldı: ${user.email}`);
      }
    }

    logger.info('Seed tamamlandı');
    process.exit(0);
  } catch (error) {
    logger.error('Seed xətası:', error);
    process.exit(1);
  }
}

seed();
