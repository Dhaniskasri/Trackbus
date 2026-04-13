import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const SECRET = process.env.SECRET || 'trackmate_secret';
const PORT = Number(process.env.PORT || 5000);
const EVENTS_COLLECTION = 'events';
const BACKEND_MODE = (process.env.BACKEND_MODE || 'local').toLowerCase();

const createLocalDb = () => {
  const localDbPath = path.resolve(process.cwd(), 'local-db.json');
  let store = {};
  if (fs.existsSync(localDbPath)) {
    try {
      store = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    } catch (_err) {
      store = {};
    }
  }

  const ensureCollection = (name) => {
    if (!Array.isArray(store[name])) store[name] = [];
    return store[name];
  };

  const persist = () => {
    fs.writeFileSync(localDbPath, JSON.stringify(store, null, 2));
  };

  const docFromItem = (collectionName, item) => ({
    id: item.id,
    exists: true,
    data: () => {
      const { id, ...rest } = item;
      return rest;
    },
    ref: {
      delete: async () => {
        const arr = ensureCollection(collectionName);
        store[collectionName] = arr.filter((x) => x.id !== item.id);
        persist();
      }
    }
  });

  const makeQuery = (collectionName, filters = [], _limit = null) => ({
    where: (field, op, value) => makeQuery(collectionName, [...filters, { field, op, value }], _limit),
    limit: (n) => makeQuery(collectionName, filters, n),
    get: async () => {
      let rows = [...ensureCollection(collectionName)];
      for (const f of filters) {
        if (f.op === '==') rows = rows.filter((x) => x[f.field] === f.value);
      }
      if (typeof _limit === 'number') rows = rows.slice(0, _limit);
      return { empty: rows.length === 0, docs: rows.map((x) => docFromItem(collectionName, x)) };
    },
    add: async (data) => {
      const id = crypto.randomUUID();
      const arr = ensureCollection(collectionName);
      arr.push({ id, ...data });
      persist();
      return { id };
    },
    doc: (id) => ({
      get: async () => {
        const item = ensureCollection(collectionName).find((x) => x.id === String(id));
        if (!item) return { exists: false, id: String(id), data: () => undefined };
        return docFromItem(collectionName, item);
      },
      set: async (payload, options = {}) => {
        const arr = ensureCollection(collectionName);
        const index = arr.findIndex((x) => x.id === String(id));
        if (index === -1) {
          arr.push({ id: String(id), ...payload });
        } else if (options.merge) {
          arr[index] = { ...arr[index], ...payload, id: String(id) };
        } else {
          arr[index] = { id: String(id), ...payload };
        }
        persist();
      },
      delete: async () => {
        const arr = ensureCollection(collectionName);
        store[collectionName] = arr.filter((x) => x.id !== String(id));
        persist();
      }
    })
  });

  return {
    collection: (name) => makeQuery(name),
    listCollections: async () =>
      Object.keys(store).map((id) => ({
        id,
        get: async () => ({ docs: ensureCollection(id).map((x) => docFromItem(id, x)) })
      }))
  };
};

