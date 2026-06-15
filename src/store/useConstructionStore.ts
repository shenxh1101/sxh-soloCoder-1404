import { create } from 'zustand';
import {
  ConstructionState,
  RingRecord,
  StratumType,
  WarningEvent,
  TimelineEvent,
  PlaybackSnapshot,
  WarningType,
  BookmarkNode,
  BookmarkType,
  ShiftType,
  SHIFT_CONFIGS,
} from '../types';
import {
  RING_LENGTH,
  SPEED_DEFAULT,
  ROTATION_DEFAULT,
  DEFAULT_THRUST_THRESHOLD,
  DEFAULT_TORQUE_THRESHOLD,
  STRATUM_CONFIGS,
  STRATUM_NAMES,
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

function getShiftForDate(date: Date): ShiftType {
  const hour = date.getHours() + date.getMinutes() / 60;
  for (const shift of SHIFT_CONFIGS) {
    if (hour >= shift.startHour && hour < shift.endHour) {
      return shift.type;
    }
  }
  if (hour >= 22 || hour < 6) return 'night';
  return 'morning';
}

function getDateKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function calculateExcavationEfficiency(
  excavationTime: number,
  totalTime: number
): number {
  if (totalTime <= 0) return 0;
  return (excavationTime / totalTime) * 100;
}

const BOOKMARK_META: Record<BookmarkType, { icon: string; color: string; title: (m?: Record<string, any>) => string; desc: (m?: Record<string, any>) => string }> = {
  stratum_enter: {
    icon: '🪨',
    color: '#8B6914',
    title: (m) => `进入${m?.stratumName || '新地层'}`,
    desc: (m) => `刀盘在里程 ${m?.mileage?.toFixed(2)}m 处进入${m?.stratumName}`,
  },
  warning_trigger: {
    icon: '⚠️',
    color: '#EF4444',
    title: (m) => `${m?.warningType === 'thrust' ? '推力' : '扭矩'}超限`,
    desc: (m) => `${m?.warningType === 'thrust' ? '推力' : '扭矩'}达到 ${m?.peakValue?.toFixed(0)}，超过阈值 ${m?.threshold?.toFixed(0)}`,
  },
  assembly_start: {
    icon: '🔧',
    color: '#06B6D4',
    title: () => '开始拼装管片',
    desc: (m) => `第 ${m?.ringNumber} 环掘进完成，开始拼装管片`,
  },
  assembly_end: {
    icon: '✅',
    color: '#10B981',
    title: () => '管片拼装完成',
    desc: (m) => `第 ${m?.ringNumber} 环拼装完成，用时 ${m?.assemblyTime?.toFixed(1)} 秒`,
  },
  excavation_resume: {
    icon: '🚀',
    color: '#3B82F6',
    title: () => '恢复掘进',
    desc: (m) => `拼装完成，恢复掘进施工`,
  },
  mileage_milestone: {
    icon: '🎯',
    color: '#A855F7',
    title: (m) => `突破 ${m?.milestone} 米`,
    desc: (m) => `累计掘进突破 ${m?.milestone} 米里程`,
  },
};

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
  jumpToBookmark: (bookmarkId: string) => void;
  addBookmark: (bookmark: Omit<BookmarkNode, 'id'>) => void;
  getGroupedByShift: () => Record<string, any>;
}

const initialState: ConstructionState = {
  advanceSpeed: SPEED_DEFAULT,
  cutterRotationSpeed: ROTATION_DEFAULT,
  isRunning: false,
  currentMileage: 0,
  totalThrust: 0,
  torque: 0,
  currentStratum: 'clay',
  previousStratum: 'clay',
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
  bookmarks: [],
  shieldPosition: 0,
  playbackMode: 'live',
  playbackIndex: 0,
  playbackSnapshots: [],
  playbackIsPlaying: false,
  playbackHighlights: { ringNumber: null, eventId: null },
};

