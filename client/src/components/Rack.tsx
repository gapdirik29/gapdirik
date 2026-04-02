import { useRef, memo, useState } from 'react';
import { TileData } from '../types';
import { Tile } from './Tile';
import { motion, AnimatePresence } from 'framer-motion';
import { ListOrdered, LayoutGrid, Unlock, ArrowUpCircle, Info, ChevronUp, ChevronDown } from 'lucide-react';

interface RackProps {
  hand: (TileData | null)[];
  selectedId: string | null;
  onSelectTile: (id: string | null) => void;
  onDoubleClickTile: (id: string) => void;
  onMoveToSlot: (tId: string, idx: number, dropCoords?: { x: number; y: number }) => void;
  canOpenSeries: boolean;
  canOpenDoubles: boolean;
  seriesPoints: number;
  doublesPoints: number;
  onOpenSeries: () => void;
  onOpenDoubles: () => void;
  onAppends: () => void;
  onSortDoubles: () => void;
  onSortSeries: () => void;
  canPutBack: boolean;
  onPutBack: () => void;
  handCount: number;
  appendableTiles: TileData[];
  minMeldToOpen: number;
  colorMult: number;
  tileSkin?: 'default' | 'gold' | 'neon' | 'marble';
  highestSeriesValue: number;
  highestDoublesValue: number;
  tournamentScores?: Record<string, number>;
}

