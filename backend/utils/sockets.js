import Bus from '../models/Bus.js';
export const setupSockets = (io) => {
  io.on('connection', (socket) => {
    console.log('🔗 Client connected:', socket.id);
    socket.on('driver:location_update', async (payload) => {
      if (payload.busId) {
        await Bus.findByIdAndUpdate(payload.busId, {
          lastKnownLocation: { lat: payload.lat, lng: payload.lng, updatedAt: Date.now() }
        });
        if (payload.tripId) {
          io.to('trip_'+payload.tripId).emit('trip:location_update', payload);
        }
      }
    });
    socket.on('student:subscribe', (payload) => {
      if (payload.tripId) socket.join('trip_'+payload.tripId);
    });
    socket.on('disconnect', () => {});
  });
};
