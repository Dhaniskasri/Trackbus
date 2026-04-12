import User from '../models/User.js';
import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import bcrypt from 'bcryptjs';

export const getStudents = async (req,res) => { try { res.status(200).json(await User.find({role: 'student'}).populate(['assignedBusId','assignedStopId','assignedRouteId'])); } catch(e){ res.status(400).json({error:e.message}); } };
export const getDrivers = async (req,res) => { try { res.status(200).json(await User.find({role: 'driver'}).populate('assignedBusId')); } catch(e){ res.status(400).json({error:e.message}); } };
export const createUser = async (req,res) => { try { const data={...req.body}; const salt=await bcrypt.genSalt(10); data.password=await bcrypt.hash(req.body.password||'password123', salt); res.status(201).json(await User.create(data)); } catch(e){ res.status(400).json({error:e.message}); } };

export const getDashboardStats = async (req, res) => {
  try {
    const [busCount, driverCount, studentCount, activeTrips] = await Promise.all([
      Bus.countDocuments(),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'student' }),
      Trip.countDocuments({ status: 'active' })
    ]);
    res.json({ busCount, driverCount, studentCount, activeTrips });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

export const getAdminTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'active' }).populate(['busId', 'driverId', 'routeId']);
    // Map to the format the dashboard expects (camelCase bus/driver)
    const formatted = trips.map(t => ({
      ...t._doc,
      bus: t.busId,
      driver: t.driverId,
      route: t.routeId
    }));
    res.json(formatted);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

export const getLiveBuses = async (req, res) => {
  try {
    const activeTrips = await Trip.find({ status: 'active' }).select('busId');
    const busIds = activeTrips.map(t => t.busId);
    const buses = await Bus.find({ _id: { $in: busIds } }).populate(['driverId', 'routeId']);
    res.json(buses);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

export const getAdminEvents = async (req, res) => {
  // Placeholder for event tracking logic
  res.json([]);
};

export const getAnalytics = async (req, res) => {
  res.json({
    averageDurationMinutes: 45,
    todayEvents: 24
  });
};