import { useState } from 'react';
import { TileData, getColorMultiplier, Player } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreBoardProps {
  indicator: TileData;
  highestSeriesValue: number;
  highestDoublesValue: number;
  players: Player[];
  roundNumber?: number;
}

export function ScoreBoard({ indicator, highestSeriesValue, highestDoublesValue, players, roundNumber }: ScoreBoardProps) {
  const [showRules, setShowRules] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const mult = getColorMultiplier(indicator);
  const colorName = indicator.isFakeOkey
    ? 'SAHTE OKEY'
    : ({ red: 'KIRMIZI', blue: 'MAVİ', black: 'SİYAH', yellow: 'SARI' }[indicator.color] ?? indicator.color.toUpperCase());

  const colorDot: Record<string, string> = {
    red: '#ff4d4d', blue: '#00a8ff', black: '#ccc', yellow: '#ffcc00',
  };
  const dot = indicator.isFakeOkey ? '#ff8c00' : (colorDot[indicator.color] ?? '#fff');

  const rulesRows: { label: string; value: string | number; color?: string; header?: boolean }[] = [
    { label: 'BARAJLAR', value: '', header: true },
    { label: 'El açma (Seri)', value: `≥ ${highestSeriesValue}`, color: 'var(--accent-gold)' },
    { label: 'El açma (Çift)', value: `≥ ${highestDoublesValue}`, color: '#00a8ff' },
    { label: 'KAZANAN BONUSLARI', value: '', header: true },
    { label: 'Normal bitiş', value: -(mult * 100), color: '#4cd137' },
    { label: 'Elden (herkes kapalı)', value: -(3 * mult * 100), color: '#4cd137' },
    { label: 'CEZALAR', value: '', header: true },
    { label: 'Açmama cezası', value: `+${100 * mult}`, color: '#ff4444' },
    { label: 'İşler taş atma', value: `+${(mult * 100) / 2}`, color: '#ff6b35' },
  ];

  return (
    <div style={{ width: '16rem', position: 'relative' }}>
      {/* Live Scores Panel (GLASSMORPHIC) */}
      <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.65)' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '0.8rem', borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: '0.5rem'
        }}>
          <span style={{ fontWeight: 1000, color: 'var(--accent-gold)', fontSize: '0.75rem', letterSpacing: 1 }}>
            YAZBOZ {roundNumber ? ` - EL ${roundNumber}` : ''}
          </span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
             <button onClick={() => setShowRules(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>ℹ️</button>
             <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }}>
                {isExpanded ? '▲' : '▼'}
             </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
                    <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 800 }}>{p.name}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 1000 }}>{p.score}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: dot, boxShadow: `0 0 10px ${dot}` }} />
            <span style={{ fontSize: '0.65rem', color: dot, fontWeight: 950, letterSpacing: 0.5 }}>{colorName} ×{mult}</span>
        </div>
      </div>

      {/* Rules Modal (ROYAL OVERLAY) */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(10px)' }}>
            <div className="glass-panel" style={{ padding: '2rem', width: '22rem', background: 'rgba(5, 20, 15, 0.98)', borderColor: 'var(--accent-gold)' }}>
              <h3 style={{ color: 'var(--accent-gold)', textAlign: 'center', fontSize: '1.2rem', fontWeight: 1000, marginBottom: '1.5rem', letterSpacing: 2 }}>OYUN KURALLARI</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {rulesRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: row.header ? '1px solid rgba(255,215,0,0.2)' : 'none' }}>
                    <span style={{ fontSize: row.header ? '0.6rem' : '0.75rem', color: row.header ? '#888' : '#bbb', fontWeight: row.header ? 1000 : 700 }}>{row.label}</span>
                    <span style={{ fontSize: '0.8rem', color: row.color, fontWeight: 1000 }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowRules(false)} className="btn-premium" style={{ width: '100%', marginTop: '2rem' }}>ANLAŞILDI</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
