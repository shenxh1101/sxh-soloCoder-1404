import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ShieldMachine } from './ShieldMachine';
import { Tunnel } from './Tunnel';
import { Geology } from './Geology';
import { Segments } from './Segments';
import { useConstructionStore } from '../store/useConstructionStore';
import { TUNNEL_LENGTH } from '../utils/constants';

function CameraController() {
  const { camera } = useThree();
  const shieldPosition = useConstructionStore((state) => state.shieldPosition);
  const isRunning = useConstructionStore((state) => state.isRunning);

  useFrame(() => {
    const targetZ = shieldPosition + 2;
    const targetY = 3;
    const targetX = -6;

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.position.z += (targetZ - camera.position.z) * 0.02;

    camera.lookAt(0, 0, shieldPosition + 5);
  });

  return null;
}

function SimulationUpdater() {
  const updateSimulation = useConstructionStore((state) => state.updateSimulation);

  useFrame((_, delta) => {
    updateSimulation(delta);
  });

  return null;
}

function SceneContent() {
  const shieldPosition = useConstructionStore((state) => state.shieldPosition);

  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 10, 50]} />

      <ambientLight intensity={0.15} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.3}
        color="#8899aa"
      />

      <SimulationUpdater />
      <CameraController />

      <Tunnel shieldPosition={shieldPosition} />
      <Geology shieldPosition={shieldPosition} />
      <ShieldMachine position={shieldPosition} />
      <Segments />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        target={[0, 0, shieldPosition + 5]}
      />

      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={1}
        />
      </EffectComposer>
    </>
  );
}

export function Scene3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [-6, 3, 10], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
}
