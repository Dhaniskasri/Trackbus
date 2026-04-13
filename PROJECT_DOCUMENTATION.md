# TrackMate - Project Documentation

## 1. Project Overview

TrackMate is a real-time school bus tracking platform designed for Ramachandra College of Engineering, Eluru. The system helps administrators manage transport operations, drivers run live trips, and students track assigned buses from a browser-based interface.

The current implementation is split into two applications:

- `backend/`: Express, Socket.IO, MongoDB, trip processing, notifications, CSV import/export
- `frontend/`: React, Vite, Leaflet maps, route-based dashboards, PWA features

Core outcomes of the current build:

- Real-time location updates from drivers to students and admins
- Route and stop modeling with embedded route stops plus physical stop documents
- ETA calculation with OSRM, caching, smoothing, and segment statistics fallback
- Student assignment and notification preference management
- Missed-bus redirect to a suitable alternative ongoing trip
- Public bus tracking without login
- Trip analytics, event logs, and CSV export for admins

## 2. Problem Statement

Campus transportation systems typically rely on static schedules and manual coordination. That creates four major operational problems:

1. Students do not know when the bus will actually arrive.
2. Administrators cannot see the live fleet state in one place.
3. Drivers have no integrated way to broadcast emergency status.
4. Missed buses create avoidable delays because there is no redirect workflow.

TrackMate addresses those issues using a web-based, role-aware tracking system rather than a paper schedule or a manual calling process.

## 3. Objectives

### 3.1 Primary Objectives

- Provide live bus tracking on maps for admins and students.
- Provide route-aware ETA updates instead of fixed schedules.
- Allow drivers to start, run, and end trips from a phone-friendly dashboard.
- Let admins manage buses, drivers, routes, stops, students, and assignments.
- Support notification alerts and missed-bus recovery.

### 3.2 Current Implementation Status

- Live tracking: implemented
- ETA engine: implemented
- Route and stop management: implemented
- Student assignment workflow: implemented
- CSV student bulk upload: implemented
- Web push notifications: implemented when VAPID is configured
- Public tracking pages: implemented
- PWA basics and service worker: implemented

## 4. Technology Stack

### 4.1 Backend

- Node.js
- Express 4
- Socket.IO
- MongoDB with Mongoose
- bcryptjs
- jsonwebtoken
- express-rate-limit
- multer
- csv-parser
- web-push
- @turf/turf

### 4.2 Frontend

- React 18
- Vite 7
- React Router 6
- Axios
- Leaflet and React Leaflet
- Socket.IO client
- Bootstrap 5
- Framer Motion
- Lucide React
- PapaParse
- @dnd-kit

### 4.3 External Services

- MongoDB Atlas or local MongoDB
- OSRM for routing duration estimates
- Brevo for email delivery
- Render or other Node host for backend deployment
- Vercel or other static host for frontend deployment

## 5. System Design

### 5.1 Architecture Summary

TrackMate follows a client-server architecture.

- The React frontend handles dashboards, forms, maps, and route navigation.
- The Express backend exposes REST APIs and a Socket.IO server.
- MongoDB stores users, buses, routes, stops, trips, assignments, and events.
- In-memory trip state is used for live ETA, stop detection, and active trip cache.

High-level flow:

1. A driver starts a trip.
2. The driver sends GPS updates.
3. The backend updates trip state, bus position, ETA cache, and stop events.
4. The backend broadcasts live updates to subscribed clients.
5. Students and admins render those updates in their dashboards.

### 5.2 Analysis and Design Diagrams

Diagram-ready content is maintained in `DIAGRAM_CONTENT.md`.

- 5.2.1 Use case diagram
- 5.2.2 Class diagram
- 5.2.3 Sequence diagram
- 5.2.4 Collaboration diagram
- 5.2.5 Data flow diagram

## 6. Repository Structure

```text
TrackMate/
  backend/
    config/
    controllers/
    inMemory/
    middleware/
    models/
    routes/
    scripts/
    utils/
    package.json
    server.js
  frontend/
    public/
    src/
      components/
      constants/
      context/
      hooks/
      pages/
      utils/
    package.json
  Screenshots/
  README.md
  PROJECT_DOCUMENTATION.md
  IEEE.md
  ui.md
  llm.md
```

## 7. Backend Design

### 7.1 Entry Point and Global Setup

The backend entry point is `backend/server.js`.

