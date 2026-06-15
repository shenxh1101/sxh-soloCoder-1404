import * as XLSX from 'xlsx';
import { RingRecord, DailyReportSummary, BookmarkNode, WarningEvent, BookmarkType, ShiftType } from '../types';
import { STRATUM_NAMES, RING_LENGTH } from './constants';

const SHIFT_COLORS: Record<ShiftType, string> = {
  morning: '#F59E0B',
  afternoon: '#3B82F6',
  night: '#8B5CF6',
};
const SHIFT_NAMES: Record<ShiftType, string> = {
  morning: '早班',
  afternoon: '中班',
  night: '夜班',
};

const BOOKMARK_TYPE_NAMES: Record<BookmarkType, string> = {
  stratum_enter: '地层变化',
  warning_trigger: '超限告警',
  assembly_start: '开始拼装',
  assembly_end: '拼装完成',
  excavation_resume: '恢复掘进',
  mileage_milestone: '里程突破',
};

export function exportConstructionLogToExcel(records: RingRecord[]): void {
  const data = records.map((record) => ({
    '环号': record.ringNumber,
    '日期': record.dateKey,
    '班次': getShiftName(record.shift),
    '开始时间': formatDateTime(record.startTime),
    '结束时间': formatDateTime(record.endTime),
    '掘进时长(分钟)': (record.excavationTime / 60).toFixed(2),
    '拼装时长(秒)': record.assemblyTime.toFixed(1),
    '掘进效率(%)': record.excavationEfficiency.toFixed(1),
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
      '超出幅度(%)': (((w.peakValue - w.threshold) / w.threshold) * 100).toFixed(1),
      '告警描述': w.message,
      '是否已恢复': w.resolved ? '是' : '否',
    }))
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 20 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 50 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '施工日志');

  if (warningData.length > 0) {
    const wsWarnings = XLSX.utils.json_to_sheet(warningData);
    wsWarnings['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsWarnings, '告警记录');
  }

  XLSX.writeFile(wb, `盾构施工日志_${formatDateForFilename()}.xlsx`);
}

