import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows,
  Stage
} from '@react-three/drei';
import { 
  EffectComposer, 
  Bloom, 
  SSAO, 
  Vignette,
  HueSaturation
} from '@react-three/postprocessing';
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
 * HÜKÜMDAR PRIME "ELITE PRO" 3D ENGINE (ULTRA FIDELITY)
 * Cinematic lighting, Post-processing and PBR integration.
 */
export const GameEngine: React.FC<GameEngineProps> = ({ 
  hand, indicator, players, isMyTurn, onDraw, onDiscard 
}) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#010f0c' }}>
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        gl={{ 
          antialias: true, 
          stencil: false, 
          depth: true,
          powerPreference: "high-performance"
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 6, 12]} fov={35} />
        
        <Suspense fallback={null}>
          {/* ROYAL STUDIO LIGHTING */}
          <Environment preset="studio" blur={0.8} />
          
          <Stage 
            intensity={0.5} 
            environment="studio" 
            shadows={{ type: 'contact', opacity: 0.2, blur: 2 }} 
            adjustCamera={false}
          >
            {/* 3D MASA (ELITE PBR) */}
            <Table3D />

            {/* MERKEZDEKİ TAŞLAR (INDICATOR / DRAW PILE) */}
            <group position={[0, 0.05, 0]}>
               <Tile3D tile={indicator} position={[1.5, 0, 0]} isIndicator />
               
               {/* Clickable Draw Pile (High-Fidelity Stack) */}
               <group onClick={onDraw} cursor="pointer">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Tile3D key={i} tile={null} position={[0, i * 0.2, 0]} isFlipped />
                  ))}
               </group>
            </group>

            {/* OYUNCU ATIKLARI (DISCARD ZONES) */}
            {/* 3D Render logic for discards can be expanded here */}

          </Stage>

          {/* POST-PROCESSING (THE "WOW" FACTOR) */}
          <EffectComposer multisampling={4}>
            <SSAO 
              intensity={16} 
              radius={0.4} 
              luminanceInfluence={0.6} 
              color="#000000" 
            />
            <Bloom 
              intensity={0.4} 
              luminanceThreshold={0.8} 
              luminanceSmoothing={0.9} 
              height={300} 
            />
            <HueSaturation saturation={0.1} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>

          <ContactShadows 
            position={[0, -0.22, 0]} 
            opacity={0.4} 
            scale={20} 
            blur={2.5} 
            far={4} 
          />
        </Suspense>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.1} 
          makeDefault
        />
      </Canvas>

      {/* 2D HUD OVERLAY (GLASSMORPHIC ACTIVE INDICATOR) */}
      <div style={{ 
        position: 'absolute', bottom: '2rem', right: '2rem', pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem'
      }}>
         <div className="glass-panel" style={{ padding: '0.4rem 1rem', backdropFilter: 'blur(10px)' }}>
            <span style={{ color: 'var(--accent-gold)', fontSize: '0.6rem', fontWeight: 950, letterSpacing: 2 }}>ELITE PRO STABLE 3D ACTIVE</span>
         </div>
      </div>
    </div>
  );
};
