"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

function Constellation() {
  const groupRef = useRef<THREE.Group>(null);
  const points = useMemo(
    () =>
      Array.from({ length: 36 }, () =>
        [
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 5,
        ] as [number, number, number]),
    [],
  );

  const edges = useMemo(() => {
    const pairs: Array<[[number, number, number], [number, number, number]]> = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = new THREE.Vector3(...points[i]);
        const b = new THREE.Vector3(...points[j]);
        if (a.distanceTo(b) < 1.7) {
          pairs.push([points[i], points[j]]);
        }
      }
    }
    return pairs;
  }, [points]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.08;
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.0002) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {edges.map((edge, idx) => (
        <Line
          key={idx}
          points={edge}
          color="#dfe9f4"
          lineWidth={0.85}
          transparent
          opacity={0.62}
          depthWrite={false}
        />
      ))}
      {points.map((point, idx) => (
        <mesh key={idx} position={point}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial
            color={idx % 7 === 0 ? "#6fa8d6" : "#dfe9f4"}
            transparent
            opacity={idx % 7 === 0 ? 1 : 0.88}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function EmbeddingSpaceScene({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-[420px] w-full", className)}>
      <Canvas
        className="block h-full w-full touch-none"
        camera={{ position: [0, 0, 5.85], fov: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        {/* Matches --color-bg-elevated so the canvas reads as a solid archive panel */}
        <color attach="background" args={["#14110d"]} />
        <ambientLight intensity={1.1} />
        <Constellation />
      </Canvas>
    </div>
  );
}
