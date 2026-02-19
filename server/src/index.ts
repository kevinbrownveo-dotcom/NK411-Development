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
import { incidentRouter } from './routes/incidents';
import { solutionRouter } from './routes/solutions';
import { requirementRouter } from './routes/requirements';
import { thresholdRouter } from './routes/thresholds';
import { reconciliationRouter } from './routes/reconciliations';
import { auditLogRouter } from './routes/auditLog';
import { dashboardRouter } from './routes/dashboard';
import { consequenceRouter } from './routes/consequences';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dəqiqə
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
app.use('/api/incidents', incidentRouter);
app.use('/api/solutions', solutionRouter);
app.use('/api/requirements', requirementRouter);
app.use('/api/thresholds', thresholdRouter);
app.use('/api/reconciliations', reconciliationRouter);
app.use('/api/consequences', consequenceRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/dashboard', dashboardRouter);

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
