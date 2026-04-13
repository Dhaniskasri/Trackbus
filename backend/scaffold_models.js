import fs from 'fs';
import path from 'path';

const models = {
  'User.js': `import mongoose from 'mongoose';
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
`,
  'Bus.js': `import mongoose from 'mongoose';
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
`,
  'Route.js': `import mongoose from 'mongoose';
const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }]
}, { timestamps: true });
export default mongoose.model('Route', routeSchema);
`,
  'Stop.js': `import mongoose from 'mongoose';
const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  sequence: { type: Number }
}, { timestamps: true });
export default mongoose.model('Stop', stopSchema);
`,
  'Trip.js': `import mongoose from 'mongoose';
const tripSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
}, { timestamps: true });
export default mongoose.model('Trip', tripSchema);
`
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join('models', filename), content);
}
console.log('Models scaffolded successfully.');
