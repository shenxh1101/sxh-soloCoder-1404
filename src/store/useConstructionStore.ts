import { create } from 'zustand';
import {
  ConstructionState,
  RingRecord,
  StratumType,
} from '../types';
import {
  RING_LENGTH,
  SPEED_DEFAULT,
  ROTATION_DEFAULT,
  DEFAULT_THRUST_THRESHOLD,
  DEFAULT_TORQUE_THRESHOLD,
} from '../utils/constants';
import {
  getStratumAtMileage,
  getStratumTypeAtMileage,
  calculateActualSpeed,
  calculateThrust,
  calculateTorque,
  calculateAverage,
} from '../utils/geologyEngine';

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
  awaitingSegmentAssembly: false,
  segmentAssemblyStartTime: null,
  hasWarning: false,
  warningMessage: '',
  shieldPosition: 0,
};

export const useConstructionStore = create<ConstructionStore>((set, get) => ({
  ...initialState,

  setAdvanceSpeed: (speed: number) => set({ advanceSpeed: speed }),
  setCutterRotationSpeed: (speed: number) => set({ cutterRotationSpeed: speed }),
  setThrustThreshold: (threshold: number) => set({ thrustThreshold: threshold }),
  setTorqueThreshold: (threshold: number) => set({ torqueThreshold: threshold }),

  startConstruction: () => {
    const state = get();
    if (state.awaitingSegmentAssembly) return;
    set({
      isRunning: true,
      currentRingStartTime: state.currentRingStartTime || new Date(),
    });
  },

  pauseConstruction: () => set({ isRunning: false }),

  resetConstruction: () => set({ ...initialState }),

  updateSimulation: (deltaTime: number) => {
    const state = get();
    if (!state.isRunning || state.awaitingSegmentAssembly) return;

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

    const previousRingNumber = Math.floor(state.currentMileage / RING_LENGTH);
    const newRingNumber = Math.floor(newMileage / RING_LENGTH);

    let hasWarning = false;
    let warningMessage = '';
    let ringHasWarning = state.ringRecords[state.ringRecords.length - 1]?.hasWarning || false;

    if (thrust > state.thrustThreshold) {
      hasWarning = true;
      warningMessage = `推力超过阈值: ${thrust.toFixed(0)} > ${state.thrustThreshold}`;
      ringHasWarning = true;
    }
    if (torque > state.torqueThreshold) {
      hasWarning = true;
      warningMessage = warningMessage
        ? `${warningMessage}; 扭矩超过阈值: ${torque.toFixed(0)} > ${state.torqueThreshold}`
        : `扭矩超过阈值: ${torque.toFixed(0)} > ${state.torqueThreshold}`;
      ringHasWarning = true;
    }

    if (newRingNumber > previousRingNumber && newMileage < 100) {
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
        segmentAssemblyStartTime: new Date(),
        ringThrustSamples: newThrustSamples,
        ringTorqueSamples: newTorqueSamples,
        ringSpeedSamples: newSpeedSamples,
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

    const newRecord: RingRecord = {
      ringNumber,
      startTime,
      endTime,
      averageSpeed: calculateAverage(state.ringSpeedSamples),
      averageThrust: calculateAverage(state.ringThrustSamples),
      averageTorque: calculateAverage(state.ringTorqueSamples),
      assemblyTime,
      stratum: state.currentStratum,
      hasWarning: state.hasWarning,
    };

    set({
      ringRecords: [...state.ringRecords, newRecord],
      awaitingSegmentAssembly: false,
      segmentAssemblyStartTime: null,
      currentRingStartTime: new Date(),
      ringThrustSamples: [],
      ringTorqueSamples: [],
      ringSpeedSamples: [],
      isRunning: true,
    });
  },

  clearWarning: () => set({ hasWarning: false, warningMessage: '' }),

  getCurrentRingNumber: () => {
    const state = get();
    return Math.floor(state.currentMileage / RING_LENGTH) + 1;
  },

  getRingProgress: () => {
    const state = get();
    return (state.currentMileage % RING_LENGTH) / RING_LENGTH;
  },
}));
