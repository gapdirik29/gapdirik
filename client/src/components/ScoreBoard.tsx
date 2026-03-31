import { useState } from 'react';
import { TileData, getColorMultiplier, Player } from '../types';

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

  // Rules breakdown
  const kazanan = -(mult * 100);
  const elAcamama = 100 * mult;
  const islekAt = (mult * 100) / 2;
  const herkesKapali = -(3 * mult * 100);
  const herkesKapaliOkey = -(3 * mult * 100 * 2);

  const rulesRows: { label: string; value: string | number; color?: string; header?: boolean }[] = [
    { label: 'BARAJLAR', value: '', header: true },
    { label: 'El açma (Seri)', value: `≥ ${highestSeriesValue}`, color: '#ffcc00' },
    { label: 'El açma (Çift)', value: `≥ ${highestDoublesValue}`, color: '#00a8ff' },
    { label: 'KAZANAN BONUSLARI', value: '', header: true },
    { label: 'Normal bitiş', value: kazanan, color: '#4cd137' },
    { label: 'Elden (herkes kapalı)', value: herkesKapali, color: '#4cd137' },
    { label: 'Okey at + herkes kapalı', value: herkesKapaliOkey, color: '#44bd32' },
    { label: 'Çift açıp çifte bitme', value: herkesKapaliOkey, color: '#2ecc71' },
    { label: 'CEZALAR', value: '', header: true },
    { label: 'Açmama cezası', value: `+${elAcamama}`, color: '#ff4444' },
    { label: 'İşler taş atma', value: `+${islekAt}`, color: '#ff6b35' },
    { label: 'Taş kaptırma (değer)', value: 'Değer ×10', color: '#ff9f43' },
    { label: 'İşlek kaptırma', value: 'Değer ×10', color: '#ff9f43' },
    { label: 'EL SONU ÇARPANLARI', value: '', header: true },
    { label: 'Mavi ×6 | Kırmızı ×5', value: '', color: '#fff' },
    { label: 'Siyah ×4 | Sarı ×3', value: '', color: '#fff' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9000,
      fontFamily: '"Outfit", sans-serif',
      width: 260,
    }}>
      {/* Live Scores Panel */}
      <div style={{
        background: 'rgba(2, 43, 34, 0.9)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: '12px 16px',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        marginBottom: 10,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 8,
        }}>
          <span style={{ fontWeight: 800, color: '#ffcc00', fontSize: 13 }}>YAZBOZ {roundNumber ? ` - EL ${roundNumber}` : ''}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <button
               onClick={() => setShowRules(true)}
               style={{
                 background: 'rgba(255,255,255,0.1)',
                 border: 'none',
                 borderRadius: '50%',
                 width: 24,
                 height: 24,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 cursor: 'pointer',
                 color: '#fff',
                 fontSize: 14,
               }}
             >
               ⚙️
             </button>
             <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ background: 'none', border:'none', color:'#fff', cursor:'pointer', fontSize: 12}}
             >
                 {isExpanded ? '▲' : '▼'}
             </button>
          </div>
        </div>

        {isExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {players.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{p.name}</span>
                        <span style={{ fontSize: 15, color: '#ffcc00', fontWeight: 900 }}>{p.score}</span>
                    </div>
                ))}
            </div>
        )}

        <div style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
            <span style={{ fontSize: 11, color: dot, fontWeight: 800 }}>{colorName} ×{mult}</span>
        </div>
      </div>

      {/* Rules Modal Overlay */}
      {showRules && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #022b22 0%, #011c16 100%)',
            border: '2px solid #ffcc00',
            borderRadius: 24,
            padding: 30,
            width: 320,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ color: '#ffcc00', textAlign: 'center', marginBottom: 20 }}>OYUN KURALLARI</h3>
            {rulesRows.map((row, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: row.header ? '10px 0 5px' : '4px 0',
                borderBottom: row.header ? '1px solid rgba(255,204,0,0.3)' : 'none',
              }}>
                <span style={{
                  fontSize: row.header ? 10 : 12,
                  color: row.header ? '#888' : '#bbb',
                  fontWeight: row.header ? 900 : 500,
                }}>{row.label}</span>
                <span style={{
                  fontSize: 12,
                  color: row.color,
                  fontWeight: 900,
                }}>{row.value}</span>
              </div>
            ))}
            <button
              className="gold-button"
              onClick={() => setShowRules(false)}
              style={{ width: '100%', padding: 12, marginTop: 25 }}
            >
              TAMAM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
