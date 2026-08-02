import express from 'express';
import cors from 'cors';
import { JSON_BODY_LIMIT } from '../config/constants.js';
import { metaRouter } from './routes/meta.js';
import { voicesRouter } from './routes/voices.js';
import { projectsRouter } from './routes/projects.js';
import { notFound, errorHandler } from './middleware.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use('/api', metaRouter);
  app.use('/api/voices', voicesRouter);
  app.use('/api/projects', projectsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
