import React from 'react';
import { TileData } from '../types';
import { Tile } from './Tile';
import { motion, AnimatePresence } from 'framer-motion';

interface MeldDisplayProps {
  melds: TileData[][];
  label?: string;
  isDouble?: boolean;
}

export const MeldDisplay: React.FC<MeldDisplayProps> = ({ melds, label, isDouble }) => {
  return (
    <div style={{ 
      display: 'flex', gap: 12, flexWrap: 'wrap', 
      justifyContent: 'center', padding: '12px 6px',
      position: 'relative', minHeight: 65,
      perspective: '1000px'
    }}>
      {label && (
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ 
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', 
            fontSize: 9, fontWeight: 950, color: 'var(--accent-gold)', 
            letterSpacing: 2, background: 'rgba(10, 15, 20, 0.9)', padding: '4px 18px', 
            borderRadius: 25, border: '1px solid rgba(255, 204, 0, 0.4)',
            boxShadow: '0 8px 15px rgba(0,0,0,0.6)', zIndex: 10, whiteSpace: 'nowrap',
            textTransform: 'uppercase', textShadow: '0 0 8px var(--accent-gold-glow)'
          }}
        >
          {label}
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {melds.map((meld, mIdx) => (
          <motion.div 
            key={`${label}-${mIdx}`}
            initial={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="glass-panel"
            style={{ 
              display: 'flex', gap: 3, 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)', 
              padding: '6px 8px', borderRadius: 12, border: '1px solid rgba(255,215,0,0.15)',
              boxShadow: '0 12px 25px rgba(0,0,0,0.45), inset 0 0 10px rgba(255,255,255,0.05)', 
              transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
              position: 'relative', overflow: 'visible'
            }}
          >
            {meld.map((tile, tIdx) => (
              <div key={tile.id} style={{ margin: '0 -1px' }}>
                <Tile 
                  id={tile.id} 
                  number={tile.number} 
                  color={tile.color} 
                  isFakeOkey={tile.isFakeOkey} 
                  small 
                />
              </div>
            ))}
          </motion.div>
        ))}
      </AnimatePresence>

      {melds.length === 0 && !label && (
        <div style={{ 
          fontSize: 11, fontWeight: 950, color: 'rgba(255,255,255,0.08)', 
          letterSpacing: 3, textTransform: 'uppercase', marginTop: 10
        }}>
          AÇILAN EL YOK
        </div>
      )}
    </div>
  );
};
