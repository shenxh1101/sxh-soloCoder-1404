import { create } from 'zustand';
import {
  ConstructionState,
  RingRecord,
  StratumType,
  WarningEvent,
  TimelineEvent,
  PlaybackSnapshot,
  WarningType,
} from '../types';
import {
  RING_LENGTH,
  SPEED_DEFAULT,
  ROTATION_DEFAULT,
  DEFAULT_THRUST_THRESHOLD,
  DEFAULT_TORQUE_THRESHOLD,
  STRATUM_CONFIGS,
} from '../utils/constants';
import {
  getStratumAtMileage,
  getStratumTypeAtMileage,
  calculateActualSpeed,
  calculateThrust,
  calculateTorque,
  calculateAverage,
} from '../utils/geologyEngine';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function calculateStratumDistribution(
  startMileage: number,
  endMileage: number
): Record<StratumType, number> {
  const distribution: Record<StratumType, number> = { clay: 0, sand: 0, rock: 0 };
  const totalLength = endMileage - startMileage;
  if (totalLength <= 0) return distribution;

  for (const config of STRATUM_CONFIGS) {
    const overlapStart = Math.max(startMileage, config.startMileage);
    const overlapEnd = Math.min(endMileage, config.endMileage);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);
    if (overlapLength > 0) {
      distribution[config.type] = overlapLength / totalLength;
    }
  }

  return distribution;
}

interface ConstructionStore extends ConstructionState {
  setAdvanceSpeed: (speed: number) => void;
  setCutterRotationSpeed: (speed: number) => void;
  setThrustThreshold: (threshold: number) => void;
  setTorqueThreshold: (threshold: number) => void;
  startConstruction: () => void;
  pauseConstruction: () => void;
  resetConstruction: () => void;
  updateSimulation: (deltaTime: number) => void;
  assembleSegments: () => void;
  clearWarning: () => void;
  getCurrentRingNumber: () => number;
  getRingProgress: () => number;
  setPlaybackMode: (mode: 'live' | 'playback') => void;
  setPlaybackIndex: (index: number) => void;
  togglePlaybackPlay: () => void;
  stepPlayback: (direction: number) => void;
  getStratumDistributionAhead: (distance: number) => Record<StratumType, number>;
}

const initialState: ConstructionState = {
  advanceSpeed: SPEED_DEFAULT,
  cutterRotationSpeed: ROTATION_DEFAULT,
  isRunning: false,
  currentMileage: 0,
  totalThrust: 0,
  torque: 0,
  currentStratum: 'clay',
  thrustThreshold: DEFAULT_THRUST_THRESHOLD,
  torqueThreshold: DEFAULT_TORQUE_THRESHOLD,
  ringRecords: [],
  currentRingStartTime: null,
  ringThrustSamples: [],
  ringTorqueSamples: [],
  ringSpeedSamples: [],
  ringPeakThrust: 0,
  ringPeakTorque: 0,
  ringPeakSpeed: 0,
  ringMinThrust: Infinity,
  ringMinTorque: Infinity,
  awaitingSegmentAssembly: false,
  segmentAssemblyStartTime: null,
  hasWarning: false,
  warningMessage: '',
  currentRingWarnings: [],
  activeWarningIds: [],
  allWarnings: [],
  allTimelineEvents: [],
  shieldPosition: 0,
  playbackMode: 'live',
  playbackIndex: 0,
  playbackSnapshots: [],
  playbackIsPlaying: false,
};

