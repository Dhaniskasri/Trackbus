import Trip from '../models/Trip.js';
export const getStudentTrip = async (req, res) => { try { const trip = await Trip.findOne({ status: 'active' }).populate('busId routeId driverId'); res.status(200).json(trip || null); } catch (e) { res.status(400).json({error:e.message}); } };
export const getEta = async (req, res) => { res.status(200).json({ etaMinutes: 5 }); };