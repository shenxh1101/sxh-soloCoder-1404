import { useMemo } from 'react';
import * as THREE from 'three';
import { TUNNEL_RADIUS, TUNNEL_LENGTH } from '../utils/constants';

interface TunnelProps {
  shieldPosition: number;
}

export function Tunnel({ shieldPosition }: TunnelProps) {
  const tunnelGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      points.push(new THREE.Vector3(0, 0, t * TUNNEL_LENGTH));
    }
    const path = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(path, 200, TUNNEL_RADIUS, 32, false);
  }, []);

  const excavationGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      points.push(new THREE.Vector3(0, 0, t * TUNNEL_LENGTH));
    }
    const path = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(path, 200, TUNNEL_RADIUS + 0.3, 32, false);
  }, []);

  const ringsGeometry = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    const ringCount = Math.floor(TUNNEL_LENGTH / 1.5);
    
    for (let i = 0; i < ringCount; i++) {
      const zPos = i * 1.5 + 0.75;
      const ringGeo = new THREE.TorusGeometry(TUNNEL_RADIUS - 0.05, 0.02, 8, 64);
      ringGeo.translate(0, 0, zPos);
      geometries.push(ringGeo);
    }
    
    return geometries;
  }, []);

  return (
    <group>
      <mesh geometry={excavationGeometry}>
        <meshStandardMaterial
          color="#3D3D3D"
          roughness={0.9}
          metalness={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh geometry={tunnelGeometry}>
        <meshStandardMaterial
          color="#2D2D2D"
          roughness={0.8}
          metalness={0.2}
          side={THREE.BackSide}
        />
      </mesh>

      {ringsGeometry.map((geo, i) => {
        const zPos = i * 1.5 + 0.75;
        const isCompleted = zPos < shieldPosition - 8;
        return (
          <mesh key={i} geometry={geo}>
            <meshStandardMaterial
              color={isCompleted ? '#4A90A4' : '#3A3A3A'}
              metalness={0.3}
              roughness={0.5}
              emissive={isCompleted ? '#1A3A44' : '#000000'}
              emissiveIntensity={isCompleted ? 0.3 : 0}
            />
          </mesh>
        );
      })}

      {Array.from({ length: 20 }).map((_, i) => {
        const zPos = 5 + i * 5;
        return (
          <mesh
            key={`light-${i}`}
            position={[0, TUNNEL_RADIUS - 0.3, zPos]}
          >
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial
              color="#FFE4B5"
              emissive="#FFE4B5"
              emissiveIntensity={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}
