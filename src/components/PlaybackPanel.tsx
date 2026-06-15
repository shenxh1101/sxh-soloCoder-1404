import { useEffect, useRef, useState, useMemo } from 'react';
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
  ArrowLeft,
  Bookmark,
  MapPin,
  Gauge,
  Zap,
  RotateCw,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Activity,
  Link,
  Scissors,
  Package,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { RING_LENGTH, STRATUM_NAMES } from '../utils/constants';
import { TimelineEventType, BookmarkType, BookmarkNode } from '../types';

const EVENT_ICONS: Record<TimelineEventType, JSX.Element> = {
  excavation_start: <ArrowRight className="w-3 h-3" />,
  excavation_end: <ArrowRight className="w-3 h-3" />,
  assembly_start: <Wrench className="w-3 h-3" />,
  assembly_end: <Wrench className="w-3 h-3" />,
  warning_start: <AlertTriangle className="w-3 h-3" />,
  warning_end: <AlertTriangle className="w-3 h-3" />,
  stratum_change: <Layers className="w-3 h-3" />,
};

const EVENT_COLORS: Record<TimelineEventType, string> = {
  excavation_start: 'bg-green-500',
  excavation_end: 'bg-green-700',
  assembly_start: 'bg-cyan-500',
  assembly_end: 'bg-cyan-700',
  warning_start: 'bg-red-500',
  warning_end: 'bg-red-700',
  stratum_change: 'bg-amber-500',
};

const BOOKMARK_FILTERS: { type: BookmarkType | 'all'; label: string; icon: string }[] = [
  { type: 'all', label: '全部', icon: '📋' },
  { type: 'stratum_enter', label: '地层变化', icon: '🪨' },
  { type: 'warning_trigger', label: '超限告警', icon: '⚠️' },
  { type: 'assembly_start', label: '开始拼装', icon: '🔧' },
  { type: 'assembly_end', label: '拼装完成', icon: '✅' },
  { type: 'excavation_resume', label: '恢复掘进', icon: '🚀' },
  { type: 'mileage_milestone', label: '里程突破', icon: '🎯' },
];

const CONTEXT_RADIUS = 30;

