import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { assetRouter } from './routes/assets';
import { threatRouter } from './routes/threats';
import { vulnerabilityRouter } from './routes/vulnerabilities';
import { riskRouter } from './routes/risks';
import { riskRelationsRouter } from './routes/riskRelations';
import { incidentRouter } from './routes/incidents';
import { solutionRouter } from './routes/solutions';
import { requirementRouter } from './routes/requirements';
import { thresholdRouter } from './routes/thresholds';
import { reconciliationRouter } from './routes/reconciliations';
import { auditLogRouter } from './routes/auditLog';
import { dashboardRouter } from './routes/dashboard';
import { consequenceRouter } from './routes/consequences';
import { adminRouter } from './routes/admin';
import { siemRouter } from './routes/siem';
import { logger } from './utils/logger';
import { correlationMiddleware } from './middleware/correlationId';

dotenv.config();

// ── Kritik env yoxlaması ──────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'dev-secret-key' || JWT_SECRET.length < 32) {
  logger.warn('⚠️  JWT_SECRET ya yoxdur, ya çox qısadır, ya da default dəyərdədir. Production üçün mütləq dəyişin!');
}
if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'postgres') {
  logger.warn('⚠️  DB_PASSWORD default dəyərdədir. Production üçün dəyişin!');
}

const app = express();
const PORT = process.env.PORT || 3001;

// nginx reverse proxy arxasında işlədiyindən trust proxy aktiv et
// (express-rate-limit X-Forwarded-For başlığını düzgün oxumaq üçün)
app.set('trust proxy', 1);

// ── Correlation ID — hər sorğuya unikal ID (Faza 15 §5) ──
app.use(correlationMiddleware);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || 'http://localhost:5173'),
  credentials: true,
}));

// Global rate limiting (hər 15 dəq 100 sorğu)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/assets', assetRouter);
app.use('/api/threats', threatRouter);
app.use('/api/vulnerabilities', vulnerabilityRouter);
app.use('/api/risks', riskRouter);
app.use('/api/risks', riskRelationsRouter);
app.use('/api/incidents', incidentRouter);
app.use('/api/solutions', solutionRouter);
app.use('/api/requirements', requirementRouter);
app.use('/api/thresholds', thresholdRouter);
app.use('/api/reconciliations', reconciliationRouter);
app.use('/api/consequences', consequenceRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/siem', siemRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Daxili server xətası' });
});

app.listen(PORT, () => {
  logger.info(`Server ${PORT} portunda işləyir`);
});

export default app;
