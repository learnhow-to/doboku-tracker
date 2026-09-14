import ExcelJS from 'exceljs';

interface ExportMeta {
  projectName?: string;
  startDate?: string;
  endDate?: string;
  companyName?: string;
}

const PRIMARY_COLOR = '1E293B'; // Slate-900 / Dark Navy
const HEADER_FILL = '0F766E';    // Teal-700
const TOTAL_FILL = 'F1F5F9';     // Slate-100
const BORDER_COLOR = 'CBD5E1';   // Slate-300

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_FILL },
    };
    cell.font = {
      name: 'Meiryo',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'medium', color: { argb: PRIMARY_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });
  row.height = 26;
}

function applyDataStyle(row: ExcelJS.Row, isEven: boolean) {
  row.eachCell((cell) => {
    cell.font = { name: 'Meiryo', size: 9.5 };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' },
      };
    }
  });
  row.height = 20;
}

function applyTotalStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { name: 'Meiryo', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TOTAL_FILL },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });
  row.height = 24;
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column: any) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: false }, (cell: any) => {
      const text = cell.value ? cell.value.toString() : '';
      // Japanese characters take more visual width
      const width = text.split('').reduce((acc: number, char: string) => {
        return acc + (char.charCodeAt(0) > 255 ? 2.1 : 1.1);
      }, 0);
      if (width > maxLength) maxLength = width;
    });
    column.width = Math.min(Math.max(maxLength + 3, 12), 40);
  });
}

// -------------------------------------------------------------
// 1. WORKFORCE EXCEL (.XLSX)
// -------------------------------------------------------------

