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
      position: 'fixed',
      top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
      display: 'flex', alignItems: 'center', gap: 20, zIndex: 10,
      width: 'max-content'
    }}>
      {/* --- TAŞ DESTEĞİ (DRAW PILE) --- */}
      <div style={{ textAlign: 'center' }}>
        <motion.div
           whileHover={!hasDrawn && isMyTurn ? { scale: 1.05 } : {}}
           whileTap={!hasDrawn && isMyTurn ? { scale: 0.95 } : {}}
           onClick={!hasDrawn && isMyTurn ? onDraw : undefined}
           style={{
             width: 75, height: 95, borderRadius: 14,
             background: 'linear-gradient(135deg, #2c3e50 0%, #000 100%)',
             border: `2px solid ${!hasDrawn && isMyTurn ? 'var(--accent-gold)' : 'var(--glass-border)'}`,
             display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
             cursor: !hasDrawn && isMyTurn ? 'pointer' : 'default',
             boxShadow: !hasDrawn && isMyTurn ? '0 0 25px var(--accent-gold-glow)' : '0 10px 30px rgba(0,0,0,0.5)',
             position: 'relative'
           }}
        >
          {/* 3. BOYUT EFEKTİ (Destenin Yanı) */}
          <div style={{ position: 'absolute', right: -6, top: 6, bottom: 6, width: 6, background: '#1a2228', borderRadius: '0 4px 4px 0', borderLeft: '1px solid rgba(255,255,255,0.1)' }} />
          
          <Layers size={24} color={!hasDrawn && isMyTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)'} style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--accent-gold)' }}>{drawPileCount}</div>
          <div style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>DESTE</div>
        </motion.div>
      </div>

      {/* --- GÖSTERGE TAŞI (INDICATOR) --- */}
      <div style={{ textAlign: 'center' }}>
        <div className="glass-panel" style={{ 
          width: 85, height: 110, padding: 4, borderRadius: 16,
          background: 'rgba(255,215,0,0.03)', border: '1.5px solid rgba(255,215,0,0.1)' 
        }}>
          <div style={{ 
             width: '100%', height: '100%', background: '#f5f5f5', borderRadius: 12, 
             display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
             boxShadow: 'inset 0 0 15px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.3)',
             position: 'relative', overflow: 'hidden'
          }}>
             {/* Fildişi Dokusu */}
             <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
             
             <span style={{ 
                fontSize: 45, fontWeight: 950, 
                color: indicator.color === 'red' ? '#e74c3c' : 
                       indicator.color === 'blue' ? '#3498db' : 
                       indicator.color === 'yellow' ? '#f1c40f' : '#2c3e50',
                letterSpacing: -2, zIndex: 2
             }}>
               {indicator.number}
             </span>
             <div style={{ position: 'absolute', bottom: 8, fontSize: 8, fontWeight: 950, color: '#000', opacity: 0.3, letterSpacing: 1.5 }}>GÖSTERGE</div>
          </div>
        </div>
      </div>

      {/* --- YAN TAŞ ALMA (DISCARD PICKUP) --- */}
      <AnimatePresence>
        {lastDiscard && (
           <motion.div
             initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
             style={{ textAlign: 'center' }}
           >
             <motion.div
                whileHover={!hasDrawn && isMyTurn && canTakeDiscard ? { scale: 1.05 } : {}}
                whileTap={!hasDrawn && isMyTurn && canTakeDiscard ? { scale: 0.95 } : {}}
                onClick={!hasDrawn && isMyTurn && canTakeDiscard ? onTakeDiscard : undefined}
                className="glass-panel"
                style={{
                  width: 70, height: 95, padding: '15px 10px',
                  border: `2px solid ${!hasDrawn && isMyTurn && canTakeDiscard ? '#4cd137' : 'var(--glass-border)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: !hasDrawn && isMyTurn && canTakeDiscard ? 'pointer' : 'default',
                  boxShadow: !hasDrawn && isMyTurn && canTakeDiscard ? '0 0 20px rgba(76,209,55,0.3)' : 'none'
                }}
             >
                <div style={{ transform: 'scale(0.85)', opacity: !hasDrawn && isMyTurn && canTakeDiscard ? 1 : 0.6 }}>
                   <Tile {...lastDiscard} skin={tileSkin} />
                </div>
                {(!hasDrawn && isMyTurn && canTakeDiscard) && (
                   <div style={{ 
                      position: 'absolute', top: -12, background: '#4cd137', color: '#000', 
                      fontSize: 9, fontWeight: 950, padding: '2px 8px', borderRadius: 10,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                   }}>
                     ALABİLİRSİN
                   </div>
                )}
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* --- ATILACAK YER (DISCARD TARGET) --- */}
      <div style={{ textAlign: 'center' }}>
         <div style={{
            width: 75, height: 95, borderRadius: 16,
            border: `2px dashed ${hasDrawn && isMyTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)'}`,
            background: hasDrawn && isMyTurn ? 'rgba(255,215,0,0.03)' : 'rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            position: 'relative'
         }}>
           <ChevronDown size={24} color={hasDrawn && isMyTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)'} style={{ marginBottom: 5 }} />
           <div style={{ fontSize: 10, fontWeight: 950, color: hasDrawn && isMyTurn ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)', letterSpacing: 1 }}>ATIK</div>
           {hasDrawn && isMyTurn && (
             <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ repeat: Infinity }} style={{ position: 'absolute', inset: 0, border: '2px solid var(--accent-gold)', borderRadius: 14 }} />
           )}
         </div>
      </div>
    </div>
  );
}
