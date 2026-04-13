# CHAPTER 10

# CODING

This chapter includes the most important code modules from the TrackMate project. Only selected snippets are included so that the final documentation highlights the core implementation logic without pasting full files.

---

## 10.1 User Authentication Logic

File used: `backend/controllers/authController.js`

This snippet shows the login API, password verification using `bcrypt`, and JWT token generation used for role-based access.

```javascript
const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

const verifyPassword = async (password, hash) => {
  if (!hash.startsWith('$2')) {
    return password === hash;
  }
  return bcrypt.compare(password, hash);
};

const login = async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = await User.findOne({
    username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
  });
  if (!user || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({ token, user: serializeUser(user), firstLogin: user.firstLogin });
};
```

Why this code is important:

- implements secure login,
- validates user credentials,
- generates a JWT for authenticated sessions,
- supports role-based access for admin, driver, and student users.

---

## 10.2 Real-Time Location Tracking Logic

File used: `backend/controllers/locationController.js`

This snippet shows the core live tracking logic where the driver sends location data, the server updates state, and the new position is emitted to connected clients.

```javascript
socket.on('driver:location_update', (payload) =>
  handleDriverLocationUpdate(io, socket, payload)
);

const handleDriverLocationUpdate = async (io, socket, payload) => {
  if (!socket.user) {
    socket.emit('auth:error', { message: 'Socket not authenticated' });
    return;
  }

  const { driverId, tripId, busId, lat, lng, timestamp, speed } = payload || {};
  if (!tripId || typeof lat !== 'number' || typeof lng !== 'number') {
    return;
  }

  const state = await getActiveTripState(tripId);
  if (!state) {
    socket.emit('trip:error', { message: 'Trip not found for tracking' });
    return;
  }

  const room = `trip_${tripId}`;
  socket.join(room);

  await updateBusLocation(state.trip.bus, { lat, lng });
  await pushLocationUpdate(tripId, { lat, lng, speed, heading: payload?.heading, timestamp: Date.now() });

  io.to(room).emit('trip:location_update', {
    tripId,
    busId: busId || state.trip.bus,
    lat,
    lng,
    speed,
    timestamp: timestamp || Date.now()
  });
};
```

Why this code is important:

- shows the WebSocket-based real-time architecture,
- receives live GPS coordinates from the driver,
- updates backend trip and bus state,
- instantly broadcasts the latest location to clients.

---

## 10.3 Trip Management Logic

File used: `backend/controllers/tripController.js`

This snippet shows how trips are started and ended, including status updates and timestamp storage.

```javascript
const startTrip = async (req, res) => {
  const driverId = req.user._id;
  const { busId } = req.body;
  const bus = await Bus.findById(busId);
  const route = await Route.findById(bus.route);

  const existingTrip = await Trip.findOne({ bus: bus._id, status: 'ONGOING' });
  if (existingTrip) {
    return res.json(existingTrip);
  }

  const trip = await Trip.create({
    bus: bus._id,
    driver: driverId,
    route: route._id,
    status: 'ONGOING',
    currentStopIndex: 0,
    startedAt: new Date()
  });

  req.app.get('io')?.emit('bus:trip_started', {
    busId: bus._id.toString(),
    tripId: trip._id.toString(),
    message: 'Trip Started'
  });
  res.status(201).json(trip);
};

const endTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.tripId || req.body.tripId);
  trip.status = 'COMPLETED';
  trip.endedAt = new Date();
  await trip.save();
  res.json({ message: 'Trip ended successfully', trip });
};
```

Why this code is important:

- manages the trip lifecycle,
- stores trip start and end time,
- changes trip status,
- triggers live events when a trip begins.

---

## 10.4 ETA Prediction Logic

File used: `backend/utils/etaCalculator.js`

This snippet shows how the system calculates ETA using speed, route distance, and OSRM-based routing data.

