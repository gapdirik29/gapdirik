import { useRef, memo } from 'react';
import { TileColor } from '../types';

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
  onClick, onDoubleClick, onDragEnd, skin = 'default'
}: TileProps) => {
  const colorMap: Record<TileColor, string> = {
    red: '#e84118',
    blue: '#0097e6',
    black: '#353b48',
    yellow: '#e1b12c',
  };

  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const elemRef = useRef<HTMLDivElement>(null);

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

  const handleClick = () => {
    if (!isDragging.current) {
      onClick?.();
    }
  };

  const shadow = isSelected
    ? '0 0 20px #ffcc00, 0 8px 0 #c2bdb0, 0 12px 15px rgba(0,0,0,0.5)'
    : isOkey
      ? '0 0 12px #ffcc00, 0 5px 0 #c2bdb0, 0 8px 10px rgba(0,0,0,0.4)'
      : isAppendable
        ? '0 0 10px #4cd137, 0 5px 0 #c2bdb0, 0 8px 10px rgba(0,0,0,0.4)'
        : small
          ? '0 2px 0 #c2bdb0, 0 3px 4px rgba(0,0,0,0.4)'
          : '0 6px 0 #c2bdb0, 0 10px 15px rgba(0,0,0,0.5)';

  const getSkinClass = () => {
    if (skin === 'gold') return 'tile-skin-gold';
    if (skin === 'neon' || isOkey) return 'tile-skin-neon';
    if (skin === 'marble') return 'tile-skin-marble';
    return '';
  };

  return (
    <div
      ref={elemRef}
      className={`gpu-accel ${getSkinClass()}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      style={{
        width: small ? 28 : '100%',
        height: small ? 38 : '100%',
        background: 'linear-gradient(160deg, #ffffff 0%, #f0ece0 60%, #e4dfd0 100%)',
        borderRadius: small ? 3 : 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: small ? 'default' : 'grab',
        position: 'relative',
        boxShadow: shadow,
        border: isOkey ? '2px solid #ffcc00' : isSelected ? '2px solid #ffcc00' : '1px solid rgba(0,0,0,0.12)',
        zIndex: isSelected ? 1000 : 1,
        fontSize: small ? '0.8rem' : '1.8rem',
        userSelect: 'none',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
        transform: isSelected ? 'translateY(-6px)' : 'translateY(0)',
        flexShrink: 0,
        overflow: 'hidden',
        willChange: 'transform, box-shadow', // GPU Acceleration
      }}
    >
      {/* Üst Yüzey Parlak Katman */}
      {!small && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: '5px 5px 0 0', pointerEvents: 'none',
        }} />
      )}

      {/* İşlek göstergesi */}
      {isAppendable && !small && (
        <div style={{
          position: 'absolute', top: 4, right: 4, width: 8, height: 8,
          borderRadius: '50%', background: '#4cd137',
          border: '1.5px solid #fff', boxShadow: '0 0 5px rgba(0,0,0,0.5)'
        }} />
      )}

      {/* Numara */}
      {/* Numara & Kalp */}
      <span style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 950,
        color: colorMap[color],
        lineHeight: 1,
        marginBottom: small ? 0 : 4,
        fontSize: 'inherit',
        textShadow: small ? 'none' : '1px 2px 0 rgba(0,0,0,0.1)',
        letterSpacing: -1,
      }}>
        <div style={{ fontSize: small ? '1.1rem' : '1.8rem' }}>
            {isFakeOkey ? '★' : number}
        </div>
        {!small && (
            <div style={{ 
               fontSize: '1rem', 
               marginTop: 6, // Daha fazla boşluk eklendi
               color: colorMap[color], 
               fontWeight: 900
            }}>
                ♥
            </div>
        )}
      </span>

      {/* Okey işareti ve Parlama */}
      {isOkey && (
        <>
          {/* Parlama Efekti (Overlay) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(45deg, rgba(255,215,0,0) 0%, rgba(255,215,0,0.15) 50%, rgba(255,215,0,0) 100%)',
            pointerEvents: 'none',
            zIndex: 2
          }} />
          
          <div style={{
            position: 'absolute',
            bottom: small ? 0 : 2,
            left: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: small ? 7 : 10,
            color: '#d4af37',
            fontWeight: 950,
            zIndex: 3,
            textShadow: '0 0 5px rgba(212,175,55,0.4)'
          }}>
            <div style={{ letterSpacing: 1, marginBottom: -2 }}>OKEY</div>
            <div style={{ fontSize: small ? 8 : 12 }}>★</div>
          </div>
        </>
      )}

      {/* Alt gölge / derinlik kenar çizgisi */}
      <div style={{
        position: 'absolute', inset: 0,
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: small ? 3 : 6,
        pointerEvents: 'none'
      }} />
    </div>
  );
};

export const Tile = memo(TileComponent);
