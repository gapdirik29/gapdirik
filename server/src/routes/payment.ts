import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User.js';

const router = express.Router();

// 1. Ödeme Aracını Dinamik Olarak Oluştur (Anahtarı her zaman env'den taze oku)
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe API Key bulunamadı! Lütfen .env dosyasını kontrol edin.');
  return new Stripe(key);
};

const ALL_PACKS: { [key: string]: { name: string, price: number, chips: number } } = {
  'starter': { name: 'Küçük Kese (50K)', price: 29.99, chips: 50000 },
  'standard': { name: 'Zengin Çanta (150K)', price: 79.99, chips: 150000 },
  'master': { name: 'Elmas Sandık (500K)', price: 199.99, chips: 500000 },
  'vip': { name: 'Kral Hazinesi (2.5M)', price: 749.99, chips: 2500000 },
};

// 1. SEPET ÖDEMESİ BAŞLATMA
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, userId } = req.body;
    const stripe = getStripe(); // Her seferinde taze anahtarla sisteme bağlan!

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Sepetiniz boş!' });
    }

    const lineItems = items.map(id => {
      const pack = ALL_PACKS[id];
      if (!pack) throw new Error(`Geçersiz paket: ${id}`);
      
      return {
        price_data: {
          currency: 'try',
          product_data: {
            name: `Gapdirik: ${pack.name}`,
            description: pack.chips > 0 ? `${pack.chips.toLocaleString()} Çip İçerir` : 'Özel Koleksiyon Parçası',
          },
          unit_amount: Math.round(pack.price * 100),
        },
        quantity: 1,
      };
    });

    const totalChips = items.reduce((sum, id) => sum + (ALL_PACKS[id]?.chips || 0), 0);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-cancel`,
      metadata: {
        userId: userId,
        totalChips: totalChips.toString(),
        itemDetails: items.join(','),
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Sepet Ödeme Hatası:', err);
    res.status(500).json({ error: err.message || 'Ödeme oturumu oluşturulamadı' });
  }
});

// 2. WEBHOOK (ÖDEME BİTİNCE ÇİPLERİ VE EŞYALARI YÜKLE)
router.post('/webhook', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const chipsToAdd = parseInt(session.metadata.totalChips);
    const purchasedItems = session.metadata.itemDetails;

    try {
      const user = await User.findById(userId);
      if (user) {
        user.chips += chipsToAdd;
        await user.save();
        console.log(`🛒 [SEPET ÖDEMESİ BAŞARILI] ${user.username} kullanıcısına ${chipsToAdd} çip yüklendi!`);
      }
    } catch (err) {
      console.error('❌ Sepet çip yükleme hatası:', err);
    }
  }

  res.json({ received: true });
});

// 3. ÖDEMEYİ MANUEL DOĞRULA VE ÇİPLERİ YÜKLE (Garantici Yöntem)
router.get('/confirm-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid' && session.metadata?.processed !== 'true') {
      const userId = session.metadata?.userId;
      const chipsToAdd = parseInt(session.metadata?.totalChips || '0');
      const itemDetails = session.metadata?.itemDetails || '';

      const user = await User.findById(userId);
      if (user) {
        user.chips += chipsToAdd;
        // Opsiyonel: Eşyaları (Inventory) de burada ekleyebiliriz
        await user.save();
        
        // Bu ödemeyi işlendi diye işaretle (Tekrar yükleme olmasın)
        await stripe.checkout.sessions.update(sessionId, {
          metadata: { ...session.metadata, processed: 'true' }
        });

        console.log(`✅ [ÖDEME ONAYLANDI] ${user.username} için ${chipsToAdd} çip yüklendi!`);
        return res.json({ success: true, chips: user.chips, username: user.username });
      }
    } else if (session.metadata?.processed === 'true') {
       return res.json({ success: true, message: 'Zaten işlendi' });
    }
    
    res.status(400).json({ error: 'Ödeme bulunamadı veya henüz tamamlanmadı.' });
  } catch (err: any) {
    console.error('Doğrulama Hatası:', err);
    res.status(500).json({ error: 'Ödeme tescili sırasında hata oluştu' });
  }
});

export default router;