export const useConstructionStore = create<ConstructionStore>((set, get) => ({
  ...initialState,

  setAdvanceSpeed: (speed: number) => set({ advanceSpeed: speed }),
  setCutterRotationSpeed: (speed: number) => set({ cutterRotationSpeed: speed }),
  setThrustThreshold: (threshold: number) => set({ thrustThreshold: threshold }),
  setTorqueThreshold: (threshold: number) => set({ torqueThreshold: threshold }),

  startConstruction: () => {
    const state = get();
    if (state.awaitingSegmentAssembly || state.playbackMode === 'playback') return;

    const now = new Date();
    const newTimelineEvent: TimelineEvent = {
      id: generateId(),
      ringNumber: Math.floor(state.currentMileage / RING_LENGTH) + 1,
      type: 'excavation_start',
      timestamp: now,
      mileage: state.currentMileage,
      description: `第 ${state.ringRecords.length + 1} 环开始掘进`,
    };

    set({
      isRunning: true,
      currentRingStartTime: state.currentRingStartTime || now,
      allTimelineEvents: [...state.allTimelineEvents, newTimelineEvent],
    });
  },

  pauseConstruction: () => set({ isRunning: false }),

  resetConstruction: () => set({ ...initialState }),

  updateSimulation: (deltaTime: number) => {
    const state = get();
    if (!state.isRunning || state.awaitingSegmentAssembly || state.playbackMode === 'playback') return;

    const stratum = getStratumAtMileage(state.currentMileage);
    const stratumType = getStratumTypeAtMileage(state.currentMileage);

    const actualSpeed = calculateActualSpeed(state.advanceSpeed, stratum);
    const thrust = calculateThrust(actualSpeed, stratum);
    const torque = calculateTorque(state.cutterRotationSpeed, stratum);

    const speedMetersPerSecond = (actualSpeed / 1000) / 60;
    const mileageIncrement = speedMetersPerSecond * deltaTime * 5;
    const newMileage = Math.min(state.currentMileage + mileageIncrement, 100);
    const newShieldPosition = newMileage;

    const newThrustSamples = [...state.ringThrustSamples, thrust];
    const newTorqueSamples = [...state.ringTorqueSamples, torque];
    const newSpeedSamples = [...state.ringSpeedSamples, actualSpeed];

    const newPeakThrust = Math.max(state.ringPeakThrust, thrust);
    const newPeakTorque = Math.max(state.ringPeakTorque, torque);
    const newPeakSpeed = Math.max(state.ringPeakSpeed, actualSpeed);
    const newMinThrust = state.ringMinThrust === Infinity ? thrust : Math.min(state.ringMinThrust, thrust);
    const newMinTorque = state.ringMinTorque === Infinity ? torque : Math.min(state.ringMinTorque, torque);

    const previousRingNumber = Math.floor(state.currentMileage / RING_LENGTH);
    const newRingNumber = Math.floor(newMileage / RING_LENGTH);

    let hasWarning = state.hasWarning;
    let warningMessage = state.warningMessage;
    let newCurrentRingWarnings = [...state.currentRingWarnings];
    let newActiveWarningIds = [...state.activeWarningIds];
    let newAllWarnings = [...state.allWarnings];
    let newTimelineEvents = [...state.allTimelineEvents];

    const currentRingNum = state.ringRecords.length + 1;
    const now = new Date();

    const checkAndHandleWarning = (
      type: WarningType,
      value: number,
      threshold: number,
      valueName: string
    ) => {
      const activeWarning = newActiveWarningIds.find((id) => {
        const w = newAllWarnings.find((ww) => ww.id === id);
        return w && w.type === type && !w.resolved;
      });

      if (value > threshold) {
        const displayValue = value.toFixed(0);
        if (activeWarning) {
          newAllWarnings = newAllWarnings.map((w) =>
            w.id === activeWarning
              ? { ...w, peakValue: Math.max(w.peakValue, value) }
              : w
          );
          hasWarning = true;
          const existingMsg = warningMessage.includes(`${valueName}超过阈值`);
          if (!existingMsg) {
            warningMessage = warningMessage
              ? `${warningMessage}; ${valueName}超过阈值: ${displayValue} > ${threshold}`
              : `${valueName}超过阈值: ${displayValue} > ${threshold}`;
          }
        } else {
          const newWarning: WarningEvent = {
            id: generateId(),
            ringNumber: currentRingNum,
            type,
            startTime: now,
            endTime: null,
            peakValue: value,
            threshold,
            message: `${valueName}超过阈值: ${displayValue} > ${threshold}`,
            resolved: false,
          };
          newAllWarnings.push(newWarning);
          newCurrentRingWarnings.push(newWarning);
          newActiveWarningIds.push(newWarning.id);
          hasWarning = true;
          warningMessage = warningMessage
            ? `${warningMessage}; ${valueName}超过阈值: ${displayValue} > ${threshold}`
            : `${valueName}超过阈值: ${displayValue} > ${threshold}`;

          newTimelineEvents.push({
            id: generateId(),
            ringNumber: currentRingNum,
            type: 'warning_start',
            timestamp: now,
            mileage: newMileage,
            description: `${valueName}超限告警: ${displayValue} > ${threshold}`,
            metadata: { type, value, threshold },
          });
        }
      } else if (activeWarning) {
        newAllWarnings = newAllWarnings.map((w) =>
          w.id === activeWarning ? { ...w, endTime: now, resolved: true } : w
        );
        newActiveWarningIds = newActiveWarningIds.filter((id) => id !== activeWarning);
        newCurrentRingWarnings = newCurrentRingWarnings.map((w) =>
          w.id === activeWarning ? { ...w, endTime: now, resolved: true } : w
        );

        newTimelineEvents.push({
          id: generateId(),
          ringNumber: currentRingNum,
          type: 'warning_end',
          timestamp: now,
          mileage: newMileage,
          description: `${valueName}恢复正常`,
          metadata: { type, value },
        });

        if (newActiveWarningIds.length === 0) {
          hasWarning = false;
          warningMessage = '';
        }
      }
    };

    checkAndHandleWarning('thrust', thrust, state.thrustThreshold, '推力');
    checkAndHandleWarning('torque', torque, state.torqueThreshold, '扭矩');

    const newSnapshot: PlaybackSnapshot = {
      timestamp: now.getTime(),
      mileage: newMileage,
      thrust,
      torque,
      speed: actualSpeed,
      stratum: stratumType,
      ringNumber: newRingNumber + 1,
      hasWarning,
      awaitingAssembly: false,
    };
    const newSnapshots = [...state.playbackSnapshots, newSnapshot];

    if (newRingNumber > previousRingNumber && newMileage < 100) {
      const assemblyStartTime = new Date();

      const ringStartMileage = previousRingNumber * RING_LENGTH;
      const ringEndMileage = newRingNumber * RING_LENGTH;

      newTimelineEvents.push({
        id: generateId(),
        ringNumber: currentRingNum,
        type: 'excavation_end',
        timestamp: assemblyStartTime,
        mileage: newMileage,
        description: `第 ${currentRingNum} 环掘进完成`,
        metadata: { duration: (assemblyStartTime.getTime() - (state.currentRingStartTime?.getTime() || now.getTime())) / 1000 },
      });

      newTimelineEvents.push({
        id: generateId(),
        ringNumber: currentRingNum,
        type: 'assembly_start',
        timestamp: assemblyStartTime,
        mileage: newMileage,
        description: `第 ${currentRingNum} 环开始拼装管片`,
      });

      const snapshotWithAssembly: PlaybackSnapshot = {
        timestamp: assemblyStartTime.getTime(),
        mileage: newMileage,
        thrust,
        torque,
        speed: actualSpeed,
        stratum: stratumType,
        ringNumber: newRingNumber + 1,
        hasWarning,
        awaitingAssembly: true,
      };

      set({
        currentMileage: newMileage,
        shieldPosition: newShieldPosition,
        totalThrust: thrust,
        torque: torque,
        currentStratum: stratumType as StratumType,
        hasWarning,
        warningMessage,
        isRunning: false,
        awaitingSegmentAssembly: true,
        segmentAssemblyStartTime: assemblyStartTime,
        ringThrustSamples: newThrustSamples,
        ringTorqueSamples: newTorqueSamples,
        ringSpeedSamples: newSpeedSamples,
        ringPeakThrust: newPeakThrust,
        ringPeakTorque: newPeakTorque,
        ringPeakSpeed: newPeakSpeed,
        ringMinThrust: newMinThrust,
        ringMinTorque: newMinTorque,
        currentRingWarnings: newCurrentRingWarnings,
        activeWarningIds: newActiveWarningIds,
        allWarnings: newAllWarnings,
        allTimelineEvents: newTimelineEvents,
        playbackSnapshots: [...newSnapshots, snapshotWithAssembly],
      });
      return;
    }

    set({
      currentMileage: newMileage,
      shieldPosition: newShieldPosition,
      totalThrust: thrust,
      torque: torque,
      currentStratum: stratumType as StratumType,
      hasWarning,
      warningMessage,
      ringThrustSamples: newThrustSamples,
      ringTorqueSamples: newTorqueSamples,
      ringSpeedSamples: newSpeedSamples,
      ringPeakThrust: newPeakThrust,
      ringPeakTorque: newPeakTorque,
      ringPeakSpeed: newPeakSpeed,
      ringMinThrust: newMinThrust,
      ringMinTorque: newMinTorque,
      currentRingWarnings: newCurrentRingWarnings,
      activeWarningIds: newActiveWarningIds,
      allWarnings: newAllWarnings,
      allTimelineEvents: newTimelineEvents,
      playbackSnapshots: newSnapshots,
    });
  },

  assembleSegments: () => {
    const state = get();
    if (!state.awaitingSegmentAssembly) return;

    const assemblyEndTime = new Date();
    const assemblyStartTime = state.segmentAssemblyStartTime || assemblyEndTime;
    const assemblyTime = (assemblyEndTime.getTime() - assemblyStartTime.getTime()) / 1000;

    const ringNumber = state.ringRecords.length + 1;
    const startTime = state.currentRingStartTime || assemblyStartTime;
    const endTime = assemblyEndTime;
    const excavationStartTime = startTime;
    const excavationEndTime = assemblyStartTime;
    const excavationTime = (excavationEndTime.getTime() - excavationStartTime.getTime()) / 1000;

    const ringStartMileage = (ringNumber - 1) * RING_LENGTH;
    const ringEndMileage = ringNumber * RING_LENGTH;
    const stratumDistribution = calculateStratumDistribution(ringStartMileage, ringEndMileage);

    const dominantStratum = (Object.entries(stratumDistribution) as [StratumType, number][])
      .sort((a, b) => b[1] - a[1])[0][0];

    const finalWarnings = state.currentRingWarnings.map((w) => ({
      ...w,
      endTime: w.endTime || assemblyEndTime,
      resolved: true,
    }));

    const hasRingWarning = finalWarnings.length > 0;

    const newTimelineEvents = [
      ...state.allTimelineEvents,
      {
        id: generateId(),
        ringNumber,
        type: 'assembly_end' as const,
        timestamp: assemblyEndTime,
        mileage: state.currentMileage,
        description: `第 ${ringNumber} 环管片拼装完成，用时 ${assemblyTime.toFixed(1)} 秒`,
        metadata: { assemblyTime },
      },
    ];

    const newRecord: RingRecord = {
      ringNumber,
      startTime,
      endTime,
      excavationStartTime,
      excavationEndTime,
      assemblyStartTime,
      assemblyEndTime,
      averageSpeed: calculateAverage(state.ringSpeedSamples),
      averageThrust: calculateAverage(state.ringThrustSamples),
      averageTorque: calculateAverage(state.ringTorqueSamples),
      peakThrust: state.ringPeakThrust,
      peakTorque: state.ringPeakTorque,
      peakSpeed: state.ringPeakSpeed,
      minThrust: state.ringMinThrust === Infinity ? 0 : state.ringMinThrust,
      minTorque: state.ringMinTorque === Infinity ? 0 : state.ringMinTorque,
      assemblyTime,
      excavationTime,
      stratum: dominantStratum,
      stratumDistribution,
      hasWarning: hasRingWarning,
      warningCount: finalWarnings.length,
      warningEvents: finalWarnings,
      timelineEvents: state.allTimelineEvents.filter((e) => e.ringNumber === ringNumber),
    };

    const nextSnapshot: PlaybackSnapshot = {
      timestamp: assemblyEndTime.getTime(),
      mileage: state.currentMileage,
      thrust: state.totalThrust,
      torque: state.torque,
      speed: calculateAverage(state.ringSpeedSamples),
      stratum: state.currentStratum,
      ringNumber: ringNumber + 1,
      hasWarning: false,
      awaitingAssembly: false,
    };

    set({
      ringRecords: [...state.ringRecords, newRecord],
      awaitingSegmentAssembly: false,
      segmentAssemblyStartTime: null,
      currentRingStartTime: new Date(),
      ringThrustSamples: [],
      ringTorqueSamples: [],
      ringSpeedSamples: [],
      ringPeakThrust: 0,
      ringPeakTorque: 0,
      ringPeakSpeed: 0,
      ringMinThrust: Infinity,
      ringMinTorque: Infinity,
      currentRingWarnings: [],
      activeWarningIds: [],
      hasWarning: false,
      warningMessage: '',
      isRunning: true,
      allTimelineEvents: newTimelineEvents,
      playbackSnapshots: [...state.playbackSnapshots, nextSnapshot],
    });
  },

  clearWarning: () => {
    const state = get();
    const now = new Date();

    const resolvedWarnings = state.activeWarningIds.map((id) => ({
      ...state.allWarnings.find((w) => w.id === id)!,
      endTime: now,
      resolved: true,
    }));

    const newTimelineEvents = state.activeWarningIds.map((id) => {
      const w = state.allWarnings.find((ww) => ww.id === id);
      return {
        id: generateId(),
        ringNumber: w?.ringNumber || state.ringRecords.length + 1,
        type: 'warning_end' as const,
        timestamp: now,
        mileage: state.currentMileage,
        description: `告警已确认清除: ${w?.type === 'thrust' ? '推力' : '扭矩'}`,
      };
    });

    set({
      hasWarning: false,
      warningMessage: '',
      activeWarningIds: [],
      allWarnings: state.allWarnings.map((w) =>
        state.activeWarningIds.includes(w.id)
          ? { ...w, endTime: now, resolved: true }
          : w
      ),
      currentRingWarnings: state.currentRingWarnings.map((w) =>
        state.activeWarningIds.includes(w.id)
          ? { ...w, endTime: now, resolved: true }
          : w
      ),
      allTimelineEvents: [...state.allTimelineEvents, ...newTimelineEvents],
    });
  },

  getCurrentRingNumber: () => {
    const state = get();
    return Math.floor(state.currentMileage / RING_LENGTH) + 1;
  },

  getRingProgress: () => {
    const state = get();
    return (state.currentMileage % RING_LENGTH) / RING_LENGTH;
  },

  setPlaybackMode: (mode: 'live' | 'playback') => {
    const state = get();
    if (mode === 'playback' && state.playbackSnapshots.length === 0) return;
    
    if (mode === 'live') {
      const lastSnapshot = state.playbackSnapshots[state.playbackSnapshots.length - 1];
      if (lastSnapshot) {
        set({
          playbackMode: mode,
          playbackIsPlaying: false,
          currentMileage: lastSnapshot.mileage,
          shieldPosition: lastSnapshot.mileage,
          totalThrust: lastSnapshot.thrust,
          torque: lastSnapshot.torque,
          currentStratum: lastSnapshot.stratum,
          hasWarning: lastSnapshot.hasWarning,
          awaitingSegmentAssembly: lastSnapshot.awaitingAssembly,
        });
      } else {
        set({ playbackMode: mode, playbackIsPlaying: false });
      }
    } else {
      set({
        playbackMode: mode,
        playbackIsPlaying: false,
        playbackIndex: state.playbackSnapshots.length - 1,
      });
    }
  },

  setPlaybackIndex: (index: number) => {
    const state = get();
    const safeIndex = Math.max(0, Math.min(index, state.playbackSnapshots.length - 1));
    const snapshot = state.playbackSnapshots[safeIndex];
    if (!snapshot) return;

    set({
      playbackIndex: safeIndex,
      currentMileage: snapshot.mileage,
      shieldPosition: snapshot.mileage,
      totalThrust: snapshot.thrust,
      torque: snapshot.torque,
      currentStratum: snapshot.stratum,
      hasWarning: snapshot.hasWarning,
      awaitingSegmentAssembly: snapshot.awaitingAssembly,
    });
  },

  togglePlaybackPlay: () => {
    set((state) => ({ playbackIsPlaying: !state.playbackIsPlaying }));
  },

  stepPlayback: (direction: number) => {
    const state = get();
    const newIndex = Math.max(
      0,
      Math.min(state.playbackIndex + direction, state.playbackSnapshots.length - 1)
    );
    get().setPlaybackIndex(newIndex);
  },

  getStratumDistributionAhead: (distance: number): Record<StratumType, number> => {
    const state = get();
    return calculateStratumDistribution(state.currentMileage, state.currentMileage + distance);
  },
}));
