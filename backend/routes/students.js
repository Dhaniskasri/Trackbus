import express from 'express';
import { getStudentTrip, getEta } from '../controllers/studentController.js';
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.use(requireAuth);
router.get('/trip', getStudentTrip);
router.get('/eta', getEta);
export default router;