export async function generateWorkforceExcel(rows: any[], meta: ExportMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '東京土木建設株式会社';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('労務・人工集計台帳', {
    views: [{ showGridLines: true }],
  });

  // Title Row
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = '東京土木建設株式会社 — 現場労務・人工集計台帳';
  titleCell.font = { name: 'Meiryo', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Metadata block
  sheet.getCell('A2').value = `対象現場: ${meta.projectName || '【全現場】'}`;
  sheet.getCell('A2').font = { name: 'Meiryo', size: 9.5, bold: true };

  sheet.getCell('F2').value = `対象期間: ${meta.startDate || '最初'} ～ ${meta.endDate || '最新'}`;
  sheet.getCell('F2').font = { name: 'Meiryo', size: 9.5 };

  sheet.getCell('I2').value = `出力日時: ${new Date().toLocaleString('ja-JP')}`;
  sheet.getCell('I2').font = { name: 'Meiryo', size: 9, color: { argb: 'FF64748B' } };

  // Empty row before table
  sheet.addRow([]);

  // Table Headers
  const headerRow = sheet.addRow([
    '作業年月日',
    '現場コード',
    '現場名称',
    '作業員氏名',
    '所属区分',
    '工種・職種',
    '通常現場時間(h)',
    '残業時間(h)',
    '合計就業時間(h)',
    '日報ステータス',
    '記入報告者',
  ]);
  applyHeaderStyle(headerRow);

  let totalReg = 0;
  let totalOt = 0;
  let totalAll = 0;

  rows.forEach((r, idx) => {
    const reg = Number(r.work_hours || 0);
    const ot = Number(r.overtime_hours || 0);
    const sum = reg + ot;

    totalReg += reg;
    totalOt += ot;
    totalAll += sum;

    const row = sheet.addRow([
      typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : new Date(r.work_date).toISOString().substring(0, 10),
      r.project_code || '',
      r.project_name || '',
      r.worker_name || '',
      r.company || '自社',
      r.trade || '',
      reg,
      ot,
      sum,
      r.report_status || '',
      r.reporter_name || '',
    ]);

    // Alignments & numeric format
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(8).alignment = { horizontal: 'right' };
    row.getCell(9).alignment = { horizontal: 'right' };
    row.getCell(10).alignment = { horizontal: 'center' };

    row.getCell(7).numFmt = '#,##0.0';
    row.getCell(8).numFmt = '#,##0.0';
    row.getCell(9).numFmt = '#,##0.0';

    applyDataStyle(row, idx % 2 === 1);
  });

  // Total Summary Row
  const totalRow = sheet.addRow([
    '【合計】',
    '',
    '',
    `${rows.length} 稼働記録`,
    '',
    '',
    totalReg,
    totalOt,
    totalAll,
    '',
    '',
  ]);
  totalRow.getCell(7).numFmt = '#,##0.0';
  totalRow.getCell(8).numFmt = '#,##0.0';
  totalRow.getCell(9).numFmt = '#,##0.0';
  applyTotalStyle(totalRow);

  autoFitColumns(sheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// -------------------------------------------------------------
// 2. EQUIPMENT & FUEL EXCEL (.XLSX)
// -------------------------------------------------------------

export async function generateEquipmentExcel(rows: any[], meta: ExportMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '東京土木建設株式会社';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('重機・燃料集計台帳', {
    views: [{ showGridLines: true }],
  });

  // Title Row
  sheet.mergeCells('A1:J1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = '東京土木建設株式会社 — 重機稼働・給油軽油集計台帳';
  titleCell.font = { name: 'Meiryo', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Metadata block
  sheet.getCell('A2').value = `対象現場: ${meta.projectName || '【全現場】'}`;
  sheet.getCell('A2').font = { name: 'Meiryo', size: 9.5, bold: true };

  sheet.getCell('F2').value = `対象期間: ${meta.startDate || '最初'} ～ ${meta.endDate || '最新'}`;
  sheet.getCell('F2').font = { name: 'Meiryo', size: 9.5 };

  sheet.getCell('I2').value = `出力日時: ${new Date().toLocaleString('ja-JP')}`;
  sheet.getCell('I2').font = { name: 'Meiryo', size: 9, color: { argb: 'FF64748B' } };

  sheet.addRow([]);

  // Table Headers
  const headerRow = sheet.addRow([
    '作業年月日',
    '現場コード',
    '現場名称',
    '重機・車両・工具名称',
    '調達先区分',
    '数量',
    '単位',
    '稼働時間(h)',
    '給油軽油(L)',
    '備考・号車',
  ]);
  applyHeaderStyle(headerRow);

  let totalHours = 0;
  let totalDiesel = 0;

  rows.forEach((r, idx) => {
    const hours = Number(r.operating_hours || 0);
    const diesel = Number(r.diesel_liters || 0);

    totalHours += hours;
    totalDiesel += diesel;

    const row = sheet.addRow([
      typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : new Date(r.work_date).toISOString().substring(0, 10),
      r.project_code || '',
      r.project_name || '',
      r.equipment_name || '',
      r.vendor || '自社',
      r.quantity ?? 1,
      r.unit || '台',
      hours,
      diesel,
      r.notes || '',
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'right' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'right' };
    row.getCell(9).alignment = { horizontal: 'right' };

    row.getCell(8).numFmt = '#,##0.0';
    row.getCell(9).numFmt = '#,##0.0';

    applyDataStyle(row, idx % 2 === 1);
  });

  const totalRow = sheet.addRow([
    '【合計】',
    '',
    '',
    `${rows.length} 稼働記録`,
    '',
    '',
    '',
    totalHours,
    totalDiesel,
    '',
  ]);
  totalRow.getCell(8).numFmt = '#,##0.0';
  totalRow.getCell(9).numFmt = '#,##0.0';
  applyTotalStyle(totalRow);

  autoFitColumns(sheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// -------------------------------------------------------------
// 3. WORK ITEMS (DEKIDAKA) EXCEL (.XLSX)
// -------------------------------------------------------------

export async function generateWorkItemsExcel(rows: any[], meta: ExportMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '東京土木建設株式会社';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('出来高集計台帳', {
    views: [{ showGridLines: true }],
  });

  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = '東京土木建設株式会社 — 工種別出来高施工記録集計台帳';
  titleCell.font = { name: 'Meiryo', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 30;

  sheet.getCell('A2').value = `対象現場: ${meta.projectName || '【全現場】'}`;
  sheet.getCell('A2').font = { name: 'Meiryo', size: 9.5, bold: true };

  sheet.getCell('E2').value = `対象期間: ${meta.startDate || '最初'} ～ ${meta.endDate || '最新'}`;
  sheet.getCell('E2').font = { name: 'Meiryo', size: 9.5 };

  sheet.getCell('G2').value = `出力日時: ${new Date().toLocaleString('ja-JP')}`;
  sheet.getCell('G2').font = { name: 'Meiryo', size: 9, color: { argb: 'FF64748B' } };

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    '作業年月日',
    '現場コード',
    '現場名称',
    '工種名称',
    '作業内容・細別',
    '施工箇所/STA',
    '出来高数量',
    '単位',
  ]);
  applyHeaderStyle(headerRow);

  rows.forEach((r, idx) => {
    const qty = Number(r.quantity || 0);

    const row = sheet.addRow([
      typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : new Date(r.work_date).toISOString().substring(0, 10),
      r.project_code || '',
      r.project_name || '',
      r.work_type || '',
      r.description || '',
      r.location_sta || '',
      qty,
      r.unit || '',
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(8).alignment = { horizontal: 'center' };

    row.getCell(7).numFmt = '#,##0.00';

    applyDataStyle(row, idx % 2 === 1);
  });

  autoFitColumns(sheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}