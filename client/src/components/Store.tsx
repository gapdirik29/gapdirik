import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, PlayCircle, Coins, Zap, Trophy, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react';

interface StoreProps {
  onClose: () => void;
  onPurchase: (amount: number, price: string) => void;
  onWatchAd: () => void;
  isAdLoading?: boolean;
}

const CHIP_PACKS = [
  { id: 'neon_tiles', chips: 0, price: 29.99, priceStr: '29.99 ₺', name: 'NEON TAŞ SETİ', icon: <Zap size={32} />, color: '#00a8ff', badge: 'YENİ' },
  { id: 'gold_tiles', chips: 0, price: 49.99, priceStr: '49.99 ₺', name: 'ALTIN TAŞ SETİ', icon: <Trophy size={32} />, color: '#ffd700', badge: 'PREMIUM' },
  { id: 'starter', chips: 100000, price: 49.99, priceStr: '49.99 ₺', icon: <Coins size={32} />, color: '#4cd137', badge: '%50 AVANTAJ' },
  { id: 'standard', chips: 250000, price: 99.99, priceStr: '99.99 ₺', icon: <Zap size={32} />, color: '#00a8ff', badge: 'EN ÇOK SATAN' },
  { id: 'master', chips: 600000, price: 199.99, priceStr: '199.99 ₺', icon: <Trophy size={32} />, color: '#ffd700', badge: '%100 EKSTRA' },
  { id: 'vip', chips: 2000000, price: 499.99, priceStr: '499.99 ₺', icon: <ShieldCheck size={32} />, color: '#e84118', badge: 'VIP KRAL PAKET' },
];

