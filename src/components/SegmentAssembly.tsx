import { useState, useEffect } from 'react';
import { Hexagon, Clock, CheckCircle } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { SEGMENTS_PER_RING } from '../utils/constants';

export function SegmentAssembly() {
  const {
    awaitingSegmentAssembly,
    assembleSegments,
    segmentAssemblyStartTime,
    ringRecords,
  } = useConstructionStore();

  const [assemblyTime, setAssemblyTime] = useState(0);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (awaitingSegmentAssembly && segmentAssemblyStartTime) {
      interval = setInterval(() => {
        const elapsed =
          (new Date().getTime() - segmentAssemblyStartTime.getTime()) / 1000;
        setAssemblyTime(elapsed);
      }, 100);
    } else if (!awaitingSegmentAssembly) {
      setAssemblyTime(0);
      setIsAssembling(false);
      setAssemblyProgress(0);
    }

    return () => clearInterval(interval);
  }, [awaitingSegmentAssembly, segmentAssemblyStartTime]);

  const handleAssemble = () => {
    if (!awaitingSegmentAssembly || isAssembling) return;

    setIsAssembling(true);
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      setAssemblyProgress(progress);
      if (progress >= 100) {
        clearInterval(progressInterval);
        assembleSegments();
      }
    }, 50);
  };

  const lastAssemblyTime =
    ringRecords.length > 0
      ? ringRecords[ringRecords.length - 1].assemblyTime
      : null;

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Hexagon className="w-5 h-5 text-cyan-400" />
        管片拼装
      </h2>

      <div className="space-y-4">
        <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">拼装计时</span>
            </div>
            <span className="text-2xl font-mono font-bold text-white">
              {assemblyTime.toFixed(1)}
              <span className="text-sm text-gray-500 ml-1">秒</span>
            </span>
          </div>

          {awaitingSegmentAssembly && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>待拼装</span>
                <span>第 {ringRecords.length + 1} 环 · {SEGMENTS_PER_RING} 块</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100"
                  style={{ width: `${assemblyProgress}%` }}
                />
              </div>
            </div>
          )}

          {isAssembling && (
            <div className="mb-4">
              <p className="text-sm text-cyan-400 text-center animate-pulse">
                正在拼装第 {assemblyProgress < 17 ? '1' : assemblyProgress < 34 ? '2' : assemblyProgress < 51 ? '3' : assemblyProgress < 68 ? '4' : assemblyProgress < 85 ? '5' : '6'} 块管片...
              </p>
              <div className="flex justify-center gap-1 mt-2">
                {Array.from({ length: SEGMENTS_PER_RING }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      assemblyProgress > (i + 1) * (100 / SEGMENTS_PER_RING)
                        ? 'bg-green-600'
                        : 'bg-gray-700'
                    }`}
                  >
                    {assemblyProgress > (i + 1) * (100 / SEGMENTS_PER_RING) && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAssemble}
            disabled={!awaitingSegmentAssembly || isAssembling}
            className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all transform flex items-center justify-center gap-2 ${
              !awaitingSegmentAssembly || isAssembling
                ? 'bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-600/30'
            }`}
          >
            <Hexagon className="w-5 h-5" />
            {isAssembling ? '拼装中...' : awaitingSegmentAssembly ? '拼装管片' : '等待掘进完成'}
          </button>
        </div>

        {lastAssemblyTime !== null && (
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">上一环拼装时间</span>
              <span className="text-green-400 font-mono font-bold">
                {lastAssemblyTime.toFixed(1)} 秒
              </span>
            </div>
          </div>
        )}

        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">已拼装环数</p>
              <p className="text-xl font-bold text-cyan-400 font-mono">
                {ringRecords.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">总管片数量</p>
              <p className="text-xl font-bold text-cyan-400 font-mono">
                {ringRecords.length * SEGMENTS_PER_RING}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
