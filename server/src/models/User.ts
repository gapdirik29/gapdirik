import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chips: { type: Number, default: 50000 },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    totalTournamentPoints: { type: Number, default: 0 }, // Küresel Sıralama Puanı
    totalChipsWon: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    currentWinStreak: { type: Number, default: 0 },
    lastGameDate: { type: Date },
  },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