export function Store({ onClose, onWatchAd, isAdLoading }: StoreProps) {
  const [cart, setCart] = useState<string[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const addToCart = (id: string) => {
    setCart(prev => [...prev, id]);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const totalPrice = cart.reduce((sum, id) => {
    const pack = CHIP_PACKS.find(p => p.id === id);
    return sum + (pack?.price || 0);
  }, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsPurchasing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Lütfen önce giriş yapın!');
        setIsPurchasing(false);
        return;
      }
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, userId: userData.id }),
      });
      
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else alert('Ödeme başlatılamadı: ' + (data.error || 'Hata'));
    } catch (err) {
      alert('Sistem şu an meşgul, lütfen az sonra tekrar deneyin.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: '"Outfit", sans-serif'
    }}>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)' }} 
      />

      <motion.div
        initial={{ scale: 0.9, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 50, opacity: 0 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 750, height: '85vh',
          background: 'linear-gradient(135deg, #054d3b 0%, #011c16 100%)',
          borderRadius: 32, border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}
      >
        {/* HEADER */}
        <div style={{
          padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
           <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#ffd700', textTransform: 'uppercase', letterSpacing: 1.5 }}>Gapdirik Mağaza</h2>
              <p style={{ opacity: 0.5, fontSize: 13 }}>Sepetini doldur, masanın kralı ol!</p>
           </div>
           
           <div style={{ display: 'flex', gap: 15 }}>
             <button 
               onClick={toggleCart}
               style={{ 
                 background: cart.length > 0 ? '#ffd700' : 'rgba(255,255,255,0.05)', 
                 border: 'none', padding: '0 20px', height: 44, borderRadius: 22, 
                 color: cart.length > 0 ? '#000' : '#fff', cursor: 'pointer', 
                 display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, fontSize: 13
               }}
             >
                <ShoppingCart size={20} />
                SEPETİM ({cart.length})
             </button>

             <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 44, height: 44, borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
             </button>
           </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 30, position: 'relative' }}>
          
          <AnimatePresence>
            {isCartOpen ? (
              // SEPET ÖZETİ EKRANI
              <motion.div
                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(1, 28, 22, 0.98)', zIndex: 10, padding: 30, display: 'flex', flexDirection: 'column' }}
              >
                <h3 style={{ fontSize: 22, fontWeight: 950, marginBottom: 20, color: '#ffd700' }}>SEPET ÖZETİNİZ</h3>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: 50, opacity: 0.4 }}>Sepetiniz şu an boş.</div>
                  ) : (
                    cart.map((id, idx) => {
                      const pack = CHIP_PACKS.find(p => p.id === id);
                      return (
                        <div key={`${id}-${idx}`} style={{ background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                             <div style={{ color: pack?.color }}>{pack?.icon}</div>
                             <div>
                               <div style={{ fontWeight: 800 }}>{pack?.name || pack?.chips.toLocaleString() + ' Çip'}</div>
                               <div style={{ fontSize: 11, opacity: 0.5 }}>{pack?.priceStr}</div>
                             </div>
                          </div>
                          <button onClick={() => removeFromCart(idx)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ borderTop: '1.5px solid rgba(255,255,255,0.1)', marginTop: 20, paddingTop: 20 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, fontSize: 18, fontWeight: 900 }}>
                      <span>TOPLAM TEMEL TUTAR:</span>
                      <span style={{ color: '#ffd700' }}>{totalPrice.toFixed(2)} ₺</span>
                   </div>
                   <button 
                     disabled={cart.length === 0 || isPurchasing}
                     onClick={handleCheckout}
                     style={{ 
                       width: '100%', padding: '18px', borderRadius: 20, border: 'none', 
                       background: 'linear-gradient(90deg, #ffd700, #ff8f00)', 
                       color: '#000', fontWeight: 950, fontSize: 16, cursor: 'pointer',
                       boxShadow: '0 10px 30px rgba(255,215,0,0.2)', opacity: (cart.length === 0 || isPurchasing) ? 0.5 : 1
                     }}
                   >
                     {isPurchasing ? 'GÜVENLİ ÖDEME BAŞLATIILIYOR...' : 'ÖDEMEYE GEÇ (GÜVENLİ)'}
                   </button>
                   <button onClick={toggleCart} style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: 13, marginTop: 15, cursor: 'pointer', opacity: 0.6 }}>ALIŞVERİŞE DEVAM ET</button>
                </div>
              </motion.div>
            ) : (
              // ÜRÜN LİSTESİ EKRANI
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {CHIP_PACKS.map(pack => (
                  <motion.div 
                    key={pack.id}
                    whileHover={{ y: -5, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 25,
                      border: `1.5px solid rgba(255,255,255,0.1)`,
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15
                    }}
                  >
                     {pack.badge && (
                       <div style={{ position: 'absolute', top: 12, right: -30, background: pack.color, transform: 'rotate(45deg)', width: 120, textAlign: 'center', fontSize: 9, fontWeight: 900, padding: '4px 0', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                         {pack.badge}
                       </div>
                     )}

                     <div style={{ 
                       width: 70, height: 70, borderRadius: 24, background: `${pack.color}22`,
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       color: pack.color, border: `1.5px solid ${pack.color}44`
                     }}>
                       {pack.icon}
                     </div>

                     <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: pack.chips > 0 ? 22 : 16, fontWeight: 900 }}>{pack.name || pack.chips.toLocaleString()}</div>
                        <div style={{ fontSize: 11, opacity: 0.4, fontWeight: 800 }}>{pack.chips > 0 ? 'GAPDİRİK ÇİP' : 'KOLEKSİYON PARÇASI'}</div>
                     </div>

                     <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 900, color: '#ffd700' }}>{pack.priceStr}</span>
                        <button 
                          onClick={() => addToCart(pack.id)}
                          style={{
                            background: '#ffd700', color: '#000', border: 'none', borderRadius: 8,
                            padding: '6px 12px', fontWeight: 900, fontSize: 11, cursor: 'pointer'
                          }}
                        >
                           SEPETE EKLE
                        </button>
                     </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

        </div>

        {/* BOTTOM AD SECTION (ALWAYS VISIBLE) */}
        <div style={{ 
          padding: '20px 30px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#4cd13722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4cd137' }}>
                 <PlayCircle size={20} />
              </div>
              <div>
                 <div style={{ fontWeight: 800, fontSize: 12 }}>Ücretsiz Çip Kazanın!</div>
              </div>
           </div>
           <button 
             onClick={onWatchAd}
             disabled={isAdLoading}
             style={{
               background: '#4cd137', color: '#fff', border: 'none', borderRadius: 10,
               padding: '8px 16px', fontWeight: 900, fontSize: 11, cursor: 'pointer', opacity: isAdLoading ? 0.5 : 1
             }}
           >
              {isAdLoading ? 'YÜKLENİYOR...' : 'REKLAMI İZLE'}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
