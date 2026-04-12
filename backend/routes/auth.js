import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
const router = express.Router();
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.user._id, req.body, { new: true }).select('-password');
    res.json(updated);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.post('/forgot-password', async (req, res) => {
  // Stub — in production you would email the user their credentials
  res.json({ message: 'If an account exists, a reset link was sent to your email.' });
});
export default router;