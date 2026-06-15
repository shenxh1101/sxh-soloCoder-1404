import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  History,
  Eye,
  Clock,
  AlertTriangle,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { RING_LENGTH } from '../utils/constants';
import { TimelineEventType } from '../types';

const EVENT_ICONS: Record<TimelineEventType, JSX.Element> = {
  excavation_start: <ArrowRight className="w-3 h-3" />,
  excavation_end: <ArrowRight className="w-3 h-3" />,
  assembly_start: <Wrench className="w-3 h-3" />,
  assembly_end: <Wrench className="w-3 h-3" />,
  warning_start: <AlertTriangle className="w-3 h-3" />,
  warning_end: <AlertTriangle className="w-3 h-3" />,
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  excavation_start: 'bg-green-500',
  excavation_end: 'bg-green-700',
  assembly_start: 'bg-cyan-500',
  assembly_end: 'bg-cyan-700',
  warning_start: 'bg-red-500',
  warning_end: 'bg-red-700',
};

export function PlaybackPanel() {
  const {
    playbackMode,
    playbackIndex,
    playbackSnapshots,
    playbackIsPlaying,
    allTimelineEvents,
    ringRecords,
    currentMileage,
    setPlaybackMode,
    setPlaybackIndex,
    togglePlaybackPlay,
    stepPlayback,
  } = useConstructionStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playbackMode === 'playback' && playbackIsPlaying) {
      intervalRef.current = setInterval(() => {
        const state = useConstructionStore.getState();
        if (state.playbackIndex >= state.playbackSnapshots.length - 1) {
          setPlaybackMode('live');
          return;
        }
        state.setPlaybackIndex(state.playbackIndex + Math.max(1, Math.floor(state.playbackSnapshots.length / 300)));
      }, 50);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playbackMode, playbackIsPlaying, setPlaybackMode]);

  const totalSnapshots = playbackSnapshots.length;
  const progressPercent = totalSnapshots > 0 ? (playbackIndex / totalSnapshots) * 100 : 0;

  const currentSnapshot = playbackSnapshots[playbackIndex];
  const currentRingNumber = currentSnapshot
    ? currentSnapshot.ringNumber
    : Math.floor(currentMileage / RING_LENGTH) + 1;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setPlaybackIndex(value);
  };

  const currentEvents = allTimelineEvents.filter((e) => e.ringNumber === currentRingNumber);

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          施工过程回放
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaybackMode('live')}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              playbackMode === 'live'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              实时
            </span>
          </button>
          <button
            onClick={() => setPlaybackMode('playback')}
            disabled={totalSnapshots === 0}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              playbackMode === 'playback'
                ? 'bg-purple-600 text-white'
                : totalSnapshots === 0
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-1">
              <History className="w-3 h-3" />
              回放
            </span>
          </button>
        </div>
      </div>

      {totalSnapshots === 0 ? (
        <div className="h-32 flex items-center justify-center bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 text-sm">暂无施工记录，开始掘进后可回放</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">当前环号</p>
                <p className="text-2xl font-bold text-white font-mono">{currentRingNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">掘进里程</p>
                <p className="text-2xl font-bold text-cyan-400 font-mono">
                  {currentSnapshot ? currentSnapshot.mileage.toFixed(2) : currentMileage.toFixed(2)}
                  <span className="text-sm text-gray-500 ml-1">m</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">回放进度</p>
                <p className="text-2xl font-bold text-purple-400 font-mono">
                  {progressPercent.toFixed(0)}
                  <span className="text-sm text-gray-500 ml-1">%</span>
                </p>
              </div>
            </div>

            {currentSnapshot && currentSnapshot.hasWarning && (
              <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-300">当前时刻存在参数超限告警</span>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                onClick={() => stepPlayback(-50)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <SkipBack className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => stepPlayback(-1)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <SkipBack className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={togglePlaybackPlay}
                disabled={playbackMode !== 'playback'}
                className={`p-3 rounded-xl transition-all ${
                  playbackMode !== 'playback'
                    ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                    : playbackIsPlaying
                    ? 'bg-yellow-600 hover:bg-yellow-500'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30'
                }`}
              >
                {playbackIsPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={() => stepPlayback(1)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <SkipForward className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => stepPlayback(50)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <SkipForward className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={totalSnapshots - 1}
                value={playbackIndex}
                onChange={handleSliderChange}
                disabled={playbackMode !== 'playback'}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="relative h-4">
                {ringRecords.map((record) => {
                  const snapshotIndex = Math.floor(
                    (record.ringNumber * RING_LENGTH / 100) * totalSnapshots
                  );
                  const leftPercent = (snapshotIndex / totalSnapshots) * 100;
                  return (
                    <div
                      key={record.ringNumber}
                      className="absolute top-0 -translate-x-1/2"
                      style={{ left: `${leftPercent}%` }}
                      title={`第 ${record.ringNumber} 环`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full cursor-pointer ${
                          record.hasWarning ? 'bg-red-500' : 'bg-cyan-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0m</span>
                <span>25m</span>
                <span>50m</span>
                <span>75m</span>
                <span>100m</span>
              </div>
            </div>
          </div>

          {currentEvents.length > 0 && playbackMode === 'playback' && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 max-h-40 overflow-y-auto custom-scrollbar">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                第 {currentRingNumber} 环事件记录
              </p>
              <div className="space-y-1.5">
                {currentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${EVENT_COLORS[event.type]} text-white`}
                    >
                      {EVENT_ICONS[event.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 truncate">{event.description}</p>
                      <p className="text-gray-500 text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString()} · 里程 {event.mileage.toFixed(2)}m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">已记录环数</p>
              <p className="text-sm font-bold text-white font-mono">{ringRecords.length}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">事件总数</p>
              <p className="text-sm font-bold text-white font-mono">{allTimelineEvents.length}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">告警环数</p>
              <p className="text-sm font-bold text-red-400 font-mono">
                {ringRecords.filter((r) => r.hasWarning).length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
