import express from 'express';
import { getStops, createStop } from '../controllers/stopController.js';
const router = express.Router();
router.get('/', getStops);
router.post('/', createStop);
export default router;