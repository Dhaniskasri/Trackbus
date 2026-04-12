import express from 'express';
import { getBuses, createBus } from '../controllers/busController.js';
const router = express.Router();
router.get('/', getBuses);
router.post('/', createBus);
export default router;