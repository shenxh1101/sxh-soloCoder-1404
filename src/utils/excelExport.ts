import * as XLSX from 'xlsx';
import { RingRecord, DailyReportSummary } from '../types';
import { STRATUM_NAMES, RING_LENGTH } from './constants';

export function exportConstructionLogToExcel(records: RingRecord[]): void {
  const data = records.map((record) => ({
    '环号': record.ringNumber,
    '开始时间': formatDateTime(record.startTime),
    '结束时间': formatDateTime(record.endTime),
    '掘进时长(分钟)': (record.excavationTime / 60).toFixed(2),
    '拼装时长(秒)': record.assemblyTime.toFixed(1),
    '平均推进速度(mm/min)': record.averageSpeed.toFixed(1),
    '峰值推进速度(mm/min)': record.peakSpeed.toFixed(1),
    '平均推力(千牛)': record.averageThrust.toFixed(0),
    '峰值推力(千牛)': record.peakThrust.toFixed(0),
    '最小推力(千牛)': record.minThrust.toFixed(0),
    '平均扭矩(千牛·米)': record.averageTorque.toFixed(0),
    '峰值扭矩(千牛·米)': record.peakTorque.toFixed(0),
    '最小扭矩(千牛·米)': record.minTorque.toFixed(0),
    '主要地层': STRATUM_NAMES[record.stratum] || record.stratum,
    '粘土层占比(%)': (record.stratumDistribution.clay * 100).toFixed(0),
    '砂层占比(%)': (record.stratumDistribution.sand * 100).toFixed(0),
    '岩层占比(%)': (record.stratumDistribution.rock * 100).toFixed(0),
    '是否有预警': record.hasWarning ? '是' : '否',
    '预警次数': record.warningCount,
    '预警详情': record.warningEvents
      .map(
        (w) =>
          `${w.type === 'thrust' ? '推力' : '扭矩'}超限(峰值:${w.peakValue.toFixed(
            0
          )}/阈值:${w.threshold.toFixed(0)})`
      )
      .join('; '),
  }));

  const warningData = records.flatMap((record) =>
    record.warningEvents.map((w) => ({
      '所属环号': record.ringNumber,
      '告警ID': w.id,
      '告警类型': w.type === 'thrust' ? '推力超限' : '扭矩超限',
      '开始时间': formatDateTime(w.startTime),
      '结束时间': w.endTime ? formatDateTime(w.endTime) : '未结束',
      '峰值数值': w.peakValue.toFixed(0),
      '设定阈值': w.threshold.toFixed(0),
      '告警描述': w.message,
      '是否已恢复': w.resolved ? '是' : '否',
    }))
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 50 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '施工日志');

  if (warningData.length > 0) {
    const wsWarnings = XLSX.utils.json_to_sheet(warningData);
    wsWarnings['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 40 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsWarnings, '告警记录');
  }

  XLSX.writeFile(wb, `盾构施工日志_${formatDateForFilename()}.xlsx`);
}

export function exportDailyReportToExcel(
  records: RingRecord[],
  summary: DailyReportSummary,
  startRing: number,
  endRing: number
): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    { '项目': '统计范围', '数值': `第 ${startRing} 环 — 第 ${endRing} 环` },
    { '项目': '完成环数', '数值': `${summary.totalRings} 环` },
    { '项目': '掘进总里程', '数值': `${summary.totalMileage.toFixed(1)} 米` },
    { '项目': '总掘进时长', '数值': `${(summary.totalExcavationTime / 60).toFixed(2)} 分钟` },
    { '项目': '总拼装时长', '数值': `${(summary.totalAssemblyTime / 60).toFixed(2)} 分钟` },
    { '项目': '平均推进速度', '数值': `${summary.avgSpeed.toFixed(1)} mm/min` },
    { '项目': '平均推力', '数值': `${summary.avgThrust.toFixed(0)} 千牛` },
    { '项目': '峰值推力', '数值': `${summary.peakThrust.toFixed(0)} 千牛` },
    { '项目': '平均扭矩', '数值': `${summary.avgTorque.toFixed(0)} 千牛·米` },
    { '项目': '峰值扭矩', '数值': `${summary.peakTorque.toFixed(0)} 千牛·米` },
    { '项目': '出现预警的环数', '数值': `${summary.ringsWithWarnings} 环` },
    { '项目': '总预警次数', '数值': `${summary.totalWarnings} 次` },
    { '项目': '导出时间', '数值': formatDateTime(new Date()) },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

  const detailData = records.map((record) => ({
    '环号': record.ringNumber,
    '开始时间': formatDateTime(record.startTime),
    '结束时间': formatDateTime(record.endTime),
    '掘进时长(分钟)': (record.excavationTime / 60).toFixed(2),
    '拼装时长(秒)': record.assemblyTime.toFixed(1),
    '平均速度(mm/min)': record.averageSpeed.toFixed(1),
    '峰值速度(mm/min)': record.peakSpeed.toFixed(1),
    '平均推力(千牛)': record.averageThrust.toFixed(0),
    '峰值推力(千牛)': record.peakThrust.toFixed(0),
    '最小推力(千牛)': record.minThrust.toFixed(0),
    '平均扭矩(千牛·米)': record.averageTorque.toFixed(0),
    '峰值扭矩(千牛·米)': record.peakTorque.toFixed(0),
    '最小扭矩(千牛·米)': record.minTorque.toFixed(0),
    '主要地层': STRATUM_NAMES[record.stratum] || record.stratum,
    '粘土层占比(%)': (record.stratumDistribution.clay * 100).toFixed(0),
    '砂层占比(%)': (record.stratumDistribution.sand * 100).toFixed(0),
    '岩层占比(%)': (record.stratumDistribution.rock * 100).toFixed(0),
    '是否有预警': record.hasWarning ? '是' : '否',
    '预警次数': record.warningCount,
  }));
  const wsDetail = XLSX.utils.json_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, '每环详情');

  const chartData = records.map((record) => ({
    '环号': `#${record.ringNumber}`,
    '平均推力(千牛)': Number(record.averageThrust.toFixed(0)),
    '峰值推力(千牛)': Number(record.peakThrust.toFixed(0)),
    '平均扭矩(千牛·米)': Number(record.averageTorque.toFixed(0)),
    '峰值扭矩(千牛·米)': Number(record.peakTorque.toFixed(0)),
    '平均速度(mm/min)': Number(record.averageSpeed.toFixed(1)),
    '拼装时长(秒)': Number(record.assemblyTime.toFixed(1)),
  }));
  const wsChart = XLSX.utils.json_to_sheet(chartData);
  wsChart['!cols'] = [
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsChart, '图表数据');

  if (summary.totalWarnings > 0) {
    const warningData = records.flatMap((record) =>
      record.warningEvents.map((w) => ({
        '所属环号': record.ringNumber,
        '告警类型': w.type === 'thrust' ? '推力超限' : '扭矩超限',
        '开始时间': formatDateTime(w.startTime),
        '结束时间': w.endTime ? formatDateTime(w.endTime) : '未结束',
        '峰值数值': w.peakValue.toFixed(0),
        '设定阈值': w.threshold.toFixed(0),
        '超出幅度(%)': (((w.peakValue - w.threshold) / w.threshold) * 100).toFixed(1),
        '告警描述': w.message,
      }))
    );
    const wsWarnings = XLSX.utils.json_to_sheet(warningData);
    wsWarnings['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsWarnings, '告警明细');
  }

  XLSX.writeFile(wb, `盾构施工日报_${startRing}-${endRing}环_${formatDateForFilename()}.xlsx`);
}

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateForFilename(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}
