import { motion, AnimatePresence } from 'framer-motion';
import { TileData } from '../types';
import { Tile } from './Tile';
import { Layers, ChevronDown } from 'lucide-react';

interface TableCenterProps {
  indicator: TileData;
  drawPileCount: number;
  discardPile: TileData[];
  isMyTurn: boolean;
  hasDrawn: boolean;
  onDraw: () => void;
  onDiscard: (tileId: string) => void;
  selectedTileId?: string | null;
  canTakeDiscard?: boolean;
  onTakeDiscard?: () => void;
  tileSkin?: 'default' | 'gold' | 'neon' | 'marble';
}

export function TableCenter({
  indicator,
  drawPileCount,
  discardPile,
  isMyTurn,
  hasDrawn,
  canTakeDiscard,
  onTakeDiscard,
  onDraw,
  tileSkin
}: TableCenterProps) {
  const lastDiscard = discardPile[discardPile.length - 1];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2rem', zIndex: 10,
      width: 'max-content', position: 'relative'
    }}>
      {/* 1. DESTE (DRAW PILE) */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <motion.div
           whileHover={!hasDrawn && isMyTurn ? { scale: 1.05, y: -5 } : {}}
           onClick={!hasDrawn && isMyTurn ? onDraw : undefined}
           style={{
             width: '4.2rem', height: '6rem', borderRadius: '0.6rem',
             background: 'linear-gradient(135deg, #2c3e50 0%, #000 100%)',
             border: `2px solid ${!hasDrawn && isMyTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)'}`,
             display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
             cursor: !hasDrawn && isMyTurn ? 'pointer' : 'default',
             boxShadow: !hasDrawn && isMyTurn ? '0 0.5rem 2rem rgba(255, 204, 0, 0.4)' : '0 1rem 3rem rgba(0,0,0,0.5)',
             position: 'relative'
           }}
        >
          {/* KATMANLI GÖRÜNÜM (Stack Depth) */}
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: '100%', height: '100%', background: '#1a1f25', zIndex: -1, borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -8, right: -8, width: '100%', height: '100%', background: '#0e1115', zIndex: -2, borderRadius: '0.6rem' }} />
          
          <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--accent-gold)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{drawPileCount}</div>
          <div style={{ fontSize: '0.5rem', fontWeight: 950, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 }}>DESTE</div>
        </motion.div>
      </div>

      {/* 2. HIZALAYICI & ZAMANLAYICI (TIMER CENTER) */}
      <div style={{ position: 'relative', width: '5rem', height: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         {/* Dairesel Zamanlayıcı Halkası */}
         <svg width="100%" height="100%" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <circle cx="50%" cy="50%" r="2.2rem" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            {isMyTurn && (
              <motion.circle 
                cx="50%" cy="50%" r="2.2rem" fill="transparent" stroke="var(--accent-gold)" strokeWidth="4"
                strokeDasharray="13.8rem" animate={{ strokeDashoffset: [0, 13.8] }}
                transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
              />
            )}
         </svg>
         
         {/* Merkez Badge */}
         <div className="glass-panel" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.4)' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 950, color: isMyTurn ? 'var(--accent-gold)' : '#fff', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
               {isMyTurn ? 'EL' : '30'}
            </span>
         </div>
      </div>

      {/* 3. GÖSTERGE (INDICATOR) */}
      <div style={{ textAlign: 'center' }}>
         <div style={{ 
            width: '4.2rem', height: '6rem', background: '#fff', borderRadius: '0.6rem', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 0 0 1rem rgba(0,0,0,0.1), 0 1rem 2.5rem rgba(0,0,0,0.4)',
            position: 'relative', overflow: 'hidden', border: '1px solid #dcdde1'
         }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
            <span style={{ 
               fontSize: '2.4rem', fontWeight: 950, 
               color: indicator.color === 'red' ? '#c0392b' : 
                      indicator.color === 'blue' ? '#2980b9' : 
                      indicator.color === 'yellow' ? '#f39c12' : '#2d3436',
               lineHeight: 1
            }}>
              {indicator.number}
            </span>
            <div style={{ position: 'absolute', bottom: '0.4rem', fontSize: '0.45rem', fontWeight: 950, color: '#000', opacity: 0.4, letterSpacing: 1 }}>GÖSTERGE</div>
         </div>
      </div>

      {/* 4. AKTİF ATIK (ACTIVE DISCARD) */}
      <AnimatePresence>
        {lastDiscard && (
           <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ marginLeft: '1rem' }}>
              <motion.div 
                 onClick={!hasDrawn && isMyTurn && canTakeDiscard ? onTakeDiscard : undefined}
                 style={{ 
                    transform: 'scale(0.85)', filter: (!hasDrawn && isMyTurn && canTakeDiscard) ? 'none' : 'grayscale(0.4) opacity(0.7)',
                    cursor: (!hasDrawn && isMyTurn && canTakeDiscard) ? 'pointer' : 'default'
                 }}
              >
                 <Tile {...lastDiscard} skin={tileSkin} />
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
