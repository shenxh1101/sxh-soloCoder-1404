import * as XLSX from 'xlsx';
import { RingRecord } from '../types';
import { STRATUM_NAMES } from './constants';

export function exportConstructionLogToExcel(records: RingRecord[]): void {
  const data = records.map((record) => ({
    '环号': record.ringNumber,
    '开始时间': formatDateTime(record.startTime),
    '结束时间': formatDateTime(record.endTime),
    '掘进时长(分钟)': calculateDurationMinutes(record.startTime, record.endTime),
    '平均推进速度(mm/min)': record.averageSpeed.toFixed(1),
    '平均推力(千牛)': record.averageThrust.toFixed(0),
    '平均扭矩(千牛·米)': record.averageTorque.toFixed(0),
    '拼装时间(秒)': record.assemblyTime.toFixed(1),
    '地层类型': STRATUM_NAMES[record.stratum] || record.stratum,
    '是否有预警': record.hasWarning ? '是' : '否',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '施工日志');

  XLSX.writeFile(wb, `盾构施工日志_${formatDateForFilename()}.xlsx`);
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

function calculateDurationMinutes(start: Date, end: Date): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  return (diffMs / 60000).toFixed(1);
}
