import { useState } from 'react';
import { Layers, Info, TrendingDown } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { STRATUM_CONFIGS, STRATUM_NAMES } from '../utils/constants';
import { StratumType } from '../types';

const STRATUM_DESCRIPTIONS: Record<StratumType, { difficulty: string; suggestion: string; icon: string }> = {
  clay: {
    difficulty: '简单',
    suggestion: '可全速推进，注意刀盘泥饼堵塞',
    icon: '🟫',
  },
  sand: {
    difficulty: '中等',
    suggestion: '建议降低速度20-30%，加强渣土改良',
    icon: '🟨',
  },
  rock: {
    difficulty: '困难',
    suggestion: '必须降低速度40-60%，密切关注扭矩和刀具磨损',
    icon: '⬜',
  },
};

export function GeologyPanel() {
  const { currentMileage, currentStratum, getStratumDistributionAhead } = useConstructionStore();
  const [expanded, setExpanded] = useState(true);

  const ahead5mDistribution = getStratumDistributionAhead(5);
  const ahead10mDistribution = getStratumDistributionAhead(10);
  const ahead5mDominant = (Object.entries(ahead5mDistribution) as [StratumType, number][])
    .filter(([_, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const hasRockAhead = ahead5mDistribution.rock > 0.1;
  const hasSandAhead = ahead5mDistribution.sand > 0.1;

  const nextStratum = STRATUM_CONFIGS.find((s) => s.startMileage > currentMileage);

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          地质信息
        </h2>
        <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="space-y-4">
          <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">当前地层</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: STRATUM_CONFIGS.find((s) => s.type === currentStratum)?.color }}
                />
                <span className="text-white font-bold">{STRATUM_NAMES[currentStratum]}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-900/50 rounded p-2">
                <p className="text-gray-500">掘进难度</p>
                <p
                  className={`font-bold ${
                    currentStratum === 'clay'
                      ? 'text-green-400'
                      : currentStratum === 'sand'
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}
                >
                  {STRATUM_DESCRIPTIONS[currentStratum].difficulty}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <p className="text-gray-500">当前里程</p>
                <p className="text-white font-mono font-bold">{currentMileage.toFixed(2)} m</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400 bg-gray-900/30 rounded p-2 flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
              <span>{STRATUM_DESCRIPTIONS[currentStratum].suggestion}</span>
            </div>
          </div>

          <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400 text-sm">刀盘前方 5 米地层占比</span>
            </div>

            {(hasRockAhead || hasSandAhead) && (
              <div
                className={`mb-3 text-xs p-2 rounded flex items-center gap-2 ${
                  hasRockAhead
                    ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                    : 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-300'
                }`}
              >
                <span className="text-lg">⚠️</span>
                <span>
                  {hasRockAhead
                    ? '前方即将进入岩层！请及时降低推进速度'
                    : '前方即将进入砂层，请注意渣土改良'}
                </span>
              </div>
            )}

            <div className="space-y-3">
              {(Object.entries(ahead5mDistribution) as [StratumType, number][])
                .filter(([_, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, ratio]) => {
                  const config = STRATUM_CONFIGS.find((c) => c.type === type)!;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-white text-sm">{config.name}</span>
                        </div>
                        <span className="text-gray-300 font-mono text-sm">
                          {(ratio * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${ratio * 100}%`,
                            backgroundColor: config.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <p className="text-gray-400 text-xs mb-2">地层图例</p>
            <div className="space-y-2">
              {STRATUM_CONFIGS.filter(
                (s, i, arr) => arr.findIndex((t) => t.type === s.type) === i
              ).map((stratum) => (
                <div key={stratum.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: stratum.color }}
                    />
                    <span className="text-white text-sm">{stratum.name}</span>
                    <span className="text-gray-500 text-xs">
                      {STRATUM_DESCRIPTIONS[stratum.type].icon}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        stratum.type === 'clay'
                          ? 'bg-green-900/50 text-green-400'
                          : stratum.type === 'sand'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {STRATUM_DESCRIPTIONS[stratum.type].difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <p className="text-gray-400 text-xs mb-2">完整地层剖面</p>
            <div className="relative h-6 rounded-full overflow-hidden bg-gray-700">
              {STRATUM_CONFIGS.map((stratum, i) => {
                const startPercent = (stratum.startMileage / 100) * 100;
                const widthPercent = ((stratum.endMileage - stratum.startMileage) / 100) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex items-center justify-center"
                    style={{
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: stratum.color,
                      opacity: 0.7,
                    }}
                  >
                    {widthPercent > 10 && (
                      <span className="text-[10px] text-white/80 font-medium">
                        {stratum.name}
                      </span>
                    )}
                  </div>
                );
              })}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${currentMileage}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0m</span>
              <span>25m</span>
              <span>50m</span>
              <span>75m</span>
              <span>100m</span>
            </div>
          </div>

          {nextStratum && (
            <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-lg p-3 border border-blue-700/30">
              <p className="text-xs text-blue-300">下一地层</p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: nextStratum.color }}
                  />
                  <span className="text-white font-bold">{nextStratum.name}</span>
                </div>
                <span className="text-xs text-blue-300">
                  剩余 {(nextStratum.startMileage - currentMileage).toFixed(1)} m
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
