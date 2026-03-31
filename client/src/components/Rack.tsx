import { useRef, memo } from 'react';
import { TileData } from '../types';
import { Tile } from './Tile';

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
  handCount, appendableTiles, minMeldToOpen, colorMult,
  tileSkin, highestSeriesValue, highestDoublesValue, tournamentScores
}: RackProps) => {
  const rackRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={rackRef}
      style={{
        position: 'fixed', bottom: 15, left: '50%', translate: '-50% 0',
        width: '98vw', maxWidth: 1200, height: 260,
        background: 'linear-gradient(180deg, #5e4230 0%, #261a12 100%)',
        borderRadius: '15px 15px 10px 10px', padding: '15px 12px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.95), inset 0 2px 5px rgba(255,255,255,0.2)',
        border: '4px solid #1a110a', zIndex: 700, display: 'flex', flexDirection: 'column', gap: 15,
        willChange: 'transform',
      }}
    >
      {/* ÜST PANEL */}
      <div style={{
        position: 'absolute', top: -60, width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 15px',
      }}>
        {/* Yazboz - Turnuva Puan Takibi */}
        <div style={{
           position: 'absolute', top: -380, right: 30, width: 220,
           background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
           borderRadius: 15, padding: 15, border: '1px solid rgba(255,215,0,0.3)',
           boxShadow: '0 20px 40px rgba(0,0,0,0.8)', zIndex: 1000,
           display: 'flex', flexDirection: 'column', gap: 10
        }}>
           <div style={{ 
              color: '#ffd700', fontWeight: 950, fontSize: 13, textAlign: 'center',
              borderBottom: '1.5px solid rgba(255,215,0,0.2)', paddingBottom: 8,
              letterSpacing: 1.5
           }}>🚀 YAZBOZ - EL: 1</div>
           <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tournamentScores && Object.entries(tournamentScores).map(([pId, score]) => (
                <div key={pId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                   <span style={{ color: pId === 'local' ? '#00a8ff' : '#eee', fontSize: 11, fontWeight: 700 }}>
                      {pId === 'local' ? 'SİZ' : 'OYUNCU'}
                   </span>
                   <span style={{ 
                      color: score <= 0 ? '#4cd137' : '#ff4757', 
                      fontSize: 14, fontWeight: 900,
                      fontFamily: 'monospace'
                   }}>{score}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Sol: Bilgi */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255,50,50,0.9)', padding: '6px 15px', borderRadius: 12,
            color: '#fff', fontWeight: 950, fontSize: 12, border: '1.5px solid #ff0000',
            boxShadow: '0 4px 10px rgba(255,0,0,0.3)'
          }}>
            BARAJ: {highestSeriesValue}
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.7)', padding: '6px 15px', borderRadius: 12,
            color: '#ffcc00', fontWeight: 950, fontSize: 12, border: '1.5px solid #ffcc00',
          }}>
            SERİ: {seriesPoints}
          </div>
          {doublesPoints > 0 && (
            <div style={{
              background: 'rgba(0,50,100,0.8)', padding: '6px 15px', borderRadius: 12,
              color: '#00a8ff', fontWeight: 950, fontSize: 12, border: '1.5px solid #00a8ff',
            }}>
              ÇİFT: {doublesPoints}
            </div>
          )}
          <div style={{
            background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: 12,
            color: '#eee', fontWeight: 800, fontSize: 11, border: '1px solid rgba(255,255,255,0.2)'
          }}>
            ×{colorMult}
          </div>
        </div>

        {/* Orta: Aksiyon Butonları */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSortSeries} style={{
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '7px 16px', fontWeight: 950, fontSize: 11, cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)', textTransform: 'uppercase'
          }}>
            SERİ DİZ
          </button>
          
          <button onClick={onSortDoubles} style={{
            background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10, padding: '7px 16px', fontWeight: 950, fontSize: 11, cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)', textTransform: 'uppercase'
          }}>
            ÇİFT DİZ
          </button>

          {canPutBack && (
            <button onClick={onPutBack} style={{
              background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
              color: '#fff', border: '1px solid rgba(255,100,100,0.4)', borderRadius: 10,
              padding: '7px 16px', fontWeight: 950, fontSize: 11, cursor: 'pointer',
              boxShadow: '0 0 14px rgba(231,76,60,0.5)', animation: 'pulse 1.5s infinite',
              textTransform: 'uppercase'
            }}>
              ↩ GERİ BIRAK
            </button>
          )}

          {appendableTiles.length > 0 && (
            <button onClick={onAppends} style={{
              background: 'linear-gradient(135deg, #44bd32 0%, #2ecc71 100%)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '7px 20px', fontWeight: 950, fontSize: 12, cursor: 'pointer',
              boxShadow: '0 0 15px rgba(68,189,50,0.6)',
              animation: 'pulse 1.5s infinite',
              textTransform: 'uppercase'
            }}>
              İŞLE ({appendableTiles.length})
            </button>
          )}

          <button 
            disabled={!canOpenDoubles}
            onClick={onOpenDoubles} 
            style={{
              background: canOpenDoubles ? 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' : '#444',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '7px 20px', fontWeight: 950, fontSize: 12, cursor: 'pointer',
              boxShadow: canOpenDoubles ? '0 0 15px rgba(230,126,34,0.4)' : 'none',
              opacity: canOpenDoubles ? 1 : 0.5,
              textTransform: 'uppercase'
            }}>
            ÇİFT AÇ
          </button>

          <button 
            disabled={!canOpenSeries}
            onClick={onOpenSeries} 
            style={{
              background: canOpenSeries ? 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)' : '#444',
              color: '#000', border: 'none', borderRadius: 10,
              padding: '7px 20px', fontWeight: 950, fontSize: 12, cursor: 'pointer',
              boxShadow: canOpenSeries ? '0 0 15px rgba(255,215,0,0.5)' : 'none',
              opacity: canOpenSeries ? 1 : 0.5,
              textTransform: 'uppercase'
            }}>
            SERİ AÇ
          </button>
        </div>

        {/* Sağ: Taş sayısı */}
        <div style={{
          background: 'rgba(0,30,0,0.8)', padding: '8px 20px', borderRadius: 12,
          color: '#4cd137', fontWeight: 950, fontSize: 13, border: '2px solid #4cd137',
          boxShadow: '0 4px 10px rgba(76,209,55,0.3)'
        }}>
          TAŞ: {handCount}
        </div>
      </div>

      {/* RACK GRID — 30 SLOT */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(15, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: 8,
        overflow: 'hidden',
      }}>
        {hand.map((tile, idx) => (
          <div
            key={`slot-${idx}`}
            style={{
              background: tile ? 'transparent' : 'rgba(0,0,0,0.25)',
              borderRadius: 6,
              position: 'relative',
              boxShadow: tile ? 'none' : 'inset 0 2px 6px rgba(0,0,0,0.5)',
              border: tile ? 'none' : '1px solid rgba(255,255,255,0.04)',
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'stretch',
              overflow: 'visible',
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

      {/* Orta Çizgi */}
      <div style={{
        position: 'absolute', top: '50%', left: 12, right: 12, height: 2,
        background: 'rgba(0,0,0,0.4)', translate: '0 -50%', pointerEvents: 'none',
        borderRadius: 1,
      }} />
    </div>
  );
};

export const Rack = memo(RackComponent);
