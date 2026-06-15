import { StratumConfig, StratumType } from '../types';
import { STRATUM_CONFIGS, BASE_THRUST, BASE_TORQUE } from './constants';

export function getStratumAtMileage(mileage: number): StratumConfig {
  for (const config of STRATUM_CONFIGS) {
    if (mileage >= config.startMileage && mileage < config.endMileage) {
      return config;
    }
  }
  return STRATUM_CONFIGS[0];
}

export function getStratumTypeAtMileage(mileage: number): StratumType {
  return getStratumAtMileage(mileage).type;
}

export function calculateActualSpeed(
  setSpeed: number,
  stratum: StratumConfig
): number {
  return setSpeed * stratum.speedFactor;
}

export function calculateThrust(
  actualSpeed: number,
  stratum: StratumConfig
): number {
  const speedFactor = 0.5 + (actualSpeed / 80) * 0.5;
  const baseValue = BASE_THRUST * stratum.thrustFactor * speedFactor;
  const noise = (Math.random() - 0.5) * baseValue * 0.05;
  return Math.max(1000, baseValue + noise);
}

export function calculateTorque(
  rotationSpeed: number,
  stratum: StratumConfig
): number {
  const rotationFactor = 0.5 + (rotationSpeed / 3) * 0.5;
  const baseValue = BASE_TORQUE * stratum.torqueFactor * rotationFactor;
  const noise = (Math.random() - 0.5) * baseValue * 0.08;
  return Math.max(500, baseValue + noise);
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function getAllStrata(): StratumConfig[] {
  return [...STRATUM_CONFIGS];
}
