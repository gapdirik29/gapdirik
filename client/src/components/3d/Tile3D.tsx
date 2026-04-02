import React, { useRef, useMemo } from 'react';
import { RoundedBox, Text } from '@react-three/drei';
import { TileData } from '../../types';

interface Tile3DProps {
  tile: TileData | null;
  position: [number, number, number];
  isFlipped?: boolean;
  isIndicator?: boolean;
}

/**
 * HÜKÜMDAR PRIME "PRO ENGINE" TILE (PHYSICAL VERSION)
 * Ceramic/Ivory physical material with polished surface and subsurface feel.
 */
export const Tile3D: React.FC<Tile3DProps> = ({ 
  tile, position, isFlipped = false, isIndicator = false 
}) => {
  // TAŞ RENGİ (Vibrant & Realistic)
  const colorHex = useMemo(() => {
    if (!tile) return '#333';
    switch(tile.color) {
      case 'red': return '#ff3e3e';
      case 'blue': return '#00a8ff';
      case 'black': return '#1e1e1e';
      case 'yellow': return '#e1b12c';
      default: return '#000';
    }
  }, [tile]);

  return (
    <group position={position}>
      {/* ANA TAŞ GÖVDESİ (ULTRA-REALISTIC POLISHED IVORY) */}
      <RoundedBox 
        args={[0.8, 1.2, 0.25]} 
        radius={0.06} 
        smoothness={8} 
        castShadow 
        receiveShadow
        rotation={[isFlipped ? Math.PI : 0, 0, 0]}
      >
        <meshPhysicalMaterial 
          color="#fffaf0" /* Floral White / Ivory Bone */
          roughness={0.1} 
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          reflectivity={1}
          envMapIntensity={2.5}
        />

        {/* NUMARA VE RENK (EMISSIVE PAINT) */}
        {!isFlipped && tile && (
          <group position={[0, 0, 0.1265]}>
             <Text
                position={[0, 0, 0]}
                fontSize={0.48}
                color={colorHex}
                font="https://fonts.gstatic.com/s/outfit/v11/Q8bc8v3P8iB_X_6m_Fw6-Lg.woff"
                anchorX="center"
                anchorY="middle"
                fontWeight={950}
             >
                {tile.number}
                <meshStandardMaterial 
                  color={colorHex} 
                  roughness={0.3} 
                  metalness={0} 
                  emissive={colorHex}
                  emissiveIntensity={0.2}
                />
             </Text>
          </group>
        )}

        {/* TAŞ ARKASI (ROYAL DIAMOND BACK) */}
        {isFlipped && (
          <group position={[0, 0, -0.1265]} rotation={[0, Math.PI, 0]}>
             <meshStandardMaterial color="#01120d" roughness={0.1} metalness={0.5} />
             <Text
                position={[0, 0, 0]}
                fontSize={0.32}
                color="#ffcc00"
                anchorX="center"
                anchorY="middle"
                fontWeight={1000}
             >
                G
             </Text>
          </group>
        )}
      </RoundedBox>

      {/* GÖSTERGE PARILTISI (GOLDEN NEON RING) */}
      {isIndicator && (
        <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
           <ringGeometry args={[0.55, 0.65, 64]} />
           <meshBasicMaterial color="#ffcc00" transparent opacity={0.8} side={2} />
        </mesh>
      )}
    </group>
  );
};
