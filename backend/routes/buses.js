import express from 'express';
import Bus from '../models/Bus.js';
import { getBuses, createBus } from '../controllers/busController.js';
const router = express.Router();
router.get('/', getBuses);
router.post('/', createBus);
router.put('/:id', async (req, res) => {
  try { res.json(await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await Bus.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(400).json({ error: e.message }); }
});
export default router;