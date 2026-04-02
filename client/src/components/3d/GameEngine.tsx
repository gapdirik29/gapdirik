import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Float,
  PresentationControls
} from '@react-three/drei';
import { Tile3D } from './Tile3D';
import { Table3D } from './Table3D';

interface GameEngineProps {
  hand: any[];
  indicator: any;
  players: any[];
  isMyTurn: boolean;
  onDraw: () => void;
  onDiscard: (id: string) => void;
}

/**
 * HÜKÜMDAR PRIME "ELITE PRO" 3D ENGINE
 * Unity kalitesinde WebGL deneyimi sunan merkezi oyun motoru.
 */
export const GameEngine: React.FC<GameEngineProps> = ({ 
  hand, indicator, players, isMyTurn, onDraw, onDiscard 
}) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#010f0c' }}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={40} />
        
        {/* ASİL IŞIKLANDIRMA (ENVIRONMENT) */}
        <Suspense fallback={null}>
          <Environment preset="studio" blur={0.8} />
          <ambientLight intensity={0.4} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          
          <PresentationControls
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 12, Math.PI / 12]}
            azimuth={[-Math.PI / 12, Math.PI / 12]}
          >
            {/* 3D MASA (ELITE DIAMOND PIT) */}
            <Table3D />

            {/* MERKEZDEKİ TAŞLAR (INDICATOR / DRAW PILE) */}
            <group position={[0, 0.05, 0]}>
               <Tile3D tile={indicator} position={[1.5, 0, 0]} isIndicator />
               {/* Clickable Draw Pile */}
               <group onClick={onDraw} cursor="pointer">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Tile3D key={i} tile={null} position={[0, i * 0.15, 0]} isFlipped />
                  ))}
               </group>
            </group>

            {/* OYUNCU ATIKLARI (DISCARD ZONES) */}
            {/* (Sadece en yeni taşları 3D olarak gösteriyoruz) */}

          </PresentationControls>

          <ContactShadows position={[0, -0.1, 0]} opacity={0.6} scale={20} blur={2.5} far={4} />
        </Suspense>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.2} 
        />
      </Canvas>

      {/* 2D HUD OVERLAY (BUTTONS / STATS) */}
      <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', pointerEvents: 'none' }}>
         <h1 style={{ color: 'var(--accent-gold)', fontSize: '0.8rem', fontWeight: 950, opacity: 0.5 }}>ELITE PRO 3D ENGINE ACTIVE</h1>
      </div>
    </div>
  );
};
