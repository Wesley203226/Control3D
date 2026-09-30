import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger';
import { errorHandler, notFound } from './middlewares/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { modelRoutes } from './routes/model.routes';
import { printRoutes } from './routes/print.routes';
import { userRoutes } from './routes/user.routes';
import { filamentRoutes } from './routes/filament.routes';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/prints', printRoutes);
app.use('/api', filamentRoutes);

app.use(notFound);
app.use(errorHandler);
