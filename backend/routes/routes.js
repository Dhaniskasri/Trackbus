import express from 'express';
import { getRoutes, createRoute } from '../controllers/routeController.js';
const router = express.Router();
router.get('/', getRoutes);
router.post('/', createRoute);
export default router;