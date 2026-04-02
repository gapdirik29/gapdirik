import { useState, useEffect } from 'react';
import { Player, TileData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from './Tile';
import { User, Star } from 'lucide-react';

interface PlayerSeatProps {
  player: Player | null;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentTurn: boolean;
  playerDiscards: TileData[]; 
  onSendGift?: (receiverId: string, gift: string) => void;
  activeGifts: { id: string, type: string, timestamp: number }[];
  lastMessage?: string;
}

const GIFTS = [
  { id: 'çay', icon: '☕' },
  { id: 'kahve', icon: '🍵' },
  { id: 'çiçek', icon: '🌸' },
  { id: 'bomba', icon: '💣' },
];

export function PlayerSeat({ player, position, isCurrentTurn, playerDiscards, onSendGift, activeGifts, lastMessage }: PlayerSeatProps) {
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  useEffect(() => {
    if (player && player.id !== 'me' && isCurrentTurn) {
        const talk = setInterval(() => {
            if (Math.random() > 0.7) {
                setIsTalking(true);
                setTimeout(() => setIsTalking(false), 2000);
            }
        }, 5000);
        return () => clearInterval(talk);
    }
  }, [player, isCurrentTurn]);

  if (!player) return null;

  const lastDiscard = playerDiscards.length > 0 ? playerDiscards[playerDiscards.length - 1] : null;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
      
      {/* 1. ÜST BİLGİ (KOLTUK NO / DURUM) */}
      <AnimatePresence>
        {isCurrentTurn && (
          <motion.div
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: -18 }}
            style={{ position: 'absolute', top: 0, color: 'var(--accent-gold)', fontSize: '0.55rem', fontWeight: 1000, letterSpacing: 2, textShadow: '0 0 10px rgba(255,204,0,0.5)' }}
          >
            SIRADA
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. ANA OYUNCU KARTI (ULTRA GLASS) */}
      <div className="glass-panel" style={{ 
        padding: '0.4rem', borderRadius: '1.5rem', 
        border: isCurrentTurn ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: isCurrentTurn ? '0 0 20px rgba(255,204,0,0.2)' : '0 10px 20px rgba(0,0,0,0.4)',
        background: isCurrentTurn ? 'rgba(255,204,0,0.05)' : 'rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
        minWidth: '5.5rem'
      }}>
        
        {/* AVATAR DERYASI */}
        <div style={{ position: 'relative', width: '3.8rem', height: '3.8rem' }}>
           <div style={{ 
             width: '100%', height: '100%', borderRadius: '1.2rem', 
             background: 'linear-gradient(135deg, #0f2027 0%, #203a43 100%)', 
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden'
           }}>
              <User size={32} color={isCurrentTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.3)'} />
              {isTalking && <motion.div animate={{ opacity: [0, 0.4, 0] }} transition={{ repeat: Infinity }} style={{ position: 'absolute', inset: 0, background: '#4cd137' }} />}
           </div>
           
           {/* VIP LOGO */}
           <div style={{ position: 'absolute', top: '-0.3rem', right: '-0.3rem', background: 'var(--accent-gold)', borderRadius: '50%', width: '1.1rem', height: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
             <Star size={10} color="#000" fill="#000" />
           </div>

           {/* TAŞ SAYISI (FLOATING BADGE) */}
           <div style={{
              position: 'absolute', bottom: '-0.3rem', left: '50%', transform: 'translateX(-50%)',
              background: '#000', border: '1px solid var(--accent-gold)',
              borderRadius: '0.6rem', padding: '0.1rem 0.5rem', fontSize: '0.6rem', fontWeight: 1000, color: 'var(--accent-gold)',
              whiteSpace: 'nowrap'
           }}>
              {player.tileCount} TAŞ
           </div>
        </div>

        {/* İSİM VE BAKİYE */}
        <div style={{ textAlign: 'center', marginTop: '0.3rem' }}>
           <div style={{ fontSize: '0.65rem', fontWeight: 950, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, maxWidth: '5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.name}
           </div>
           <div style={{ color: 'var(--accent-gold)', fontSize: '0.7rem', fontWeight: 1000, marginTop: '0.1rem' }}>
              {player.chips.toLocaleString()} ₺
           </div>
        </div>
      </div>

      {/* DISCARDS (ELITE PRO MINI DISPLAY) */}
      <div style={{
          position: 'absolute', 
          ...(position === 'top' ? { top: '8.5rem' } : position === 'bottom' ? { bottom: '7.5rem' } : position === 'left' ? { left: '7.5rem' } : { right: '7.5rem' }),
          zIndex: 5, transform: 'scale(0.8)'
      }}>
          <AnimatePresence mode="wait">
            {lastDiscard ? (
                <motion.div key={lastDiscard.id} initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                   <Tile {...lastDiscard} />
                </motion.div>
            ) : (
                <div style={{ width: 40, height: 55, border: '1.5px dashed rgba(255,255,255,0.06)', borderRadius: 10 }} />
            )}
          </AnimatePresence>
      </div>

      {/* KONUŞMA BALONU (MINIMALIST ROYAL) */}
      <AnimatePresence>
        {lastMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="glass-panel"
            style={{ 
              position: 'absolute', left: '110%', top: '10%', padding: '0.6rem 1rem', 
              minWidth: '6rem', color: '#fff', fontSize: '0.7rem', fontWeight: 800,
              zIndex: 1000, borderLeft: '3px solid var(--accent-gold)'
            }}
          >
            {lastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
