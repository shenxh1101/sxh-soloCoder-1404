import { StratumConfig } from '../types';

export const RING_LENGTH = 1.5;
export const SEGMENTS_PER_RING = 6;
export const TUNNEL_RADIUS = 3.2;
export const TUNNEL_LENGTH = 100;
export const SCALE_FACTOR = 1;

export const SPEED_MIN = 0;
export const SPEED_MAX = 80;
export const SPEED_DEFAULT = 40;
export const ROTATION_MIN = 0;
export const ROTATION_MAX = 3;
export const ROTATION_DEFAULT = 1;

export const BASE_THRUST = 10000;
export const BASE_TORQUE = 3000;

export const DEFAULT_THRUST_THRESHOLD = 25000;
export const DEFAULT_TORQUE_THRESHOLD = 8000;

export const STRATUM_CONFIGS: StratumConfig[] = [
  {
    type: 'clay',
    name: '粘土层',
    color: '#8B6914',
    startMileage: 0,
    endMileage: 15,
    speedFactor: 1.0,
    thrustFactor: 1.0,
    torqueFactor: 1.0,
  },
  {
    type: 'sand',
    name: '砂层',
    color: '#DAA520',
    startMileage: 15,
    endMileage: 30,
    speedFactor: 0.7,
    thrustFactor: 1.3,
    torqueFactor: 1.2,
  },
  {
    type: 'rock',
    name: '岩层',
    color: '#696969',
    startMileage: 30,
    endMileage: 60,
    speedFactor: 0.4,
    thrustFactor: 1.8,
    torqueFactor: 2.0,
  },
  {
    type: 'clay',
    name: '粘土层',
    color: '#8B6914',
    startMileage: 60,
    endMileage: 100,
    speedFactor: 1.0,
    thrustFactor: 1.0,
    torqueFactor: 1.0,
  },
];

export const STRATUM_NAMES: Record<string, string> = {
  clay: '粘土层',
  sand: '砂层',
  rock: '岩层',
};
