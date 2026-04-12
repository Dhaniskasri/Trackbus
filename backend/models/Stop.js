import mongoose from 'mongoose';
const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  sequence: { type: Number }
}, { timestamps: true });
export default mongoose.model('Stop', stopSchema);
