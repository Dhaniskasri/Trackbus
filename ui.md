# TrackMate - UI Documentation

## 1. UI Scope

This document summarizes the current frontend experience in the TrackMate codebase. It reflects the present implementation in `frontend/src` rather than the older exhaustive design inventory.

The UI is organized around four user-facing surfaces:

- authenticated admin dashboard,
- authenticated driver dashboard,
- authenticated student dashboard,
- public tracking pages.

## 2. Visual Direction

The current UI is dark-first and uses orange as the main brand accent.

Primary visual traits:

- deep slate and navy backgrounds,
- orange call-to-action highlights,
- glass-like cards and overlays,
- map-centric layouts,
- strong status badges for live state,
- mobile-friendly spacing and card composition.

## 3. Theme and Layout

The app is wrapped by `ThemeProvider` and `AuthProvider` in `frontend/src/main.jsx`.

Theme characteristics:

- dark mode is the dominant default experience,
- light mode support exists through theme context,
- route-aware layout hides the main navbar on login and public tracking pages.

Global layout behavior:

- authenticated pages use the shared app shell from `App.jsx`,
- maps are embedded in dashboards rather than isolated in standalone pages,
- major views are optimized for both desktop and mobile cards.

## 4. Route-Level UI Structure

Current frontend routes:

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

## 5. Main Screens

### 5.1 Login

The login page is the project entry point for authenticated users.

Key UI responsibilities:

- collect username and password,
- handle first-login redirect behavior after authentication,
- present branded entry experience,
- show validation and loading feedback.

### 5.2 Admin Dashboard

The admin dashboard is the operational overview page.

Visible UI sections:

- summary stat cards,
- active trip cards,
- live fleet map,
- event stream,
- analytics summary,
- quick links to management pages,
- CSV export action.

Related components:

- `AdminMap`
- navigation links and cards
- toasts and alert overlays

### 5.3 Driver Dashboard

The driver dashboard is optimized for live trip control on a phone-sized screen.

Visible UI sections:

- trip start/end controls,
- connection and GPS status,
- wake lock status,
- simulation mode support,
- SOS action,
- debug log,
- live route map.

Related components:

- `DriverMap`
- socket and geolocation hooks
- wake lock hook

### 5.4 Student Dashboard

The student dashboard is the main live tracking experience.

Visible UI sections:

- current bus position,
- ETA card,
- route progress,
- recent stop timeline,
- notification settings,
- redirect state after missed-bus action,
- driver contact information when available.

Related components:

- `StudentMap`
- `NotificationToggle`
- trip and ETA display cards
- redirect and event state UI

### 5.5 Public Tracking

The public UI is split into two screens:

- `TrackSelector` at `/track`
- `PublicTracking` at `/track/:busName`

Visible UI elements:

- branded selector card,
- active bus status marker,
- bus route map,
- next stop information,
- public live badge.

## 6. Shared UI Components

Important shared components in the current implementation:

- `Navbar`
- `ProtectedRoute`
- `TrackMateLoader`
- `AdminMap`
- `DriverMap`
- `StudentMap`
- `MapView`
- `MapEditor`
- `Drawer`
- `ConfirmDialog`
- `Toast`
- `TrackingControls`

These components support both presentation and workflow-specific interaction.

## 7. UI State and Interaction Model

The frontend relies on a mix of REST and live socket state.

Main interaction patterns:

- initial page data through API calls,
- live trip changes through Socket.IO,
- local UI memory through state and localStorage,
- theme state through context,
- auth state through `AuthContext`.

Examples of persistent client-side state:

- auth token,
- theme preference,
- student notification toggle state,
- recent student event history,
- stop-departed flags,
- redirect UI restoration.

## 8. Mapping Experience

Maps are a central UI feature.

Current map usage includes:

- admin fleet overview,
- driver live route map,
- student assigned bus tracking,
- public bus tracking,
- route and stop editing.

Map behaviors visible in the current code:

- dynamic markers,
- route polylines,
- auto-fit bounds,
- active stop progression,
- simulation teleport support on driver map.

## 9. Notification UI

User-facing notification features include:

- browser push enablement,
- push testing,
- student preference controls,
- toast feedback for arrivals, departures, and redirect state,
- SOS alert display for admins.

## 10. Responsiveness

The UI is mobile-aware in several important places:

- the driver dashboard is designed around phone operation,
- the student dashboard uses stacked card layouts,
- maps resize inside rounded containers,
- public tracking pages adapt to narrow screens,
- the navbar behavior changes by route and available space.

## 11. Assets and Screenshots

The repository includes screenshots in `Screenshots/` for:

- login,
- admin dashboard,
- route creation,
- driver dashboard,
- student dashboard,
- push notification examples,
- SOS state.

Brand assets live primarily in `frontend/public` and related favicon folders.

## 12. Current UI Notes

- The UI already reflects the live trip architecture well.
- Public tracking intentionally uses a simpler presentation than authenticated dashboards.
- The driver and student experiences contain the most live state logic.
- The route and map editing flows are functionally important and should remain documented whenever major UI changes are made.