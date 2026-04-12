import mongoose from 'mongoose';
const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }]
}, { timestamps: true });
export default mongoose.model('Route', routeSchema);
