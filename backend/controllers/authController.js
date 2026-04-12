import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const signToken = (_id) => jwt.sign({ _id }, process.env.SECRET || 'trackmate_secret', { expiresIn: '7d' });

export const login = async (req, res) => {
  const { username, password, role } = req.body;
  try {
    let user = await User.findOne({ username }).populate('assignedBusId');
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password || 'dummy', salt);
      user = await User.create({ username, password: hashedPassword, name: username, role: role || 'student' });
    } else {
      const match = await bcrypt.compare(password || 'dummy', user.password);
      if (!match) return res.status(400).json({ error: 'Incorrect password' });
    }
    const token = signToken(user._id);
    res.status(200).json({ username, token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};