export function PlaybackPanel() {
  const {
    playbackMode,
    playbackIndex,
    playbackSnapshots,
    playbackIsPlaying,
    allTimelineEvents,
    ringRecords,
    currentMileage,
    bookmarks,
    playbackHighlights,
    totalThrust,
    torque,
    currentStratum,
    setPlaybackMode,
    setPlaybackIndex,
    togglePlaybackPlay,
    stepPlayback,
    jumpToBookmark,
  } = useConstructionStore();

  const [bookmarkFilter, setBookmarkFilter] = useState<BookmarkType | 'all'>('all');
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [contextBookmark, setContextBookmark] = useState<BookmarkNode | null>(null);
  const [clipStart, setClipStart] = useState<number | null>(null);
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const [isSelectingClip, setIsSelectingClip] = useState(false);
  const [showClipPack, setShowClipPack] = useState(false);
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

  const filteredEvents = allTimelineEvents.filter((e) => {
    if (!currentSnapshot) return e.ringNumber === currentRingNumber;
    return e.snapshotIndex <= playbackIndex;
  }).sort((a, b) => b.snapshotIndex - a.snapshotIndex).slice(0, 10);

  const filteredBookmarks = bookmarks.filter(
    (b) => bookmarkFilter === 'all' || b.type === bookmarkFilter
  ).sort((a, b) => a.snapshotIndex - b.snapshotIndex);

  const isInAssemblyPhase = currentSnapshot?.awaitingAssembly;
  const activeWarningTypes = currentSnapshot?.activeWarningTypes || [];

  const handleBookmarkClick = (bookmark: BookmarkNode) => {
    jumpToBookmark(bookmark.id);
    setContextBookmark(bookmark);
  };

  const contextData = useMemo(() => {
    if (!contextBookmark || totalSnapshots === 0) return null;

    const centerIdx = contextBookmark.snapshotIndex;
    const startIdx = Math.max(0, centerIdx - CONTEXT_RADIUS);
    const endIdx = Math.min(totalSnapshots - 1, centerIdx + CONTEXT_RADIUS);
    const contextSnapshots = playbackSnapshots.slice(startIdx, endIdx + 1);

    const contextEvents = allTimelineEvents.filter(
      (e) => e.snapshotIndex >= startIdx && e.snapshotIndex <= endIdx
    ).sort((a, b) => a.snapshotIndex - b.snapshotIndex);

    const relatedWarnings = contextEvents.filter(
      (e) => e.type === 'warning_start' || e.type === 'warning_end'
    );

    const nearbyBookmarks = bookmarks.filter(
      (b) => b.snapshotIndex >= startIdx && b.snapshotIndex <= endIdx && b.id !== contextBookmark.id
    ).sort((a, b) => a.snapshotIndex - b.snapshotIndex);

    const beforeSnapshots = contextSnapshots.filter((_, i) => startIdx + i < centerIdx);
    const afterSnapshots = contextSnapshots.filter((_, i) => startIdx + i > centerIdx);

    const beforeMinThrust = beforeSnapshots.length > 0 ? Math.min(...beforeSnapshots.map(s => s.thrust)) : 0;
    const beforeMaxThrust = beforeSnapshots.length > 0 ? Math.max(...beforeSnapshots.map(s => s.thrust)) : 0;
    const afterMinThrust = afterSnapshots.length > 0 ? Math.min(...afterSnapshots.map(s => s.thrust)) : 0;
    const afterMaxThrust = afterSnapshots.length > 0 ? Math.max(...afterSnapshots.map(s => s.thrust)) : 0;

    const beforeMinTorque = beforeSnapshots.length > 0 ? Math.min(...beforeSnapshots.map(s => s.torque)) : 0;
    const beforeMaxTorque = beforeSnapshots.length > 0 ? Math.max(...beforeSnapshots.map(s => s.torque)) : 0;
    const afterMinTorque = afterSnapshots.length > 0 ? Math.min(...afterSnapshots.map(s => s.torque)) : 0;
    const afterMaxTorque = afterSnapshots.length > 0 ? Math.max(...afterSnapshots.map(s => s.torque)) : 0;

    return {
      startIdx,
      endIdx,
      centerIdx,
      contextSnapshots,
      contextEvents,
      relatedWarnings,
      nearbyBookmarks,
      before: {
        thrustRange: [beforeMinThrust, beforeMaxThrust],
        torqueRange: [beforeMinTorque, beforeMaxTorque],
        count: beforeSnapshots.length,
      },
      after: {
        thrustRange: [afterMinThrust, afterMaxThrust],
        torqueRange: [afterMinTorque, afterMaxTorque],
        count: afterSnapshots.length,
      },
    };
  }, [contextBookmark, totalSnapshots, playbackSnapshots, allTimelineEvents, bookmarks]);

  const clipPackData = useMemo(() => {
    if (clipStart === null || clipEnd === null || totalSnapshots === 0) return null;
    const start = Math.min(clipStart, clipEnd);
    const end = Math.max(clipStart, clipEnd);
    const clipSnapshots = playbackSnapshots.slice(start, end + 1);
    if (clipSnapshots.length === 0) return null;

    const clipEvents = allTimelineEvents.filter(
      (e) => e.snapshotIndex >= start && e.snapshotIndex <= end
    ).sort((a, b) => a.snapshotIndex - b.snapshotIndex);

    const clipBookmarks = bookmarks.filter(
      (b) => b.snapshotIndex >= start && b.snapshotIndex <= end
    ).sort((a, b) => a.snapshotIndex - b.snapshotIndex);

    const clipWarnings = clipEvents.filter(
      (e) => e.type === 'warning_start'
    );

    const startS = clipSnapshots[0];
    const endS = clipSnapshots[clipSnapshots.length - 1];

    const thrusts = clipSnapshots.map((s) => s.thrust);
    const torques = clipSnapshots.map((s) => s.torque);
    const speeds = clipSnapshots.map((s) => s.speed);

    const ringSet = new Set(clipSnapshots.map((s) => s.ringNumber));
    const ringRange = `${Math.min(...ringSet)} — ${Math.max(...ringSet)}`;

    const mileageStart = startS.mileage;
    const mileageEnd = endS.mileage;
    const distance = mileageEnd - mileageStart;

    const excavationSnapshots = clipSnapshots.filter((s) => s.isExcavating);
    const assemblySnapshots = clipSnapshots.filter((s) => s.awaitingAssembly);
    const excavationRatio = clipSnapshots.length > 0
      ? (excavationSnapshots.length / clipSnapshots.length) * 100
      : 0;

    return {
      start,
      end,
      frameCount: clipSnapshots.length,
      ringRange,
      rings: Array.from(ringSet).sort((a, b) => a - b),
      mileageStart,
      mileageEnd,
      distance,
      events: clipEvents,
      bookmarks: clipBookmarks,
      warnings: clipWarnings,
      startSnapshot: startS,
      endSnapshot: endS,
      avgThrust: thrusts.reduce((a, b) => a + b, 0) / thrusts.length,
      minThrust: Math.min(...thrusts),
      maxThrust: Math.max(...thrusts),
      avgTorque: torques.reduce((a, b) => a + b, 0) / torques.length,
      minTorque: Math.min(...torques),
      maxTorque: Math.max(...torques),
      avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      excavationRatio,
      assemblyRatio: (assemblySnapshots.length / clipSnapshots.length) * 100,
    };
  }, [clipStart, clipEnd, totalSnapshots, playbackSnapshots, allTimelineEvents, bookmarks]);

  const handleToggleClipSelection = () => {
    if (isSelectingClip) {
      setIsSelectingClip(false);
      setClipStart(null);
      setClipEnd(null);
      setShowClipPack(false);
    } else {
      setIsSelectingClip(true);
      setClipStart(playbackIndex);
      setClipEnd(null);
      setShowClipPack(false);
    }
  };

  const handleSetClipPoint = () => {
    if (!isSelectingClip) return;
    if (clipStart === null) {
      setClipStart(playbackIndex);
    } else if (clipEnd === null) {
      setClipEnd(playbackIndex);
      setIsSelectingClip(false);
      setShowClipPack(true);
    } else {
      setClipStart(playbackIndex);
      setClipEnd(null);
    }
  };

  const exportClipPack = () => {
    if (!clipPackData) return;
    const {
      start, end, frameCount, ringRange, mileageStart, mileageEnd, distance,
      events, bookmarks, warnings,
      startSnapshot, endSnapshot,
      avgThrust, minThrust, maxThrust,
      avgTorque, minTorque, maxTorque,
      avgSpeed, excavationRatio, assemblyRatio,
    } = clipPackData;

    const eventRows = events.map((e, i) => `
      <tr style="${e.type.includes('warning') ? 'background:rgba(239,68,68,0.08)' : ''}">
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${e.type.includes('warning') ? '⚠️' : e.type.includes('assembly') ? '🔧' : e.type.includes('stratum') ? '🪨' : '▶️'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${e.description}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">#${e.ringNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${e.mileage.toFixed(1)}m</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${new Date(e.timestamp).toLocaleTimeString()}</td>
      </tr>
    `).join('');

    const bookmarkRows = bookmarks.map((b, i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.icon}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.title}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.description || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">#${b.ringNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.mileage.toFixed(1)}m</td>
      </tr>
    `).join('');

    const warningRows = warnings.map((w, i) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${w.description}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">#${w.ringNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${w.mileage.toFixed(1)}m</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<title>盾构复盘片段 — #${ringRange}环 ${mileageStart.toFixed(1)}-${mileageEnd.toFixed(1)}m</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; padding: 30px; }
  h1 { font-size: 24px; margin-bottom: 4px; background: linear-gradient(to right, #06b6d4, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .meta { color:#94a3b8; font-size:13px; margin-bottom:24px; }
  .grid { display:grid; grid-template-columns: repeat(4,1fr); gap:12px; margin-bottom:24px; }
  .card { background:#1e293b; border:1px solid #334155; border-radius:10px; padding:14px; }
  .card .label { color:#94a3b8; font-size:11px; margin-bottom:4px; }
  .card .value { font-size:20px; font-weight:bold; font-family:monospace; }
  .blue{color:#3b82f6}.green{color:#10b981}.amber{color:#f59e0b}.red{color:#ef4444}.cyan{color:#06b6d4}
  table { width:100%; border-collapse:collapse; background:#1e293b; border-radius:8px; overflow:hidden; margin-bottom:20px;}
  th { background:#0f172a; color:#94a3b8; font-size:12px; padding:10px; text-align:left; border-bottom:2px solid #334155; }
  td { font-size:13px; }
  h2 { font-size:17px; margin:24px 0 12px; border-left:4px solid #06b6d4; padding-left:10px; }
</style></head><body>
  <h1>盾构施工复盘片段</h1>
  <p class="meta">
    帧范围: ${start} — ${end} (${frameCount}帧) &nbsp;|&nbsp;
    环号: ${ringRange}环 &nbsp;|&nbsp;
    里程: ${mileageStart.toFixed(1)}m — ${mileageEnd.toFixed(1)}m (推进 ${distance.toFixed(2)}m) &nbsp;|&nbsp;
    生成时间: ${new Date().toLocaleString()}
  </p>

  <div class="grid">
    <div class="card"><div class="label">片段时长占比</div>
      <div class="value green">${excavationRatio.toFixed(1)}%</div>
      <div class="label" style="margin-top:6px">掘进 / 拼装</div>
      <div class="value cyan" style="font-size:14px">${excavationRatio.toFixed(0)}% / ${assemblyRatio.toFixed(0)}%</div>
    </div>
    <div class="card"><div class="label">平均推力 (范围)</div>
      <div class="value amber">${avgThrust.toFixed(0)}</div>
      <div class="label" style="margin-top:6px">最小 — 最大</div>
      <div class="value amber" style="font-size:14px">${minThrust.toFixed(0)} — ${maxThrust.toFixed(0)} kN</div>
    </div>
    <div class="card"><div class="label">平均扭矩 (范围)</div>
      <div class="value red">${avgTorque.toFixed(0)}</div>
      <div class="label" style="margin-top:6px">最小 — 最大</div>
      <div class="value red" style="font-size:14px">${minTorque.toFixed(0)} — ${maxTorque.toFixed(0)} kN·m</div>
    </div>
    <div class="card"><div class="label">告警次数 / 关键节点</div>
      <div class="value ${warnings.length > 0 ? 'red' : 'green'}">${warnings.length} / ${bookmarks.length}</div>
      <div class="label" style="margin-top:6px">平均推进速度</div>
      <div class="value blue" style="font-size:14px">${avgSpeed.toFixed(1)} mm/min</div>
    </div>
  </div>

  <h2>时间轴事件链 (${events.length})</h2>
  <table><thead><tr><th>#</th><th>图标</th><th>事件</th><th>环号</th><th>里程</th><th>时间</th></tr></thead>
  <tbody>${eventRows}</tbody></table>

  ${bookmarks.length > 0 ? `<h2>关键节点 (${bookmarks.length})</h2>
  <table><thead><tr><th>图标</th><th>标题</th><th>描述</th><th>环号</th><th>里程</th></tr></thead>
  <tbody>${bookmarkRows}</tbody></table>` : ''}

  ${warnings.length > 0 ? `<h2>告警演变 (${warnings.length})</h2>
  <table><thead><tr><th>#</th><th>告警内容</th><th>环号</th><th>里程</th></tr></thead>
  <tbody>${warningRows}</tbody></table>` : ''}

  <h2>起止参数对照</h2>
  <div class="grid">
    <div class="card"><div class="label">起始状态</div>
      <div class="value cyan" style="font-size:15px">${startSnapshot.isExcavating ? '掘进中' : startSnapshot.awaitingAssembly ? '拼装中' : '待机'}</div>
      <div class="label" style="margin-top:4px">推力 / 扭矩</div>
      <div style="font-size:13px;font-family:monospace">${startSnapshot.thrust.toFixed(0)}kN / ${startSnapshot.torque.toFixed(0)}kN·m</div>
    </div>
    <div class="card"><div class="label">终止状态</div>
      <div class="value cyan" style="font-size:15px">${endSnapshot.isExcavating ? '掘进中' : endSnapshot.awaitingAssembly ? '拼装中' : '待机'}</div>
      <div class="label" style="margin-top:4px">推力 / 扭矩</div>
      <div style="font-size:13px;font-family:monospace">${endSnapshot.thrust.toFixed(0)}kN / ${endSnapshot.torque.toFixed(0)}kN·m</div>
    </div>
    <div class="card"><div class="label">起始环号 / 里程</div>
      <div class="value blue" style="font-size:15px">#${startSnapshot.ringNumber}</div>
      <div style="font-size:13px;font-family:monospace" class="amber">${startSnapshot.mileage.toFixed(2)} m</div>
    </div>
    <div class="card"><div class="label">终止环号 / 里程</div>
      <div class="value blue" style="font-size:15px">#${endSnapshot.ringNumber}</div>
      <div style="font-size:13px;font-family:monospace" class="amber">${endSnapshot.mileage.toFixed(2)} m</div>
    </div>
  </div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `盾构复盘片段_${ringRange}环_${mileageStart.toFixed(0)}-${mileageEnd.toFixed(0)}m_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          施工过程回放
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPlaybackMode('live'); setContextBookmark(null); }}
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
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">当前环号</p>
                <p className={`text-2xl font-bold font-mono ${playbackHighlights.ringNumber === currentRingNumber ? 'text-yellow-400' : 'text-white'}`}>
                  {currentRingNumber}
                  {isInAssemblyPhase && <span className="text-xs text-cyan-400 ml-1">拼装中</span>}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">掘进里程</p>
                <p className="text-2xl font-bold text-cyan-400 font-mono flex items-center justify-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {currentSnapshot ? currentSnapshot.mileage.toFixed(2) : currentMileage.toFixed(2)}
                  <span className="text-sm text-gray-500">m</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">环进度</p>
                <p className="text-2xl font-bold text-green-400 font-mono">
                  {((currentSnapshot?.ringProgress || 0) * 100).toFixed(0)}
                  <span className="text-sm text-gray-500 ml-1">%</span>
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

            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-700/50">
              <div className="bg-gray-900/50 rounded p-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] text-gray-500">推力</span>
                </div>
                <p className="text-sm font-bold text-yellow-400 font-mono text-center">
                  {(currentSnapshot?.thrust || totalThrust).toFixed(0)}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <RotateCw className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] text-gray-500">扭矩</span>
                </div>
                <p className="text-sm font-bold text-red-400 font-mono text-center">
                  {(currentSnapshot?.torque || torque).toFixed(0)}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Gauge className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] text-gray-500">速度</span>
                </div>
                <p className="text-sm font-bold text-blue-400 font-mono text-center">
                  {(currentSnapshot?.speed || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-gray-500">地层</span>
                </div>
                <p className="text-sm font-bold text-amber-400 font-mono text-center">
                  {STRATUM_NAMES[currentSnapshot?.stratum || currentStratum]}
                </p>
              </div>
            </div>

            {currentSnapshot && activeWarningTypes.length > 0 && (
              <div className="mt-3 p-2 bg-red-900/30 border border-red-700/50 rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-xs text-red-300">
                  当前时刻存在告警: {activeWarningTypes.map(t => t === 'thrust' ? '推力超限' : '扭矩超限').join('、')}
                </span>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                onClick={() => stepPlayback(-50)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="后退50帧"
              >
                <SkipBack className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => stepPlayback(-10)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="后退10帧"
              >
                <SkipBack className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => stepPlayback(-1)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="后退1帧"
              >
                <SkipBack className="w-3 h-3 text-white" />
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
                title="前进1帧"
              >
                <SkipForward className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => stepPlayback(10)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="前进10帧"
              >
                <SkipForward className="w-3 h-3 text-white" />
              </button>
              <button
                onClick={() => stepPlayback(50)}
                disabled={playbackMode !== 'playback'}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="前进50帧"
              >
                <SkipForward className="w-4 h-4 text-white" />
              </button>

              <div className="w-px h-6 bg-gray-600 mx-1" />

              <button
                onClick={handleSetClipPoint}
                disabled={!isSelectingClip || playbackMode !== 'playback'}
                className={`p-2 rounded-lg transition-all ${
                  isSelectingClip
                    ? clipStart !== null && clipEnd === null
                      ? 'bg-cyan-600 hover:bg-cyan-500 animate-pulse'
                      : 'bg-cyan-800/50 border border-cyan-600'
                    : 'bg-gray-700 opacity-30 cursor-not-allowed'
                }`}
                title={clipStart === null ? '选择片段起点' : clipEnd === null ? '选择片段终点' : '重新选择起点'}
              >
                <Scissors className={`w-4 h-4 ${isSelectingClip ? 'text-white' : 'text-gray-500'}`} />
              </button>

              <button
                onClick={handleToggleClipSelection}
                disabled={playbackMode !== 'playback'}
                className={`p-2 rounded-lg transition-all ${
                  playbackMode !== 'playback'
                    ? 'bg-gray-700 opacity-30 cursor-not-allowed'
                    : isSelectingClip
                      ? 'bg-red-600 hover:bg-red-500'
                      : (clipStart !== null && clipEnd !== null)
                        ? 'bg-teal-600 hover:bg-teal-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isSelectingClip ? '取消片段选择' : clipStart !== null && clipEnd !== null ? '查看打包结果' : '开始框选片段'}
              >
                {isSelectingClip ? (
                  <RefreshCw className="w-4 h-4 text-white" />
                ) : (
                  <Package className={`w-4 h-4 ${clipStart !== null && clipEnd !== null ? 'text-white' : 'text-gray-400'}`} />
                )}
              </button>
            </div>

            {(isSelectingClip || (clipStart !== null && clipEnd !== null)) && (
              <div className={`mt-2 p-2 rounded text-xs ${isSelectingClip ? 'bg-cyan-900/30 border border-cyan-700/50 text-cyan-300' : 'bg-teal-900/30 border border-teal-700/50 text-teal-300'}`}>
                {isSelectingClip
                  ? clipStart === null
                    ? '📍 将回放头拖到起点位置，然后点击 ✂️ 按钮设置起点'
                    : clipEnd === null
                      ? `📍 起点已设（帧 #${clipStart}），将头拖到终点，再次点击 ✂️ 按钮设置终点`
                      : ''
                  : `✅ 片段已选定：帧 #${Math.min(clipStart!, clipEnd!)} — #${Math.max(clipStart!, clipEnd!)} ，共 ${Math.abs(clipEnd! - clipStart!) + 1} 帧`
                }
              </div>
            )}

            <div className="space-y-2">
              {clipStart !== null && clipEnd !== null && (
                <div className="relative h-2 rounded-lg bg-gray-700 overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-cyan-500/50 to-teal-500/50 border-x-2 border-cyan-400"
                    style={{
                      left: `${(Math.min(clipStart, clipEnd) / totalSnapshots) * 100}%`,
                      width: `${(Math.abs(clipEnd - clipStart) / totalSnapshots) * 100}%`,
                    }}
                  />
                  <div
                    className="absolute top-0 h-full w-1 bg-cyan-400 shadow-lg shadow-cyan-400/50"
                    style={{ left: `${(Math.min(clipStart, clipEnd) / totalSnapshots) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-1 bg-teal-400 shadow-lg shadow-teal-400/50"
                    style={{ left: `${(Math.max(clipStart, clipEnd) / totalSnapshots) * 100}%` }}
                  />
                </div>
              )}

              <input
                type="range"
                min={0}
                max={totalSnapshots - 1}
                value={playbackIndex}
                onChange={handleSliderChange}
                disabled={playbackMode !== 'playback'}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="relative h-5">
                {bookmarks.map((bookmark) => {
                  const leftPercent = (bookmark.snapshotIndex / totalSnapshots) * 100;
                  const isActive = contextBookmark?.id === bookmark.id;
                  return (
                    <button
                      key={bookmark.id}
                      onClick={() => handleBookmarkClick(bookmark)}
                      className={`absolute top-0 -translate-x-1/2 hover:scale-125 transition-transform cursor-pointer z-10 ${isActive ? 'scale-125' : ''}`}
                      style={{ left: `${leftPercent}%` }}
                      title={`${bookmark.icon} ${bookmark.title}`}
                    >
                      <span className={`text-sm ${isActive ? 'drop-shadow-lg' : ''}`}>{bookmark.icon}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative h-3">
                {ringRecords.map((record) => {
                  const firstEvent = allTimelineEvents.find(e => e.ringNumber === record.ringNumber);
                  const snapshotIdx = firstEvent?.snapshotIndex || Math.floor((record.ringNumber * RING_LENGTH / 100) * totalSnapshots);
                  const leftPercent = (snapshotIdx / totalSnapshots) * 100;
                  return (
                    <div
                      key={record.ringNumber}
                      className="absolute top-0 -translate-x-1/2"
                      style={{ left: `${leftPercent}%` }}
                      title={`第 ${record.ringNumber} 环${record.hasWarning ? ' · 含告警' : ''}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full cursor-pointer ${
                          playbackHighlights.ringNumber === record.ringNumber
                            ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-800'
                            : ''
                        } ${record.hasWarning ? 'bg-red-500' : 'bg-cyan-500'}`}
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

          {contextBookmark && contextData && (
            <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/30 rounded-lg p-4 border border-purple-700/50 shadow-lg shadow-purple-900/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold text-purple-200">节点复盘上下文</span>
                </div>
                <button
                  onClick={() => setContextBookmark(null)}
                  className="p-1 rounded hover:bg-gray-700/50 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-purple-700/30">
                <span className="text-2xl">{contextBookmark.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{contextBookmark.title}</p>
                  <p className="text-purple-300 text-[11px]">
                    #{contextBookmark.ringNumber} · {contextBookmark.mileage.toFixed(1)}m · {new Date(contextBookmark.timestamp).toLocaleTimeString()}
                  </p>
                  {contextBookmark.description && (
                    <p className="text-gray-400 text-[11px] mt-0.5">{contextBookmark.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-900/50 rounded p-2 border border-green-700/30">
                  <p className="text-[10px] text-green-400 mb-1 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> 节点前 ({contextData.before.count}帧)
                  </p>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-400">
                      推力 <span className="text-yellow-400 font-mono">{contextData.before.thrustRange[0].toFixed(0)}~{contextData.before.thrustRange[1].toFixed(0)}</span> kN
                    </p>
                    <p className="text-[10px] text-gray-400">
                      扭矩 <span className="text-red-400 font-mono">{contextData.before.torqueRange[0].toFixed(0)}~{contextData.before.torqueRange[1].toFixed(0)}</span> kN·m
                    </p>
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded p-2 border border-blue-700/30">
                  <p className="text-[10px] text-blue-400 mb-1 flex items-center gap-1">
                    节点后 ({contextData.after.count}帧) <ArrowRight className="w-3 h-3" />
                  </p>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-400">
                      推力 <span className="text-yellow-400 font-mono">{contextData.after.thrustRange[0].toFixed(0)}~{contextData.after.thrustRange[1].toFixed(0)}</span> kN
                    </p>
                    <p className="text-[10px] text-gray-400">
                      扭矩 <span className="text-red-400 font-mono">{contextData.after.torqueRange[0].toFixed(0)}~{contextData.after.torqueRange[1].toFixed(0)}</span> kN·m
                    </p>
                  </div>
                </div>
              </div>

              {contextData.contextEvents.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    前后事件链
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {contextData.contextEvents.map((event) => {
                      const isCenter = Math.abs(event.snapshotIndex - contextData.centerIdx) < 3;
                      return (
                        <div
                          key={event.id}
                          className={`flex items-start gap-2 text-[11px] p-1 rounded ${
                            isCenter ? 'bg-purple-900/50 border border-purple-600/50' : 'hover:bg-gray-800/50'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${EVENT_COLORS[event.type]} text-white`}
                          >
                            {EVENT_ICONS[event.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`truncate ${isCenter ? 'text-purple-200 font-medium' : 'text-gray-400'}`}>
                              {event.description}
                            </p>
                            <p className="text-gray-600 text-[9px]">
                              #{event.ringNumber} · {event.mileage.toFixed(1)}m
                              {isCenter ? ' · ← 当前节点' : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => setPlaybackIndex(event.snapshotIndex)}
                            className="text-[9px] text-purple-400 hover:text-purple-300 flex-shrink-0"
                          >
                            跳转
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {contextData.relatedWarnings.length > 0 && (
                <div className="p-2 bg-red-900/20 border border-red-700/30 rounded">
                  <p className="text-[10px] text-red-300 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    相关告警 ({contextData.relatedWarnings.length})
                  </p>
                  <div className="space-y-0.5">
                    {contextData.relatedWarnings.map((w) => (
                      <p key={w.id} className="text-[10px] text-gray-400">
                        <span className="text-red-400">●</span> #{w.ringNumber} · {w.description}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {contextData.nearbyBookmarks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[9px] text-gray-500">相邻节点:</span>
                  {contextData.nearbyBookmarks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBookmarkClick(b)}
                      className="text-[10px] px-1.5 py-0.5 bg-gray-800/60 hover:bg-purple-900/40 rounded border border-gray-700/50 hover:border-purple-600/50 transition-all"
                    >
                      {b.icon} {b.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {clipPackData && showClipPack && (
            <div className="bg-gradient-to-br from-teal-900/40 to-cyan-900/30 rounded-lg p-4 border border-teal-700/50 shadow-lg shadow-teal-900/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-bold text-teal-200">复盘片段打包</span>
                  <span className="text-[10px] text-gray-400">
                    #{clipPackData.ringRange}环 · {clipPackData.mileageStart.toFixed(1)}-{clipPackData.mileageEnd.toFixed(1)}m
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportClipPack}
                    className="flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md font-medium transition-all"
                  >
                    <Download className="w-3 h-3" />
                    导出HTML
                  </button>
                  <button
                    onClick={() => { setShowClipPack(false); }}
                    className="p-1 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="bg-gray-900/50 rounded p-2">
                  <p className="text-[9px] text-gray-500">推进距离</p>
                  <p className="text-sm font-bold text-cyan-400 font-mono">{clipPackData.distance.toFixed(2)}m</p>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                  <p className="text-[9px] text-gray-500">掘进占比</p>
                  <p className="text-sm font-bold text-green-400 font-mono">{clipPackData.excavationRatio.toFixed(0)}%</p>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                  <p className="text-[9px] text-gray-500">平均推力</p>
                  <p className="text-sm font-bold text-yellow-400 font-mono">{clipPackData.avgThrust.toFixed(0)}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-2">
                  <p className="text-[9px] text-gray-500">告警/节点</p>
                  <p className="text-sm font-bold font-mono">
                    <span className="text-red-400">{clipPackData.warnings.length}</span>
                    <span className="text-gray-600"> / </span>
                    <span className="text-teal-400">{clipPackData.bookmarks.length}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-gray-900/30 rounded p-2">
                  <p className="text-gray-500 mb-1">参数范围</p>
                  <p className="text-gray-400">
                    推力: <span className="text-yellow-400 font-mono">{clipPackData.minThrust.toFixed(0)}~{clipPackData.maxThrust.toFixed(0)}</span>
                  </p>
                  <p className="text-gray-400">
                    扭矩: <span className="text-red-400 font-mono">{clipPackData.minTorque.toFixed(0)}~{clipPackData.maxTorque.toFixed(0)}</span>
                  </p>
                </div>
                <div className="bg-gray-900/30 rounded p-2">
                  <p className="text-gray-500 mb-1">起止状态</p>
                  <p className="text-gray-400">
                    起: <span className="text-cyan-400 font-mono">#{clipPackData.startSnapshot.ringNumber} · {clipPackData.mileageStart.toFixed(1)}m</span>
                  </p>
                  <p className="text-gray-400">
                    止: <span className="text-cyan-400 font-mono">#{clipPackData.endSnapshot.ringNumber} · {clipPackData.mileageEnd.toFixed(1)}m</span>
                  </p>
                </div>
              </div>

              {clipPackData.bookmarks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-teal-700/30">
                  <p className="text-[10px] text-teal-300 mb-1.5">🔗 关键节点链 ({clipPackData.bookmarks.length})</p>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                    {clipPackData.bookmarks.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => handleBookmarkClick(b)}
                        className="w-full text-left flex items-center gap-2 text-[11px] p-1 rounded hover:bg-teal-900/30 transition-colors"
                      >
                        <span>{b.icon}</span>
                        <span className="text-gray-300 truncate">{b.title}</span>
                        <span className="text-gray-600 ml-auto flex-shrink-0">#{b.ringNumber}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {filteredEvents.length > 0 && playbackMode === 'playback' && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 max-h-56 overflow-y-auto custom-scrollbar">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1 sticky top-0 bg-gray-800/90 py-1 -mt-1">
                  <Clock className="w-3 h-3" />
                  最近事件记录
                </p>
                <div className="space-y-1.5">
                  {filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`flex items-start gap-2 text-xs p-1.5 rounded ${
                        playbackHighlights.eventId === event.id
                          ? 'bg-yellow-900/30 border border-yellow-700/50'
                          : 'hover:bg-gray-700/50'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${EVENT_COLORS[event.type]} text-white`}
                      >
                        {EVENT_ICONS[event.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 truncate">{event.description}</p>
                        <p className="text-gray-500 text-[10px]">
                          #{event.ringNumber} · {new Date(event.timestamp).toLocaleTimeString()} · {event.mileage.toFixed(1)}m
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bookmarks.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => setShowBookmarks(!showBookmarks)}
                >
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />
                    关键节点书签 ({filteredBookmarks.length})
                  </p>
                  {showBookmarks ? (
                    <ChevronUp className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  )}
                </div>

                {showBookmarks && (
                  <>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {BOOKMARK_FILTERS.map((f) => (
                        <button
                          key={f.type}
                          onClick={() => setBookmarkFilter(f.type)}
                          className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                            bookmarkFilter === f.type
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {f.icon} {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                      {filteredBookmarks.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">暂无此类书签</p>
                      ) : (
                        filteredBookmarks.map((bookmark) => {
                          const isActive = Math.abs(bookmark.snapshotIndex - playbackIndex) < 5;
                          const isContext = contextBookmark?.id === bookmark.id;
                          return (
                            <button
                              key={bookmark.id}
                              onClick={() => handleBookmarkClick(bookmark)}
                              className={`w-full text-left flex items-start gap-2 text-xs p-1.5 rounded transition-all ${
                                isContext
                                  ? 'bg-purple-900/50 border border-purple-500/50'
                                  : isActive
                                  ? 'bg-purple-900/40 border border-purple-700/50'
                                  : 'hover:bg-gray-700/50'
                              }`}
                            >
                              <span className="text-lg leading-none">{bookmark.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-200 font-medium truncate">{bookmark.title}</p>
                                <p className="text-gray-500 text-[10px] truncate">
                                  #{bookmark.ringNumber} · {bookmark.mileage.toFixed(1)}m · {new Date(bookmark.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
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
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">关键节点</p>
              <p className="text-sm font-bold text-purple-400 font-mono">{bookmarks.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
