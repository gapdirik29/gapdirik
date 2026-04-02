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
      zIndex: 800, 
      paddingBottom: 'calc(10px + var(--safe-bottom))',
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none'
    }}>
      
      {/* 1. ÜST BİLGİ VE AKSİYON HUB (Interactive) */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', 
        padding: '0 12px', pointerEvents: 'auto' 
      }}>
        
        {/* SOL: BİLGİ PANELİ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
             <div style={{ fontSize: 10, fontWeight: 950, color: 'var(--accent-gold)' }}>BARAJ: {highestSeriesValue}</div>
             <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)' }} />
             <div style={{ fontSize: 10, fontWeight: 950, color: '#fff' }}>ELİM: {seriesPoints}</div>
          </div>
          <button 
            onClick={() => setIsScoreOpen(!isScoreOpen)}
            className="glass-panel" 
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: isScoreOpen ? '1px solid var(--accent-gold)' : '1px solid var(--glass-border)' }}
          >
             <Info size={14} color="var(--accent-gold)" />
             <span style={{ fontSize: 10, fontWeight: 950, color: '#fff' }}>YAZBOZ</span>
             {isScoreOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* ORTA: ANA AKSİYONLAR */}
        <div style={{ display: 'flex', gap: 8 }}>
           <button onClick={onSortSeries} className="btn-premium" style={{ height: 45, padding: '0 15px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
             <ListOrdered size={18} />
           </button>
           <button onClick={onSortDoubles} className="btn-premium" style={{ height: 45, padding: '0 15px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
             <LayoutGrid size={18} />
           </button>

           <AnimatePresence>
             {appendableTiles.length > 0 && (
               <motion.button 
                 initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                 onClick={onAppends} className="btn-premium" 
                 style={{ height: 45, background: '#4cd137', color: '#000', padding: '0 15px' }}
               >
                 <ArrowUpCircle size={18} /> İŞLE
               </motion.button>
             )}
           </AnimatePresence>

           <button 
             disabled={!canOpenSeries}
             onClick={onOpenSeries} 
             className="btn-premium"
             style={{ height: 45, minWidth: 100, opacity: canOpenSeries ? 1 : 0.4 }}
           >
             <Unlock size={18} /> AÇ
           </button>
        </div>

        {/* SAĞ: TAŞ SAYISI */}
        <div className="glass-panel" style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderColor: 'var(--accent-gold)' }}>
           <div style={{ fontSize: 18, fontWeight: 950, color: 'var(--accent-gold)' }}>{handCount}</div>
           <div style={{ fontSize: 8, fontWeight: 900, opacity: 0.5 }}>TAŞ</div>
        </div>
      </div>

      {/* 2. YAZBOZ BOARD (Overlay) */}
      <AnimatePresence>
        {isScoreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="glass-panel"
            style={{ position: 'fixed', bottom: 320, left: 12, right: 12, padding: 20, zIndex: 900, pointerEvents: 'auto' }}
          >
             <div style={{ fontSize: 13, fontWeight: 950, color: 'var(--accent-gold)', marginBottom: 15, textAlign: 'center', letterSpacing: 1 }}>TURNUVA PUANLARI</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tournamentScores && Object.entries(tournamentScores).map(([pId, score]) => (
                   <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontWeight: 800, fontSize: 12 }}>{pId === 'local' ? 'SİZİN SKORUNUZ' : 'OYUNCU'}</span>
                      <span style={{ color: score <= 0 ? '#4cd137' : '#ff4757', fontWeight: 950 }}>{score}</span>
                   </div>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. ANA ISTAKA (RACK) - LÜKS 3D TASARIM */}
      <div
        ref={rackRef}
        style={{
          width: '100%', height: 215, pointerEvents: 'auto',
          background: 'linear-gradient(180deg, #1a2228 0%, #0d1216 100%)',
          backdropFilter: 'blur(25px)',
          borderTop: '2.5px solid rgba(255, 215, 0, 0.3)',
          padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 -15px 50px rgba(0,0,0,0.8), inset 0 2px 10px rgba(255,255,255,0.05)',
          position: 'relative', overflow: 'visible',
          borderRadius: '24px 24px 0 0'
        }}
      >
        {/* ISTAKA DOKUSU (ARTISAN) */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none', background: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.1) 41px)' }} />

        <div style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
          gap: 5, position: 'relative', zIndex: 1
        }}>
          {hand.map((tile, idx) => (
            <div
              key={`slot-${idx}`}
              style={{
                background: 'rgba(0,0,0,0.4)', borderRadius: 10,
                position: 'relative', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch',
                boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.02)'
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
        
        {/* Ortasındaki Ayırıcı Çizgi */}
        <div style={{ 
          position: 'absolute', top: '50%', left: 20, right: 20, height: 1, 
          background: 'rgba(255,255,255,0.05)', translate: '0 -50%', pointerEvents: 'none' 
        }} />
      </div>
    </div>
  );
};

export const Rack = memo(RackComponent);
