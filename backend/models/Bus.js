import mongoose from 'mongoose';
const busSchema = new mongoose.Schema({
  name: { type: String, required: true },
  numberPlate: { type: String, required: true },
  capacity: { type: Number, default: 50 },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  lastKnownLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  }
}, { timestamps: true });
export default mongoose.model('Bus', busSchema);
