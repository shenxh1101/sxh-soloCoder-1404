import { Gauge, Zap, RotateCw, MapPin, Layers, History, Wrench, AlertTriangle } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { STRATUM_NAMES, RING_LENGTH } from '../utils/constants';
import { getStratumAtMileage } from '../utils/geologyEngine';

export function DataDisplay() {
  const {
    currentMileage,
    totalThrust,
    torque,
    currentStratum,
    ringRecords,
    getRingProgress,
    isRunning,
    awaitingSegmentAssembly,
    playbackMode,
    playbackIndex,
    playbackSnapshots,
    hasWarning,
  } = useConstructionStore();

  const isPlayback = playbackMode === 'playback';
  const snapshot = isPlayback ? playbackSnapshots[playbackIndex] : null;

  const displayMileage = snapshot ? snapshot.mileage : currentMileage;
  const displayThrust = snapshot ? snapshot.thrust : (totalThrust > 0 ? totalThrust : 0);
  const displayTorque = snapshot ? snapshot.torque : (torque > 0 ? torque : 0);
  const displayStratum = snapshot ? snapshot.stratum : currentStratum;
  const displayRing = snapshot ? snapshot.ringNumber : Math.floor(currentMileage / RING_LENGTH) + 1;
  const displayRingProgress = snapshot ? snapshot.ringProgress : getRingProgress();
  const displaySpeed = snapshot ? snapshot.speed : 0;
  const isAssembly = snapshot ? snapshot.awaitingAssembly : awaitingSegmentAssembly;
  const activeWarnings = snapshot ? snapshot.activeWarningTypes : [];
  const isExcavating = snapshot ? snapshot.isExcavating : isRunning;

  const stratum = getStratumAtMileage(displayMileage);

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Gauge className="w-5 h-5 text-green-400" />
        {isPlayback ? '回放参数' : '实时参数'}
        {isPlayback && (
          <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full ml-2">
            快照 #{playbackIndex}
          </span>
        )}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-400 text-xs">掘进里程</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {displayMileage.toFixed(2)}
            </span>
            <span className="text-gray-500 text-sm">米</span>
          </div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isPlayback
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${(displayMileage / 100) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0m</span>
            <span>100m</span>
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400 text-xs">当前环号</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {displayRing}
            </span>
            <span className="text-gray-500 text-sm">环</span>
            {isAssembly && (
              <span className="text-[10px] bg-cyan-900/50 text-cyan-400 px-1.5 py-0.5 rounded ml-1">拼装中</span>
            )}
          </div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isPlayback
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${displayRingProgress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0%</span>
            <span>{Math.round(displayRingProgress * 100)}%</span>
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400 text-xs">总推力</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {displayThrust.toFixed(0)}
            </span>
            <span className="text-gray-500 text-sm">千牛</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                displayThrust > 25000
                  ? 'bg-red-900/50 text-red-400'
                  : 'bg-green-900/50 text-green-400'
              }`}
            >
              {displayThrust > 25000 ? '超限' : '正常'}
            </span>
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <RotateCw className="w-4 h-4 text-orange-400" />
            <span className="text-gray-400 text-xs">扭矩</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {displayTorque.toFixed(0)}
            </span>
            <span className="text-gray-500 text-sm">千牛·米</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                displayTorque > 8000
                  ? 'bg-red-900/50 text-red-400'
                  : 'bg-green-900/50 text-green-400'
              }`}
            >
              {displayTorque > 8000 ? '超限' : '正常'}
            </span>
          </div>
        </div>
      </div>

      {isPlayback && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-gray-500">推进速度</span>
            </div>
            <p className="text-lg font-bold text-blue-400 font-mono">
              {displaySpeed.toFixed(1)}
              <span className="text-[10px] text-gray-500 ml-1">mm/min</span>
            </p>
          </div>
          <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-gray-500">地层</span>
            </div>
            <p className="text-lg font-bold text-amber-400 font-mono">
              {STRATUM_NAMES[displayStratum]}
            </p>
          </div>
        </div>
      )}

      {isPlayback && activeWarnings.length > 0 && (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-700/50 rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs text-red-300">
            当前时刻存在告警: {activeWarnings.map(t => t === 'thrust' ? '推力超限' : '扭矩超限').join('、')}
          </span>
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: stratum.color }}
            />
            <div>
              <p className="text-gray-400 text-xs">当前地层</p>
              <p className="text-white font-bold">
                {STRATUM_NAMES[displayStratum]}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">已完成环数</p>
            <p className="text-white font-bold font-mono text-xl">
              {ringRecords.length}
              <span className="text-gray-500 text-sm ml-1">环</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isPlayback
                ? 'bg-purple-500 animate-pulse'
                : isRunning
                ? 'bg-green-500 animate-pulse'
                : 'bg-gray-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {isPlayback ? (
              <span className="text-purple-300 flex items-center gap-1">
                <History className="w-3 h-3" />
                回放模式 — {isAssembly ? '停机拼装中' : isExcavating ? '掘进施工中' : '待机'}
              </span>
            ) : isRunning ? (
              '正在掘进中...'
            ) : awaitingSegmentAssembly ? (
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                等待管片拼装
              </span>
            ) : (
              '系统待机'
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
