"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Constellation() {
  const groupRef = useRef<THREE.Group>(null);
  const points = useMemo(
    () =>
      Array.from({ length: 36 }, () => [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 5,
      ] as [number, number, number]),
    []
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
        <Line key={idx} points={edge} color="#ede5d3" lineWidth={0.5} transparent opacity={0.35} />
      ))}
      {points.map((point, idx) => (
        <mesh key={idx} position={point}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshBasicMaterial color={idx % 7 === 0 ? "#c9a961" : "#ede5d3"} transparent opacity={idx % 7 === 0 ? 0.95 : 0.65} />
        </mesh>
      ))}
    </group>
  );
}

export function EmbeddingSpaceScene() {
  return (
    <div className="h-[420px] w-full">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <Constellation />
      </Canvas>
    </div>
  );
}
