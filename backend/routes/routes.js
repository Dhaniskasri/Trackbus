import express from 'express';
import Route from '../models/Route.js';
import { getRoutes, createRoute } from '../controllers/routeController.js';
const router = express.Router();
router.get('/', getRoutes);
router.post('/', createRoute);
router.put('/:id', async (req, res) => {
  try { res.json(await Route.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Route.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});
export default router;