import express from 'express';
import { User } from '../models/User.js';

const router = express.Router();

/**
 * Küresel Sıralamayı Getir (Puan bazlı, İlk 10)
 */
router.get('/top', async (req, res) => {
  try {
    const topPlayers = await User.find({})
      .sort({ 'stats.totalTournamentPoints': -1 })
      .limit(10)
      .select('username level stats.totalTournamentPoints stats.wins stats.gamesPlayed chips');

    res.json({
      success: true,
      data: topPlayers
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Mevcut kullanıcının sıralamasını getir
 */
router.get('/my-rank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const rank = await User.countDocuments({
      'stats.totalTournamentPoints': { $gt: user.stats?.totalTournamentPoints || 0 }
    }) + 1;

    res.json({
      success: true,
      rank,
      user: {
        username: user.username,
        points: user.stats?.totalTournamentPoints || 0,
        chips: user.chips
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