It is responsible for:

- Loading environment variables
- Connecting to MongoDB
- Configuring CORS and JSON parsing
- Applying login and register rate limits
- Mounting route groups under `/api/*`
- Creating the HTTP server and Socket.IO server
- Registering live visitor counting
- Registering real-time location handlers
- Seeding the default admin account through `ensureDefaultAccounts()`

### 7.2 Route Groups

Current mounted backend routes:

- `/api/auth`
- `/api/routes`
- `/api/trips`
- `/api/admin`
- `/api/buses`
- `/api/driver`
- `/api/stops`
- `/api/student`
- `/api/students`
- `/api/events`
- `/api/notifications`
- `/api/public`

Note:

- `/api/student` and `/api/students` currently point to the same student route module.
- A rate limiter exists for `/api/auth/register`, but the current auth router does not expose a register endpoint. The registration controller exists in code, but it is not mounted in `backend/routes/authRoutes.js`.

### 7.3 Core Controllers

#### 7.3.1 `locationController.js`

This is the center of the real-time trip pipeline.

Responsibilities:

- WebSocket authentication handling
- Driver update throttling
- Live trip room subscription
- Bus last-known location persistence
- Trip breadcrumb persistence
- ETA computation and smoothing
- Stop arrival and departure detection
- Event emission and notification triggering

#### 7.3.2 `tripController.js`

Responsibilities:

- Start trip via `/api/trips/start`
- Return the active driver trip via `/api/trips/active`
- End trips via `/api/trips/:tripId/end` or `/api/trips/end`
- Reset current-day testing history via `/api/trips/history/today`
- Auto-end stale trips based on `STALE_TRIP_HOURS`

#### 7.3.3 `adminController.js`

Responsibilities:

- Dashboard counts
- Student assignment CRUD
- Ongoing trip list
- Live fleet positions
- Event history
- Analytics summary
- CSV trip export

#### 7.3.4 `driverController.js`

Responsibilities:

- Driver account CRUD for admins
- Driver bus lookup
- Driver active trip lookup
- Legacy driver trip and event endpoints
- Approaching and SOS-related workflow support

#### 7.3.5 `studentController.js`

Responsibilities:

- Assignment lookup
- ETA lookup
- Current live trip lookup
- Notification token and preference management
- Self-service assignment update
- Bus and route options for student selection

#### 7.3.6 `missedBusController.js`

Responsibilities:

- Find alternative buses for a missed stop
- Prefer same-route alternatives first
- Track redirect state in memory
- Expose redirect status
- Allow redirect cancellation

## 8. Frontend Design

### 8.1 Entry and Routing

The frontend entry point is `frontend/src/main.jsx`.

Current routes:

- `/login`
- `/admin`
- `/admin/buses`
- `/admin/drivers`
- `/admin/routes`
- `/admin/stops`
- `/admin/assignments`
- `/admin/students`
- `/driver`
- `/driver-sim`
- `/student`
- `/profile`
- `/track`
- `/track/:busName`

### 8.2 Main Role Dashboards

#### Admin Dashboard

Capabilities:

- Fleet summary cards
- Active trips list
- Live fleet map
- Event feed
- Analytics snapshot
- Export action for completed trips

#### Driver Dashboard

Capabilities:

- Start trip and end trip
- Live GPS mode or simulation mode
- Wake lock support
- Teleport bus in simulation mode
- SOS trigger
- Debug log and connection status

#### Student Dashboard

Capabilities:

- Current bus location and route progress
- ETA display
- Recent stop events
- Push notification controls
- Redirect state after missed-bus reporting
- Driver contact display when available

#### Public Tracking

Capabilities:

- Bus selector at `/track`
- Bus-specific public page at `/track/:busName`
- Active status handling
- Live public subscription to trip rooms

## 9. Data Model

### 9.1 User

Primary roles:

- `admin`
- `driver`
- `student`

Notable fields:

- `username`
- `password`
- `role`
- `name`
- `phone`
- `email`
- `firstLogin`
- `driverMeta.bus`
- `pushSubscription`
- `assignedBusId` and `assignedStopId` as legacy compatibility fields

### 9.2 Bus

Notable fields:

- `name`
- `numberPlate`
- `capacity`
- `driver`
- `route`
- `isActive`
- `lastKnownLocation`

### 9.3 Route

Notable fields:

