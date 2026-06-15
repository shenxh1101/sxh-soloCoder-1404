import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TUNNEL_RADIUS, RING_LENGTH, SEGMENTS_PER_RING } from '../utils/constants';
import { useConstructionStore } from '../store/useConstructionStore';

interface SegmentInstanceData {
  ringNumber: number;
  segmentIndex: number;
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  assembled: boolean;
  animationProgress: number;
}

export function Segments() {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const ringRecords = useConstructionStore((state) => state.ringRecords);
  const awaitingSegmentAssembly = useConstructionStore(
    (state) => state.awaitingSegmentAssembly
  );
  const shieldPosition = useConstructionStore((state) => state.shieldPosition);

  const [segmentInstances, setSegmentInstances] = useState<SegmentInstanceData[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const segmentGeometry = useMemo(() => {
    const innerRadius = TUNNEL_RADIUS - 0.3;
    const outerRadius = TUNNEL_RADIUS - 0.05;
    const arcAngle = (Math.PI * 2) / SEGMENTS_PER_RING - 0.02;
    const length = RING_LENGTH * 0.98;

    const shape = new THREE.Shape();
    const startAngle = -arcAngle / 2;
    const endAngle = arcAngle / 2;

    shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
    shape.lineTo(innerRadius * Math.cos(endAngle), innerRadius * Math.sin(endAngle));
    shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
    shape.lineTo(outerRadius * Math.cos(startAngle), outerRadius * Math.sin(startAngle));

    const extrudeSettings = {
      depth: length,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -length / 2);

    return geometry;
  }, []);

  useEffect(() => {
    const newInstances: SegmentInstanceData[] = [];
    const assembledRings = ringRecords.length;
    const innerRadius = TUNNEL_RADIUS - 0.3;
    const outerRadius = TUNNEL_RADIUS - 0.05;

    for (let ring = 0; ring < assembledRings; ring++) {
      const ringZ = ring * RING_LENGTH + RING_LENGTH / 2;

      for (let seg = 0; seg < SEGMENTS_PER_RING; seg++) {
        const angle = (seg / SEGMENTS_PER_RING) * Math.PI * 2;
        const centerRadius = (innerRadius + outerRadius) / 2;

        const targetPos = new THREE.Vector3(
          Math.cos(angle) * centerRadius,
          Math.sin(angle) * centerRadius,
          ringZ
        );

        const targetRot = new THREE.Euler(0, 0, angle + Math.PI / 2);

        newInstances.push({
          ringNumber: ring + 1,
          segmentIndex: seg,
          targetPosition: targetPos,
          targetRotation: targetRot,
          assembled: true,
          animationProgress: 1,
        });
      }
    }

    if (awaitingSegmentAssembly && assembledRings < Math.floor(shieldPosition / RING_LENGTH)) {
      const ringZ = assembledRings * RING_LENGTH + RING_LENGTH / 2;

      for (let seg = 0; seg < SEGMENTS_PER_RING; seg++) {
        const angle = (seg / SEGMENTS_PER_RING) * Math.PI * 2;
        const centerRadius = (TUNNEL_RADIUS - 0.3 + TUNNEL_RADIUS - 0.05) / 2;

        const targetPos = new THREE.Vector3(
          Math.cos(angle) * centerRadius,
          Math.sin(angle) * centerRadius,
          ringZ
        );

        const targetRot = new THREE.Euler(0, 0, angle + Math.PI / 2);

        newInstances.push({
          ringNumber: assembledRings + 1,
          segmentIndex: seg,
          targetPosition: targetPos,
          targetRotation: targetRot,
          assembled: false,
          animationProgress: 0,
        });
      }
    }

    setSegmentInstances(newInstances);
  }, [ringRecords, awaitingSegmentAssembly, shieldPosition]);

  useFrame((_, delta) => {
    if (!instancedMeshRef.current) return;

    const innerRadius = TUNNEL_RADIUS - 0.3;
    const outerRadius = TUNNEL_RADIUS - 0.05;

    setSegmentInstances((prev) => {
      const updated = prev.map((instance, index) => {
        if (!instance.assembled && instance.animationProgress < 1) {
          const delay = instance.segmentIndex * 0.15;
          const effectiveDelta = Math.max(0, delta * 2 - delay * delta);
          const newProgress = Math.min(1, instance.animationProgress + effectiveDelta);

          const startPos = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            shieldPosition - 2
          );

          const currentPos = new THREE.Vector3().lerpVectors(
            startPos,
            instance.targetPosition,
            easeOutElastic(newProgress)
          );

          const currentRot = new THREE.Euler(
            instance.targetRotation.x * easeOutElastic(newProgress),
            instance.targetRotation.y * easeOutElastic(newProgress),
            instance.targetRotation.z * easeOutElastic(newProgress)
          );

          dummy.position.copy(currentPos);
          dummy.rotation.copy(currentRot);
          dummy.updateMatrix();
          instancedMeshRef.current!.setMatrixAt(index, dummy.matrix);

          return {
            ...instance,
            animationProgress: newProgress,
          };
        }

        dummy.position.copy(instance.targetPosition);
        dummy.rotation.copy(instance.targetRotation);
        dummy.updateMatrix();
        instancedMeshRef.current!.setMatrixAt(index, dummy.matrix);

        return instance;
      });

      instancedMeshRef.current!.instanceMatrix.needsUpdate = true;
      return updated;
    });
  });

  const totalSegments = Math.max(
    segmentInstances.length,
    ringRecords.length * SEGMENTS_PER_RING + (awaitingSegmentAssembly ? SEGMENTS_PER_RING : 0)
  );

  if (totalSegments === 0) return null;

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[segmentGeometry, undefined, totalSegments]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color="#A8B5C0"
        metalness={0.3}
        roughness={0.6}
      />
    </instancedMesh>
  );
}

function easeOutElastic(x: number): number {
  const c4 = (2 * Math.PI) / 3;
  return x === 0
    ? 0
    : x === 1
    ? 1
    : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}
