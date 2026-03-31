import { motion } from 'framer-motion';
import { TileData } from '../types';
import { Tile } from './Tile';

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
  onDraw,
  canTakeDiscard,
  onTakeDiscard,
  tileSkin
}: TableCenterProps) {
  const lastDiscard = discardPile[discardPile.length - 1];

  return (
    <div style={{
      position: 'fixed',
      top: '44%', // Biraz daha aşağı aldım
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 32, 
      zIndex: 10,
    }}>
      {/* 1. DESTE (Daha şık, 3D Deste) */}
      <div style={{ textAlign: 'center' }}>
        <motion.div
           whileHover={!hasDrawn && isMyTurn ? { y: -10, scale: 1.05 } : {}}
           whileTap={!hasDrawn && isMyTurn ? { scale: 0.95 } : {}}
           onClick={!hasDrawn && isMyTurn ? onDraw : undefined}
           style={{
             width: 80, height: 104,
             background: 'linear-gradient(135deg, #263238 0%, #000 100%)',
             borderRadius: 12,
             border: `3px solid ${!hasDrawn && isMyTurn ? '#ffd700' : 'rgba(255,255,255,0.05)'}`,
             display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
             cursor: !hasDrawn && isMyTurn ? 'pointer' : 'default',
             boxShadow: !hasDrawn && isMyTurn ? '0 0 35px rgba(255,215,0,0.5)' : '0 15px 35px rgba(0,0,0,0.6)',
             position: 'relative', overflow: 'hidden',
           }}
        >
          {/* Üst Kısım Kart Deseni */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
          <span style={{ fontSize: 32, marginBottom: 4, textShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>🀄</span>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>DESTE</span>
          <span style={{ fontSize: 20, fontWeight: 950, color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>{drawPileCount}</span>
        </motion.div>
      </div>

      {/* 2. GÖSTERGE (Zarif İvory Görünüm) */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 80, height: 104, background: '#fff', borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 25px rgba(0,0,0,0.5)', position: 'relative', border: '1px solid #ddd',
          backgroundImage: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
        }}>
          <span style={{ 
            fontSize: 42, 
            fontWeight: 950, 
            color: indicator.color === 'red' ? '#ff4d4d' : 
                   indicator.color === 'blue' ? '#00a8ff' : 
                   indicator.color === 'yellow' ? '#ffcc00' : 
                   '#111', 
            letterSpacing: '-2px' 
          }}>
            {indicator.number}
          </span>
          <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(0,0,0,0.3)', position: 'absolute', bottom: 12, letterSpacing: '0.1em' }}>GÖSTERGELİK</span>
        </div>
      </div>

      {/* 3. YAN TAŞ ALMA (Gold Cam Efekti) */}
      {lastDiscard && (
        <div style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            whileHover={!hasDrawn && isMyTurn && canTakeDiscard ? { scale: 1.05, y: -5 } : {}}
            onClick={!hasDrawn && isMyTurn && canTakeDiscard ? onTakeDiscard : undefined}
            style={{
              width: 54, height: 74, background: 'rgba(255,255,255,0.08)', borderRadius: 10,
              backdropFilter: 'blur(12px)',
              border: `2px solid ${!hasDrawn && isMyTurn && canTakeDiscard ? '#ffd700' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: !hasDrawn && isMyTurn && canTakeDiscard ? 'pointer' : 'default',
              position: 'relative',
              boxShadow: !hasDrawn && isMyTurn && canTakeDiscard ? '0 0 25px rgba(255,215,0,0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ pointerEvents: 'none' }}>
              <Tile
                id={lastDiscard.id}
                number={lastDiscard.number}
                color={lastDiscard.color}
                isFakeOkey={lastDiscard.isFakeOkey}
                skin={tileSkin}
              />
            </div>
            <div style={{
              position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(to right, #00897b, #00695c)', color: '#fff', fontSize: 9, fontWeight: 900,
              padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap', boxShadow: '0 5px 15px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              YAN TAŞ
            </div>
          </motion.div>
        </div>
      )}

      {/* 4. ATIK ALANI (Zarif Çerçeve) */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 84, height: 108, background: 'rgba(0,0,0,0.4)', borderRadius: 15,
          border: '2px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>AT</span>
          <div style={{ position: 'absolute', top: 18, opacity: 0.1, fontSize: 18 }}>⬇️</div>
        </div>
      </div>
    </div>
  );
}
