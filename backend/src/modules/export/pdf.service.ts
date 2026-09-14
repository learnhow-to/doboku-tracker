import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFullReport } from '../reports/reports.service.js';
import { AuthenticatedUser } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedLogoBase64: string | null = null;
function getLogoBase64(): string {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const logoPath = path.resolve(__dirname, '../../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath);
      cachedLogoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      return cachedLogoBase64;
    }
  } catch (_) {}
  return '';
}

export async function generateNippouHtml(reportId: string, user: AuthenticatedUser): Promise<string> {
  const report = await getFullReport(reportId, user);
  if (!report) throw new Error('Report not found');

  const rawDateStr = typeof report.work_date === 'string'
    ? report.work_date.substring(0, 10)
    : new Date(report.work_date).toISOString().substring(0, 10);
  const [yearStr, monthStr, dayStr] = rawDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const date = parseInt(dayStr, 10);

  // Japanese Era calculation (Reiwa era started in 2019)
  const reiwaYear = year >= 2019 ? year - 2018 : null;
  const eraString = reiwaYear ? (reiwaYear === 1 ? '令和元年' : `令和${reiwaYear}年`) : '';

  // Safe day of week using Asia/Tokyo noon
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = dayNames[new Date(`${rawDateStr}T12:00:00+09:00`).getDay()];

  const workerNames = (report.workers || []).map((w: any) => `${w.name} (${w.trade || '自社'})`).join('、 ');
  const workItems = report.workItems || [];
  const equipment = report.equipment || [];
  const materials = report.materials || [];

  const approvedAtStr = report.approved_at
    ? (typeof report.approved_at === 'string' ? report.approved_at : new Date(report.approved_at).toISOString())
    : rawDateStr;
  const approvedDateDisplay = approvedAtStr.substring(0, 10).replace(/-/g, '.');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>作業日報 - ${report.project_name} (${report.work_date})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', 'Noto Sans JP', 'MS Gothic', sans-serif;
      color: #111;
      background: #fff;
      font-size: 11pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .header-box {
      text-align: center;
      position: relative;
      margin-bottom: 8px;
    }
    .draft-badge {
      display: inline-block;
      background: #ffebee;
      color: #c62828;
      border: 1.5px dashed #c62828;
      padding: 3px 10px;
      font-size: 9pt;
      font-weight: bold;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 22pt;
      letter-spacing: 0.5em;
      margin: 2px 0;
      font-weight: bold;
    }
    .company-brand {
      position: absolute;
      right: 0;
      top: 0px;
      text-align: right;
    }
    table.nippou-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    table.nippou-table th, table.nippou-table td {
      border: 1px solid #333;
      padding: 5px 8px;
      vertical-align: middle;
      font-size: 10pt;
    }
    table.nippou-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
      width: 22%;
    }
    .weather-circle {
      display: inline-block;
      border: 1.5px solid #000;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      line-height: 22px;
      text-align: center;
      font-weight: bold;
      margin: 0 4px;
    }
    .weather-plain {
      display: inline-block;
      margin: 0 4px;
      color: #777;
    }
    .section-title {
      font-weight: bold;
      font-size: 10.5pt;
      margin: 8px 0 4px 0;
      border-bottom: 1.5px solid #333;
      padding-bottom: 2px;
    }
    .sub-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .sub-table th, .sub-table td {
      border: 1px solid #444;
      padding: 4px 6px;
      font-size: 9pt;
    }
    .sub-table th {
      background-color: #e9ecef;
      text-align: center;
    }
    .two-col {
      display: flex;
      gap: 10px;
    }
    .two-col > div {
      flex: 1;
    }
    .note-box {
      border: 1px solid #444;
      padding: 8px;
      min-height: 45px;
      font-size: 9.5pt;
      background: #fafafa;
    }
    .footer-warning {
      margin-top: 15px;
      padding: 6px;
      background: #fdfdfe;
      border: 1px solid #ccc;
      font-size: 8pt;
      color: #666;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .header-left {
      width: 25%;
      text-align: left;
    }
    .header-center {
      width: 50%;
      text-align: center;
    }
    .header-right {
      width: 25%;
      display: flex;
      justify-content: flex-end;
    }
    .hanko-table {
      border-collapse: collapse;
      border: 1.5px solid #333;
    }
    .hanko-table th {
      border: 1px solid #555;
      font-size: 7pt;
      padding: 1px 4px;
      background: #f1f5f9;
      text-align: center;
      font-weight: bold;
      width: 48px;
    }
    .hanko-table td {
      border: 1px solid #555;
      height: 48px;
      width: 48px;
      text-align: center;
      vertical-align: middle;
      padding: 1px;
    }
    .hanko-seal {
      width: 42px;
      height: 42px;
      border: 1.5px solid #dc2626;
      border-radius: 50%;
      color: #dc2626;
      font-family: 'Yu Mincho', 'Hiragino Mincho ProN', 'MS Mincho', serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 0 auto;
      transform: rotate(-3deg);
      line-height: 1;
      padding: 1px;
    }
    .hanko-seal-top {
      font-size: 7pt;
      font-weight: bold;
    }
    .hanko-seal-date {
      font-size: 5.5pt;
      border-top: 1px solid #dc2626;
      border-bottom: 1px solid #dc2626;
      padding: 1px 0;
      width: 90%;
      font-family: monospace;
      margin: 1px 0;
    }
    .hanko-seal-bottom {
      font-size: 6.5pt;
      font-weight: bold;
    }
    @media print {
      .no-print { display: none; }
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="header-container">
    <div class="header-left">
      ${getLogoBase64() ? `<img src="${getLogoBase64()}" alt="GUREISU" style="height: 28px; vertical-align: middle;" /><br/>` : ''}
      <span style="font-size: 8.5pt; font-weight: bold; color: #111;">株式会社グレイス</span>
    </div>
    <div class="header-center">
      <div class="draft-badge">${report.status === 'APPROVED' ? '原本・電子決裁済' : 'DRAFT — TEMPLATE BELUM TERVERIFIKASI (原本照合待ち)'}</div>
      <div class="doc-title">作業日報</div>
    </div>
    <div class="header-right">
      <table class="hanko-table">
        <tr>
          <th>所長・検査</th>
          <th>現場代理人</th>
          <th>担当・職長</th>
        </tr>
        <tr>
          <td>
            ${report.status === 'APPROVED' ? `
              <div class="hanko-seal">
                <div class="hanko-seal-top">グレイス</div>
                <div class="hanko-seal-date">${approvedDateDisplay}</div>
                <div class="hanko-seal-bottom">承認</div>
              </div>
            ` : '<span style="color:#bbb;font-size:7.5pt;">未決</span>'}
          </td>
          <td>
            ${report.status === 'APPROVED' ? `
              <div class="hanko-seal">
                <div class="hanko-seal-top">${(report.approved_by || '代理人').trim().split(/[\s　]+/)[0]}</div>
                <div class="hanko-seal-date">${approvedDateDisplay}</div>
                <div class="hanko-seal-bottom">確認</div>
              </div>
            ` : '<span style="color:#bbb;font-size:7.5pt;">未決</span>'}
          </td>
          <td>
            ${report.status === 'SUBMITTED' || report.status === 'APPROVED' ? `
              <div class="hanko-seal">
                <div class="hanko-seal-top">${report.reporter_name ? report.reporter_name.trim().split(/[\s　]+/)[0] : '担当'}</div>
                <div class="hanko-seal-date">${rawDateStr.substring(0, 10).replace(/-/g, '.')}</div>
                <div class="hanko-seal-bottom">提出</div>
              </div>
            ` : '<span style="color:#bbb;font-size:7.5pt;">未決</span>'}
          </td>
        </tr>
      </table>
    </div>
  </div>

  <table class="nippou-table">
    <tr>
      <th>作業日</th>
      <td>${eraString ? `${eraString} （` : ''}${year}年${month}月${date}日${eraString ? '）' : ''} （${dayOfWeek}）曜日</td>
      <th style="width: 15%;">天候</th>
      <td style="width: 30%;">
        <span class="${report.weather === '晴' ? 'weather-circle' : 'weather-plain'}">晴</span>
        ・
        <span class="${report.weather === '雨' ? 'weather-circle' : 'weather-plain'}">雨</span>
        ・
        <span class="${report.weather === '曇' ? 'weather-circle' : 'weather-plain'}">曇</span>
        ${report.weather !== '晴' && report.weather !== '雨' && report.weather !== '曇' ? `（${report.weather}）` : ''}
      </td>
    </tr>
    <tr>
      <th>現場名</th>
      <td colspan="3"><strong>${report.project_name || '未設定'}</strong></td>
    </tr>
    <tr>
      <th>元請名</th>
      <td colspan="3">${report.main_contractor || '未記入'}</td>
    </tr>
    <tr>
      <th>報告者</th>
      <td colspan="3">${report.reporter_name}</td>
    </tr>
    <tr>
      <th>現場作業員（全員）</th>
      <td colspan="3" style="min-height: 40px;">
        ${workerNames || 'なし'}
      </td>
    </tr>
    <tr>
      <th>作業時間（現場での）</th>
      <td colspan="3">
        ${report.site_start_time || '08:00'} ～ ${report.site_end_time || '17:00'}
        （休憩: ${report.break_minutes ?? 60}分）
      </td>
    </tr>
  </table>

  <div class="section-title">作業内容（工種）</div>
  <table class="sub-table">
    <thead>
      <tr>
        <th style="width: 25%;">工種</th>
        <th>作業内容</th>
        <th style="width: 15%;">数量 / 単位</th>
        <th style="width: 15%;">場所 / STA</th>
      </tr>
    </thead>
    <tbody>
      ${workItems.length > 0 ? workItems.map((wi: any) => `
        <tr>
          <td><strong>${wi.work_type}</strong></td>
          <td>${wi.description}</td>
          <td style="text-align: right;">${wi.quantity} ${wi.unit}</td>
          <td>${wi.location_sta || '-'}</td>
        </tr>
      `).join('') : `
        <tr><td colspan="4" style="text-align: center; color: #888;">作業内容の登録がありません</td></tr>
      `}
    </tbody>
  </table>

  <div class="section-title">伝達事項</div>
  <div class="note-box">${report.handover_notes || '特記事項なし'}</div>

  <div class="section-title">使用したもの・購入したもの</div>
  <div class="two-col">
    <div>
      <table class="sub-table">
        <thead>
          <tr>
            <th>品名</th>
            <th>業者名</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          ${equipment.map((e: any) => `
            <tr>
              <td>${e.name}</td>
              <td style="text-align: center;">${e.vendor}</td>
              <td style="text-align: right;">${e.quantity} ${e.unit}${e.diesel_liters ? ` (軽油 ${e.diesel_liters}L)` : ''}</td>
            </tr>
          `).join('')}
          ${equipment.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #888;">機械・車輌なし</td></tr>` : ''}
        </tbody>
      </table>
    </div>
    <div>
      <table class="sub-table">
        <thead>
          <tr>
            <th>品名</th>
            <th>業者名</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          ${materials.map((m: any) => `
            <tr>
              <td>${m.name}</td>
              <td style="text-align: center;">${m.vendor}</td>
              <td style="text-align: right;">${m.quantity} ${m.unit}</td>
            </tr>
          `).join('')}
          ${materials.length === 0 ? `<tr><td colspan="3" style="text-align: center; color: #888;">材料なし</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer-warning">
    ※ 照合注記: 本書面は14027.jpg/14028.jpg写真からの暫定再構成ドラフトです。右端・下端の未確認項目や捺印欄は原本照合完了後に確定されます。
    ステータス: <strong>${report.status}</strong> (v${report.version}) | 承認者: ${report.approved_by || '未承認'}
  </div>

  ${report.ky ? `
    <div style="page-break-before: always; margin-top: 20px;">
      <div class="header-box">
        <div class="draft-badge">社内安全管理 付録（APPENDIX）</div>
        <div class="doc-title" style="font-size: 16pt;">危険予知（KY）活動記録</div>
      </div>
      <table class="nippou-table">
        <tr>
          <th>実施時間</th>
          <td>${report.ky.meeting_time || '08:00'}</td>
          <th>参加人数</th>
          <td>${report.ky.attendees_count} 名</td>
        </tr>
        <tr>
          <th>本日の危険要因</th>
          <td colspan="3">${report.ky.specific_hazards}</td>
        </tr>
        <tr>
          <th>安全対策・重点目標</th>
          <td colspan="3">${report.ky.countermeasures}</td>
        </tr>
        <tr>
          <th>現場責任者</th>
          <td>${report.ky.supervisor_name}</td>
          <th>確認状況</th>
          <td>${report.ky.is_checked ? '確認済 (レ点確認)' : '未確認'}</td>
        </tr>
      </table>
    </div>
  ` : ''}

</body>
</html>`;
}
