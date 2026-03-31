import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, PlayCircle, Coins, Zap, Trophy, ShieldCheck } from 'lucide-react';

interface StoreProps {
  onClose: () => void;
  onPurchase: (amount: number, price: string) => void;
  onWatchAd: () => void;
  isAdLoading?: boolean;
}

const CHIP_PACKS = [
  { id: 'neon_tiles', chips: 0, price: '29.99 ₺', name: 'NEON TAŞ SETİ', icon: <Zap size={32} />, color: '#00a8ff', badge: 'YENİ' },
  { id: 'gold_tiles', chips: 0, price: '49.99 ₺', name: 'ALTIN TAŞ SETİ', icon: <Trophy size={32} />, color: '#ffd700', badge: 'PREMIUM' },
  { id: 'starter', chips: 100000, price: '49.99 ₺', icon: <Coins size={32} />, color: '#4cd137', badge: '%50 AVANTAJ' },
  { id: 'standard', chips: 250000, price: '99.99 ₺', icon: <Zap size={32} />, color: '#00a8ff', badge: 'EN ÇOK SATAN' },
  { id: 'master', chips: 600000, price: '199.99 ₺', icon: <Trophy size={32} />, color: '#ffd700', badge: '%100 EKSTRA' },
  { id: 'vip', chips: 2000000, price: '499.99 ₺', icon: <ShieldCheck size={32} />, color: '#e84118', badge: 'VIP KRAL PAKET' },
];

export function Store({ onClose, onPurchase, onWatchAd, isAdLoading }: StoreProps) {
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
          position: 'relative', width: '100%', maxWidth: 700,
          background: 'linear-gradient(135deg, #054d3b 0%, #011c16 100%)',
          borderRadius: 32, border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{
          padding: '25px 30px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
           <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#ffd700', textTransform: 'uppercase', letterSpacing: 1.5 }}>Çip Mağazası</h2>
              <p style={{ opacity: 0.5, fontSize: 13 }}>Hemen çip al, oyunun galibi sen ol!</p>
           </div>
           <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 44, height: 44, borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={24} />
           </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 30, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
           {CHIP_PACKS.map(pack => (
             <motion.div 
               key={pack.id}
               whileHover={{ y: -5, scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={() => onPurchase(pack.chips, pack.price)}
               style={{
                 background: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 25,
                 border: `1.5px solid rgba(255,255,255,0.1)`,
                 cursor: 'pointer', position: 'relative', overflow: 'hidden',
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

                <button style={{
                  width: '100%', padding: '12px', borderRadius: 16, border: 'none',
                  background: 'linear-gradient(to right, #ffd700, #ff8f00)',
                  color: '#000', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}>
                   <CreditCard size={16} /> {pack.price}
                </button>
             </motion.div>
           ))}
        </div>

        <div style={{ 
          padding: '25px 30px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#4cd13722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4cd137' }}>
                 <PlayCircle size={24} />
              </div>
              <div>
                 <div style={{ fontWeight: 800, fontSize: 13 }}>Ücretsiz Çip Kazanın!</div>
                 <div style={{ opacity: 0.5, fontSize: 11 }}>Kısa bir reklam izleyerek 5.000 Çip kazanın.</div>
              </div>
           </div>
           <button 
             onClick={onWatchAd}
             disabled={isAdLoading}
             style={{
               background: '#4cd137', color: '#fff', border: 'none', borderRadius: 12,
               padding: '10px 20px', fontWeight: 900, fontSize: 13, cursor: 'pointer',
               display: 'flex', alignItems: 'center', gap: 8, opacity: isAdLoading ? 0.5 : 1
             }}
           >
              {isAdLoading ? 'YÜKLENİYOR...' : 'REKLAMI İZLE'}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
