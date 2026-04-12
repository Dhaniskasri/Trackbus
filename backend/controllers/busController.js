import Bus from '../models/Bus.js';
export const getBuses = async (req, res) => { try { res.status(200).json(await Bus.find().populate('driverId').populate('routeId')); } catch (e) { res.status(400).json({error:e.message}); } };
export const createBus = async (req, res) => { try { res.status(201).json(await Bus.create(req.body)); } catch (e) { res.status(400).json({error:e.message}); } };