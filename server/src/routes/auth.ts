import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gapdirik-super-secret-key';

// Check email or username
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Simple validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurun' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        chips: user.chips,
        level: user.level,
        stats: user.stats
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kayıt olurken bir hata oluştu' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurun' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        chips: user.chips,
        level: user.level,
        stats: user.stats
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Giriş yaparken bir hata oluştu' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkisiz erişim' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Geçersiz token' });
  }
});

export default router;
