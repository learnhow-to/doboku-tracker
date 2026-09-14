import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Plus,
  Building,
  RefreshCw,
} from 'lucide-react';
import { getMonthlyMatrix } from '../../services/api.js';
import { Language } from '../../i18n/index.js';

interface AdminCalendarViewProps {
  projects: any[];
  currentProjectId?: string;
  lang: Language;
  onViewReport?: (reportId: string) => void;
  onCreateForDate?: (date: string, projectId: string) => void;
}

export const AdminCalendarView: React.FC<AdminCalendarViewProps> = ({
  projects,
  currentProjectId,
  lang,
  onViewReport,
  onCreateForDate,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    currentProjectId || (projects[0]?.id || '')
  );

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState<string>(currentYearMonth);

  const [loading, setLoading] = useState<boolean>(false);
  const [matrixData, setMatrixData] = useState<any>(null);

  const loadMatrix = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const data = await getMonthlyMatrix(selectedProjectId, yearMonth);
      setMatrixData(data);
    } catch (err) {
      console.error('Failed to load monthly matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [selectedProjectId, yearMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Build calendar days array
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...

  // Map reports by date string (YYYY-MM-DD)
  const reportByDateMap = new Map<string, any>();
  if (matrixData?.reports) {
    for (const r of matrixData.reports) {
      const dateKey = typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : r.work_date;
      reportByDateMap.set(dateKey, r);
    }
  }

  // Count stats
  let approvedCount = 0;
  let submittedCount = 0;
  let draftCount = 0;
  let missingCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const rep = reportByDateMap.get(dateStr);
    if (rep) {
      if (rep.status === 'APPROVED') approvedCount++;
      else if (rep.status === 'SUBMITTED') submittedCount++;
      else if (rep.status === 'DRAFT') draftCount++;
    } else {
      if (dateStr <= todayStr) missingCount++;
    }
  }

  const dayHeadersJa = ['日 (日)', '月 (月)', '火 (火)', '水 (水)', '木 (木)', '金 (金)', '土 (土)'];
  const dayHeadersId = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>{lang === 'ja' ? '現場月次カレンダー' : 'Kalender Bulanan Proyek'}</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                {yearMonth}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ja'
                ? '日報の提出・未提出状況を一目で把握し、抜け漏れを即時チェックできます。'
                : 'Monitor kelengkapan laporan harian dalam 1 bulan kalender kerja.'}
            </p>
          </div>
        </div>

        {/* Project Selector & Month Nav */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Project select */}
          <div className="flex items-center space-x-1.5 text-xs bg-slate-50 px-2.5 py-1.5 rounded border border-slate-300">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded p-0.5 shadow-sm text-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
              title="前月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold font-mono text-slate-800">
              {lang === 'ja'
                ? `${year}年 ${month}月`
                : new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
              title={lang === 'ja' ? '次月' : 'Bulan Berikutnya'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadMatrix}
            disabled={loading}
            className="p-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-100 transition"
            title={lang === 'ja' ? '再読み込み' : 'Muat Ulang'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-slate-500 text-[11px] font-bold">
              {lang === 'ja' ? '承認済日報' : 'Disetujui (Approved)'}
            </div>
            <div className="text-lg font-bold text-emerald-800 font-mono">
              {approvedCount} <span className="text-xs font-normal">{lang === 'ja' ? '日' : ' hari'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm flex items-center space-x-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <div className="text-slate-500 text-[11px] font-bold">
              {lang === 'ja' ? '提出済 (確認待ち)' : 'Diajukan (Review)'}
            </div>
            <div className="text-lg font-bold text-amber-800 font-mono">
              {submittedCount} <span className="text-xs font-normal">{lang === 'ja' ? '日' : ' hari'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-sky-200 shadow-sm flex items-center space-x-3">
          <FileText className="w-5 h-5 text-sky-600 flex-shrink-0" />
          <div>
            <div className="text-slate-500 text-[11px] font-bold">
              {lang === 'ja' ? '下書き作成中' : 'Draft Tersimpan'}
            </div>
            <div className="text-lg font-bold text-sky-800 font-mono">
              {draftCount} <span className="text-xs font-normal">{lang === 'ja' ? '日' : ' hari'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <div className="text-slate-500 text-[11px] font-bold">
              {lang === 'ja' ? '未提出 (要提出)' : 'Belum Ada Laporan'}
            </div>
            <div className="text-lg font-bold text-rose-800 font-mono">
              {missingCount} <span className="text-xs font-normal">{lang === 'ja' ? '日' : ' hari'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center font-bold text-xs py-2">
          {(lang === 'ja' ? dayHeadersJa : dayHeadersId).map((d, idx) => (
            <div
              key={idx}
              className={idx === 0 ? 'text-rose-600' : idx === 6 ? 'text-blue-600' : 'text-slate-700'}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[90px] bg-slate-50/50" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${yearMonth}-${String(dayNum).padStart(2, '0')}`;
            const dayOfWeek = (firstDayOfWeek + i) % 7;
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const isToday = dateStr === todayStr;

            const rep = reportByDateMap.get(dateStr);

            return (
              <div
                key={dayNum}
                className={`min-h-[95px] p-2 flex flex-col justify-between transition ${
                  isToday
                    ? 'bg-amber-50/60 ring-2 ring-inset ring-amber-400'
                    : isSunday
                    ? 'bg-rose-50/20'
                    : isSaturday
                    ? 'bg-blue-50/20'
                    : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isSunday
                        ? 'text-rose-600'
                        : isSaturday
                        ? 'text-blue-600'
                        : 'text-slate-700'
                    } ${isToday ? 'bg-amber-600 text-white px-1.5 py-0.5 rounded-full text-[11px]' : ''}`}
                  >
                    {dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-bold text-amber-800 uppercase">
                      {lang === 'ja' ? '本日' : 'Hari Ini'}
                    </span>
                  )}
                </div>

                {/* Day content: Report Card or Empty */}
                <div className="my-1 flex-1 flex flex-col justify-center">
                  {rep ? (
                    <div
                      onClick={() => onViewReport && onViewReport(rep.id)}
                      className={`cursor-pointer rounded p-1.5 text-[11px] border transition shadow-2xs hover:shadow-sm ${
                        rep.status === 'APPROVED'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                          : rep.status === 'SUBMITTED'
                          ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                          : 'bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-1">
                          {rep.status === 'APPROVED' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : rep.status === 'SUBMITTED' ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <FileText className="w-3 h-3 text-sky-600" />
                          )}
                          <span className="truncate">
                            {rep.status === 'APPROVED'
                              ? lang === 'ja' ? '承認済' : 'Disetujui'
                              : rep.status === 'SUBMITTED'
                              ? lang === 'ja' ? '提出済' : 'Diajukan'
                              : lang === 'ja' ? '下書き' : 'Draft'}
                          </span>
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate mt-0.5">
                        {rep.reporter_name}
                      </div>
                      {rep.worker_count > 0 && (
                        <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                          {lang === 'ja' ? '作業員: ' : 'Pekerja: '}{rep.worker_count}{lang === 'ja' ? '名' : ' org'}
                        </div>
                      )}
                    </div>
                  ) : dateStr <= todayStr ? (
                    <div className="text-center py-1">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-50 border border-dashed border-rose-300 mb-1">
                        {lang === 'ja' ? '未提出' : 'Belum Ada'}
                      </span>
                      {onCreateForDate && (
                        <button
                          onClick={() => onCreateForDate(dateStr, selectedProjectId)}
                          className="w-full text-[10px] text-slate-500 hover:text-teal-800 hover:bg-teal-50 border border-dashed border-slate-300 rounded py-0.5 flex items-center justify-center space-x-0.5 transition cursor-pointer"
                          title={lang === 'ja' ? 'この日付の日報を作成' : 'Buat laporan untuk tanggal ini'}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>{lang === 'ja' ? '作成' : 'Buat'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[10px] text-slate-300 font-medium">
                      {lang === 'ja' ? '予定' : 'Mendatang'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
