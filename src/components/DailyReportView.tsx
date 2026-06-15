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
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useConstructionStore } from '../store/useConstructionStore';
import { STRATUM_NAMES, RING_LENGTH } from '../utils/constants';
import { DailyReportSummary, RingRecord } from '../types';
import { exportDailyReportToExcel } from '../utils/excelExport';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function DailyReportView() {
  const ringRecords = useConstructionStore((state) => state.ringRecords);
  const [startRing, setStartRing] = useState(1);
  const [endRing, setEndRing] = useState(0);
  const [expandedRings, setExpandedRings] = useState<Set<number>>(new Set());
  const [showWarnings, setShowWarnings] = useState(true);

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

  const summary: DailyReportSummary = useMemo(() => {
    if (filteredRecords.length === 0) {
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
      };
    }

    const totalRings = filteredRecords.length;
    const totalMileage = totalRings * RING_LENGTH;
    const totalExcavationTime = filteredRecords.reduce((s, r) => s + r.excavationTime, 0);
    const totalAssemblyTime = filteredRecords.reduce((s, r) => s + r.assemblyTime, 0);
    const avgSpeed = filteredRecords.reduce((s, r) => s + r.averageSpeed, 0) / totalRings;
    const avgThrust = filteredRecords.reduce((s, r) => s + r.averageThrust, 0) / totalRings;
    const avgTorque = filteredRecords.reduce((s, r) => s + r.averageTorque, 0) / totalRings;
    const peakThrust = Math.max(...filteredRecords.map((r) => r.peakThrust));
    const peakTorque = Math.max(...filteredRecords.map((r) => r.peakTorque));
    const totalWarnings = filteredRecords.reduce((s, r) => s + r.warningCount, 0);
    const ringsWithWarnings = filteredRecords.filter((r) => r.hasWarning).length;

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
    };
  }, [filteredRecords]);

  const chartData = useMemo(() => {
    const labels = filteredRecords.map((r) => `#${r.ringNumber}`);
    return {
      labels,
      datasets: [
        {
          label: '平均推力 (千牛)',
          data: filteredRecords.map((r) => r.averageThrust),
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: '平均扭矩 (千牛·米)',
          data: filteredRecords.map((r) => r.averageTorque),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    };
  }, [filteredRecords]);

  const chartOptions = {
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
        ticks: { color: '#9CA3AF', font: { size: 9 } },
      },
      y: {
        position: 'left' as const,
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        ticks: { color: '#F59E0B', font: { size: 10 } },
        title: { display: true, text: '推力 (千牛)', color: '#F59E0B', font: { size: 10 } },
      },
      y1: {
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#EF4444', font: { size: 10 } },
        title: { display: true, text: '扭矩 (千牛·米)', color: '#EF4444', font: { size: 10 } },
      },
    },
  };

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

  const handleExportReport = () => {
    exportDailyReportToExcel(filteredRecords, summary, effectiveStartRing, effectiveEndRing);
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">环号范围:</label>
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
            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-lg p-3 border border-yellow-700/30">
              <p className="text-xs text-yellow-300 mb-1">平均推力</p>
              <p className="text-xl font-bold text-yellow-400 font-mono">
                {summary.avgThrust.toFixed(0)}
              </p>
              <p className="text-[10px] text-yellow-400/70">
                峰值: {summary.peakThrust.toFixed(0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 rounded-lg p-3 border border-red-700/30">
              <p className="text-xs text-red-300 mb-1">平均扭矩</p>
              <p className="text-xl font-bold text-red-400 font-mono">
                {summary.avgTorque.toFixed(0)}
              </p>
              <p className="text-[10px] text-red-400/70">
                峰值: {summary.peakTorque.toFixed(0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-lg p-3 border border-purple-700/30">
              <p className="text-xs text-purple-300 mb-1">告警情况</p>
              <p className="text-xl font-bold text-purple-400 font-mono">
                {summary.ringsWithWarnings}
                <span className="text-xs text-purple-300 ml-1">/ {summary.totalRings} 环</span>
              </p>
              <p className="text-[10px] text-purple-400/70">
                共 {summary.totalWarnings} 次超限
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">平均速度</p>
              <p className="text-sm font-bold text-cyan-400 font-mono">
                {summary.avgSpeed.toFixed(1)} mm/min
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">总掘进时长</p>
              <p className="text-sm font-bold text-green-400 font-mono">
                {(summary.totalExcavationTime / 60).toFixed(1)} min
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500">总拼装时长</p>
              <p className="text-sm font-bold text-cyan-400 font-mono">
                {(summary.totalAssemblyTime / 60).toFixed(1)} min
              </p>
            </div>
          </div>

          {filteredRecords.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                参数对比图
              </p>
              <div className="h-48">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {filteredRecords.map((record) => (
              <RingDetailCard
                key={record.ringNumber}
                record={record}
                expanded={expandedRings.has(record.ringNumber)}
                showWarnings={showWarnings}
                onToggle={() => toggleRingExpand(record.ringNumber)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RingDetailCard({
  record,
  expanded,
  showWarnings,
  onToggle,
}: {
  record: RingRecord;
  expanded: boolean;
  showWarnings: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition-all">
      <div
        className="p-3 cursor-pointer flex items-center gap-3"
        onClick={onToggle}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            record.hasWarning
              ? 'bg-red-900/50 border border-red-700/50'
              : 'bg-blue-900/50 border border-blue-700/50'
          }`}
        >
          <span
            className={`font-bold text-sm ${
              record.hasWarning ? 'text-red-400' : 'text-blue-400'
            }`}
          >
            #{record.ringNumber}
          </span>
        </div>

        <div className="flex-1 grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-500">地层</p>
            <div className="flex items-center justify-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-white">{STRATUM_NAMES[record.stratum]}</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">推力</p>
            <p className="text-xs text-yellow-400 font-mono">
              {record.averageThrust.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">扭矩</p>
            <p className="text-xs text-red-400 font-mono">
              {record.averageTorque.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">拼装</p>
            <p className="text-xs text-cyan-400 font-mono">
              {record.assemblyTime.toFixed(1)}s
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
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-700/50 pt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-900/50 rounded p-2">
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
            <div className="bg-gray-900/50 rounded p-2">
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
            <div className="bg-gray-900/50 rounded p-2">
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
            <div className="bg-gray-900/50 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-gray-500">掘进时长</span>
              </div>
              <p className="text-sm text-green-400 font-mono">
                {record.excavationTime.toFixed(1)} 秒
              </p>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
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