const initFirebase = () => {
  if (admin.apps.length) return admin.app();

  const defaultServiceAccountPath = path.resolve(process.cwd(), 'serviceAccount.json');
  if (fs.existsSync(defaultServiceAccountPath)) {
    const raw = fs.readFileSync(defaultServiceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(raw);
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }

  throw new Error(
    'Firebase credentials not configured. Add backend/serviceAccount.json, set FIREBASE_SERVICE_ACCOUNT_PATH, or set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.'
  );
};

let db;
let runningMode = BACKEND_MODE;

if (BACKEND_MODE === 'firebase') {
  try {
    initFirebase();
    db = admin.firestore();
  } catch (error) {
    console.error('\nFirebase initialization failed. Falling back to local mode.');
    console.error(error.message);
    db = createLocalDb();
    runningMode = 'local';
  }
} else {
  db = createLocalDb();
  runningMode = 'local';
}

const mapDoc = (doc) => ({ _id: doc.id, id: doc.id, ...doc.data() });
const signToken = (_id) => jwt.sign({ _id }, SECRET, { expiresIn: '7d' });

const getById = async (collection, id) => {
  if (!id) return null;
  const snap = await db.collection(collection).doc(String(id)).get();
  return snap.exists ? mapDoc(snap) : null;
};

const expandUser = async (user) => {
  if (!user) return null;
  const out = { ...user };
  if (user.assignedBusId) out.assignedBusId = await getById('buses', user.assignedBusId);
  if (user.assignedStopId) out.assignedStopId = await getById('stops', user.assignedStopId);
  if (user.assignedRouteId) out.assignedRouteId = await getById('routes', user.assignedRouteId);
  delete out.password;
  return out;
};

const expandBus = async (bus) => {
  if (!bus) return null;
  const out = { ...bus };
  if (bus.driverId) out.driverId = await getById('users', bus.driverId);
  if (bus.routeId) out.routeId = await getById('routes', bus.routeId);
  return out;
};

const expandRoute = async (route) => {
  if (!route) return null;
  const out = { ...route };
  const stopIds = Array.isArray(route.stops) ? route.stops : [];
  out.stops = await Promise.all(stopIds.map((id) => getById('stops', id)));
  out.stops = out.stops.filter(Boolean);
  return out;
};

const expandTrip = async (trip) => {
  if (!trip) return null;
  const out = { ...trip };
  out.busId = await getById('buses', trip.busId);
  out.driverId = await getById('users', trip.driverId);
  out.routeId = trip.routeId ? await getById('routes', trip.routeId) : null;
  out.bus = out.busId;
  out.driver = out.driverId;
  out.route = out.routeId;
  return out;
};

const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: 'Authorization token required' });
    const token = authorization.split(' ')[1];
    const { _id } = jwt.verify(token, SECRET);
    const user = await getById('users', _id);
    if (!user) return res.status(401).json({ error: 'Request is not authorized' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

const collectionList = async (name) => {
  const snap = await db.collection(name).get();
  return snap.docs.map(mapDoc);
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const users = await db.collection('users').where('username', '==', username).limit(1).get();
    let user;
    if (users.empty) {
      const hash = await bcrypt.hash(password || 'dummy', 10);
      const ref = await db.collection('users').add({
        username,
        password: hash,
        name: username,
        role: role || 'student',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      user = await getById('users', ref.id);
    } else {
      user = mapDoc(users.docs[0]);
      const match = await bcrypt.compare(password || 'dummy', user.password);
      if (!match) return res.status(400).json({ error: 'Incorrect password' });
    }
    const token = signToken(user._id);
    res.json({ username, token, user: await expandUser(user) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => res.json(await expandUser(req.user)));
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  const patch = { ...req.body, updatedAt: Date.now() };
  await db.collection('users').doc(req.user._id).set(patch, { merge: true });
  res.json(await expandUser(await getById('users', req.user._id)));
});
app.post('/api/auth/forgot-password', async (_req, res) => {
  res.json({ message: 'If an account exists, a reset link was sent to your email.' });
});

app.get('/api/buses', async (_req, res) => {
  const buses = await collectionList('buses');
  res.json(await Promise.all(buses.map(expandBus)));
});
app.post('/api/buses', async (req, res) => {
  const ref = await db.collection('buses').add({ ...req.body, createdAt: Date.now(), updatedAt: Date.now() });
  res.status(201).json(await getById('buses', ref.id));
});
app.put('/api/buses/:id', async (req, res) => {
  await db.collection('buses').doc(req.params.id).set({ ...req.body, updatedAt: Date.now() }, { merge: true });
  res.json(await getById('buses', req.params.id));
});
app.delete('/api/buses/:id', async (req, res) => {
  await db.collection('buses').doc(req.params.id).delete();
  res.json({ success: true });
});

app.get('/api/routes', async (_req, res) => {
  const routes = await collectionList('routes');
  res.json(await Promise.all(routes.map(expandRoute)));
});
app.post('/api/routes', async (req, res) => {
  const ref = await db.collection('routes').add({ ...req.body, createdAt: Date.now(), updatedAt: Date.now() });
  res.status(201).json(await getById('routes', ref.id));
});
app.put('/api/routes/:id', async (req, res) => {
  await db.collection('routes').doc(req.params.id).set({ ...req.body, updatedAt: Date.now() }, { merge: true });
  res.json(await getById('routes', req.params.id));
});
app.delete('/api/routes/:id', async (req, res) => {
  await db.collection('routes').doc(req.params.id).delete();
  res.json({ success: true });
});

app.get('/api/stops', async (_req, res) => {
  const stops = await collectionList('stops');
  stops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  res.json(stops);
});
app.post('/api/stops', async (req, res) => {
  const ref = await db.collection('stops').add({ ...req.body, createdAt: Date.now(), updatedAt: Date.now() });
  res.status(201).json(await getById('stops', ref.id));
});
app.put('/api/stops/:id', async (req, res) => {
  await db.collection('stops').doc(req.params.id).set({ ...req.body, updatedAt: Date.now() }, { merge: true });
  res.json(await getById('stops', req.params.id));
});
app.delete('/api/stops/:id', async (req, res) => {
  await db.collection('stops').doc(req.params.id).delete();
  res.json({ success: true });
});
app.get('/api/stops/:routeId', async (req, res) => {
  const route = await getById('routes', req.params.routeId);
  const ids = Array.isArray(route?.stops) ? route.stops : [];
  const stops = (await Promise.all(ids.map((id) => getById('stops', id)))).filter(Boolean);
  res.json(stops);
});

app.get('/api/admin/dashboard', requireAuth, async (_req, res) => {
  const [buses, users, trips] = await Promise.all([collectionList('buses'), collectionList('users'), collectionList('trips')]);
  res.json({
    busCount: buses.length,
    driverCount: users.filter((u) => u.role === 'driver').length,
    studentCount: users.filter((u) => u.role === 'student').length,
    activeTrips: trips.filter((t) => t.status === 'active').length
  });
});
app.get('/api/admin/trips', requireAuth, async (_req, res) => {
  const trips = (await collectionList('trips')).filter((t) => t.status === 'active');
  res.json(await Promise.all(trips.map(expandTrip)));
});
app.get('/api/admin/live-buses', requireAuth, async (_req, res) => {
  const trips = (await collectionList('trips')).filter((t) => t.status === 'active');
  const busIds = new Set(trips.map((t) => t.busId));
  const buses = (await collectionList('buses')).filter((b) => busIds.has(b._id));
  res.json(await Promise.all(buses.map(expandBus)));
});
app.get('/api/admin/events', requireAuth, async (_req, res) => res.json(await collectionList(EVENTS_COLLECTION)));
app.delete('/api/admin/events', requireAuth, async (_req, res) => {
  const events = await db.collection(EVENTS_COLLECTION).get();
  await Promise.all(events.docs.map((doc) => doc.ref.delete()));
  res.json({ success: true });
});
app.get('/api/admin/analytics', requireAuth, async (_req, res) => {
  res.json({ averageDurationMinutes: 45, todayEvents: 24 });
});
app.get('/api/admin/export-trips', async (_req, res) => {
  const trips = await collectionList('trips');
  const csv = ['tripId,status,busId,driverId,startedAt,endedAt', ...trips.map((t) => `${t._id},${t.status || ''},${t.busId || ''},${t.driverId || ''},${t.startedAt || ''},${t.endedAt || ''}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

app.get('/api/admin/students', requireAuth, async (_req, res) => {
  const users = (await collectionList('users')).filter((u) => u.role === 'student');
  res.json(await Promise.all(users.map(expandUser)));
});
app.get('/api/admin/drivers', requireAuth, async (_req, res) => {
  const users = (await collectionList('users')).filter((u) => u.role === 'driver');
  res.json(await Promise.all(users.map(expandUser)));
});
app.post('/api/admin/students', requireAuth, async (req, res) => {
  const password = await bcrypt.hash(req.body.password || 'password123', 10);
  const ref = await db.collection('users').add({ ...req.body, role: 'student', password, createdAt: Date.now(), updatedAt: Date.now() });
  res.status(201).json(await expandUser(await getById('users', ref.id)));
});
app.post('/api/admin/drivers', requireAuth, async (req, res) => {
  const password = await bcrypt.hash(req.body.password || 'password123', 10);
  const ref = await db.collection('users').add({ ...req.body, role: 'driver', password, createdAt: Date.now(), updatedAt: Date.now() });
  res.status(201).json(await expandUser(await getById('users', ref.id)));
});
app.put('/api/admin/students/:id', requireAuth, async (req, res) => {
  const payload = { ...req.body, updatedAt: Date.now() };
  if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
  await db.collection('users').doc(req.params.id).set(payload, { merge: true });
  res.json(await expandUser(await getById('users', req.params.id)));
});
app.put('/api/admin/drivers/:id', requireAuth, async (req, res) => {
  const payload = { ...req.body, updatedAt: Date.now() };
  if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
  await db.collection('users').doc(req.params.id).set(payload, { merge: true });
  res.json(await expandUser(await getById('users', req.params.id)));
});
app.delete('/api/admin/students/:id', requireAuth, async (req, res) => {
  await db.collection('users').doc(req.params.id).delete();
  res.json({ success: true });
});
app.delete('/api/admin/drivers/:id', requireAuth, async (req, res) => {
  await db.collection('users').doc(req.params.id).delete();
  res.json({ success: true });
});
app.get('/api/admin/assignments', requireAuth, async (_req, res) => {
  const users = (await collectionList('users')).filter((u) => u.role === 'student' && u.assignedBusId);
  res.json(await Promise.all(users.map(expandUser)));
});
app.post('/api/admin/assignments', requireAuth, async (req, res) => {
  const { studentId, assignedBusId, assignedRouteId, assignedStopId } = req.body;
  await db.collection('users').doc(studentId).set({ assignedBusId, assignedRouteId, assignedStopId, updatedAt: Date.now() }, { merge: true });
  res.json(await expandUser(await getById('users', studentId)));
});
app.put('/api/admin/assignments/:id', requireAuth, async (req, res) => {
  await db.collection('users').doc(req.params.id).set({ ...req.body, updatedAt: Date.now() }, { merge: true });
  res.json(await expandUser(await getById('users', req.params.id)));
});
app.delete('/api/admin/assignments/:id', requireAuth, async (req, res) => {
  await db.collection('users').doc(req.params.id).set({ assignedBusId: null, assignedRouteId: null, assignedStopId: null, updatedAt: Date.now() }, { merge: true });
  res.json({ success: true });
});
app.post('/api/admin/students/bulk-delete', requireAuth, async (req, res) => {
  const ids = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
  await Promise.all(ids.map((id) => db.collection('users').doc(String(id)).delete()));
  res.json({ success: true, deleted: ids.length });
});
app.post('/api/admin/students/bulk-upload', requireAuth, async (_req, res) => {
  res.status(501).json({ error: 'Bulk upload is not implemented in Firebase backend yet.' });
});

app.get('/api/students/me', requireAuth, async (req, res) => res.json(await expandUser(req.user)));
app.get('/api/students/trip', requireAuth, async (req, res) => {
  const all = await collectionList('trips');
  const trip = all.find((t) => t.status === 'active' && (t.driverId === req.user._id || t.busId === req.user.assignedBusId)) || null;
  res.json(trip ? await expandTrip(trip) : null);
});
app.get('/api/students/eta', requireAuth, async (_req, res) => res.json({ etaMinutes: 5 }));
app.get('/api/students/buses', requireAuth, async (_req, res) => res.json(await collectionList('buses')));
app.get('/api/students/assignment', requireAuth, async (req, res) => {
  const user = await expandUser(await getById('users', req.user._id));
  res.json({ assignedBusId: user?.assignedBusId || null, assignedRouteId: user?.assignedRouteId || null, assignedStopId: user?.assignedStopId || null });
});
app.put('/api/students/assignment', requireAuth, async (req, res) => {
  await db.collection('users').doc(req.user._id).set({ ...req.body, updatedAt: Date.now() }, { merge: true });
  res.json(await expandUser(await getById('users', req.user._id)));
});
app.get('/api/students/preferences', requireAuth, async (req, res) => res.json(req.user.preferences || {}));
app.put('/api/students/preferences', requireAuth, async (req, res) => {
  await db.collection('users').doc(req.user._id).set({ preferences: req.body, updatedAt: Date.now() }, { merge: true });
  res.json(req.body);
});
app.post('/api/students/missed-bus', requireAuth, async (_req, res) => res.json({ success: true }));
app.post('/api/students/cancel-redirect', requireAuth, async (_req, res) => res.json({ success: true }));
app.get('/api/students/redirect-status', requireAuth, async (_req, res) => res.json({ redirected: false }));

app.post('/api/notifications/subscribe', requireAuth, async (_req, res) => res.json({ success: true }));
app.get('/api/notifications/test-push', requireAuth, async (_req, res) => res.json({ success: true }));

app.post('/api/trips/start', requireAuth, async (req, res) => {
  const { busId } = req.body;
  const active = (await collectionList('trips')).find((t) => t.busId === busId && t.status === 'active');
  if (active) return res.json(await expandTrip(active));
  const bus = await getById('buses', busId);
  const ref = await db.collection('trips').add({
    busId,
    driverId: req.user._id,
    routeId: bus?.routeId || null,
    status: 'active',
    startedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  res.json(await expandTrip(await getById('trips', ref.id)));
});
app.get('/api/trips/active', requireAuth, async (req, res) => {
  const trip = (await collectionList('trips')).find((t) => t.driverId === req.user._id && t.status === 'active');
  res.json(trip ? await expandTrip(trip) : {});
});
const endTrip = async (tripId) => {
  if (!tripId) return null;
  await db.collection('trips').doc(String(tripId)).set({ status: 'ended', endedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
  return getById('trips', String(tripId));
};
app.post('/api/trips/end', requireAuth, async (req, res) => res.json(await endTrip(req.body.tripId)));
app.post('/api/trips/:id/end', requireAuth, async (req, res) => res.json(await endTrip(req.params.id)));
app.delete('/api/trips/history/today', requireAuth, async (_req, res) => res.json({ deleted: 0 }));

app.get('/api/public/buses', async (_req, res) => {
  const buses = await collectionList('buses');
  res.json(buses.map((b) => ({ _id: b._id, id: b._id, name: b.name, numberPlate: b.numberPlate })));
});
app.get('/api/public/track/:busName', async (req, res) => {
  const buses = await collectionList('buses');
  const bus = buses.find((b) => String(b.name || '').toLowerCase() === String(req.params.busName || '').toLowerCase());
  if (!bus) return res.status(404).json({ error: 'Bus not found' });
  res.json(await expandBus(bus));
});

app.get('/api/debug/inspect', async (_req, res) => {
  const collections = await db.listCollections();
  const data = {};
  await Promise.all(collections.map(async (col) => {
    const docs = await col.get();
    data[col.id] = docs.docs.map(mapDoc);
  }));
  res.json(data);
});

io.on('connection', (socket) => {
  socket.on('auth:token', ({ token }) => {
    try {
      const payload = jwt.verify(token, SECRET);
      socket.data.userId = payload._id;
      socket.emit('auth:ready');
    } catch (_e) {
      socket.emit('auth:error');
    }
  });

  socket.on('admin:join', () => socket.join('admin'));
  socket.on('student:subscribe', ({ tripId }) => { if (tripId) socket.join(`trip_${tripId}`); });
  socket.on('student:unsubscribe', ({ tripId }) => { if (tripId) socket.leave(`trip_${tripId}`); });

  socket.on('driver:location_update', async (payload) => {
    if (!payload?.busId) return;
    await db.collection('buses').doc(String(payload.busId)).set({
      lastKnownLocation: { lat: payload.lat, lng: payload.lng, updatedAt: Date.now() },
      updatedAt: Date.now()
    }, { merge: true });
    if (payload.tripId) io.to(`trip_${payload.tripId}`).emit('trip:location_update', payload);
    io.to('admin').emit('admin:bus_location', payload);
  });

  socket.on('driver:sos', async (payload) => {
    const event = { type: 'sos', ...payload, createdAt: Date.now() };
    await db.collection(EVENTS_COLLECTION).add(event);
    io.to('admin').emit('driver:sos', event);
  });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT} (${runningMode} mode)`);
});
