import { useMemo } from 'react';
import * as THREE from 'three';
import { TUNNEL_RADIUS, TUNNEL_LENGTH, STRATUM_CONFIGS } from '../utils/constants';

interface GeologyProps {
  shieldPosition: number;
}

export function Geology({ shieldPosition }: GeologyProps) {
  const stratumMeshes = useMemo(() => {
    const meshes: {
      geometry: THREE.BufferGeometry;
      color: string;
      startZ: number;
      endZ: number;
    }[] = [];

    const displayRadius = TUNNEL_RADIUS + 8;
    const tunnelCenterY = 0;

    STRATUM_CONFIGS.forEach((stratum, index) => {
      const length = stratum.endMileage - stratum.startMileage;
      const startZ = stratum.startMileage;
      const endZ = stratum.endMileage;

      const shape = new THREE.Shape();
      shape.moveTo(-displayRadius, -displayRadius * 1.5);
      shape.lineTo(displayRadius, -displayRadius * 1.5);
      shape.lineTo(displayRadius, displayRadius * 1.5);
      shape.lineTo(-displayRadius, displayRadius * 1.5);
      shape.lineTo(-displayRadius, -displayRadius * 1.5);

      const holePath = new THREE.Path();
      holePath.absarc(0, tunnelCenterY, TUNNEL_RADIUS, 0, Math.PI * 2, true);
      shape.holes.push(holePath);

      const extrudeSettings = {
        depth: length,
        bevelEnabled: false,
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0, startZ);

      meshes.push({
        geometry,
        color: stratum.color,
        startZ,
        endZ,
      });
    });

    return meshes;
  }, []);

  const stratumLabels = useMemo(() => {
    return STRATUM_CONFIGS.map((stratum) => ({
      position: [
        TUNNEL_RADIUS + 4,
        0,
        stratum.startMileage + (stratum.endMileage - stratum.startMileage) / 2,
      ] as [number, number, number],
      name: stratum.name,
      color: stratum.color,
      startMileage: stratum.startMileage,
      endMileage: stratum.endMileage,
    }));
  }, []);

  const sectionPlaneGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(TUNNEL_RADIUS * 2 + 10, TUNNEL_RADIUS * 2 + 10);
  }, []);

  return (
    <group>
      {stratumMeshes.map((mesh, i) => {
        const isAhead = mesh.startZ > shieldPosition + 5;
        const opacity = isAhead ? 0.6 : 0.15;
        
        return (
          <mesh key={i} geometry={mesh.geometry}>
            <meshStandardMaterial
              color={mesh.color}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              roughness={0.9}
            />
          </mesh>
        );
      })}

      {stratumLabels.map((label, i) => (
        <group key={`label-${i}`} position={label.position}>
          <mesh rotation={[0, -Math.PI / 4, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color={label.color} emissive={label.color} emissiveIntensity={0.5} />
          </mesh>
          
          {Array.from({ length: 3 }).map((_, j) => (
            <mesh
              key={`line-${j}`}
              position={[0, 0, (label.endMileage - label.startMileage) / 2 * (j - 1)]}
              rotation={[0, 0, 0]}
            >
              <boxGeometry args={[2, 0.05, 0.05]} />
              <meshStandardMaterial color={label.color} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh
        position={[0, 0, shieldPosition + 15]}
        rotation={[0, Math.PI / 2, 0]}
        geometry={sectionPlaneGeometry}
      >
        <meshStandardMaterial
          color="#165DFF"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={`debris-${i}`}
          position={[
            (Math.random() - 0.5) * TUNNEL_RADIUS * 1.5,
            (Math.random() - 0.5) * TUNNEL_RADIUS * 1.5,
            shieldPosition + 9 + Math.random() * 3,
          ]}
        >
          <boxGeometry args={[0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2, 0.1 + Math.random() * 0.2]} />
          <meshStandardMaterial color="#5A5A5A" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
