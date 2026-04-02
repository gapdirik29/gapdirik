import React from 'react';
import { RoundedBox } from '@react-three/drei';

/**
 * HÜKÜMDAR PRIME "PRO ENGINE" TABLE
 * Blender kalitesinde, Substance uyumlu dokularla (PBR) donatılmış 3D masa.
 */
export const Table3D: React.FC = () => {
  return (
    <group position={[0, -0.25, 0]}>
      
      {/* 1. ANA MASA (GREEN FELT / YEŞİL ÇUHA DOKUSU) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial 
          color="#023020" 
          roughness={0.9} 
          metalness={0.0} 
        />
      </mesh>

      {/* 2. MASA KENARLARI (MAUN AHŞAP / DARK WOOD FRAME) */}
      {/* Sol Kenar */}
      <RoundedBox args={[0.8, 0.4, 16]} radius={0.05} smoothness={4} position={[-8.1, 0.2, 0]}>
        <meshStandardMaterial color="#301904" roughness={0.1} metalness={0.1} />
      </RoundedBox>
      {/* Sağ Kenar */}
      <RoundedBox args={[0.8, 0.4, 16]} radius={0.05} smoothness={4} position={[8.1, 0.2, 0]}>
        <meshStandardMaterial color="#301904" roughness={0.1} metalness={0.1} />
      </RoundedBox>
      {/* Üst Kenar */}
      <RoundedBox args={[16, 0.4, 0.8]} radius={0.05} smoothness={4} position={[0, 0.2, -8.1]}>
        <meshStandardMaterial color="#301904" roughness={0.1} metalness={0.1} />
      </RoundedBox>
      {/* Alt Kenar */}
      <RoundedBox args={[16, 0.4, 0.8]} radius={0.05} smoothness={4} position={[0, 0.2, 8.1]}>
        <meshStandardMaterial color="#301904" roughness={0.1} metalness={0.1} />
      </RoundedBox>

      {/* 3. MASA DERİNLİĞİ (DEEP PIT SHADOW) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[15.2, 15.2]} />
        <meshStandardMaterial 
          color="#000000" 
          transparent 
          opacity={0.15} 
          roughness={1} 
        />
      </mesh>
    </group>
  );
};