export function exportDailyReportToExcel(
  records: RingRecord[],
  summary: DailyReportSummary,
  bookmarks: BookmarkNode[],
  allWarnings: WarningEvent[],
  startRing: number,
  endRing: number,
  teamReview?: { dateKey: string; shifts: Record<ShiftType, { records: RingRecord[]; summary: DailyReportSummary }> }[]
): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    { '项目': '报告标题', '数值': '盾构施工日报' },
    { '项目': '统计范围', '数值': `第 ${startRing} 环 — 第 ${endRing} 环` },
    { '项目': '导出时间', '数值': formatDateTime(new Date()) },
    { '项目': '', '数值': '' },
    { '项目': '完成环数', '数值': `${summary.totalRings} 环` },
    { '项目': '掘进总里程', '数值': `${summary.totalMileage.toFixed(1)} 米` },
    { '项目': '总掘进时长', '数值': `${(summary.totalExcavationTime / 60).toFixed(2)} 分钟` },
    { '项目': '总拼装时长', '数值': `${(summary.totalAssemblyTime / 60).toFixed(2)} 分钟` },
    { '项目': '平均掘进效率', '数值': `${summary.avgExcavationEfficiency.toFixed(1)} %` },
    { '项目': '', '数值': '' },
    { '项目': '平均推进速度', '数值': `${summary.avgSpeed.toFixed(1)} mm/min` },
    { '项目': '平均推力', '数值': `${summary.avgThrust.toFixed(0)} 千牛` },
    { '项目': '峰值推力', '数值': `${summary.peakThrust.toFixed(0)} 千牛` },
    { '项目': '平均扭矩', '数值': `${summary.avgTorque.toFixed(0)} 千牛·米` },
    { '项目': '峰值扭矩', '数值': `${summary.peakTorque.toFixed(0)} 千牛·米` },
    { '项目': '', '数值': '' },
    { '项目': '出现预警的环数', '数值': `${summary.ringsWithWarnings} 环` },
    { '项目': '总预警次数', '数值': `${summary.totalWarnings} 次` },
    { '项目': '预警环占比', '数值': `${summary.totalRings > 0 ? ((summary.ringsWithWarnings / summary.totalRings) * 100).toFixed(1) : 0} %` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 40 }];
  wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

  const filteredBookmarks = bookmarks.filter(
    (b) => b.ringNumber >= startRing && b.ringNumber <= endRing
  );
  if (filteredBookmarks.length > 0) {
    const bookmarkData = filteredBookmarks
      .sort((a, b) => a.snapshotIndex - b.snapshotIndex)
      .map((b, idx) => ({
        '序号': idx + 1,
        '节点类型': BOOKMARK_TYPE_NAMES[b.type] || b.type,
        '图标': b.icon,
        '标题': b.title,
        '描述': b.description,
        '所属环号': b.ringNumber,
        '对应里程(m)': b.mileage.toFixed(2),
        '发生时间': formatDateTime(b.timestamp),
        '快照索引': b.snapshotIndex,
      }));
    const wsBookmarks = XLSX.utils.json_to_sheet(bookmarkData);
    wsBookmarks['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 40 },
      { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsBookmarks, '关键节点摘要');
  }

  const warningSummary = generateWarningSummary(records, allWarnings, startRing, endRing);
  if (warningSummary.length > 0) {
    const wsWarnSummary = XLSX.utils.json_to_sheet(warningSummary);
    wsWarnSummary['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsWarnSummary, '告警摘要');
  }

  const detailData = records.map((record) => ({
    '环号': record.ringNumber,
    '日期': record.dateKey,
    '班次': getShiftName(record.shift),
    '开始时间': formatDateTime(record.startTime),
    '结束时间': formatDateTime(record.endTime),
    '掘进时长(分钟)': (record.excavationTime / 60).toFixed(2),
    '拼装时长(秒)': record.assemblyTime.toFixed(1),
    '掘进效率(%)': record.excavationEfficiency.toFixed(1),
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
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 20 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, '每环详情');

  const chartData = records.map((record) => ({
    '环号': `#${record.ringNumber}`,
    '日期': record.dateKey,
    '班次': getShiftName(record.shift),
    '平均推力(千牛)': Number(record.averageThrust.toFixed(0)),
    '峰值推力(千牛)': Number(record.peakThrust.toFixed(0)),
    '平均扭矩(千牛·米)': Number(record.averageTorque.toFixed(0)),
    '峰值扭矩(千牛·米)': Number(record.peakTorque.toFixed(0)),
    '平均速度(mm/min)': Number(record.averageSpeed.toFixed(1)),
    '拼装时长(秒)': Number(record.assemblyTime.toFixed(1)),
    '掘进效率(%)': Number(record.excavationEfficiency.toFixed(1)),
    '预警次数': record.warningCount,
  }));
  const wsChart = XLSX.utils.json_to_sheet(chartData);
  wsChart['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 16 },
    { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsChart, '趋势图数据');

  const shiftAggData = generateShiftAggregation(records);
  if (shiftAggData.length > 0) {
    const wsShift = XLSX.utils.json_to_sheet(shiftAggData);
    wsShift['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsShift, '班次聚合');
  }

  if (summary.totalWarnings > 0) {
    const warningData = records.flatMap((record) =>
      record.warningEvents.map((w) => ({
        '所属环号': record.ringNumber,
        '日期': record.dateKey,
        '班次': getShiftName(record.shift),
        '告警类型': w.type === 'thrust' ? '推力超限' : '扭矩超限',
        '开始时间': formatDateTime(w.startTime),
        '结束时间': w.endTime ? formatDateTime(w.endTime) : '未结束',
        '峰值数值': w.peakValue.toFixed(0),
        '设定阈值': w.threshold.toFixed(0),
        '超出幅度(%)': (((w.peakValue - w.threshold) / w.threshold) * 100).toFixed(1),
        '持续时长(秒)': w.endTime ? ((w.endTime.getTime() - w.startTime.getTime()) / 1000).toFixed(1) : '-',
        '告警描述': w.message,
      }))
    );
    const wsWarnings = XLSX.utils.json_to_sheet(warningData);
    wsWarnings['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsWarnings, '告警明细');
  }

  if (teamReview && teamReview.length > 0) {
    const teamReviewData: any[] = [];
    let idx = 1;
    for (const day of teamReview) {
      const shiftTypes = Object.keys(day.shifts) as ShiftType[];
      for (const st of shiftTypes) {
        const s = day.shifts[st].summary;
        teamReviewData.push({
          '序号': idx++,
          '日期': day.dateKey,
          '班次': SHIFT_NAMES[st],
          '完成环数': s.totalRings,
          '掘进里程(m)': s.totalMileage.toFixed(1),
          '平均效率(%)': s.avgExcavationEfficiency.toFixed(1),
          '平均速度(mm/min)': s.avgSpeed.toFixed(1),
          '平均推力(kN)': s.avgThrust.toFixed(0),
          '平均扭矩(kN·m)': s.avgTorque.toFixed(0),
          '拼装总时长(分钟)': (s.totalAssemblyTime / 60).toFixed(2),
          '告警次数': s.totalWarnings,
          '告警环数': s.ringsWithWarnings,
        });
      }
    }
    if (teamReviewData.length > 0) {
      const wsTeam = XLSX.utils.json_to_sheet(teamReviewData);
      wsTeam['!cols'] = [
        { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 14 },
        { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
        { wch: 10 }, { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, wsTeam, '班组对照');
    }
  }

  XLSX.writeFile(wb, `盾构施工日报_${startRing}-${endRing}环_${formatDateForFilename()}.xlsx`);
}

function generateWarningSummary(
  records: RingRecord[],
  _allWarnings: WarningEvent[],
  _startRing: number,
  _endRing: number
): any[] {
  const result: any[] = [];
  let idx = 1;
  for (const record of records) {
    if (record.warningEvents.length === 0) continue;
    for (const w of record.warningEvents) {
      const duration = w.endTime
        ? ((w.endTime.getTime() - w.startTime.getTime()) / 1000).toFixed(1)
        : '-';
      result.push({
        '序号': idx++,
        '告警类型': w.type === 'thrust' ? '推力超限' : '扭矩超限',
        '环号': record.ringNumber,
        '峰值': w.peakValue.toFixed(0),
        '阈值': w.threshold.toFixed(0),
        '超幅(%)': (((w.peakValue - w.threshold) / w.threshold) * 100).toFixed(1),
        '开始时间': formatDateTime(w.startTime),
        '结束时间': w.endTime ? formatDateTime(w.endTime) : '未结束',
        '持续时长(秒)': duration,
      });
    }
  }
  if (result.length > 0) {
    const thrustCount = result.filter((r) => r['告警类型'] === '推力超限').length;
    const torqueCount = result.filter((r) => r['告警类型'] === '扭矩超限').length;
    result.unshift(
      { '序号': '', '告警类型': '【统计】', '环号': '', '峰值': '', '阈值': '', '超幅(%)': '', '开始时间': `推力超限共 ${thrustCount} 次`, '结束时间': `扭矩超限共 ${torqueCount} 次`, '持续时长(秒)': `合计 ${result.length} 次` }
    );
  }
  return result;
}

function generateShiftAggregation(records: RingRecord[]): any[] {
  const groups: Record<string, RingRecord[]> = {};
  for (const record of records) {
    const key = `${record.dateKey}_${record.shift}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(record);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, recs]) => {
      const [dateKey, shiftType] = key.split('_');
      const totalExcavation = recs.reduce((s, r) => s + r.excavationTime, 0);
      const totalAssembly = recs.reduce((s, r) => s + r.assemblyTime, 0);
      const totalTime = totalExcavation + totalAssembly;
      const efficiency = totalTime > 0 ? (totalExcavation / totalTime) * 100 : 0;
      const warningRings = recs.filter((r) => r.hasWarning).length;
      const totalWarnings = recs.reduce((s, r) => s + r.warningCount, 0);

      return {
        '日期': dateKey,
        '班次': getShiftName(shiftType as any),
        '完成环数': recs.length,
        '掘进里程(m)': (recs.length * RING_LENGTH).toFixed(1),
        '平均效率(%)': efficiency.toFixed(1),
        '平均推力(kN)': (recs.reduce((s, r) => s + r.averageThrust, 0) / recs.length).toFixed(0),
        '平均扭矩(kN·m)': (recs.reduce((s, r) => s + r.averageTorque, 0) / recs.length).toFixed(0),
        '告警环数': warningRings,
        '告警次数': totalWarnings,
      };
    });
}

function getShiftName(shift: string): string {
  const map: Record<string, string> = { morning: '早班', afternoon: '中班', night: '夜班' };
  return map[shift] || shift;
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

export function exportDailyReportToHTML(
  records: RingRecord[],
  summary: DailyReportSummary,
  bookmarks: BookmarkNode[],
  startRing: number,
  endRing: number,
  chartImages: Record<string, string>,
  teamReview?: { dateKey: string; shifts: Record<ShiftType, { records: RingRecord[]; summary: DailyReportSummary }> }[]
): void {
  const filteredBookmarks = bookmarks.filter(
    (b) => b.ringNumber >= startRing && b.ringNumber <= endRing
  );

  const warningRows = records
    .filter((r) => r.warningEvents.length > 0)
    .flatMap((r) =>
      r.warningEvents.map((w) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #374151;">#${r.ringNumber}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #374151;">${w.type === 'thrust' ? '推力超限' : '扭矩超限'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #374151;">${w.peakValue.toFixed(0)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #374151;">${w.threshold.toFixed(0)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #374151;">${(((w.peakValue - w.threshold) / w.threshold) * 100).toFixed(1)}%</td>
          <td style="padding:6px 10px;border-bottom:1px solid #374151;">${formatDateTime(w.startTime)}</td>
        </tr>
      `)
    ).join('');

  const bookmarkRows = filteredBookmarks
    .sort((a, b) => a.snapshotIndex - b.snapshotIndex)
    .map(
      (b) => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.icon}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${BOOKMARK_TYPE_NAMES[b.type] || b.type}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.title}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">#${b.ringNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${b.mileage.toFixed(1)}m</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${formatDateTime(b.timestamp)}</td>
      </tr>
    `
    ).join('');

  const ringRows = records
    .map(
      (r) => `
      <tr style="${r.hasWarning ? 'background:rgba(239,68,68,0.08)' : ''}">
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">#${r.ringNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${r.dateKey}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${getShiftName(r.shift)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${r.excavationEfficiency.toFixed(1)}%</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${r.averageSpeed.toFixed(1)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${r.averageThrust.toFixed(0)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${r.averageTorque.toFixed(0)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${STRATUM_NAMES[r.stratum]}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;">${r.assemblyTime.toFixed(1)}s</td>
        <td style="padding:6px 10px;border-bottom:1px solid #374151;${r.hasWarning ? 'color:#EF4444;font-weight:bold' : ''}">${r.hasWarning ? `${r.warningCount}次` : '-'}</td>
      </tr>
    `
    ).join('');

  const trendImageSection = chartImages.trend
    ? `<div style="margin-bottom:30px;">
        <h3 style="color:#10B981;font-size:16px;margin-bottom:10px;">📈 掘进效率与拼装耗时趋势</h3>
        <img src="${chartImages.trend}" style="max-width:100%;border-radius:8px;border:1px solid #374151;" />
      </div>`
    : '';

  const warningImageSection = chartImages.warning
    ? `<div style="margin-bottom:30px;">
        <h3 style="color:#EF4444;font-size:16px;margin-bottom:10px;">⚠️ 每环告警次数分布</h3>
        <img src="${chartImages.warning}" style="max-width:100%;border-radius:8px;border:1px solid #374151;" />
      </div>`
    : '';

  const stratumImageSection = chartImages.stratum
    ? `<div style="margin-bottom:30px;">
        <h3 style="color:#D97706;font-size:16px;margin-bottom:10px;">🪨 地层占比汇总</h3>
        <img src="${chartImages.stratum}" style="max-width:100%;border-radius:8px;border:1px solid #374151;" />
      </div>`
    : '';

  const teamEfficiencySection = chartImages.teamEfficiency
    ? `<div style="margin-bottom:30px;">
        <h3 style="color:#8B5CF6;font-size:16px;margin-bottom:10px;">📊 连续多天各班次掘进效率趋势</h3>
        <img src="${chartImages.teamEfficiency}" style="max-width:100%;border-radius:8px;border:1px solid #374151;" />
      </div>`
    : '';

  const teamWarningSection = chartImages.teamWarning
    ? `<div style="margin-bottom:30px;">
        <h3 style="color:#EF4444;font-size:16px;margin-bottom:10px;">⚠️ 连续多天各班次告警密度趋势</h3>
        <img src="${chartImages.teamWarning}" style="max-width:100%;border-radius:8px;border:1px solid #374151;" />
      </div>`
    : '';

  let teamReviewSection = '';
  if (teamReview && teamReview.length > 0) {
    const teamRows = teamReview.flatMap((day) => {
      const shiftTypes = Object.keys(day.shifts) as ShiftType[];
      return shiftTypes.map((st) => {
        const s = day.shifts[st].summary;
        return `
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;">${day.dateKey}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;color:${SHIFT_COLORS[st]};font-weight:bold;">${SHIFT_NAMES[st]}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;">${s.totalRings} 环</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;">${s.totalMileage.toFixed(1)} m</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;color:#10B981;font-weight:bold;">${s.avgExcavationEfficiency.toFixed(1)}%</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;">${s.avgThrust.toFixed(0)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;">${s.avgTorque.toFixed(0)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #374151;color:${s.totalWarnings > 0 ? '#EF4444' : '#64748B'};font-weight:bold;">${s.totalWarnings > 0 ? `${s.totalWarnings} 次` : '—'}</td>
          </tr>
        `;
      });
    }).join('');

    teamReviewSection = `
      <div class="section">
        <h2>班组对照（按日期×班次）</h2>
        <table>
          <thead>
            <tr>
              <th>日期</th><th>班次</th><th>完成环数</th><th>掘进里程</th>
              <th>平均效率</th><th>平均推力(kN)</th><th>平均扭矩(kN·m)</th><th>告警</th>
            </tr>
          </thead>
          <tbody>${teamRows}</tbody>
        </table>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>盾构施工日报 — 第${startRing}~${endRing}环</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px; }
    h1 { font-size: 28px; margin-bottom: 8px; background: linear-gradient(to right, #3b82f6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 20px; margin: 30px 0 15px; border-left: 4px solid #3b82f6; padding-left: 12px; }
    .meta { color: #94a3b8; font-size: 13px; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .card .label { color: #94a3b8; font-size: 12px; margin-bottom: 4px; }
    .card .value { font-size: 24px; font-weight: bold; font-family: monospace; }
    .card .sub { color: #64748b; font-size: 11px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    th { background: #0f172a; color: #94a3b8; font-size: 12px; padding: 10px; text-align: left; border-bottom: 2px solid #334155; }
    td { font-size: 13px; }
    .blue { color: #3b82f6; }
    .green { color: #10b981; }
    .amber { color: #f59e0b; }
    .red { color: #ef4444; }
    .cyan { color: #06b6d4; }
    .section { margin-bottom: 40px; }
    @media print { body { background: white; color: #1e293b; } .card { border-color: #e2e8f0; } table { border-color: #e2e8f0; } }
  </style>
</head>
<body>
  <h1>盾构施工日报</h1>
  <p class="meta">
    统计范围: 第 ${startRing} 环 — 第 ${endRing} 环 &nbsp;|&nbsp;
    导出时间: ${formatDateTime(new Date())} &nbsp;|&nbsp;
    共 ${summary.totalRings} 环 / ${summary.totalMileage.toFixed(1)} 米
  </p>

  <div class="grid">
    <div class="card">
      <div class="label">完成环数</div>
      <div class="value blue">${summary.totalRings} <span style="font-size:14px;color:#64748b">环</span></div>
      <div class="sub">${summary.totalMileage.toFixed(1)} 米</div>
    </div>
    <div class="card">
      <div class="label">平均掘进效率</div>
      <div class="value green">${summary.avgExcavationEfficiency.toFixed(1)}%</div>
      <div class="sub">总耗时 ${(summary.totalExcavationTime / 60).toFixed(1)} 分钟</div>
    </div>
    <div class="card">
      <div class="label">平均推力 / 扭矩</div>
      <div class="value amber">${summary.avgThrust.toFixed(0)} <span style="font-size:12px">kN</span></div>
      <div class="value red" style="font-size:18px;margin-top:4px">${summary.avgTorque.toFixed(0)} <span style="font-size:12px">kN·m</span></div>
    </div>
    <div class="card">
      <div class="label">告警情况</div>
      <div class="value red">${summary.ringsWithWarnings} / ${summary.totalRings} <span style="font-size:12px">环</span></div>
      <div class="sub">共 ${summary.totalWarnings} 次超限</div>
    </div>
  </div>

  <div class="section">
    <h2>趋势图表</h2>
    ${trendImageSection}
    ${warningImageSection}
    ${stratumImageSection}
    ${teamEfficiencySection}
    ${teamWarningSection}
  </div>

  <div class="section">
    <h2>每环施工详情</h2>
    <table>
      <thead>
        <tr>
          <th>环号</th><th>日期</th><th>班次</th><th>掘进效率</th>
          <th>速度(mm/min)</th><th>推力(kN)</th><th>扭矩(kN·m)</th>
          <th>地层</th><th>拼装耗时</th><th>告警</th>
        </tr>
      </thead>
      <tbody>${ringRows}</tbody>
    </table>
  </div>

  ${warningRows ? `
  <div class="section">
    <h2>告警摘要</h2>
    <table>
      <thead>
        <tr><th>环号</th><th>告警类型</th><th>峰值</th><th>阈值</th><th>超幅</th><th>开始时间</th></tr>
      </thead>
      <tbody>${warningRows}</tbody>
    </table>
  </div>
  ` : ''}

  ${bookmarkRows ? `
  <div class="section">
    <h2>关键节点摘要</h2>
    <table>
      <thead>
        <tr><th>图标</th><th>类型</th><th>标题</th><th>环号</th><th>里程</th><th>时间</th></tr>
      </thead>
      <tbody>${bookmarkRows}</tbody>
    </table>
  </div>
  ` : ''}

  ${teamReviewSection}

  <div style="text-align:center;color:#475569;font-size:11px;margin-top:40px;padding-top:20px;border-top:1px solid #334155;">
    盾构机隧道掘进模拟系统 — 自动生成施工日报
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `盾构施工日报_${startRing}-${endRing}环_${formatDateForFilename()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