```javascript
const computeRawEtas = async (state, position, speedMps = 0) => {
  const orderedStops = state.routeStops;
  const upcomingIndex = Math.min(Math.max(state.trip.currentStopIndex || 0, 0), orderedStops.length - 1);
  const nextStop = orderedStops[upcomingIndex];
  const rawEtas = {};
  const now = Date.now();

  const velocity = speedMps >= MIN_SPEED_MPS ? speedMps : ASSUMED_SPEED_MPS;
  const cacheValid = state.osrmCache &&
    (now - state.osrmCache.timestamp <= OSRM_CACHE_TTL_MS) &&
    state.osrmCache.startIndex === upcomingIndex;

  if (!cacheValid) {
    state.osrmCache = { timestamp: now, durations: [], firstSegmentDuration: null, startIndex: upcomingIndex };
    const remainingStops = orderedStops.slice(upcomingIndex);
    const durations = await fetchOsrmDurations(remainingStops, position);
    if (durations && durations.length > 0) {
      state.osrmCache.firstSegmentDuration = durations[0];
      state.osrmCache.durations = durations.slice(1);
    }
  }

  const distToNext = remainingDistanceToStop(state.route, position, nextStop) || 0;
  let nextEtaMs;

  if (distToNext < 100) nextEtaMs = (distToNext / velocity) * 1000;
  else if (typeof state.osrmCache.firstSegmentDuration === 'number') nextEtaMs = state.osrmCache.firstSegmentDuration * 1000;
  else nextEtaMs = (distToNext / velocity) * 1000;

  rawEtas[resolveStopId(nextStop)] = Math.max(0, nextEtaMs);
  return rawEtas;
};
```

Why this code is important:

- demonstrates the main prediction algorithm,
- uses live speed and position data,
- integrates OSRM routing support,
- provides dynamic ETA instead of a fixed timetable.

---

## 10.5 Geo-Fencing Stop Detection

File used: `backend/controllers/locationController.js`

This snippet shows how geo-fencing is used to detect whether a bus has arrived at or left a stop.

```javascript
const nextStop = state.routeStops[state.currentStopIndex];
if (nextStop) {
  const distance = distanceMeters({ lat, lng }, { lat: nextStop.lat, lng: nextStop.lng });

  if (distance <= RADIUS_METERS) {
    state.insideWindow.timestamps.push(now);
    state.insideWindow.timestamps = state.insideWindow.timestamps.filter(
      (ts) => now - ts <= SUSTAIN_TIME_MS
    );

    if (!state.insideWindow.arrivedMarked) {
      const firstTs = state.insideWindow.timestamps[0];
      if (payload.force || (firstTs && now - firstTs >= SUSTAIN_TIME_MS)) {
        state.insideWindow.arrivedMarked = true;
        const event = await persistStopEvent({
          tripId,
          stopIndex: nextStop.seq,
          stopName: nextStop.name,
          status: 'ARRIVED',
          location: { lat, lng },
          source: 'auto'
        });
        io.to(room).emit('trip:stop_arrived', event);
      }
    }
  } else {
    state.insideWindow.timestamps = [];
    if (state.insideWindow.arrivedMarked && !state.insideWindow.leftMarked && distance >= LEAVE_RADIUS_METERS) {
      state.insideWindow.leftMarked = true;
      const event = await persistStopEvent({
        tripId,
        stopIndex: nextStop.seq,
        stopName: nextStop.name,
        status: 'LEFT',
        location: { lat, lng },
        source: 'auto'
      });
      io.to(room).emit('trip:stop_left', event);
    }
  }
}
```

Why this code is important:

- shows the geospatial logic in the project,
- detects stop arrival and departure automatically,
- creates transport events from live movement data,
- improves trip progress tracking accuracy.

---

## 10.6 Live Tracking Map Implementation

File used: `frontend/src/pages/StudentDashboard.jsx`

This snippet shows how the frontend listens for live trip updates and updates the map marker position in real time.

```javascript
const handleLocationUpdate = useCallback((payload) => {
  if (!payload) return;
  const newPos = normalizeLocation(payload);
  if (newPos) {
    setBusPosition(newPos);
    if (typeof payload.speed === 'number') setBusSpeed(payload.speed);
  }
}, []);

const socketHandlers = useMemo(() => ({
  'trip:location_update': handleLocationUpdate,
  'trip:eta_update': handleEtaUpdate,
  'trip:stop_arrived': (p) => handleStopEvent(p, 'ARRIVED'),
  'trip:stop_left': (p) => handleStopEvent(p, 'LEFT'),
  'trip:sos': setSosAlert,
  'stats:live_visitors': setVisitorCount
}), [handleLocationUpdate, handleEtaUpdate, handleStopEvent]);

const { socket, isConnected } = useSocket(socketHandlers);
```

Why this code is important:

- connects frontend UI to backend live events,
- updates the bus marker as soon as new coordinates arrive,
- demonstrates backend and frontend integration,
- shows how real-time tracking is presented to students.

---

These six code modules represent the core implementation of TrackMate and are the most suitable selections for inclusion in the final documentation chapter on coding.