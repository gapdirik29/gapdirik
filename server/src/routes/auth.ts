import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
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

    const { data: user, error: fetchErr } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateCode();

    if (user) {
      if (user.is_verified) {
        return res.status(400).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanımda' });
      }
      
      await supabase.from('profiles').update({
        password_hash: hashedPassword,
        verification_code: verificationCode,
        username: username
      }).eq('id', user.id);
    } else {
      // Yeni kullanıcı (UUID otomatik oluşsun veya biz verelim)
      const { data: newUser, error: insertErr } = await supabase.from('profiles').insert({
        id: crypto.randomUUID(), // SQL tarafında da UUID default olabilir
        username,
        email,
        password_hash: hashedPassword,
        is_verified: false,
        verification_code: verificationCode,
        chips: 50000,
        level: 1
      });
      if (insertErr) throw insertErr;
    }

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

    const { data: user, error: fetchErr } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Doğrulama kodu hatalı' });
    }

    await supabase.from('profiles').update({
      is_verified: true,
      verification_code: null
    }).eq('id', user.id);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        chips: user.chips,
        level: user.level,
        total_points: user.total_points
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

    const { data: user, error: fetchErr } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (!user) return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Geçersiz e-posta veya şifre' });

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Lütfen önce hesabınızı e-posta üzerinden doğrulayın', unverified: true });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        chips: user.chips,
        level: user.level,
        total_points: user.total_points
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
    const { data: user, error: fetchErr } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (!user) {
      return res.status(404).json({ error: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı' });
    }

    const resetCode = generateCode();
    await supabase.from('profiles').update({ verification_code: resetCode }).eq('id', user.id);

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

    const { data: user, error: fetchErr } = await supabase.from('profiles').select('*').eq('email', email).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.verification_code !== code) {
       return res.status(400).json({ error: 'Sıfırlama kodu hatalı' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await supabase.from('profiles').update({ 
       password_hash: hashedPassword, 
       verification_code: null 
    }).eq('id', user.id);
    
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

    const { data: user, error: fetchErr } = await supabase.from('profiles').select('*').eq('id', decoded.id).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı yok' });

    const now = new Date();
    const lastBonus = user.last_bonus_date ? new Date(user.last_bonus_date) : new Date(0);
    const diffHours = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return res.status(400).json({ error: 'Bugünkü ödülünüzü zaten aldınız.' });
    }

    const bonusAmount = 50000;
    const newChips = (user.chips || 0) + bonusAmount;
    await supabase.from('profiles').update({
       chips: newChips,
       last_bonus_date: now.toISOString()
    }).eq('id', user.id);

    res.json({ success: true, chips: newChips, bonus: bonusAmount });
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
    const { data: user, error: fetchErr } = await supabase.from('profiles').select('id, username, chips, level, total_points').eq('id', decoded.id).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı yok' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Geçersiz' });
  }
});

export default router;
