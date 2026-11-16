import cors, { type CorsOptions } from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger';
import { AppError } from './lib/errors';
import { config } from './lib/config';
import { errorHandler, notFound } from './middlewares/error.middleware';
import { securityHeaders } from './middlewares/security.middleware';
import { authRoutes } from './routes/auth.routes';
import { modelRoutes } from './routes/model.routes';
import { printRoutes } from './routes/print.routes';
import { userRoutes } from './routes/user.routes';
import { filamentRoutes } from './routes/filament.routes';
import { wallpaperRoutes } from './routes/wallpaper.routes';
import { featuresRoutes } from './routes/features.routes';
import { adminRoutes } from './routes/admin.routes';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requisições sem Origin (curl, health check, mesmo host) são permitidas.
    if (!origin || !config.corsOrigins.length) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (config.corsOrigins.includes(normalized)) return callback(null, true);
    callback(new AppError(403, 'CORS_ORIGIN_NOT_ALLOWED', 'Origem não autorizada.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86_400,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api', featuresRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/prints', printRoutes);
app.use('/api', filamentRoutes);
app.use('/api', wallpaperRoutes);

app.use(notFound);
app.use(errorHandler);
