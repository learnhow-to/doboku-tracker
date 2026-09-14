import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import authRouter from './modules/auth/auth.controller.js';
import projectsRouter from './modules/projects/projects.controller.js';
import reportsRouter from './modules/reports/reports.controller.js';
import photosRouter from './modules/photos/photos.controller.js';
import masterRouter from './modules/master/master.controller.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mount modular monolith routers
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/master', masterRouter);

// Centralized error handling
app.use(errorHandler);