- `name`
- `geojson`
- `stops[]`
- `segStats[]`

Routes store embedded stops for fast live-trip reads.

### 9.4 Stop

Notable fields:

- `name`
- `latitude`
- `longitude`
- `sequence`
- `route`
- `averageTravelMinutes`

Stops also exist as separate documents for assignment and relation-heavy operations.

### 9.5 Trip

Notable fields:

- `bus`
- `driver`
- `route`
- `status`
- `currentStopIndex`
- `startedAt`
- `endedAt`
- `lastLocation`
- `locations[]`

Trip status lifecycle:

- `PENDING`
- `ONGOING`
- `COMPLETED`

### 9.6 StudentAssignment

This is the current source of truth for student transport mapping.

Notable fields:

- `student`
- `bus`
- `stop`
- `notificationPreferences.enabled`
- `notificationPreferences.proximityMinutes`
- `notificationPreferences.proximityMeters`
- `notificationPreferences.lastProximityAlertTrip`
- `notificationPreferences.arrivalAlert`

### 9.7 StopEvent

Notable fields:

- `trip`
- `stop`
- `stopIndex`
- `stopName`
- `status`
- `message`
- `timestamp`
- `location`
- `source`
- `etaMinutes`

Supported statuses:

- `ARRIVED`
- `LEFT`
- `SOS`

## 10. API Documentation

### 10.1 Authentication

Base path: `/api/auth`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/login` | Login with username and password |
| POST | `/forgot-password` | Reset password through email workflow |
| GET | `/me` | Current user profile |
| PUT | `/profile` | Update profile and optionally change password |

### 10.2 Trips

Base path: `/api/trips`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/start` | Start a driver trip |
| GET | `/active` | Get the active trip for the current driver |
| DELETE | `/history/today` | Reset same-day test history |
| POST | `/:tripId/end` | End a trip |
| POST | `/end` | Legacy end-trip fallback |

### 10.3 Admin

Base path: `/api/admin`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/dashboard` | Dashboard counts |
| POST | `/assignments` | Create or update a student assignment |
| GET | `/assignments` | List assignments |
| PUT | `/assignments/:id` | Update assignment |
| DELETE | `/assignments/:id` | Delete assignment |
| GET | `/trips` | List ongoing trips |
| GET | `/live-buses` | Live fleet positions |
| GET | `/analytics` | Trip analytics summary |
| GET | `/events` | Event history |
| DELETE | `/events` | Clear event history |
| POST | `/drivers` | Create driver |
| GET | `/drivers` | List drivers |
| PUT | `/drivers/:id` | Update driver |
| DELETE | `/drivers/:id` | Delete driver |
| GET | `/students` | List students |
| POST | `/students` | Create student |
| POST | `/students/bulk-upload` | Bulk upload students from CSV |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student |
| GET | `/export-trips` | Export completed trips as CSV |

### 10.4 Buses

Base path: `/api/buses`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/` | Create bus |
| GET | `/` | List buses |
| PUT | `/:id` | Update bus |
| DELETE | `/:id` | Delete bus |

### 10.5 Routes

Base path: `/api/routes`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/` | Create route |
| GET | `/` | List routes |
| PUT | `/:id` | Update route |
| DELETE | `/:id` | Delete route |

### 10.6 Stops

Base path: `/api/stops`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/` | Create stop |
| GET | `/:routeId` | List stops for a route |
| PUT | `/:id` | Update stop |
| DELETE | `/:id` | Delete stop |

### 10.7 Driver

Base path: `/api/driver`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/bus` | Get assigned bus |
| GET | `/trip` | Get current active trip |
| POST | `/trips/start` | Start trip through legacy driver route |
| POST | `/trips/location` | Submit a location update |
| POST | `/trips/event` | Record a stop event |
| POST | `/trips/end` | End trip through legacy driver route |
| POST | `/approaching` | Send approaching notification |

### 10.8 Students

Base path: `/api/students` and `/api/student`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/assignment` | Get current assignment |
| GET | `/me` | Alias of assignment lookup |
| GET | `/eta` | Get ETA for assigned stop |
| GET | `/trip` | Get active trip for assigned bus |
| POST | `/notifications` | Save notification token |
| GET | `/preferences` | Get notification preferences |
| PUT | `/preferences` | Update notification preferences |
| GET | `/buses` | Get buses with route data for student selection |
| PUT | `/assignment` | Update personal assignment |
| POST | `/missed-bus` | Report a missed bus |
| GET | `/redirect-status` | Get redirect status |
| POST | `/cancel-redirect` | Cancel redirect |

