import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

// Animated Sun Component
const Sun: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshBasicMaterial color="#FDB813" />
      <pointLight intensity={2.5} distance={100} color="#FFFFFF" />
      <Html distanceFactor={15}>
        <div className="bg-black/80 border border-yellow-500/50 text-yellow-400 text-[10px] font-mono px-1.5 py-0.5 rounded backdrop-blur">
          SUN [SOL]
        </div>
      </Html>
    </mesh>
  );
};

// Planet with Orbital Ring Component
interface OrbitingBodyProps {
  radius: number;
  speed: number;
  size: number;
  color: string;
  label: string;
  isMoonTarget?: boolean;
}

const OrbitingBody: React.FC<OrbitingBodyProps> = ({
  radius,
  speed,
  size,
  color,
  label,
  isMoonTarget,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(t) * radius;
      groupRef.current.position.z = Math.sin(t) * radius;
    }
    if (moonRef.current) {
      moonRef.current.rotation.y += 0.01;
    }
  });

  return (
    <>
      {/* Orbit Ring Trail */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.03, radius + 0.03, 64]} />
        <meshBasicMaterial color={isMoonTarget ? '#176B87' : '#3D4D5C'} side={THREE.DoubleSide} opacity={0.4} transparent />
      </mesh>

      {/* Orbiting Body Group */}
      <group ref={groupRef}>
        <mesh ref={moonRef}>
          <sphereGeometry args={[size, 24, 24]} />
          <meshStandardMaterial
            color={color}
            roughness={0.8}
            metalness={0.2}
            emissive={isMoonTarget ? '#176B87' : '#000000'}
            emissiveIntensity={isMoonTarget ? 0.3 : 0}
          />
        </mesh>

        {/* Highlight target marker for Moon */}
        {isMoonTarget && (
          <group>
            {/* Subtle Moon orbit around Earth */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[size + 0.5, size + 0.52, 32]} />
              <meshBasicMaterial color="#E3A93B" opacity={0.8} transparent />
            </mesh>
            <Html distanceFactor={12}>
              <div className="bg-[#17212B]/90 border border-[#176B87] text-[#E9EEF3] text-[10px] font-mono px-2 py-1 rounded shadow-lg flex items-center space-x-1 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[#E3A93B] animate-ping" />
                <span className="font-bold text-[#E3A93B]">TARGET: LUNA [MOON]</span>
                <span className="text-[8px] text-[#A0ACB8] ml-1">(PS-166 SITE)</span>
              </div>
            </Html>
          </group>
        )}

        {!isMoonTarget && (
          <Html distanceFactor={15}>
            <div className="bg-black/70 text-gray-300 text-[9px] font-mono px-1 py-0.5 rounded border border-gray-700">
              {label}
            </div>
          </Html>
        )}
      </group>
    </>
  );
};

export const SolarSystem: React.FC = () => {
  return (
    <div className="relative w-full h-[420px] bg-[#0A0E14] rounded-lg border border-[#2D3A4A] overflow-hidden shadow-inner">
      {/* Viewport Overlay HUD Header */}
      <div className="absolute top-3 left-3 z-10 font-mono text-xs text-[#E9EEF3] bg-[#17212B]/80 backdrop-blur px-3 py-1.5 rounded border border-[#2D3A4A] flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-[#176B87] animate-pulse" />
          <span className="font-bold tracking-wider text-[#176B87]">LUNAR ORBITAL MISSION SIMULATOR</span>
        </div>
        <span className="text-[#5B6875]">|</span>
        <span className="text-[10px] text-[#A0ACB8]">SPATIAL BODY: MOON / SELENE</span>
      </div>

      {/* Viewport Control Instructions */}
      <div className="absolute bottom-3 right-3 z-10 font-mono text-[10px] text-[#A0ACB8] bg-[#17212B]/80 backdrop-blur px-2.5 py-1 rounded border border-[#2D3A4A]">
        Drag to rotate • Scroll to zoom • Right-click to pan
      </div>

      {/* R3F Canvas */}
      <Canvas camera={{ position: [0, 12, 18], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <Stars radius={100} depth={50} count={2500} factor={4} saturation={0} fade speed={1} />
        
        {/* Central Sun */}
        <Sun />

        {/* Planets */}
        <OrbitingBody radius={3.5} speed={0.4} size={0.35} color="#A98D74" label="Mercury" />
        <OrbitingBody radius={5.5} speed={0.25} size={0.5} color="#D4A373" label="Venus" />
        
        {/* Earth & Target Moon System */}
        <OrbitingBody radius={8.5} speed={0.15} size={0.7} color="#2B6CB0" label="Earth" />
        <OrbitingBody radius={9.8} speed={0.12} size={0.4} color="#D1D5DB" label="Luna (Moon)" isMoonTarget />

        <OrbitingBody radius={12.5} speed={0.08} size={0.55} color="#C53030" label="Mars" />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          maxDistance={35}
          minDistance={5}
          maxPolarAngle={Math.PI / 2 + 0.1}
        />
      </Canvas>
    </div>
  );
};
