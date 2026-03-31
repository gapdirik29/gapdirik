import React from 'react';
import { TileData } from '../types';
import { Tile } from './Tile';

interface MeldDisplayProps {
  melds: TileData[][];
  label?: string;
}

export function MeldDisplay({ melds, label }: MeldDisplayProps) {
  return (
    <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', justifyContent: 'center', padding: '10px' }}>
      {melds.map((meld, mIdx) => (
        <div key={mIdx} style={{ 
          display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', 
          padding: '4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          {meld.map(tile => (
            <Tile key={tile.id} id={tile.id} number={tile.number} color={tile.color} isFakeOkey={tile.isFakeOkey} small />
          ))}
        </div>
      ))}
      {label && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 900, color: '#ffd700', letterSpacing: 1 }}>{label}</div>}
    </div>
  );
}
