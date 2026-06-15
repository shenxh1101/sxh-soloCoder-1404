import { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Gauge,
  Zap,
  RotateCw,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  TrendingUp,
  Filter,
  BarChart2,
  PieChart,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useConstructionStore } from '../store/useConstructionStore';
import { STRATUM_NAMES, RING_LENGTH } from '../utils/constants';
import { DailyReportSummary, RingRecord, ShiftType, SHIFT_CONFIGS, StratumType } from '../types';
import { exportDailyReportToExcel } from '../utils/excelExport';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type GroupMode = 'ring' | 'shift' | 'date';

const SHIFT_NAMES: Record<ShiftType, string> = {
  morning: '早班',
  afternoon: '中班',
  night: '夜班',
};

const SHIFT_COLORS: Record<ShiftType, string> = {
  morning: '#F59E0B',
  afternoon: '#3B82F6',
  night: '#8B5CF6',
};

export function DailyReportView() {
  const ringRecords = useConstructionStore((state) => state.ringRecords);
  const bookmarks = useConstructionStore((state) => state.bookmarks);
  const allWarnings = useConstructionStore((state) => state.allWarnings);

  const [startRing, setStartRing] = useState(1);
  const [endRing, setEndRing] = useState(0);
  const [expandedRings, setExpandedRings] = useState<Set<number>>(new Set());
  const [showWarnings, setShowWarnings] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>('ring');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const maxRing = ringRecords.length;
  const effectiveEndRing = endRing === 0 || endRing > maxRing ? maxRing : endRing;
  const effectiveStartRing = Math.min(startRing, effectiveEndRing);

  const filteredRecords = useMemo(
    () =>
      ringRecords.filter(
        (r) => r.ringNumber >= effectiveStartRing && r.ringNumber <= effectiveEndRing
      ),
    [ringRecords, effectiveStartRing, effectiveEndRing]
  );

  const groupedByShift = useMemo(() => {
    const groups: Record<string, RingRecord[]> = {};
    for (const record of filteredRecords) {
      const key = `${record.dateKey}_${record.shift}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    }
    return groups;
  }, [filteredRecords]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, RingRecord[]> = {};
    for (const record of filteredRecords) {
      if (!groups[record.dateKey]) groups[record.dateKey] = [];
      groups[record.dateKey].push(record);
    }
    return groups;
  }, [filteredRecords]);

  const summary = useMemo(() => calculateSummary(filteredRecords), [filteredRecords]);

  const toggleRingExpand = (ringNumber: number) => {
    setExpandedRings((prev) => {
      const next = new Set(prev);
      if (next.has(ringNumber)) {
        next.delete(ringNumber);
      } else {
        next.add(ringNumber);
      }
      return next;
    });
  };

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleExportReport = () => {
    exportDailyReportToExcel(filteredRecords, summary, bookmarks, allWarnings, effectiveStartRing, effectiveEndRing);
  };

  const trendChartData = useMemo(() => {
    const labels = filteredRecords.map((r) => `#${r.ringNumber}`);
    return {
      labels,
      datasets: [
        {
          label: '掘进效率 (%)',
          data: filteredRecords.map((r) => r.excavationEfficiency),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
          type: 'line' as const,
        },
        {
          label: '拼装耗时 (秒)',
          data: filteredRecords.map((r) => r.assemblyTime),
          backgroundColor: 'rgba(6, 182, 212, 0.7)',
          borderColor: 'rgba(6, 182, 212, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    };
  }, [filteredRecords]);

  const warningTrendData = useMemo(() => {
    const labels = filteredRecords.map((r) => `#${r.ringNumber}`);
    return {
      labels,
      datasets: [
        {
          label: '告警次数',
          data: filteredRecords.map((r) => r.warningCount),
          backgroundColor: filteredRecords.map((r) =>
            r.hasWarning ? 'rgba(239, 68, 68, 0.8)' : 'rgba(75, 85, 99, 0.4)'
          ),
          borderColor: filteredRecords.map((r) =>
            r.hasWarning ? 'rgba(239, 68, 68, 1)' : 'rgba(75, 85, 99, 0.6)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [filteredRecords]);

  const stratumChartData = useMemo(() => {
    const dist: Record<StratumType, number> = { clay: 0, sand: 0, rock: 0 };
    for (const record of filteredRecords) {
      dist.clay += record.stratumDistribution.clay;
      dist.sand += record.stratumDistribution.sand;
      dist.rock += record.stratumDistribution.rock;
    }
    const total = dist.clay + dist.sand + dist.rock;
    return {
      labels: ['粘土层', '砂层', '岩层'],
      datasets: [
        {
          data: total > 0 ? [
            (dist.clay / total) * 100,
            (dist.sand / total) * 100,
            (dist.rock / total) * 100,
          ] : [0, 0, 0],
          backgroundColor: ['#92400E', '#D97706', '#6B7280'],
          borderWidth: 2,
          borderColor: '#1F2937',
        },
      ],
    };
  }, [filteredRecords]);

  const shiftEfficiencyData = useMemo(() => {
    const shiftKeys = Object.keys(groupedByShift).sort();
    return {
      labels: shiftKeys.map((k) => {
        const [date, shift] = k.split('_');
        return `${date.slice(5)} ${SHIFT_NAMES[shift as ShiftType]}`;
      }),
      datasets: [
        {
          label: '平均掘进效率 (%)',
          data: shiftKeys.map((k) => {
            const s = calculateSummary(groupedByShift[k]);
            return s.avgExcavationEfficiency;
          }),
          backgroundColor: shiftKeys.map((k) => {
            const [, shift] = k.split('_');
            return SHIFT_COLORS[shift as ShiftType] + 'B3';
          }),
          borderColor: shiftKeys.map((k) => {
            const [, shift] = k.split('_');
            return SHIFT_COLORS[shift as ShiftType];
          }),
          borderWidth: 1,
        },
      ],
    };
  }, [groupedByShift]);

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9CA3AF', font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: '#374151',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        ticks: { color: '#9CA3AF', font: { size: 9 }, maxRotation: 45 },
      },
    },
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-pink-400" />
          施工日报
        </h2>
        <button
          onClick={handleExportReport}
          disabled={filteredRecords.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filteredRecords.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-pink-600 hover:bg-pink-500 text-white hover:scale-105 active:scale-95'
          }`}
        >
          <Download className="w-4 h-4" />
          导出报告
        </button>
      </div>

      {ringRecords.length === 0 ? (
        <div className="h-40 flex items-center justify-center bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 text-sm">暂无施工数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  环号范围:
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxRing}
                  value={effectiveStartRing}
                  onChange={(e) => setStartRing(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm text-center"
                />
                <span className="text-gray-500">—</span>
                <input
                  type="number"
                  min={1}
                  max={maxRing}
                  placeholder={String(maxRing)}
                  value={endRing === 0 ? '' : endRing}
                  onChange={(e) => setEndRing(e.target.value ? Number(e.target.value) : 0)}
                  className="w-16 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm text-center"
                />
              </div>

              <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
                <button
                  onClick={() => setGroupMode('ring')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    groupMode === 'ring'
                      ? 'bg-pink-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <BarChart2 className="w-3 h-3" />
                  按环
                </button>
                <button
                  onClick={() => setGroupMode('shift')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    groupMode === 'shift'
                      ? 'bg-pink-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  按班次
                </button>
                <button
                  onClick={() => setGroupMode('date')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    groupMode === 'date'
                      ? 'bg-pink-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  按日期
                </button>
              </div>

              <div className="flex-1" />

              <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWarnings}
                  onChange={(e) => setShowWarnings(e.target.checked)}
                  className="accent-red-500"
                />
                显示告警详情
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-lg p-3 border border-blue-700/30">
              <p className="text-xs text-blue-300 mb-1">完成环数</p>
              <p className="text-xl font-bold text-white font-mono">
                {summary.totalRings}
                <span className="text-xs text-blue-400 ml-1">环</span>
              </p>
              <p className="text-[10px] text-blue-400/70">
                {summary.totalMileage.toFixed(1)} 米
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-lg p-3 border border-green-700/30">
              <p className="text-xs text-green-300 mb-1">平均掘进效率</p>
              <p className="text-xl font-bold text-green-400 font-mono">
                {summary.avgExcavationEfficiency.toFixed(1)}
                <span className="text-xs text-green-400/70 ml-1">%</span>
              </p>
              <p className="text-[10px] text-green-400/70">
                总耗时 {(summary.totalExcavationTime + summary.totalAssemblyTime).toFixed(0)}s
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-lg p-3 border border-amber-700/30">
              <p className="text-xs text-amber-300 mb-1">平均推力 / 扭矩</p>
              <p className="text-lg font-bold text-amber-400 font-mono">
                {summary.avgThrust.toFixed(0)}
                <span className="text-[10px] text-amber-300 ml-1">kN</span>
              </p>
              <p className="text-lg font-bold text-red-400 font-mono">
                {summary.avgTorque.toFixed(0)}
                <span className="text-[10px] text-red-300 ml-1">kN·m</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-lg p-3 border border-red-700/30">
              <p className="text-xs text-red-300 mb-1">告警情况</p>
              <p className="text-xl font-bold text-red-400 font-mono">
                {summary.ringsWithWarnings}
                <span className="text-xs text-red-300 ml-1">/ {summary.totalRings} 环</span>
              </p>
              <p className="text-[10px] text-red-400/70">
                共 {summary.totalWarnings} 次超限
              </p>
            </div>
          </div>

          {filteredRecords.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  掘进效率与拼装耗时趋势
                </p>
                <div className="h-44">
                  <Line
                    data={trendChartData}
                    options={{
                      ...commonChartOptions,
                      scales: {
                        ...commonChartOptions.scales,
                        y: {
                          position: 'left' as const,
                          grid: { color: 'rgba(75, 85, 99, 0.3)' },
                          ticks: { color: '#10B981', font: { size: 10 } },
                          title: { display: true, text: '效率 (%)', color: '#10B981', font: { size: 10 } },
                        },
                        y1: {
                          position: 'right' as const,
                          grid: { drawOnChartArea: false },
                          ticks: { color: '#06B6D4', font: { size: 10 } },
                          title: { display: true, text: '拼装 (s)', color: '#06B6D4', font: { size: 10 } },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  每环告警次数分布
                </p>
                <div className="h-44">
                  <Bar data={warningTrendData} options={{
                    ...commonChartOptions,
                    scales: {
                      ...commonChartOptions.scales,
                      y: {
                        grid: { color: 'rgba(75, 85, 99, 0.3)' },
                        ticks: { color: '#EF4444', font: { size: 10 }, stepSize: 1 },
                        title: { display: true, text: '次数', color: '#EF4444', font: { size: 10 } },
                      },
                    },
                  }} />
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <PieChart className="w-3 h-3" />
                  地层占比汇总
                </p>
                <div className="h-44 flex items-center justify-center">
                  <Doughnut
                    data={stratumChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right' as const,
                          labels: { color: '#9CA3AF', font: { size: 11 } },
                        },
                        tooltip: {
                          backgroundColor: 'rgba(17, 24, 39, 0.9)',
                          callbacks: {
                            label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {Object.keys(groupedByShift).length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    各班次掘进效率对比
                  </p>
                  <div className="h-44">
                    <Bar data={shiftEfficiencyData} options={{
                      ...commonChartOptions,
                      scales: {
                        ...commonChartOptions.scales,
                        y: {
                          grid: { color: 'rgba(75, 85, 99, 0.3)' },
                          ticks: { color: '#9CA3AF', font: { size: 10 } },
                          title: { display: true, text: '效率 (%)', color: '#9CA3AF', font: { size: 10 } },
                        },
                      },
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {groupMode === 'ring' && filteredRecords.map((record) => (
              <RingDetailCard
                key={record.ringNumber}
                record={record}
                expanded={expandedRings.has(record.ringNumber)}
                showWarnings={showWarnings}
                onToggle={() => toggleRingExpand(record.ringNumber)}
              />
            ))}

            {groupMode === 'shift' && Object.entries(groupedByShift)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, records]) => {
                const [dateKey, shiftType] = key.split('_');
                const shift = shiftType as ShiftType;
                const groupSummary = calculateSummary(records);
                const expanded = expandedGroups.has(key);
                return (
                  <div key={key} className="bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden">
                    <div
                      className="p-3 cursor-pointer flex items-center gap-3"
                      onClick={() => toggleGroupExpand(key)}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: SHIFT_COLORS[shift] + '33', borderColor: SHIFT_COLORS[shift] + '80' }}
                      >
                        <Users className="w-5 h-5" style={{ color: SHIFT_COLORS[shift] }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{dateKey}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: SHIFT_COLORS[shift] + '33', color: SHIFT_COLORS[shift] }}
                          >
                            {SHIFT_NAMES[shift]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {records.length} 环 · 效率 {groupSummary.avgExcavationEfficiency.toFixed(1)}% · {groupSummary.totalWarnings} 次告警
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center text-xs mr-3">
                        <div>
                          <p className="text-gray-500">平均推力</p>
                          <p className="text-yellow-400 font-mono font-bold">{groupSummary.avgThrust.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">平均扭矩</p>
                          <p className="text-red-400 font-mono font-bold">{groupSummary.avgTorque.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">平均速度</p>
                          <p className="text-cyan-400 font-mono font-bold">{groupSummary.avgSpeed.toFixed(1)}</p>
                        </div>
                      </div>
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    {expanded && (
                      <div className="border-t border-gray-700/50 p-2 space-y-2">
                        {records.map((r) => (
                          <RingDetailCard
                            key={r.ringNumber}
                            record={r}
                            expanded={expandedRings.has(r.ringNumber)}
                            showWarnings={showWarnings}
                            onToggle={() => toggleRingExpand(r.ringNumber)}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {groupMode === 'date' && Object.entries(groupedByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateKey, records]) => {
                const groupSummary = calculateSummary(records);
                const expanded = expandedGroups.has(dateKey);

                const shiftBreakdown = SHIFT_CONFIGS.map((sc) => {
                  const shiftRecords = records.filter((r) => r.shift === sc.type);
                  return {
                    ...sc,
                    count: shiftRecords.length,
                    summary: shiftRecords.length > 0 ? calculateSummary(shiftRecords) : null,
                  };
                });

                return (
                  <div key={dateKey} className="bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden">
                    <div
                      className="p-3 cursor-pointer flex items-center gap-3"
                      onClick={() => toggleGroupExpand(dateKey)}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-900/40 border border-pink-700/50">
                        <Calendar className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-bold">{dateKey}</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {records.length} 环 · 效率 {groupSummary.avgExcavationEfficiency.toFixed(1)}% · 里程 {(records.length * RING_LENGTH).toFixed(1)}m
                        </p>
                      </div>
                      <div className="flex gap-1 mr-2">
                        {shiftBreakdown.map((sb) => (
                          sb.count > 0 && (
                            <div
                              key={sb.type}
                              className="px-2 py-0.5 rounded text-[10px] font-medium"
                              style={{ backgroundColor: SHIFT_COLORS[sb.type] + '33', color: SHIFT_COLORS[sb.type] }}
                            >
                              {SHIFT_NAMES[sb.type]} {sb.count}环
                            </div>
                          )
                        ))}
                      </div>
                      <div className="text-center mr-2">
                        <p className="text-[10px] text-gray-500">告警</p>
                        <p className={`font-mono font-bold ${groupSummary.totalWarnings > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                          {groupSummary.totalWarnings}
                        </p>
                      </div>
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    {expanded && (
                      <div className="border-t border-gray-700/50 p-2 space-y-2">
                        {records.map((r) => (
                          <RingDetailCard
                            key={r.ringNumber}
                            record={r}
                            expanded={expandedRings.has(r.ringNumber)}
                            showWarnings={showWarnings}
                            onToggle={() => toggleRingExpand(r.ringNumber)}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function calculateSummary(records: RingRecord[]): DailyReportSummary {
  if (records.length === 0) {
    return {
      totalRings: 0,
      totalMileage: 0,
      totalExcavationTime: 0,
      totalAssemblyTime: 0,
      avgSpeed: 0,
      avgThrust: 0,
      avgTorque: 0,
      peakThrust: 0,
      peakTorque: 0,
      totalWarnings: 0,
      ringsWithWarnings: 0,
      avgExcavationEfficiency: 0,
    };
  }

  const totalRings = records.length;
  const totalMileage = totalRings * RING_LENGTH;
  const totalExcavationTime = records.reduce((s, r) => s + r.excavationTime, 0);
  const totalAssemblyTime = records.reduce((s, r) => s + r.assemblyTime, 0);
  const avgSpeed = records.reduce((s, r) => s + r.averageSpeed, 0) / totalRings;
  const avgThrust = records.reduce((s, r) => s + r.averageThrust, 0) / totalRings;
  const avgTorque = records.reduce((s, r) => s + r.averageTorque, 0) / totalRings;
  const peakThrust = Math.max(...records.map((r) => r.peakThrust));
  const peakTorque = Math.max(...records.map((r) => r.peakTorque));
  const totalWarnings = records.reduce((s, r) => s + r.warningCount, 0);
  const ringsWithWarnings = records.filter((r) => r.hasWarning).length;
  const avgExcavationEfficiency = records.reduce((s, r) => s + r.excavationEfficiency, 0) / totalRings;

  return {
    totalRings,
    totalMileage,
    totalExcavationTime,
    totalAssemblyTime,
    avgSpeed,
    avgThrust,
    avgTorque,
    peakThrust,
    peakTorque,
    totalWarnings,
    ringsWithWarnings,
    avgExcavationEfficiency,
  };
}

function RingDetailCard({
  record,
  expanded,
  showWarnings,
  onToggle,
  compact = false,
}: {
  record: RingRecord;
  expanded: boolean;
  showWarnings: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-all ${compact ? '' : ''}`}>
      <div
        className={`cursor-pointer flex items-center gap-3 ${compact ? 'p-2' : 'p-3'}`}
        onClick={onToggle}
      >
        <div
          className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg flex items-center justify-center ${
            record.hasWarning
              ? 'bg-red-900/50 border border-red-700/50'
              : 'bg-blue-900/50 border border-blue-700/50'
          }`}
        >
          <span
            className={`font-bold ${compact ? 'text-[10px]' : 'text-sm'} ${
              record.hasWarning ? 'text-red-400' : 'text-blue-400'
            }`}
          >
            #{record.ringNumber}
          </span>
        </div>

        <div className="flex-1 grid grid-cols-4 gap-2 text-center">
          <div>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-gray-500`}>地层</p>
            <div className="flex items-center justify-center gap-1">
              <Layers className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-400`} />
              <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-white`}>{STRATUM_NAMES[record.stratum]}</span>
            </div>
          </div>
          <div>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-gray-500`}>推力</p>
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-yellow-400 font-mono`}>
              {record.averageThrust.toFixed(0)}
            </p>
          </div>
          <div>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-gray-500`}>扭矩</p>
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-red-400 font-mono`}>
              {record.averageTorque.toFixed(0)}
            </p>
          </div>
          <div>
            <p className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-gray-500`}>效率</p>
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-green-400 font-mono`}>
              {record.excavationEfficiency.toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {record.hasWarning && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-900/50 border border-red-700/50 rounded text-[10px] text-red-400">
              <AlertTriangle className="w-3 h-3" />
              {record.warningCount}
            </span>
          )}
          <span
            className="px-1.5 py-0.5 rounded text-[9px]"
            style={{ backgroundColor: SHIFT_COLORS[record.shift] + '33', color: SHIFT_COLORS[record.shift] }}
          >
            {SHIFT_NAMES[record.shift]}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className={`px-3 pb-3 border-t border-gray-700/50 pt-3 space-y-3 ${compact ? 'px-2' : ''}`}>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Gauge className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-gray-500">速度 (mm/min)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-white font-mono">
                  {record.averageSpeed.toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-500">
                  峰 {record.peakSpeed.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-gray-500">推力 (千牛)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-yellow-400 font-mono">
                  {record.averageThrust.toFixed(0)}
                </span>
                <span className="text-[10px] text-gray-500">
                  峰 {record.peakThrust.toFixed(0)}
                </span>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <RotateCw className="w-3 h-3 text-red-400" />
                <span className="text-[10px] text-gray-500">扭矩 (千牛·米)</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-red-400 font-mono">
                  {record.averageTorque.toFixed(0)}
                </span>
                <span className="text-[10px] text-gray-500">
                  峰 {record.peakTorque.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-gray-500">掘进时长</span>
              </div>
              <p className="text-sm text-green-400 font-mono">
                {record.excavationTime.toFixed(1)} 秒
              </p>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-gray-500">拼装时长</span>
              </div>
              <p className="text-sm text-cyan-400 font-mono">
                {record.assemblyTime.toFixed(1)} 秒
              </p>
            </div>
          </div>

          {showWarnings && record.warningEvents.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-2">
              <p className="text-xs text-red-300 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                告警记录 ({record.warningEvents.length} 次)
              </p>
              <div className="space-y-1">
                {record.warningEvents.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between text-xs bg-red-950/40 rounded px-2 py-1"
                  >
                    <span className="text-red-300">
                      {w.type === 'thrust' ? '推力超限' : '扭矩超限'}
                    </span>
                    <span className="text-red-400 font-mono">
                      峰值 {w.peakValue.toFixed(0)} / 阈值 {w.threshold.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
