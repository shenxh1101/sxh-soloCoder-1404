export type StratumType = 'clay' | 'sand' | 'rock';

export type WarningType = 'thrust' | 'torque';
export type PlaybackMode = 'live' | 'playback';
export type TimelineEventType = 'excavation_start' | 'excavation_end' | 'assembly_start' | 'assembly_end' | 'warning_start' | 'warning_end';

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

export interface WarningEvent {
  id: string;
  ringNumber: number;
  type: WarningType;
  startTime: Date;
  endTime: Date | null;
  peakValue: number;
  threshold: number;
  message: string;
  resolved: boolean;
}

export interface TimelineEvent {
  id: string;
  ringNumber: number;
  type: TimelineEventType;
  timestamp: Date;
  mileage: number;
  description: string;
  metadata?: Record<string, number | string>;
}

export interface RingRecord {
  ringNumber: number;
  startTime: Date;
  endTime: Date;
  excavationStartTime: Date;
  excavationEndTime: Date;
  assemblyStartTime: Date;
  assemblyEndTime: Date;
  averageSpeed: number;
  averageThrust: number;
  averageTorque: number;
  peakThrust: number;
  peakTorque: number;
  peakSpeed: number;
  minThrust: number;
  minTorque: number;
  assemblyTime: number;
  excavationTime: number;
  stratum: string;
  stratumDistribution: Record<StratumType, number>;
  hasWarning: boolean;
  warningCount: number;
  warningEvents: WarningEvent[];
  timelineEvents: TimelineEvent[];
}

export interface PlaybackSnapshot {
  timestamp: number;
  mileage: number;
  thrust: number;
  torque: number;
  speed: number;
  stratum: StratumType;
  ringNumber: number;
  hasWarning: boolean;
  awaitingAssembly: boolean;
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
  ringPeakThrust: number;
  ringPeakTorque: number;
  ringPeakSpeed: number;
  ringMinThrust: number;
  ringMinTorque: number;
  awaitingSegmentAssembly: boolean;
  segmentAssemblyStartTime: Date | null;
  hasWarning: boolean;
  warningMessage: string;
  currentRingWarnings: WarningEvent[];
  activeWarningIds: string[];
  allWarnings: WarningEvent[];
  allTimelineEvents: TimelineEvent[];
  shieldPosition: number;
  playbackMode: PlaybackMode;
  playbackIndex: number;
  playbackSnapshots: PlaybackSnapshot[];
  playbackIsPlaying: boolean;
}

export interface SegmentData {
  ringNumber: number;
  segmentIndex: number;
  position: [number, number, number];
  rotation: [number, number, number];
  assembled: boolean;
  assemblyProgress: number;
}

export interface DailyReportFilter {
  startRing: number;
  endRing: number;
}

export interface DailyReportSummary {
  totalRings: number;
  totalMileage: number;
  totalExcavationTime: number;
  totalAssemblyTime: number;
  avgSpeed: number;
  avgThrust: number;
  avgTorque: number;
  peakThrust: number;
  peakTorque: number;
  totalWarnings: number;
  ringsWithWarnings: number;
}
