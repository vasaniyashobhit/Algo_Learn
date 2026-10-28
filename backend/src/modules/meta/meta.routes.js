import { Router } from 'express';
import { getTags } from './meta.controller.js';

export const metaRouter = Router();

metaRouter.get('/tags', getTags);
