import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

/**
 * Küresel Sıralamayı Getir (Puan bazlı, İlk 10 - SQL HIZI)
 */
router.get('/top', async (req, res) => {
  try {
    const { data: topPlayers, error } = await supabase
      .from('profiles')
      .select('username, level, total_points, wins, games_played, chips')
      .order('total_points', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      data: topPlayers
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Mevcut kullanıcının sıralamasını getir (SQL COUNT MİHRABI)
 */
router.get('/my-rank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: user, error: fetchErr } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

    // Kendisinden daha fazla puanı olanları say
    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('total_points', user.total_points || 0);

    const rank = (count || 0) + 1;

    res.json({
      success: true,
      rank,
      user: {
        username: user.username,
        points: user.total_points || 0,
        chips: user.chips
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
