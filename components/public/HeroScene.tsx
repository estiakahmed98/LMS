"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment, RoundedBox, MeshDistortMaterial } from "@react-three/drei";
import type { Group } from "three";

function Panel({
  position,
  color,
  size = [1.6, 1, 0.06],
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  color: string;
  size?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <RoundedBox args={size} radius={0.08} smoothness={4} position={position} rotation={rotation}>
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
    </RoundedBox>
  );
}

function Blob() {
  return (
    <mesh position={[0, 0, -1.2]} scale={1.4}>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshDistortMaterial
        color="#D82028"
        distort={0.35}
        speed={1.4}
        roughness={0.25}
        metalness={0.2}
        opacity={0.35}
        transparent
      />
    </mesh>
  );
}

function Scene() {
  const group = useRef<Group>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (!group.current) return;
    const targetX = (state.pointer.y * Math.PI) / 24;
    const targetY = (state.pointer.x * Math.PI) / 20;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;
  });

  const scale = useMemo(() => Math.min(1, viewport.width / 6), [viewport.width]);

  return (
    <group ref={group} scale={scale}>
      <Blob />
      <Float speed={1.6} rotationIntensity={0.5} floatIntensity={1.2}>
        <Panel position={[0.9, 0.6, 0.4]} color="#D82028" />
      </Float>
      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1} floatingRange={[-0.15, 0.15]}>
        <Panel position={[-1, -0.3, 0.8]} color="#1A1A2E" size={[1.2, 1.5, 0.06]} rotation={[0, 0.3, 0.05]} />
      </Float>
      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.4}>
        <Panel position={[0.4, -0.9, 1.1]} color="#F8F9FA" size={[1, 0.7, 0.06]} rotation={[0, -0.2, -0.08]} />
      </Float>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 4]} intensity={1.2} />
      <Suspense fallback={null}>
        <Scene />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
