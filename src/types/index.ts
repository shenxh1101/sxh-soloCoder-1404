export type StratumType = 'clay' | 'sand' | 'rock';

export type WarningType = 'thrust' | 'torque';
export type PlaybackMode = 'live' | 'playback';
export type TimelineEventType =
  | 'excavation_start'
  | 'excavation_end'
  | 'assembly_start'
  | 'assembly_end'
  | 'warning_start'
  | 'warning_end'
  | 'stratum_change';

export type BookmarkType =
  | 'stratum_enter'
  | 'warning_trigger'
  | 'assembly_start'
  | 'assembly_end'
  | 'excavation_resume'
  | 'mileage_milestone';

export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface ShiftInfo {
  type: ShiftType;
  name: string;
  startHour: number;
  endHour: number;
}

export const SHIFT_CONFIGS: ShiftInfo[] = [
  { type: 'morning', name: '早班', startHour: 6, endHour: 14 },
  { type: 'afternoon', name: '中班', startHour: 14, endHour: 22 },
  { type: 'night', name: '夜班', startHour: 22, endHour: 30 },
];

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
  snapshotIndex: number;
}

export interface TimelineEvent {
  id: string;
  ringNumber: number;
  type: TimelineEventType;
  timestamp: Date;
  mileage: number;
  description: string;
  snapshotIndex: number;
  metadata?: Record<string, number | string>;
}

export interface BookmarkNode {
  id: string;
  type: BookmarkType;
  title: string;
  description: string;
  timestamp: Date;
  mileage: number;
  ringNumber: number;
  snapshotIndex: number;
  icon: string;
  color: string;
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
  shift: ShiftType;
  dateKey: string;
  excavationEfficiency: number;
  thrustSamples: number[];
  torqueSamples: number[];
  speedSamples: number[];
}

export interface PlaybackSnapshot {
  timestamp: number;
  mileage: number;
  thrust: number;
  torque: number;
  speed: number;
  advanceSpeed: number;
  cutterRotationSpeed: number;
  stratum: StratumType;
  ringNumber: number;
  hasWarning: boolean;
  awaitingAssembly: boolean;
  isExcavating: boolean;
  elapsedInRing: number;
  ringProgress: number;
  activeWarningTypes: WarningType[];
}

export interface ConstructionState {
  advanceSpeed: number;
  cutterRotationSpeed: number;
  isRunning: boolean;
  currentMileage: number;
  totalThrust: number;
  torque: number;
  currentStratum: StratumType;
  previousStratum: StratumType;
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
  bookmarks: BookmarkNode[];
  shieldPosition: number;
  playbackMode: PlaybackMode;
  playbackIndex: number;
  playbackSnapshots: PlaybackSnapshot[];
  playbackIsPlaying: boolean;
  playbackHighlights: {
    ringNumber: number | null;
    eventId: string | null;
  };
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
  groupBy: 'ring' | 'shift' | 'date';
  dateKey?: string;
  shiftType?: ShiftType;
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
  avgExcavationEfficiency: number;
}

export interface ShiftGroupData {
  shift: ShiftType;
  shiftName: string;
  dateKey: string;
  rings: RingRecord[];
  summary: DailyReportSummary;
  stratumBreakdown: Record<StratumType, number>;
}

export interface DateGroupData {
  dateKey: string;
  shifts: ShiftGroupData[];
  rings: RingRecord[];
  summary: DailyReportSummary;
}

export interface ChartSyncState {
  highlightedIndex: number;
  highlightedRing: number;
  isPlaybackMode: boolean;
}
