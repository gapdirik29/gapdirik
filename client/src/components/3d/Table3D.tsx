import React from 'react';
import { RoundedBox } from '@react-three/drei';

/**
 * HÜKÜMDAR PRIME "PRO ENGINE" TABLE (PBR VERSION)
 * High-fidelity materials with physical properties (Roughness, Clearcoat, Metalness).
 */
export const Table3D: React.FC = () => {
  return (
    <group position={[0, -0.25, 0]}>
      
      {/* 1. ANA MASA (ULTRA-REALISTIC GREEN FELT) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 16]} />
        <meshPhysicalMaterial 
          color="#023020" 
          roughness={0.85} 
          metalness={0.0}
          reflectivity={0.2}
          clearcoat={0.1}
          clearcoatRoughness={0.5}
        />
      </mesh>

      {/* 2. MASA KENARLARI (POLISHED ROYAL MAHOGANY) */}
      {/* Sol Kenar */}
      <RoundedBox args={[0.8, 0.45, 16.1]} radius={0.06} smoothness={8} position={[-8.1, 0.22, 0]}>
        <meshPhysicalMaterial 
          color="#301904" 
          roughness={0.1} 
          metalness={0.2} 
          clearcoat={1} 
          clearcoatRoughness={0.05} 
          reflectivity={1}
        />
      </RoundedBox>
      {/* Sağ Kenar */}
      <RoundedBox args={[0.8, 0.45, 16.1]} radius={0.06} smoothness={8} position={[8.1, 0.22, 0]}>
        <meshPhysicalMaterial 
          color="#301904" 
          roughness={0.1} 
          metalness={0.2} 
          clearcoat={1} 
          clearcoatRoughness={0.05} 
          reflectivity={1}
        />
      </RoundedBox>
      {/* Üst Kenar */}
      <RoundedBox args={[16.1, 0.45, 0.8]} radius={0.06} smoothness={8} position={[0, 0.22, -8.1]}>
        <meshPhysicalMaterial 
          color="#301904" 
          roughness={0.1} 
          metalness={0.2} 
          clearcoat={1} 
          clearcoatRoughness={0.05} 
          reflectivity={1}
        />
      </RoundedBox>
      {/* Alt Kenar */}
      <RoundedBox args={[16.1, 0.45, 0.8]} radius={0.06} smoothness={8} position={[0, 0.22, 8.1]}>
        <meshPhysicalMaterial 
          color="#301904" 
          roughness={0.1} 
          metalness={0.2} 
          clearcoat={1} 
          clearcoatRoughness={0.05} 
          reflectivity={1}
        />
      </RoundedBox>

      {/* 3. MASA DERİNLİĞİ (AMBIENT OCCLUSION PIT) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[15.2, 15.2]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.3} 
        />
      </mesh>
    </group>
  );
};