const RackComponent = ({
  hand, selectedId, onSelectTile, onDoubleClickTile, onMoveToSlot,
  canOpenSeries, canOpenDoubles, seriesPoints, doublesPoints,
  onOpenSeries, onOpenDoubles, onAppends, onSortDoubles, onSortSeries,
  canPutBack, onPutBack,
  handCount, appendableTiles, colorMult,
  tileSkin, highestSeriesValue, tournamentScores
}: RackProps) => {
  const rackRef = useRef<HTMLDivElement>(null);
  const [isScoreOpen, setIsScoreOpen] = useState(false);

  const calculateSlotIndex = (x: number, y: number) => {
    if (!rackRef.current) return -1;
    const rect = rackRef.current.getBoundingClientRect();
    if (x < rect.left - 50 || x > rect.right + 50 || y < rect.top - 50 || y > rect.bottom + 50) return -1;
    const relX = Math.max(0, Math.min(rect.width, x - rect.left));
    const relY = Math.max(0, Math.min(rect.height, y - rect.top));
    const colWidth = rect.width / 15;
    const rowHeight = rect.height / 2;
    const col = Math.floor(relX / colWidth);
    const row = Math.floor(relY / rowHeight);
    return Math.min(29, Math.max(0, row * 15 + col));
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 1800, 
      paddingBottom: 'calc(5px + var(--safe-bottom))',
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none'
    }}>
      
      {/* 1. FLOATING STATUS HUB (GLASSMORPHIC) */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', 
        padding: '0 1.5rem', pointerEvents: 'auto' 
      }}>
        
        {/* SOL: BİLGİ & YAZBOZ KONTROL */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1.2rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(5, 20, 15, 0.9)', borderColor: 'var(--accent-gold)' }}>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 1000, opacity: 0.6, color: '#fff' }}>BARAJ</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 1000, color: 'var(--accent-gold)' }}>{highestSeriesValue}</span>
             </div>
             <div style={{ width: 1, height: '1.2rem', background: 'rgba(255,215,0,0.2)' }} />
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 1000, opacity: 0.6, color: '#fff' }}>ELİNİZ</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 1000, color: '#fff' }}>{seriesPoints}</span>
             </div>
          </div>
          
          <button 
            onClick={() => setIsScoreOpen(!isScoreOpen)}
            className="glass-panel" 
            style={{ 
              width: '2.8rem', height: '2.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isScoreOpen ? 'var(--accent-gold)' : 'rgba(0,0,0,0.5)',
              borderColor: isScoreOpen ? 'var(--accent-gold)' : 'var(--glass-border)'
            }}
          >
             <Info size={20} color={isScoreOpen ? '#000' : 'var(--accent-gold)'} />
          </button>
        </div>

        {/* SAĞ: TAŞ SAYISI (ROYAL BADGE) */}
        <div className="glass-panel" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderColor: 'var(--accent-gold)' }}>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.5rem', fontWeight: 1000, opacity: 0.6 }}>KALAN</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 1000, color: 'var(--accent-gold)' }}>{handCount} TAŞ</div>
           </div>
        </div>
      </div>

      {/* 2. ANA ISTAKA (ULTRA-PREMIUM CARBON/WOOD) */}
      <div
        ref={rackRef}
        style={{
          width: '100%', minHeight: '14rem', pointerEvents: 'auto',
          background: 'linear-gradient(180deg, #12161b 0%, #050505 100%)',
          borderTop: '0.2rem solid var(--accent-gold)',
          padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1.5rem',
          boxShadow: '0 -2rem 4rem rgba(0,0,0,0.95)',
          position: 'relative', borderRadius: '2.5rem 2.5rem 0 0',
          overflow: 'hidden'
        }}
      >
        {/* CARBON DOKUSU (OVERLAY) */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")', pointerEvents: 'none' }} />

        {/* SOL AKSİYON PANELİ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', zIndex: 2 }}>
           <button onClick={onSortSeries} className="glass-panel" style={{ width: '3.8rem', height: '3.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <ListOrdered size={20} color="var(--accent-gold)" />
              <span style={{ fontSize: '0.45rem', fontWeight: 1000, color: '#fff', marginTop: 4 }}>SERİ DİZ</span>
           </button>
           <button onClick={onSortDoubles} className="glass-panel" style={{ width: '3.8rem', height: '3.8rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutGrid size={20} color="var(--accent-gold)" />
              <span style={{ fontSize: '0.45rem', fontWeight: 1000, color: '#fff', marginTop: 4 }}>ÇİFT DİZ</span>
           </button>
        </div>

        {/* TAŞ ALANI (PHYSICAL GRID) */}
        <div style={{
          flex: 1, display: 'grid', height: '100%',
          gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
          gap: '0.4rem', position: 'relative', zIndex: 2
        }}>
          {hand.map((tile, idx) => (
            <div
              key={`slot-${idx}`}
              className="rack-slot"
              style={{
                borderRadius: '0.6rem', position: 'relative', 
                background: 'rgba(0,0,0,0.6)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.8)'
              }}
            >
              {tile && (
                <Tile
                  {...tile}
                  isSelected={selectedId === tile.id}
                  isAppendable={appendableTiles.some(x => x.id === tile.id)}
                  onClick={() => onSelectTile(tile.id === selectedId ? null : tile.id)}
                  onDoubleClick={() => onDoubleClickTile(tile.id)}
                  skin={tileSkin}
                  onDragEnd={(tId, x, y) => {
                    const targetSlot = calculateSlotIndex(x, y);
                    if (targetSlot !== -1) onMoveToSlot(tId, targetSlot, { x, y });
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* SAĞ ANA AKSİYON (OPEN BUTTON) */}
        <div style={{ zIndex: 2 }}>
           <button 
             disabled={!canOpenSeries && !canOpenDoubles}
             onClick={() => canOpenDoubles ? onOpenDoubles() : onOpenSeries()}
             className={(canOpenSeries || canOpenDoubles) ? 'btn-premium' : ''}
             style={{ 
                width: '7.5rem', height: '7.5rem', borderRadius: '1.8rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: (canOpenSeries || canOpenDoubles) ? '' : 'rgba(255,255,255,0.03)',
                border: (canOpenSeries || canOpenDoubles) ? 'none' : '2px dashed rgba(255,255,255,0.1)',
                opacity: (canOpenSeries || canOpenDoubles) ? 1 : 0.3
             }}
           >
              <Unlock size={36} color={(canOpenSeries || canOpenDoubles) ? '#000' : '#fff'} />
              <span style={{ fontSize: '1rem', fontWeight: 1000, color: (canOpenSeries || canOpenDoubles) ? '#000' : '#fff', marginTop: 6, letterSpacing: 1 }}>AÇ</span>
           </button>
        </div>

      </div>
    </div>
  );
};

export const Rack = memo(RackComponent);
