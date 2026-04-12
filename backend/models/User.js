import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['student', 'driver', 'admin'], default: 'student' },
  firstLogin: { type: Boolean, default: false },
  assignedBusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
  phone: { type: String },
  assignedStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop' },
  assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' }
}, { timestamps: true });
export default mongoose.model('User', userSchema);
