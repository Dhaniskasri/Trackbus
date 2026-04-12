import Route from '../models/Route.js';
export const getRoutes = async (req, res) => { try { res.status(200).json(await Route.find().populate('stops')); } catch (e) { res.status(400).json({error:e.message}); } };
export const createRoute = async (req, res) => { try { res.status(201).json(await Route.create(req.body)); } catch (e) { res.status(400).json({error:e.message}); } };