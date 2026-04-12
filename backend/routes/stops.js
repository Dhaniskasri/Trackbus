import express from 'express';
import Stop from '../models/Stop.js';
import { getStops, createStop } from '../controllers/stopController.js';
const router = express.Router();
router.get('/', getStops);
router.post('/', createStop);
router.put('/:id', async (req, res) => {
  try { res.json(await Stop.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Stop.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});
router.get('/:routeId', async (req, res) => {
  try {
    const Route = (await import('../models/Route.js')).default;
    const route = await Route.findById(req.params.routeId).populate('stops');
    res.json(route?.stops || []);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
export default router;