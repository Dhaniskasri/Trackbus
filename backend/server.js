import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import busRoutes from './routes/buses.js';
import routeRoutes from './routes/routes.js';
import stopRoutes from './routes/stops.js';
import tripRoutes from './routes/trips.js';
import studentRoutes from './routes/students.js';
import { setupSockets } from './utils/sockets.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Keep a global reference to io for controllers to broadcast events
export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Debug Inspector Route (To see in-memory data)
app.get('/api/debug/inspect', async (req, res) => {
  try {
    const collections = mongoose.connection.collections;
    const data = {};
    for (const key in collections) {
      data[key] = await mongoose.model(collections[key].modelName).find({});
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect data', details: err.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/students', studentRoutes);

// Socket setup
setupSockets(io);

// ── Serving Frontend (Integrated) ───────────────────────────────────────────
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets in production-like environments or if built
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Handle React Router - Serve index.html for all non-API routes
app.use((req, res, next) => {
  // If request is for an /api route, it should have been handled above
  if (req.path.startsWith('/api')) return next();

  // Otherwise, serve index.html (React SPA)
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If we can't find index.html, it means frontend is likely not built
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({ error: 'Frontend build not found. Run npm run build.' });
      } else {
        // In local development we want to avoid getting stuck if frontend/dist is missing
        next();
      }
    }
  });
});

// Database Connection
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  let mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    // No MONGO_URI set — spin up a persistent local MongoDB for development
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create({
      instance: {
        dbPath: './db_data',
        storageEngine: 'wiredTiger', // Recommended for persistence
      }
    });
    mongoUri = mongod.getUri();
    console.log('🧪 Using local persistent MongoDB (at backend/db_data)');
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

startServer();