export const useConstructionStore = create<ConstructionStore>((set, get) => ({
  ...initialState,

  setAdvanceSpeed: (speed: number) => set({ advanceSpeed: speed }),
  setCutterRotationSpeed: (speed: number) => set({ cutterRotationSpeed: speed }),
  setThrustThreshold: (threshold: number) => set({ thrustThreshold: threshold }),
  setTorqueThreshold: (threshold: number) => set({ torqueThreshold: threshold }),

  addBookmark: (bookmarkData) => {
    set((state) => ({
      bookmarks: [...state.bookmarks, { ...bookmarkData, id: generateId() }],
    }));
  },

  jumpToBookmark: (bookmarkId) => {
    const state = get();
    const bookmark = state.bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark) return;

    if (state.playbackMode !== 'playback') {
      set({ playbackMode: 'playback', playbackIsPlaying: false });
    }
    set({
      playbackIndex: bookmark.snapshotIndex,
      playbackHighlights: { ringNumber: bookmark.ringNumber, eventId: null },
    });
    const snapshot = state.playbackSnapshots[bookmark.snapshotIndex];
    if (snapshot) {
      set({
        currentMileage: snapshot.mileage,
        shieldPosition: snapshot.mileage,
        totalThrust: snapshot.thrust,
        torque: snapshot.torque,
        currentStratum: snapshot.stratum,
        hasWarning: snapshot.hasWarning,
        awaitingSegmentAssembly: snapshot.awaitingAssembly,
      });
    }
  },

  startConstruction: () => {
    const state = get();
    if (state.awaitingSegmentAssembly || state.playbackMode === 'playback') return;

    const now = new Date();
    const snapshotIndex = state.playbackSnapshots.length;
    const newTimelineEvent: TimelineEvent = {
      id: generateId(),
      ringNumber: Math.floor(state.currentMileage / RING_LENGTH) + 1,
      type: 'excavation_start',
      timestamp: now,
      mileage: state.currentMileage,
      description: `第 ${state.ringRecords.length + 1} 环开始掘进`,
      snapshotIndex,
    };

    const milestone = Math.floor(state.currentMileage / 10) * 10;
    const newBookmarks = [...state.bookmarks];
    if (state.ringRecords.length > 0) {
      const meta = BOOKMARK_META['excavation_resume'];
      newBookmarks.push({
        id: generateId(),
        type: 'excavation_resume',
        title: meta.title(),
        description: meta.desc({ ringNumber: state.ringRecords.length + 1 }),
        timestamp: now,
        mileage: state.currentMileage,
        ringNumber: state.ringRecords.length + 1,
        snapshotIndex,
        icon: meta.icon,
        color: meta.color,
      });
    }

    set({
      isRunning: true,
      currentRingStartTime: state.currentRingStartTime || now,
      allTimelineEvents: [...state.allTimelineEvents, newTimelineEvent],
      bookmarks: newBookmarks,
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
    const currentRingNum = state.ringRecords.length + 1;

    const currentRingStartMileage = (currentRingNum - 1) * RING_LENGTH;
    const ringProgress = Math.max(0, Math.min(1, (newMileage - currentRingStartMileage) / RING_LENGTH));
    const currentRingStartTime = state.currentRingStartTime || new Date();
    const elapsedInRing = (Date.now() - currentRingStartTime.getTime()) / 1000;

    let hasWarning = state.hasWarning;
    let warningMessage = state.warningMessage;
    let newCurrentRingWarnings = [...state.currentRingWarnings];
    let newActiveWarningIds = [...state.activeWarningIds];
    let newAllWarnings = [...state.allWarnings];
    let newTimelineEvents = [...state.allTimelineEvents];
    let newBookmarks = [...state.bookmarks];
    let newPreviousStratum = state.previousStratum;

    const now = new Date();
    const snapshotIndex = state.playbackSnapshots.length;
    const activeWarningTypes: WarningType[] = [];

    if (stratumType !== state.previousStratum && state.currentMileage > 0) {
      const stratumName = STRATUM_NAMES[stratumType];
      const meta = BOOKMARK_META['stratum_enter'];
      newBookmarks.push({
        id: generateId(),
        type: 'stratum_enter',
        title: meta.title({ stratumName }),
        description: meta.desc({ mileage: newMileage, stratumName }),
        timestamp: now,
        mileage: newMileage,
        ringNumber: currentRingNum,
        snapshotIndex,
        icon: meta.icon,
        color: meta.color,
        metadata: { stratumType, stratumName },
      });
      newTimelineEvents.push({
        id: generateId(),
        ringNumber: currentRingNum,
        type: 'stratum_change',
        timestamp: now,
        mileage: newMileage,
        description: `进入${stratumName}`,
        snapshotIndex,
        metadata: { stratumType },
      });
      newPreviousStratum = stratumType;
    }

    const prevMilestone = Math.floor(state.currentMileage / 10) * 10;
    const currMilestone = Math.floor(newMileage / 10) * 10;
    if (currMilestone > prevMilestone && currMilestone > 0) {
      const meta = BOOKMARK_META['mileage_milestone'];
      newBookmarks.push({
        id: generateId(),
        type: 'mileage_milestone',
        title: meta.title({ milestone: currMilestone }),
        description: meta.desc({ milestone: currMilestone }),
        timestamp: now,
        mileage: newMileage,
        ringNumber: currentRingNum,
        snapshotIndex,
        icon: meta.icon,
        color: meta.color,
        metadata: { milestone: currMilestone },
      });
    }

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
        activeWarningTypes.push(type);
        const displayValue = value.toFixed(0);
        if (activeWarning) {
          newAllWarnings = newAllWarnings.map((w) =>
            w.id === activeWarning
              ? { ...w, peakValue: Math.max(w.peakValue, value) }
              : w
          );
          newCurrentRingWarnings = newCurrentRingWarnings.map((w) =>
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
            snapshotIndex,
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
            snapshotIndex,
            metadata: { type, value, threshold },
          });

          const meta = BOOKMARK_META['warning_trigger'];
          newBookmarks.push({
            id: generateId(),
            type: 'warning_trigger',
            title: meta.title({ warningType: type }),
            description: meta.desc({ peakValue: value, threshold, warningType: type }),
            timestamp: now,
            mileage: newMileage,
            ringNumber: currentRingNum,
            snapshotIndex,
            icon: meta.icon,
            color: meta.color,
            metadata: { type, peakValue: value, threshold },
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
          snapshotIndex,
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
      ringNumber: currentRingNum,
      hasWarning,
      awaitingAssembly: false,
      isExcavating: true,
      elapsedInRing,
      ringProgress,
      activeWarningTypes,
    };
    const newSnapshots = [...state.playbackSnapshots, newSnapshot];

    if (newRingNumber > previousRingNumber && newMileage < 100) {
      const assemblyStartTime = new Date();
      const assemblySnapshotIndex = newSnapshots.length;

      newTimelineEvents.push({
        id: generateId(),
        ringNumber: currentRingNum,
        type: 'excavation_end',
        timestamp: assemblyStartTime,
        mileage: newMileage,
        description: `第 ${currentRingNum} 环掘进完成`,
        snapshotIndex: assemblySnapshotIndex,
        metadata: { duration: elapsedInRing },
      });

      newTimelineEvents.push({
        id: generateId(),
        ringNumber: currentRingNum,
        type: 'assembly_start',
        timestamp: assemblyStartTime,
        mileage: newMileage,
        description: `第 ${currentRingNum} 环开始拼装管片`,
        snapshotIndex: assemblySnapshotIndex,
      });

      const assemblyMeta = BOOKMARK_META['assembly_start'];
      newBookmarks.push({
        id: generateId(),
        type: 'assembly_start',
        title: assemblyMeta.title(),
        description: assemblyMeta.desc({ ringNumber: currentRingNum }),
        timestamp: assemblyStartTime,
        mileage: newMileage,
        ringNumber: currentRingNum,
        snapshotIndex: assemblySnapshotIndex,
        icon: assemblyMeta.icon,
        color: assemblyMeta.color,
        metadata: { ringNumber: currentRingNum },
      });

      const snapshotWithAssembly: PlaybackSnapshot = {
        timestamp: assemblyStartTime.getTime(),
        mileage: newMileage,
        thrust,
        torque,
        speed: actualSpeed,
        stratum: stratumType,
        ringNumber: currentRingNum,
        hasWarning,
        awaitingAssembly: true,
        isExcavating: false,
        elapsedInRing,
        ringProgress: 1,
        activeWarningTypes,
      };

      set({
        currentMileage: newMileage,
        shieldPosition: newShieldPosition,
        totalThrust: thrust,
        torque: torque,
        currentStratum: stratumType,
        previousStratum: newPreviousStratum,
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
        bookmarks: newBookmarks,
        playbackSnapshots: [...newSnapshots, snapshotWithAssembly],
      });
      return;
    }

    set({
      currentMileage: newMileage,
      shieldPosition: newShieldPosition,
      totalThrust: thrust,
      torque: torque,
      currentStratum: stratumType,
      previousStratum: newPreviousStratum,
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
      bookmarks: newBookmarks,
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
    const totalTime = (endTime.getTime() - startTime.getTime()) / 1000;

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

    const shift = getShiftForDate(startTime);
    const dateKey = getDateKey(startTime);
    const efficiency = calculateExcavationEfficiency(excavationTime, totalTime);

    const snapshotIndex = state.playbackSnapshots.length;

    const newTimelineEvents = [
      ...state.allTimelineEvents,
      {
        id: generateId(),
        ringNumber,
        type: 'assembly_end' as const,
        timestamp: assemblyEndTime,
        mileage: state.currentMileage,
        description: `第 ${ringNumber} 环管片拼装完成，用时 ${assemblyTime.toFixed(1)} 秒`,
        snapshotIndex,
        metadata: { assemblyTime },
      },
    ];

    const assemblyEndMeta = BOOKMARK_META['assembly_end'];
    const newBookmarks = [
      ...state.bookmarks,
      {
        id: generateId(),
        type: 'assembly_end' as BookmarkType,
        title: assemblyEndMeta.title(),
        description: assemblyEndMeta.desc({ ringNumber, assemblyTime }),
        timestamp: assemblyEndTime,
        mileage: state.currentMileage,
        ringNumber,
        snapshotIndex,
        icon: assemblyEndMeta.icon,
        color: assemblyEndMeta.color,
        metadata: { ringNumber, assemblyTime },
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
      shift,
      dateKey,
      excavationEfficiency: efficiency,
      thrustSamples: [...state.ringThrustSamples],
      torqueSamples: [...state.ringTorqueSamples],
      speedSamples: [...state.ringSpeedSamples],
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
      isExcavating: true,
      elapsedInRing: 0,
      ringProgress: 0,
      activeWarningTypes: [],
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
      bookmarks: newBookmarks,
      playbackSnapshots: [...state.playbackSnapshots, nextSnapshot],
    });
  },

  clearWarning: () => {
    const state = get();
    const now = new Date();

    const newTimelineEvents = state.activeWarningIds.map((id) => {
      const w = state.allWarnings.find((ww) => ww.id === id);
      return {
        id: generateId(),
        ringNumber: w?.ringNumber || state.ringRecords.length + 1,
        type: 'warning_end' as const,
        timestamp: now,
        mileage: state.currentMileage,
        description: `告警已确认清除: ${w?.type === 'thrust' ? '推力' : '扭矩'}`,
        snapshotIndex: state.playbackSnapshots.length - 1,
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
          playbackHighlights: { ringNumber: null, eventId: null },
        });
      } else {
        set({ playbackMode: mode, playbackIsPlaying: false });
      }
    } else {
      const lastIndex = state.playbackSnapshots.length - 1;
      const snapshot = state.playbackSnapshots[lastIndex];
      set({
        playbackMode: mode,
        playbackIsPlaying: false,
        playbackIndex: lastIndex,
        currentMileage: snapshot?.mileage || 0,
        shieldPosition: snapshot?.mileage || 0,
        totalThrust: snapshot?.thrust || 0,
        torque: snapshot?.torque || 0,
        currentStratum: snapshot?.stratum || 'clay',
        hasWarning: snapshot?.hasWarning || false,
        awaitingSegmentAssembly: snapshot?.awaitingAssembly || false,
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
      playbackHighlights: { ringNumber: snapshot.ringNumber, eventId: null },
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

  getGroupedByShift: () => {
    const state = get();
    const result: Record<string, any> = {};
    for (const record of state.ringRecords) {
      const key = `${record.dateKey}_${record.shift}`;
      if (!result[key]) {
        result[key] = {
          dateKey: record.dateKey,
          shift: record.shift,
          rings: [],
          summary: null,
        };
      }
      result[key].rings.push(record);
    }
    return result;
  },
}));
