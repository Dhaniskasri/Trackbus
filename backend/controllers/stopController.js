import Stop from '../models/Stop.js';
export const getStops = async (req, res) => { try { res.status(200).json(await Stop.find().sort({sequence:1})); } catch (e) { res.status(400).json({error:e.message}); } };
export const createStop = async (req, res) => { try { res.status(201).json(await Stop.create(req.body)); } catch (e) { res.status(400).json({error:e.message}); } };