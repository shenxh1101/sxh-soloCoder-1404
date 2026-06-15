import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useConstructionStore } from '../store/useConstructionStore';
import { TUNNEL_RADIUS } from '../utils/constants';

interface ShieldMachineProps {
  position: number;
}

export function ShieldMachine({ position }: ShieldMachineProps) {
  const cutterHeadRef = useRef<THREE.Group>(null);
  const cutterRotationSpeed = useConstructionStore(
    (state) => state.cutterRotationSpeed
  );

  useFrame((_, delta) => {
    if (cutterHeadRef.current) {
      const rotationSpeed = (cutterRotationSpeed * Math.PI * 2 * delta) / 60;
      cutterHeadRef.current.rotation.z += rotationSpeed;
    }
  });

  const shieldLength = 8;
  const shieldRadius = TUNNEL_RADIUS - 0.1;

  return (
    <group position={[0, 0, position]}>
      <mesh position={[0, 0, shieldLength / 2]}>
        <cylinderGeometry args={[shieldRadius, shieldRadius, shieldLength, 32]} />
        <meshStandardMaterial
          color="#4A5568"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0, shieldLength * 0.7]}>
        <cylinderGeometry args={[shieldRadius * 0.95, shieldRadius * 0.9, 2, 32]} />
        <meshStandardMaterial
          color="#2D3748"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      <group ref={cutterHeadRef} position={[0, 0, shieldLength + 0.5]}>
        <mesh>
          <cylinderGeometry args={[shieldRadius * 0.95, shieldRadius * 0.95, 0.6, 32]} />
          <meshStandardMaterial
            color="#718096"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * shieldRadius * 0.5,
                Math.sin(angle) * shieldRadius * 0.5,
                0.4,
              ]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[0.15, shieldRadius * 0.7, 0.4]} />
              <meshStandardMaterial
                color="#E2E8F0"
                metalness={0.95}
                roughness={0.05}
              />
            </mesh>
          );
        })}

        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const radius = shieldRadius * 0.85;
          return (
            <mesh
              key={`tooth-${i}`}
              position={[
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0.7,
              ]}
              rotation={[0, 0, angle + Math.PI / 16]}
            >
              <coneGeometry args={[0.12, 0.3, 6]} />
              <meshStandardMaterial
                color="#F7FAFC"
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          );
        })}

        <pointLight position={[0, 0, 2]} intensity={2} color="#FFE4B5" distance={20} />
      </group>

      <group position={[0, 0, -1]}>
        <mesh position={[0, -shieldRadius * 0.6, 0]}>
          <boxGeometry args={[3, 1.5, 4]} />
          <meshStandardMaterial color="#1A202C" metalness={0.7} roughness={0.3} />
        </mesh>

        <mesh position={[shieldRadius * 0.5, -shieldRadius * 0.3, 1.5]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
          <meshStandardMaterial color="#2D3748" metalness={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[shieldRadius * 0.5, -shieldRadius * 0.3, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.15, 8, 32, Math.PI]} />
          <meshStandardMaterial color="#4A5568" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={`thruster-${i}`}
          position={[
            Math.cos((i / 6) * Math.PI * 2) * (shieldRadius * 0.6),
            Math.sin((i / 6) * Math.PI * 2) * (shieldRadius * 0.6),
            -2,
          ]}
          rotation={[0, 0, (i / 6) * Math.PI * 2]}
        >
          <cylinderGeometry args={[0.2, 0.25, 3, 12]} />
          <meshStandardMaterial color="#718096" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
