import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../store/themeStore';

function getSceneTokens() {
  if (typeof window === 'undefined') {
    return {
      metal: 'gold',
      particle: 'gold',
      lightKey: 'white',
      lightFill: 'lightblue',
      bg: 'transparent',
      fog: 'transparent',
    };
  }
  const style = getComputedStyle(document.documentElement);
  return {
    metal: style.getPropertyValue('--scene-metal').trim() || 'gold',
    particle: style.getPropertyValue('--particle').trim() || 'gold',
    lightKey: style.getPropertyValue('--scene-light-key').trim() || 'white',
    lightFill: style.getPropertyValue('--scene-light-fill').trim() || 'lightblue',
    bg: style.getPropertyValue('--scene-bg').trim() || 'transparent',
    fog: style.getPropertyValue('--scene-fog').trim() || 'transparent',
  };
}

// 3D Staff and Entwined Serpent Model
function AsclepiusStaff({ tokens }: { tokens: ReturnType<typeof getSceneTokens> }) {
  const groupRef = useRef<THREE.Group>(null);
  const snakeRef = useRef<THREE.Mesh>(null);

  // Generate smooth helical curve for the snake winding around the staff
  const snakeCurve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const height = 4.2;
    const turns = 3.5;
    const count = 120;

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const y = (t - 0.5) * height;
      const angle = t * Math.PI * 2 * turns;
      const radius = 0.38 + Math.sin(t * Math.PI) * 0.12;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const snakeGeo = useMemo(() => {
    return new THREE.TubeGeometry(snakeCurve, 100, 0.08, 12, false);
  }, [snakeCurve]);

  // Metallic materials that adapt dynamically to theme metal token
  const goldMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(tokens.metal),
      metalness: 0.85,
      roughness: 0.25,
    });
  }, []);

  const staffMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(tokens.metal),
      metalness: 0.65,
      roughness: 0.35,
    });
  }, []);

  const marbleMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(tokens.fog),
      metalness: 0.1,
      roughness: 0.6,
    });
  }, []);

  useEffect(() => {
    goldMaterial.color.set(tokens.metal);
    staffMaterial.color.set(tokens.metal);
    marbleMaterial.color.set(tokens.fog);
  }, [tokens, goldMaterial, staffMaterial, marbleMaterial]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central Staff */}
      <mesh material={staffMaterial} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 4.6, 24]} />
      </mesh>

      {/* Staff Finial Top Sphere */}
      <mesh material={goldMaterial} position={[0, 2.35, 0]}>
        <sphereGeometry args={[0.22, 24, 24]} />
      </mesh>

      {/* Staff Bottom Tip */}
      <mesh material={goldMaterial} position={[0, -2.35, 0]}>
        <coneGeometry args={[0.12, 0.3, 16]} />
      </mesh>

      {/* Entwined Serpent Body */}
      <mesh ref={snakeRef} geometry={snakeGeo} material={goldMaterial} />

      {/* Serpent Head */}
      <mesh material={goldMaterial} position={[0.25, 2.05, 0.32]} rotation={[0.4, 0.2, -0.3]}>
        <coneGeometry args={[0.13, 0.32, 12]} />
      </mesh>

      {/* Floating Hellenic Column Fragments */}
      <mesh material={marbleMaterial} position={[-1.8, -1.2, -0.8]} rotation={[0.4, 0.5, 0.2]}>
        <cylinderGeometry args={[0.25, 0.25, 0.7, 16]} />
      </mesh>

      <mesh material={marbleMaterial} position={[1.9, 1.4, -0.6]} rotation={[-0.3, 0.2, 0.5]}>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 16]} />
      </mesh>

      <mesh material={marbleMaterial} position={[-1.4, 1.8, 0.6]} rotation={[0.6, -0.4, -0.2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.4, 16]} />
      </mesh>
    </group>
  );
}

