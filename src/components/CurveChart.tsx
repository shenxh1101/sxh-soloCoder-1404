import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { useState, useMemo } from 'react';
import { RING_LENGTH } from '../utils/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ChartType = 'thrust' | 'torque' | 'speed' | 'all';

export function CurveChart() {
  const ringRecords = useConstructionStore((state) => state.ringRecords);
  const playbackMode = useConstructionStore((state) => state.playbackMode);
  const playbackIndex = useConstructionStore((state) => state.playbackIndex);
  const playbackSnapshots = useConstructionStore((state) => state.playbackSnapshots);
  const currentMileage = useConstructionStore((state) => state.currentMileage);
  const [chartType, setChartType] = useState<ChartType>('all');

  const labels = ringRecords.map((r) => `#${r.ringNumber}`);

  const thrustData = ringRecords.map((r) => r.averageThrust);
  const torqueData = ringRecords.map((r) => r.averageTorque);
  const speedData = ringRecords.map((r) => r.averageSpeed);

  const currentHighlightRing = useMemo(() => {
    if (playbackMode !== 'playback' || playbackSnapshots.length === 0) {
      const liveRing = Math.floor(currentMileage / RING_LENGTH);
      return liveRing >= 0 && liveRing < ringRecords.length ? liveRing : null;
    }
    const snapshot = playbackSnapshots[playbackIndex];
    if (!snapshot) return null;
    const ringIdx = snapshot.ringNumber - 1;
    return ringIdx >= 0 && ringIdx < ringRecords.length ? ringIdx : null;
  }, [playbackMode, playbackIndex, playbackSnapshots, ringRecords, currentMileage]);

  const datasets = [];
  const pointBgColors = ringRecords.map((_, i) =>
    i === currentHighlightRing ? '#FBBF24' : undefined
  );
  const pointRadii = ringRecords.map((_, i) =>
    i === currentHighlightRing ? 8 : 3
  );
  const pointBorderWidths = ringRecords.map((_, i) =>
    i === currentHighlightRing ? 3 : 1
  );

  if (chartType === 'all' || chartType === 'thrust') {
    datasets.push({
      label: '平均推力 (千牛)',
      data: thrustData,
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.4,
      yAxisID: 'y',
      pointBackgroundColor: pointBgColors,
      pointRadius: pointRadii,
      pointBorderWidth: pointBorderWidths,
      pointBorderColor: '#fff',
    });
  }

  if (chartType === 'all' || chartType === 'torque') {
    datasets.push({
      label: '平均扭矩 (千牛·米)',
      data: torqueData,
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4,
      yAxisID: 'y1',
      pointBackgroundColor: pointBgColors,
      pointRadius: pointRadii,
      pointBorderWidth: pointBorderWidths,
      pointBorderColor: '#fff',
    });
  }

  if (chartType === 'all' || chartType === 'speed') {
    datasets.push({
      label: '平均速度 (mm/min)',
      data: speedData,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      yAxisID: 'y2',
      pointBackgroundColor: pointBgColors,
      pointRadius: pointRadii,
      pointBorderWidth: pointBorderWidths,
      pointBorderColor: '#fff',
    });
  }

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9CA3AF',
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: currentHighlightRing !== null ? '#FBBF24' : '#374151',
        borderWidth: currentHighlightRing !== null ? 2 : 1,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            size: 10,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: chartType === 'all' || chartType === 'thrust',
        position: 'left' as const,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#F59E0B',
          font: {
            size: 10,
          },
        },
        title: {
          display: true,
          text: '推力 (千牛)',
          color: '#F59E0B',
          font: {
            size: 10,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: chartType === 'all' || chartType === 'torque',
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#EF4444',
          font: {
            size: 10,
          },
        },
        title: {
          display: true,
          text: '扭矩 (千牛·米)',
          color: '#EF4444',
          font: {
            size: 10,
          },
        },
      },
      y2: {
        type: 'linear' as const,
        display: chartType === 'all' || chartType === 'speed',
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#3B82F6',
          font: {
            size: 10,
          },
        },
        title: {
          display: true,
          text: '速度 (mm/min)',
          color: '#3B82F6',
          font: {
            size: 10,
          },
        },
      },
    },
  };

  const chartButtons: { type: ChartType; label: string }[] = [
    { type: 'all', label: '全部' },
    { type: 'thrust', label: '推力' },
    { type: 'torque', label: '扭矩' },
    { type: 'speed', label: '速度' },
  ];

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          掘进参数曲线
          {playbackMode === 'playback' && currentHighlightRing !== null && (
            <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full ml-2">
              回放高亮: #{currentHighlightRing + 1}
            </span>
          )}
        </h2>
        <div className="flex gap-1">
          {chartButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => setChartType(btn.type)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                chartType === btn.type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {ringRecords.length === 0 ? (
        <div className="h-64 flex items-center justify-center bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 text-sm">暂无数据，开始掘进后将显示参数曲线</p>
        </div>
      ) : (
        <div className="h-64">
          <Line data={data} options={options} />
        </div>
      )}

      {ringRecords.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">平均推力</p>
            <p className="text-yellow-400 font-mono font-bold">
              {(thrustData.reduce((a, b) => a + b, 0) / thrustData.length).toFixed(0)}
            </p>
            {currentHighlightRing !== null && (
              <p className="text-[10px] text-yellow-300 mt-1">
                当前: {thrustData[currentHighlightRing]?.toFixed(0) || '-'}
              </p>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">平均扭矩</p>
            <p className="text-red-400 font-mono font-bold">
              {(torqueData.reduce((a, b) => a + b, 0) / torqueData.length).toFixed(0)}
            </p>
            {currentHighlightRing !== null && (
              <p className="text-[10px] text-red-300 mt-1">
                当前: {torqueData[currentHighlightRing]?.toFixed(0) || '-'}
              </p>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">平均速度</p>
            <p className="text-blue-400 font-mono font-bold">
              {(speedData.reduce((a, b) => a + b, 0) / speedData.length).toFixed(1)}
            </p>
            {currentHighlightRing !== null && (
              <p className="text-[10px] text-blue-300 mt-1">
                当前: {speedData[currentHighlightRing]?.toFixed(1) || '-'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
