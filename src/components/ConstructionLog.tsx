import { FileSpreadsheet, Download, Calendar, Gauge, Zap, RotateCw, Clock } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';
import { STRATUM_NAMES } from '../utils/constants';
import { exportConstructionLogToExcel } from '../utils/excelExport';

export function ConstructionLog() {
  const ringRecords = useConstructionStore((state) => state.ringRecords);

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return (diffMs / 60000).toFixed(1);
  };

  const handleExport = () => {
    if (ringRecords.length === 0) return;
    exportConstructionLogToExcel(ringRecords);
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-5 border border-gray-700 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          施工日志
        </h2>
        <button
          onClick={handleExport}
          disabled={ringRecords.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            ringRecords.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95'
          }`}
        >
          <Download className="w-4 h-4" />
          导出Excel
        </button>
      </div>

      {ringRecords.length === 0 ? (
        <div className="h-48 flex items-center justify-center bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 text-sm">暂无施工记录，开始掘进后将自动记录</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {[...ringRecords].reverse().map((record) => (
            <div
              key={record.ringNumber}
              className="bg-gray-800/80 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">
                      #{record.ringNumber}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">第 {record.ringNumber} 环</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {formatDateTime(record.startTime)} - {formatDateTime(record.endTime)}
                      </span>
                      <span className="text-gray-600">|</span>
                      <Clock className="w-3 h-3" />
                      <span>{calculateDuration(record.startTime, record.endTime)} 分钟</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        record.stratum === 'clay'
                          ? '#8B6914'
                          : record.stratum === 'sand'
                          ? '#DAA520'
                          : '#696969',
                    }}
                  />
                  <span className="text-xs text-gray-400">
                    {STRATUM_NAMES[record.stratum]}
                  </span>
                  {record.hasWarning && (
                    <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded">
                      预警
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <Gauge className="w-3 h-3 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">速度</p>
                  <p className="text-sm font-bold text-blue-400 font-mono">
                    {record.averageSpeed.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <Zap className="w-3 h-3 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">推力</p>
                  <p className="text-sm font-bold text-yellow-400 font-mono">
                    {record.averageThrust.toFixed(0)}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <RotateCw className="w-3 h-3 text-red-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">扭矩</p>
                  <p className="text-sm font-bold text-red-400 font-mono">
                    {record.averageTorque.toFixed(0)}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center">
                  <Clock className="w-3 h-3 text-cyan-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">拼装</p>
                  <p className="text-sm font-bold text-cyan-400 font-mono">
                    {record.assemblyTime.toFixed(1)}s
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {ringRecords.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">总掘进环数</p>
            <p className="text-2xl font-bold text-white font-mono">
              {ringRecords.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">总掘进距离</p>
            <p className="text-2xl font-bold text-white font-mono">
              {(ringRecords.length * 1.5).toFixed(1)}
              <span className="text-sm text-gray-500 ml-1">m</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">预警次数</p>
            <p className="text-2xl font-bold text-red-400 font-mono">
              {ringRecords.filter((r) => r.hasWarning).length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
