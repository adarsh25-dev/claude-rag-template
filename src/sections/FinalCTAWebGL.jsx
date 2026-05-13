"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec3 n = normalize(normal);
  float breathe = sin(uTime * 0.55) * 0.035;
  float wobble =
    sin(position.x * 3.2 + uTime * 0.9) * 0.07 +
    cos(position.y * 2.8 + uTime * 0.65) * 0.055 +
    sin(position.z * 2.4 + uTime * 0.5) * 0.045;
  vec3 displaced = position * (1.0 + breathe) + n * wobble;

  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPos.xyz;
  vWorldNormal = normalize((modelMatrix * vec4(n, 0.0)).xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uCameraPos;
uniform float uTime;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);

  /* Midnight steel (206°) + deep slate edge — no purple/violet */
  vec3 core = vec3(0.04, 0.055, 0.075);
  vec3 edge = vec3(0.12, 0.18, 0.26);
  vec3 steel = vec3(0.38, 0.62, 0.78);
  vec3 col = mix(core, edge, fresnel * 0.75 + 0.12);
  col += steel * fresnel * 0.32;

  float pulse = 0.04 * sin(length(vWorldPosition) * 1.2 + uTime * 0.8);
  col += pulse;

  gl_FragColor = vec4(col * 1.25, 0.92);
}
`;

function SingularityBlob() {
  const meshRef = useRef(null);
  const { camera } = useThree();

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });
  }, []);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uCameraPos.value.copy(camera.position);
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.06;
      meshRef.current.rotation.x = Math.sin(material.uniforms.uTime.value * 0.25) * 0.12;
    }
  });

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh ref={meshRef} material={material} scale={2.35}>
      <icosahedronGeometry args={[1, 48]} />
    </mesh>
  );
}

/** HSL(206,48%,58%) steel accent — matches `--color-accent` in globals */
const LIGHT_KEY = "#7eb4d4";
/** Deeper steel for fill */
const LIGHT_FILL = "#4a6f88";

export function FinalCTAWebGLScene() {
  return (
    <>
      <color attach="background" args={["#0a0b0c"]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[4, 2, 6]} intensity={1.2} color={LIGHT_KEY} />
      <pointLight position={[-5, -3, 4]} intensity={0.6} color={LIGHT_FILL} />
      <SingularityBlob />
    </>
  );
}
