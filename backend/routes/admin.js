import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { getStudents, getDrivers, createUser } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.use(requireAuth);

// Students
router.get('/students', getStudents);
router.post('/students', createUser);
router.put('/students/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password) { const s = await bcrypt.genSalt(10); data.password = await bcrypt.hash(data.password, s); }
    res.json(await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password'));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/students/:id', async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

// Drivers
router.get('/drivers', getDrivers);
router.post('/drivers', createUser);
router.put('/drivers/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.password) { const s = await bcrypt.genSalt(10); data.password = await bcrypt.hash(data.password, s); }
    res.json(await User.findByIdAndUpdate(req.params.id, data, { new: true }).select('-password'));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/drivers/:id', async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});

// Assignments
router.get('/assignments', async (req, res) => {
  try {
    const assignments = await User.find({ role: 'student', assignedBusId: { $exists: true } })
      .populate(['assignedBusId', 'assignedStopId', 'assignedRouteId']);
    res.json(assignments);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Bulk student operations
router.post('/students/bulk-delete', async (req, res) => {
  try {
    const { studentIds } = req.body;
    await User.deleteMany({ _id: { $in: studentIds } });
    res.json({ success: true, deleted: studentIds.length });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

export default router;