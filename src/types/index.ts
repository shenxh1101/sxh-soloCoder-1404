export type StratumType = 'clay' | 'sand' | 'rock';

export interface StratumConfig {
  type: StratumType;
  name: string;
  color: string;
  startMileage: number;
  endMileage: number;
  speedFactor: number;
  thrustFactor: number;
  torqueFactor: number;
}

export interface RingRecord {
  ringNumber: number;
  startTime: Date;
  endTime: Date;
  averageSpeed: number;
  averageThrust: number;
  averageTorque: number;
  assemblyTime: number;
  stratum: string;
  hasWarning: boolean;
}

export interface ConstructionState {
  advanceSpeed: number;
  cutterRotationSpeed: number;
  isRunning: boolean;
  currentMileage: number;
  totalThrust: number;
  torque: number;
  currentStratum: StratumType;
  thrustThreshold: number;
  torqueThreshold: number;
  ringRecords: RingRecord[];
  currentRingStartTime: Date | null;
  ringThrustSamples: number[];
  ringTorqueSamples: number[];
  ringSpeedSamples: number[];
  awaitingSegmentAssembly: boolean;
  segmentAssemblyStartTime: Date | null;
  hasWarning: boolean;
  warningMessage: string;
  shieldPosition: number;
}

export interface SegmentData {
  ringNumber: number;
  segmentIndex: number;
  position: [number, number, number];
  rotation: [number, number, number];
  assembled: boolean;
  assemblyProgress: number;
}
