import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import {
  SPEED_MIN,
  SPEED_MAX,
  ROTATION_MIN,
  ROTATION_MAX,
  DEFAULT_THRUST_THRESHOLD,
  DEFAULT_TORQUE_THRESHOLD,
} from '../utils/constants';
import { useState } from 'react';

export function ControlPanel() {
  const {
    advanceSpeed,
    cutterRotationSpeed,
    isRunning,
    thrustThreshold,
    torqueThreshold,
    setAdvanceSpeed,
    setCutterRotationSpeed,
    setThrustThreshold,
    setTorqueThreshold,
    startConstruction,
    pauseConstruction,
    resetConstruction,
    awaitingSegmentAssembly,
  } = useConstructionStore();

  const [showThresholdSettings, setShowThresholdSettings] = useState(false);

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-blue-400" />
        控制面板
      </h2>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-gray-300 text-sm font-medium">
              推进速度 (mm/min)
            </label>
            <span className="text-blue-400 font-mono text-lg font-bold">
              {advanceSpeed.toFixed(0)}
            </span>
          </div>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            value={advanceSpeed}
            onChange={(e) => setAdvanceSpeed(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{SPEED_MIN}</span>
            <span>{SPEED_MAX}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-gray-300 text-sm font-medium">
              刀盘转速 (rpm)
            </label>
            <span className="text-orange-400 font-mono text-lg font-bold">
              {cutterRotationSpeed.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={ROTATION_MIN}
            max={ROTATION_MAX}
            step={0.1}
            value={cutterRotationSpeed}
            onChange={(e) => setCutterRotationSpeed(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{ROTATION_MIN}</span>
            <span>{ROTATION_MAX}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setShowThresholdSettings(!showThresholdSettings)}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-between"
          >
            <span>阈值设置</span>
            <span className="text-xs">{showThresholdSettings ? '▲' : '▼'}</span>
          </button>

          {showThresholdSettings && (
            <div className="mt-4 space-y-4 p-4 bg-gray-800/50 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-400 text-xs">推力阈值 (千牛)</label>
                  <span className="text-red-400 font-mono text-sm">
                    {thrustThreshold.toFixed(0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={40000}
                  step={1000}
                  value={thrustThreshold}
                  onChange={(e) => setThrustThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-400 text-xs">扭矩阈值 (千牛·米)</label>
                  <span className="text-red-400 font-mono text-sm">
                    {torqueThreshold.toFixed(0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={15000}
                  step={500}
                  value={torqueThreshold}
                  onChange={(e) => setTorqueThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-3">
          {!isRunning ? (
            <button
              onClick={startConstruction}
              disabled={awaitingSegmentAssembly}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 active:scale-95 ${
                awaitingSegmentAssembly
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/30'
              }`}
            >
              <Play className="w-5 h-5" />
              开始掘进
            </button>
          ) : (
            <button
              onClick={pauseConstruction}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white bg-yellow-600 hover:bg-yellow-500 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-yellow-600/30"
            >
              <Pause className="w-5 h-5" />
              暂停
            </button>
          )}

          <button
            onClick={resetConstruction}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-white bg-gray-700 hover:bg-gray-600 transition-all transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {awaitingSegmentAssembly && (
          <div className="mt-3 p-3 bg-yellow-900/50 border border-yellow-600/50 rounded-lg animate-pulse">
            <p className="text-yellow-400 text-sm text-center font-medium">
              ⚠️ 请完成管片拼装后继续掘进
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