// Sparkle Particles Field responding to --particle token
function ThemeParticles({ tokens }: { tokens: ReturnType<typeof getSceneTokens> }) {
  const particlesCount = 80;
  const positions = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 8;
      pos[i + 1] = (Math.random() - 0.5) * 6;
      pos[i + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  }, [particlesCount]);

  const pointsRef = useRef<THREE.Points>(null);
  const particleMat = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.06,
      color: new THREE.Color(tokens.particle),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useEffect(() => {
    particleMat.color.set(tokens.particle);
  }, [tokens.particle, particleMat]);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <primitive object={particleMat} attach="material" />
    </points>
  );
}

// Parallax Scene Controller
function SceneContainer({
  mousePos,
  tokens,
}: {
  mousePos: { x: number; y: number };
  tokens: ReturnType<typeof getSceneTokens>;
}) {
  const sceneRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (sceneRef.current) {
      sceneRef.current.rotation.x = THREE.MathUtils.lerp(
        sceneRef.current.rotation.x,
        mousePos.y * 0.2,
        0.05
      );
      sceneRef.current.rotation.y = THREE.MathUtils.lerp(
        sceneRef.current.rotation.y,
        mousePos.x * 0.25,
        0.05
      );
    }
  });

  return (
    <group ref={sceneRef}>
      <AsclepiusStaff tokens={tokens} />
      <ThemeParticles tokens={tokens} />
    </group>
  );
}

// Static SVG Fallback adapted for Light, Dark, and Aesthetic themes
export const StaticAsclepiusHeroFallback: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      data-testid="static-hero-fallback"
      className="w-full h-full flex items-center justify-center relative"
    >
      <div
        className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 p-8 flex items-center justify-center shadow-glow animate-pulse-subtle ${
          theme === 'aesthetic'
            ? 'bg-surface-glass border-accent/60'
            : theme === 'dark'
            ? 'bg-surface border-primary/50'
            : 'bg-surface border-accent/40'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-accent themed-illustration"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="50" cy="50" r="46" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <line x1="50" y1="8" x2="50" y2="92" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="8" r="5" fill="currentColor" />
          <path
            d="M 40 84 C 25 76, 75 70, 50 52 C 25 36, 75 30, 50 18 C 45 15, 43 12, 50 12 C 57 12, 60 16, 56 22 C 50 32, 28 34, 48 54 C 70 72, 33 76, 50 88"
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
      </div>
    </div>
  );
};

export const AsclepiusHero3D: React.FC = () => {
  const { theme } = useTheme();
  const [tokens, setTokens] = useState(getSceneTokens());
  const [shouldFallback, setShouldFallback] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setTokens(getSceneTokens());
  }, [theme]);

  useEffect(() => {
    // 1. Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShouldFallback(true);
      return;
    }

    // 2. Mobile screen optimization (lightweight static hero for touch/mobile devices)
    if (window.innerWidth < 768) {
      setShouldFallback(true);
      return;
    }
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    if (hardwareConcurrency <= 2 || deviceMemory <= 2) {
      setShouldFallback(true);
      return;
    }

    // 3. Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setShouldFallback(true);
      }
    } catch {
      setShouldFallback(true);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    setMousePos({ x, y });
  };

  if (shouldFallback) {
    return <StaticAsclepiusHeroFallback />;
  }

  return (
    <div
      data-testid="asclepius-3d-canvas"
      role="img"
      onMouseMove={handleMouseMove}
      className="w-full h-full relative cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D Rod of Asclepius Emblem"
    >
      <Suspense fallback={<StaticAsclepiusHeroFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          frameloop="always"
        >
          {/* Dynamic Scene Lighting Scheme driven by --scene tokens */}
          <ambientLight intensity={0.7} color={tokens.lightKey} />
          <directionalLight position={[4, 5, 4]} intensity={1.5} color={tokens.lightKey} />
          <directionalLight position={[-4, -2, -3]} intensity={0.6} color={tokens.lightFill} />
          <pointLight position={[0, 0, 2.5]} intensity={1.2} color={tokens.metal} distance={6} />

          <SceneContainer mousePos={mousePos} tokens={tokens} />
        </Canvas>
      </Suspense>
    </div>
  );
};
