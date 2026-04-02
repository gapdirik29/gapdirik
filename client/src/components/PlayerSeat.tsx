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

  const getContainerStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
    };

    switch(position) {
      case 'top': return { ...base, top: 'calc(10px + var(--safe-top))', left: '15px' };
      case 'bottom': return { ...base, bottom: 'calc(130px + var(--safe-bottom))', right: '15px' };
      case 'left': return { ...base, top: '50%', left: 'calc(8px + var(--safe-left))', transform: 'translateY(-50%)' };
      case 'right': return { ...base, top: '50%', right: 'calc(8px + var(--safe-right))', transform: 'translateY(-50%)' };
      default: return base;
    }
  };

  const getDiscardStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'fixed', zIndex: 5, pointerEvents: 'none' };
    switch(position) {
      case 'top': return { ...base, top: 'calc(40px + var(--safe-top) + 100px)', left: '40px' };
      case 'bottom': return { ...base, bottom: 'calc(240px + var(--safe-bottom))', right: '40px' };
      case 'left': return { ...base, top: '50%', left: '110px', transform: 'translateY(-50%)' };
      case 'right': return { ...base, top: '50%', right: '110px', transform: 'translateY(-50%)' };
      default: return base;
    }
  };

  if (!player) return null;

  const lastDiscard = playerDiscards.length > 0 ? playerDiscards[playerDiscards.length - 1] : null;

  return (
    <>
      <div style={getContainerStyle()}>
        <div style={{ position: 'relative' }}>
          <motion.div
            onClick={() => onSendGift && !player.isBot && setShowGiftMenu(!showGiftMenu)}
            animate={isCurrentTurn ? { boxShadow: ['0 0 0px var(--accent-gold-glow)', '0 0 30px var(--accent-gold-glow)', '0 0 0px var(--accent-gold-glow)'] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: 72, height: 72, borderRadius: 22,
              padding: 2, background: isCurrentTurn ? 'var(--accent-gold)' : 'var(--glass-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              zIndex: 10
            }}
          >
            <div style={{ width: '100%', height: '100%', borderRadius: 20, background: '#12161b', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {isTalking && <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity }} style={{ position: 'absolute', inset: 0, background: 'rgba(76, 209, 55, 0.2)' }} />}
              <User size={38} color={isCurrentTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.4)'} />
              
              <div style={{ position: 'absolute', top: 5, right: 5, background: 'var(--accent-gold)', borderRadius: 5, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                <Star size={10} color="#000" fill="#000" />
              </div>
            </div>

            <div style={{
              position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #1e272e 0%, #000 100%)', border: `1px solid ${isCurrentTurn ? 'var(--accent-gold)' : 'var(--glass-border)'}`,
              borderRadius: 10, padding: '3px 10px', fontSize: 10, fontWeight: 950, color: 'var(--accent-gold)',
              boxShadow: '0 6px 12px rgba(0,0,0,0.6)', whiteSpace: 'nowrap', zIndex: 20
            }}>
              {player.tileCount} TAŞ
            </div>
          </motion.div>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 950, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.8)', maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
              {player.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent-gold)', opacity: 1, letterSpacing: 0.5, marginTop: 2 }}>
              {player.chips.toLocaleString()} ₺
            </div>
          </div>

          <AnimatePresence>
            {showGiftMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: -60 }} animate={{ opacity: 1, scale: 1, x: -85 }} exit={{ opacity: 0, scale: 0.8 }}
                className="glass-panel"
                style={{ position: 'absolute', left: 0, top: -10, padding: 12, display: 'flex', gap: 12, zIndex: 100 }}
              >
                {GIFTS.map(g => (
                  <button key={g.id} onClick={(e) => { e.stopPropagation(); onSendGift?.(player.id, g.id); setShowGiftMenu(false); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, fontSize: 24, padding: 8, cursor: 'pointer' }}>
                    {g.icon}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isCurrentTurn && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ color: '#4cd137', fontSize: 8, fontWeight: 950, letterSpacing: 1.5, textShadow: '0 0 10px rgba(76, 209, 55, 0.6)', marginTop: 4 }}
          >
            DÜŞÜNÜYOR
          </motion.div>
        )}
      </div>

      {/* KONUŞMA BALONCUĞU (Speech Bubble) */}
      <AnimatePresence>
        {lastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'fixed', zIndex: 1000, 
              ...((() => {
                const box: React.CSSProperties = { transform: 'translateX(-50%)' };
                switch(position) {
                  case 'top': return { ...box, top: 'calc(100px + var(--safe-top))', left: '60px' };
                  case 'bottom': return { ...box, bottom: 'calc(210px + var(--safe-bottom))', right: '40px' };
                  case 'left': return { ...box, top: '50%', left: '110px', transform: 'translateY(-100%)' };
                  case 'right': return { ...box, top: '50%', right: '110px', transform: 'translateY(-100%)' };
                  default: return box;
                }
              })())
            }}
          >
            <div className="glass-panel" style={{
              padding: '10px 18px', borderRadius: '15px 15px 15px 4px',
              border: '1.5px solid rgba(255, 215, 0, 0.4)', background: 'rgba(10, 20, 25, 0.95)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)', color: '#fff', fontSize: 13, 
              fontWeight: 800, minWidth: 100, maxWidth: 180, textAlign: 'center', lineHeight: 1.4,
              position: 'relative'
            }}>
              {lastMessage}
              {/* Baloncuk Oku */}
              <div style={{
                position: 'absolute', bottom: -8, left: 10, width: 0, height: 0,
                borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(255, 215, 0, 0.4)'
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={getDiscardStyle()}>
          <AnimatePresence mode="wait">
            {lastDiscard ? (
                <motion.div
                  key={lastDiscard.id}
                  initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
                  animate={{ scale: 0.85, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="tile-wrapper shadow-none"
                >
                   <Tile {...lastDiscard} />
                </motion.div>
            ) : (
                <div style={{ width: 42, height: 58, border: '1.5px dashed rgba(255,255,255,0.06)', borderRadius: 10 }} />
            )}
          </AnimatePresence>
      </div>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2000 }}>
         {activeGifts.map(gift => (
            <motion.div
              key={gift.id}
              initial={{ scale: 0, opacity: 0, y: 100 }} animate={{ scale: [0, 2.5, 1], opacity: [0, 1, 1], y: 0 }} exit={{ opacity: 0, scale: 2, transition: { duration: 0.8 } }}
              style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', fontSize: 80, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
            >
              {GIFTS.find(g => g.id === gift.type)?.icon || '🎁'}
            </motion.div>
         ))}
      </div>
    </>
  );
}
