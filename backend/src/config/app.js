/**
 * app.js
 * ------
 * Creates and configures the Express application instance.
 * Middleware registration lives here (CORS, Helmet, Morgan, JSON parsing).
 * Routes will be mounted here as each stage is implemented.
 *
 * The app instance is exported so server.js can start it, and tests can
 * import it without binding to a port.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';

// ── Route imports (will be added stage-by-stage) ──────────────────────────
import healthRouter from '../routes/health.js';
import authRouter from '../routes/auth.js';
import testRouter from '../routes/testRoutes.js';
import departmentRouter from '../routes/departments.js';
import kpiRouter from '../routes/kpis.js';
import performanceRouter from '../routes/performance.js';
import scoreRouter from '../routes/scores.js';
import dashboardRouter from '../routes/dashboard.js';
import anomalyRouter from '../routes/anomalies.js';
import forecastRouter from '../routes/forecasts.js';
import reportsRouter from '../routes/reports.js';

// ── Middleware imports ─────────────────────────────────────────────────────
import { notFoundHandler, errorHandler } from '../middleware/errorHandler.js';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  })
);

// ── Request logging ───────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/test', testRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/kpis', kpiRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/scores', scoreRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/anomalies', anomalyRouter);
app.use('/api/forecasts', forecastRouter);
app.use('/api/reports', reportsRouter);

// ── 404 + Global error handler ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
