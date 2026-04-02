import { useRef, memo } from 'react';
import { TileColor } from '../types';
import { motion } from 'framer-motion';

interface TileProps {
  id: string;
  number: number;
  color: TileColor;
  isFakeOkey?: boolean;
  isOkey?: boolean;
  isSelected?: boolean;
  isAppendable?: boolean;
  small?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  skin?: 'default' | 'gold' | 'neon' | 'marble';
}

const TileComponent = ({
  id, number, color, isFakeOkey, isOkey, isSelected, isAppendable, small,
  onClick, onDoubleClick, onDragEnd
}: TileProps) => {
  const colorMap: Record<TileColor, string> = {
    red: '#ff4d4d',    // Premium Red
    blue: '#3498db',   // Premium Blue
    black: '#2c3e50',  // Premium Black
    yellow: '#f1c40f', // Premium Gold/Yellow
  };

  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (small) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (small) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDragging.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (small) return;
    if (isDragging.current) {
      onDragEnd?.(id, e.clientX, e.clientY);
    }
    isDragging.current = false;
  };

  // Taş Derinliği (Premium Shadow System)
  const getShadow = () => {
    if (isSelected) return '0 15px 30px rgba(0,0,0,0.6), 0 0 10px var(--accent-gold-glow), 0 5px 0 #d9d4c5';
    if (isOkey) return '0 0 15px var(--accent-gold-glow), 0 4px 0 #d9d4c5';
    if (small) return '0 2px 0 #d9d4c5, 0 3px 5px rgba(0,0,0,0.3)';
    return '0 8px 15px rgba(0,0,0,0.4), 0 4px 0 #d9d4c5';
  };

  return (
    <motion.div
      whileTap={small ? {} : { scale: 1.05, y: -5 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={() => !isDragging.current && onClick?.()}
      onDoubleClick={onDoubleClick}
      style={{
        width: small ? 26 : '100%',
        height: small ? 36 : '100%',
        background: 'linear-gradient(160deg, #ffffff 0%, #f7f3e8 40%, #e8e2d4 100%)',
        borderRadius: small ? 4 : 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: small ? 'default' : 'grab', position: 'relative',
        boxShadow: getShadow(),
        border: isOkey || isSelected ? '1.5px solid var(--accent-gold)' : '1px solid rgba(0,0,0,0.08)',
        zIndex: isSelected ? 1000 : 1,
        transition: 'box-shadow 0.2s',
        userSelect: 'none', overflow: 'hidden'
      }}
    >
      {/* Üst Yüzey Işıltısı */}
      {!small && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none'
        }} />
      )}

      {/* İşlek Göstergesi */}
      {isAppendable && !small && (
        <div style={{
          position: 'absolute', top: 4, right: 4, width: 8, height: 8,
          borderRadius: '50%', background: '#4cd137', border: '1.5px solid #fff',
          boxShadow: '0 0 5px rgba(0,0,0,0.4)'
        }} />
      )}

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontWeight: 950, color: colorMap[color], lineHeight: 1, letterSpacing: -1,
        fontSize: small ? 14 : 26, textShadow: '0.5px 1px 0 rgba(0,0,0,0.05)'
      }}>
         {isFakeOkey ? (
            <div style={{ fontSize: small ? 12 : 24, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>👑</div>
         ) : (
            <>
              <div>{number}</div>
              {!small && <div style={{ fontSize: 10, marginTop: 4 }}>♥</div>}
            </>
         )}
      </div>

      {/* OKEY Efekti */}
      {isOkey && (
        <div style={{
          position: 'absolute', bottom: small ? 0 : 4, width: '100%',
          textAlign: 'center', fontSize: small ? 6 : 8, fontWeight: 950,
          color: 'var(--accent-gold)', letterSpacing: 1, textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          OKEY
        </div>
      )}

      {/* Kenar Bitirme */}
      <div style={{
        position: 'absolute', inset: 0, border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: small ? 4 : 8, pointerEvents: 'none'
      }} />
    </motion.div>
  );
};

export const Tile = memo(TileComponent);
