import User from '../models/User.js';
import bcrypt from 'bcryptjs';
export const getStudents = async (req,res) => { try { res.status(200).json(await User.find({role: 'student'}).populate(['assignedBusId','assignedStopId','assignedRouteId'])); } catch(e){ res.status(400).json({error:e.message}); } };
export const getDrivers = async (req,res) => { try { res.status(200).json(await User.find({role: 'driver'}).populate('assignedBusId')); } catch(e){ res.status(400).json({error:e.message}); } };
export const createUser = async (req,res) => { try { const data={...req.body}; const salt=await bcrypt.genSalt(10); data.password=await bcrypt.hash(req.body.password||'password123', salt); res.status(201).json(await User.create(data)); } catch(e){ res.status(400).json({error:e.message}); } };