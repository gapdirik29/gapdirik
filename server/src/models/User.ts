import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chips: { type: Number, default: 50000 },
  level: { type: Number, default: 1 },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
