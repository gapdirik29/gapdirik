import { useState, useEffect } from 'react';
import { Player, TileData } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Tile } from './Tile';
import { User, Mic, MicOff } from 'lucide-react';

interface PlayerSeatProps {
  player: Player | null;
  position: 'top' | 'left' | 'right' | 'bottom';
  isCurrentTurn: boolean;
  playerDiscards: TileData[]; 
  onSendGift?: (receiverId: string, gift: string) => void;
  activeGifts: { id: string, type: string, timestamp: number }[];
}

const GIFTS = [
  { id: 'çay', icon: '☕' },
  { id: 'kahve', icon: '🍵' },
  { id: 'çiçek', icon: '🌸' },
  { id: 'bomba', icon: '💣' },
];

export function PlayerSeat({ player, position, isCurrentTurn, playerDiscards, onSendGift, activeGifts }: PlayerSeatProps) {
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);

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

  if (!player) return (
    <div style={{
      position: 'fixed',
      top: position === 'top' ? 30 : position === 'bottom' ? 'auto' : '50%',
      bottom: position === 'bottom' ? 100 : 'auto',
      left: position === 'left' ? 30 : position === 'right' ? 'auto' : '50%',
      right: position === 'right' ? 30 : 'auto',
      transform: (position === 'left' || position === 'right') ? 'translateY(-50%)' : 'translateX(-50%)',
      padding: '20px', borderRadius: 24, background: 'rgba(255,255,255,0.02)',
      border: '1.5px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)',
      fontSize: 12, fontWeight: 900, textAlign: 'center', zIndex: 5
    }}>
      BEKLENİYOR...
    </div>
  );

  const lastDiscard = playerDiscards.length > 0 ? playerDiscards[playerDiscards.length - 1] : null;

  const getDiscardStyle = () => {
    switch(position) {
      case 'bottom': return { bottom: 180, left: '50%', transform: 'translateX(-50%)' };
      case 'top': return { top: 120, left: '50%', transform: 'translateX(-50%)' };
      case 'left': return { left: 240, top: '50%', transform: 'translateY(-50%)' };
      case 'right': return { right: 240, top: '50%', transform: 'translateY(-50%)' };
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        top: position === 'top' ? 30 : position === 'bottom' ? 'auto' : '50%',
        bottom: position === 'bottom' ? 100 : 'auto',
        left: position === 'left' ? 30 : position === 'right' ? 'auto' : '50%',
        right: position === 'right' ? 30 : 'auto',
        transform: (position === 'left' || position === 'right') ? 'translateY(-50%)' : 'translateX(-50%)',
        display: 'flex', flexDirection: position === 'bottom' ? 'row' : 'column',
        alignItems: 'center', gap: 12, zIndex: 5,
      }}>
        
        <div style={{ position: 'relative' }}>
          <motion.div
            onClick={() => onSendGift && !player.isBot && setShowGiftMenu(!showGiftMenu)}
            style={{
              width: 80, height: 80, borderRadius: 24,
              border: isCurrentTurn ? '3.5px solid #ffd700' : '2px solid rgba(255,255,255,0.1)',
              background: isCurrentTurn ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', cursor: 'pointer', transition: '0.3s',
              boxShadow: isTalking ? '0 0 25px #4cd137' : '0 10px 30px rgba(0,0,0,0.3)'
            }}
          >
            {isTalking && <div className="mic-pulse" />}
            <User size={38} color={isCurrentTurn ? '#ffd700' : 'rgba(255,255,255,0.3)'} />
            
            <div style={{
              position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)',
              background: '#011c16', border: '1px solid #ffd700', borderRadius: 10,
              padding: '2px 8px', fontSize: 9, fontWeight: 900, color: '#ffd700',
              boxShadow: '0 5px 10px rgba(0,0,0,0.5)', whiteSpace: 'nowrap'
            }}>
              {player.tileCount} TAŞ
            </div>
          </motion.div>
        
          <div style={{ marginTop: 15, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{player.name.toUpperCase()}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#ffd700' }}>{player.chips.toLocaleString()} ₺</div>
          </div>

          {position === 'bottom' && (
             <button 
                onClick={() => setMicEnabled(!micEnabled)}
                style={{
                  position: 'absolute', right: -25, top: 0,
                  width: 32, height: 32, borderRadius: 10, border: 'none',
                  background: micEnabled ? '#4cd13722' : 'rgba(232, 65, 24, 0.2)',
                  color: micEnabled ? '#4cd137' : '#e84118', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
             >
                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
             </button>
          )}

          <AnimatePresence>
            {showGiftMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: -10 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)', borderRadius: 16, padding: '8px 12px',
                  display: 'flex', gap: 10, border: '1.5px solid rgba(255,255,255,0.1)',
                  zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
              >
                {GIFTS.map(g => (
                  <button
                    key={g.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendGift?.(player.id, g.id);
                      setShowGiftMenu(false);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
                      fontSize: 20, cursor: 'pointer', padding: '5px'
                    }}
                  >
                    {g.icon}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isCurrentTurn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)', color: '#4cd137', fontSize: 9, fontWeight: 900, letterSpacing: 1, whiteSpace: 'nowrap' }}
          >
            SIRA ONDA
          </motion.div>
        )}
      </div>

      {/* AKTİF HEDİYE ANİMASYONLARI */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
         <AnimatePresence>
           {activeGifts.map(gift => (
             <motion.div
               key={gift.id}
               initial={{ scale: 0, opacity: 0, y: 50 }}
               animate={{ scale: [0, 1.5, 1], opacity: 1, y: -40 }}
               exit={{ scale: 0, opacity: 0, transition: { duration: 0.5 } }}
               style={{ 
                 position: 'absolute', left: '50%', transform: 'translateX(-50%)', 
                 fontSize: 40, zIndex: 1000 
               }}
             >
               {GIFTS.find(g => g.id === gift.type)?.icon || gift.type}
             </motion.div>
           ))}
         </AnimatePresence>
      </div>

      {/* EN SON ATILAN TAŞ */}
      <div style={{
          position: 'fixed',
          ...getDiscardStyle() as any,
          zIndex: 4,
          pointerEvents: 'none',
          width: 48, height: 68 // Standart Boyut
      }}>
          <AnimatePresence mode="wait">
            {lastDiscard ? (
                <motion.div
                  key={lastDiscard.id}
                  initial={{ scale: 0.5, y: -20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                   <Tile {...lastDiscard} />
                </motion.div>
            ) : (
                <div style={{ width: 48, height: 68, border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 6 }} />
            )}
          </AnimatePresence>
      </div>
    </>
  );
}
