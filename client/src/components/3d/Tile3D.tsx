import React, { useRef, useMemo } from 'react';
import { RoundedBox, Text, useTexture } from '@react-three/drei';
import { TileData } from '../../types';

interface Tile3DProps {
  tile: TileData | null;
  position: [number, number, number];
  isFlipped?: boolean;
  isIndicator?: boolean;
}

/**
 * HÜKÜMDAR PRIME "PRO ENGINE" TILE
 * Substance/Blender kalitesinde, gerçekçi kemik dokusu ve boya efektli 3D taş.
 */
export const Tile3D: React.FC<Tile3DProps> = ({ 
  tile, position, isFlipped = false, isIndicator = false 
}) => {
  const meshRef = useRef<any>(null);

  // TAŞ RENGİ (Mızmar Silsile)
  const colorHex = useMemo(() => {
    if (!tile) return '#333';
    switch(tile.color) {
      case 'red': return '#d63031';
      case 'blue': return '#0984e3';
      case 'black': return '#2d3436';
      case 'yellow': return '#fdcb6e';
      default: return '#000';
    }
  }, [tile]);

  return (
    <group position={position}>
      {/* ANA TAŞ GÖVDESİ (BONE MATERIAL) */}
      <RoundedBox 
        args={[0.8, 1.2, 0.25]} 
        radius={0.06} 
        smoothness={4} 
        castShadow 
        receiveShadow
        rotation={[isFlipped ? Math.PI : 0, 0, 0]}
      >
        <meshStandardMaterial 
          color="#fdf5e6" /* Gerçekçi Kemik Rengi */
          roughness={0.15} 
          metalness={0.05} 
          envMapIntensity={1.2}
        />

        {/* NUMARA VE RENK (SUBSTANCE PAINT) */}
        {!isFlipped && tile && (
          <group position={[0, 0, 0.126]}>
             <Text
                position={[0, 0, 0]}
                fontSize={0.45}
                color={colorHex}
                font="https://fonts.gstatic.com/s/outfit/v11/Q8bc8v3P8iB_X_6m_Fw6-Lg.woff"
                anchorX="center"
                anchorY="middle"
                fontWeight={950}
             >
                {tile.number}
                <meshStandardMaterial 
                  color={colorHex} 
                  roughness={0.4} 
                  metalness={0} 
                  emissive={colorHex}
                  emissiveIntensity={0.1}
                />
             </Text>
          </group>
        )}

        {/* TAŞ ARKASI (BACKSIDE DESIGN - ROYAL LOGO) */}
        {isFlipped && (
          <group position={[0, 0, -0.126]} rotation={[0, Math.PI, 0]}>
             <meshStandardMaterial color="#2d3436" roughness={0.1} metalness={0.8} />
             <Text
                position={[0, 0, 0]}
                fontSize={0.3}
                color="#ffcc00"
                anchorX="center"
                anchorY="middle"
                fontWeight={950}
             >
                G
             </Text>
          </group>
        )}
      </RoundedBox>

      {/* GÖSTERGE PARILTISI (INDICATOR HALO) */}
      {isIndicator && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
           <ringGeometry args={[0.5, 0.6, 32]} />
           <meshBasicMaterial color="#ffcc00" transparent opacity={0.6} side={2} />
        </mesh>
      )}
    </group>
  );
};