### 10.9 Notifications

Base path: `/api/notifications`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/subscribe` | Save Web Push subscription |
| GET | `/test-push` | Send a test push notification |

### 10.10 Events

Base path: `/api/events`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | List all events |
| GET | `/:tripId` | List events for one trip |

### 10.11 Public

Base path: `/api/public`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/buses` | List buses for public selector |
| GET | `/track/:busIdentifier` | Public bus tracking lookup |

## 11. WebSocket Events

Current notable event names used in the system:

- `trip:location_update`
- `trip:eta_update`
- `trip:stop_arrived`
- `trip:stop_left`
- `trip:sos`
- `bus:trip_started`
- `bus:trip_ended`
- `stats:live_visitors`
- `admin:joined`
- `public:subscribe`

## 12. Core Algorithms and Runtime Behavior

### 12.1 Location Throttling

Driver updates are throttled using `MIN_UPDATE_INTERVAL_MS`, currently 1000 ms.

### 12.2 Stop Detection

Current values from `backend/config/constants.js`:

- `RADIUS_METERS = 75`
- `SUSTAIN_TIME_MS = 3000`
- `LEAVE_RADIUS_METERS = 80`

Arrival is confirmed after sustained presence inside the stop radius. Departure is confirmed when the bus leaves the larger radius.

### 12.3 ETA Computation

The ETA engine combines:

- OSRM road duration lookup
- 15-second OSRM cache
- Exponential smoothing for display stability
- Segment-statistics fallback when live routing is not available
- Speed-based fallback when necessary

### 12.4 Missed-Bus Redirect

Current redirect logic:

1. Load the student's current assignment.
2. Exclude the student's original bus.
3. Search all ongoing trips for a matching stop name.
4. Ignore buses that have already passed the student's stop.
5. Prefer same-route buses, then prefer lower ETA.
6. Store the chosen redirect in an in-memory redirect map.

## 13. Notifications and PWA

### 13.1 Push Notifications

Push notifications are available when VAPID values are configured.

Supported flows:

- Manual subscription save
- Test push from API
- Proximity alerts
- Stop arrival alerts
- SOS alerts

### 13.2 Email Notifications

The codebase includes email workflows for:

- Welcome email
- Password reset email
- Arrival-related notification fallback

### 13.3 PWA Support

The frontend includes:

- `manifest.json`
- `sw.js`
- `offline.html`

The app can be installed and used with a service-worker-backed shell, but live tracking still depends on network connectivity.

## 14. Deployment and Configuration

### 14.1 Backend Environment

Important backend environment variables:

- `MONGO_URI`
- `DB_NAME`
- `JWT_SECRET`
- `PORT`
- `ALLOWED_ORIGINS`
- `OSRM_BASE_URL`
- `STALE_TRIP_HOURS`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `BREVO_API_KEY`
- `EMAIL_USER`

### 14.2 Frontend Environment

Important frontend environment variables:

- `VITE_BACKEND_URL`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_MIN_UPDATE_INTERVAL_MS`

## 15. Known Documentation Notes

- The default admin in the current code is `ad1/ad1`, not `admin/admin123`.
- Student registration logic exists in `authController.js`, but the current auth router does not mount a registration endpoint.
- Student assignment truth is centered on `StudentAssignment`, not the legacy assignment fields in `User`.
- Both `/api/student` and `/api/students` currently resolve to the student route module.
- Both `/api/trips/*` and some `/api/driver/trips/*` endpoints exist because the project contains newer and older trip-control route paths.

## 16. Future Improvements

- Remove or formalize duplicated legacy route paths.
- Either expose or fully remove the dormant student self-registration endpoint.
- Consolidate driver trip actions around one route group.
- Add automated API and integration tests.
- Add persistent redirect storage if cross-session redirect recovery becomes necessary.
- Expand analytics beyond summary metrics.

## 17. Conclusion

TrackMate is currently a functional full-stack transport management and tracking platform with live trip flow, operational dashboards, ETA logic, and public bus visibility. The architecture is already strong enough for continued refinement, but the main next engineering step is consolidation of older and newer route patterns so the API surface becomes simpler to maintain.