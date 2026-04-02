import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import axios from 'axios';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gapdirik-super-secret-key';

// Backend'den EmailJS API çağrısı yaparak mail gönderme (Tam Güvenlik)
const sendEmailJS = async (templateId: string, templateParams: any) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID || 'dummy';
  const userId = process.env.EMAILJS_PUBLIC_KEY || 'dummy';
  const privateKey = process.env.EMAILJS_PRIVATE_KEY || 'dummy'; // Artık private key gerekli (API kullanımı için)

  if (serviceId === 'dummy') {
    console.log('[EmailJS] Ayarlar eksik, API simüle ediliyor. Gönderilen parametreler:', templateParams);
    return;
  }

  const payload = {
    service_id: 'service_9uw3fat',
    template_id: templateId,
    user_id: '7Zet8tjktS_7DI81r',
    accessToken: 'MSowcu8yBuOMNupf7HkTG',
    template_params: templateParams
  };

  try {
    await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    const errorText = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error('EmailJS Hatası:', errorText);
    throw new Error('E-posta gönderimi başarısız oldu: ' + errorText);
  }
};

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

// 1. KAYIT İSTEĞİ (Kod Gönderir, Kullanıcıyı Pasif Olarak Oluşturur)
router.post('/register-request', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurun' });
    }

    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanımda' });
      }
      // Kullanıcı var ama doğrulanmamışsa şifreyi ve kodu güncelle
      user.password = await bcrypt.hash(password, 10);
      user.username = username; // Eğer aynı emaille farklı username denemişse
    } else {
      user = new User({
        username,
        email,
        password: await bcrypt.hash(password, 10),
        isEmailVerified: false
      });
    }

    const verificationCode = generateCode();
    user.emailVerificationCode = verificationCode;
    await user.save();

    const templateId = process.env.EMAILJS_REGISTER_TEMPLATE || 'dummy';
    await sendEmailJS(templateId, {
      to_email: email,
      to_name: username,
      code: verificationCode
    });

    res.json({ success: true, message: 'Doğrulama kodu e-postanıza gönderildi' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'İşlem sırasında bir hata oluştu: ' + (err.message || String(err)) });
  }
});

// 2. KAYIT DOĞRULAMA (Kodu Onaylar, Token Döndürür)
router.post('/register-verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Eksik bilgi' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ error: 'Doğrulama kodu hatalı' });
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
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
    res.status(500).json({ error: 'Doğrulama sırasında hata oluştu' });
  }
});

// 3. GİRİŞ YAPMA (Doğrulanmamış hesapları engeller)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) return res.status(400).json({ error: 'Tüm alanları doldurun' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Lütfen önce hesabınızı e-posta üzerinden doğrulayın', unverified: true });
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

// 4. ŞİFREMİ UNUTTUM (Kod Gönderir)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı' });
    }

    const resetCode = generateCode();
    user.resetPasswordCode = resetCode;
    // user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // Opsiyonel 15 dk
    await user.save();

    const templateId = process.env.EMAILJS_FORGOT_TEMPLATE || 'dummy';
    await sendEmailJS(templateId, {
      to_email: email,
      to_name: user.username,
      code: resetCode
    });

    res.json({ success: true, message: 'Şifre sıfırlama kodunuz gönderildi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// 5. ŞİFRE SIFIRLAMA (Kodu Doğrular ve Şifreyi Değiştirir)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.resetPasswordCode !== code) {
       return res.status(400).json({ error: 'Sıfırlama kodu hatalı' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCode = undefined;
    await user.save();
    
    res.json({ success: true, message: 'Şifreniz başarıyla güncellendi' });
  } catch (err) {
    res.status(500).json({ error: 'Şifre güncellenirken hata oluştu' });
  }
});

router.post('/daily-bonus', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Yetkisiz' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'Kullanıcı yok' });

    const now = new Date();
    const lastBonus = user.stats?.lastDailyBonus ? new Date(user.stats.lastDailyBonus) : new Date(0);
    const diffHours = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return res.status(400).json({ error: 'Bugünkü ödülünüzü zaten aldınız.' });
    }

    const bonusAmount = 50000;
    user.chips += bonusAmount;
    if (!user.stats) user.stats = { totalGames: 0, wins: 0, losses: 0, totalWinnings: 0 };
    user.stats.lastDailyBonus = now.getTime();
    await user.save();

    res.json({ success: true, chips: user.chips, bonus: bonusAmount });
  } catch (err) {
    res.status(500).json({ error: 'Ödül alınırken hata oluştu' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Yetkisiz' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Kullanıcı yok' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Geçersiz' });
  }
});

export default router;
