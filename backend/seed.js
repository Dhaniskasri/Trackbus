/**
 * Seed script — run once to populate demo data into the database.
 * Usage: node seed.js
 *
 * Creates:
 *   Admin:   username=admin       password=admin123
 *   Driver:  username=driver1     password=driver123
 *   Student: username=student1    password=student123
 *   + a sample Route, Stops, and Bus
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
dotenv.config();

// Import models
import User from './models/User.js';
import Bus from './models/Bus.js';
import Route from './models/Route.js';
import Stop from './models/Stop.js';

const seed = async () => {
  let mongoUri = process.env.MONGO_URI;
  let mongod;

  if (!mongoUri) {
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    console.log('🧪 Using in-memory MongoDB (data will not persist — set MONGO_URI in .env)');
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  await Bus.deleteMany({});
  await Route.deleteMany({});
  await Stop.deleteMany({});

  // Hash passwords
  const hash = (pw) => bcrypt.hash(pw, 10);

  // Create stops
  const stops = await Stop.insertMany([
    { name: 'College Gate', location: { lat: 16.9108, lng: 81.1447 }, sequence: 1 },
    { name: 'Main Market',  location: { lat: 16.9180, lng: 81.1300 }, sequence: 2 },
    { name: 'Bus Stand',    location: { lat: 16.9250, lng: 81.1150 }, sequence: 3 },
    { name: 'Railway Station', location: { lat: 16.9310, lng: 81.1000 }, sequence: 4 },
  ]);

  // Create route
  const route = await Route.create({
    name: 'Route A — College to Railway Station',
    stops: stops.map(s => s._id),
  });

  // Create admin
  const admin = await User.create({
    username: 'admin',
    password: await hash('admin123'),
    name: 'System Admin',
    role: 'admin',
  });

  // Create driver
  const driver = await User.create({
    username: 'driver1',
    password: await hash('driver123'),
    name: 'Raju Kumar',
    role: 'driver',
    phone: '9876543210',
  });

  // Create bus and assign driver + route
  const bus = await Bus.create({
    name: 'Bus A',
    numberPlate: 'AP 38 X 1234',
    capacity: 50,
    driverId: driver._id,
    routeId: route._id,
  });

  // Assign bus back to driver
  driver.assignedBusId = bus._id;
  await driver.save();

  // Create student
  const student = await User.create({
    username: 'student1',
    password: await hash('student123'),
    name: 'Priya Sharma',
    role: 'student',
    assignedBusId: bus._id,
    assignedRouteId: route._id,
    assignedStopId: stops[1]._id,  // Main Market stop
  });

  console.log('\n🌱 Seed data created successfully!\n');
  console.log('┌──────────────────────────────────────┐');
  console.log('│              LOGIN DETAILS            │');
  console.log('├──────────────────────────────────────┤');
  console.log('│ Role    │ Username  │ Password        │');
  console.log('├──────────────────────────────────────┤');
  console.log('│ Admin   │ admin     │ admin123        │');
  console.log('│ Driver  │ driver1   │ driver123       │');
  console.log('│ Student │ student1  │ student123      │');
  console.log('└──────────────────────────────────────┘\n');

  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
