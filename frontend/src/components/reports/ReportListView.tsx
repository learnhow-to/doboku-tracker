import React from 'react';
import { Eye, Plus, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Language, translations } from '../../i18n/index.js';

interface ReportListViewProps {
  reports: any[];
  projectName: string;
  lang: Language;
  onSelectReport: (reportId: string) => void;
  onCreateNew: () => void;
  onOpenPreview: (reportId: string) => void;
}

export const ReportListView: React.FC<ReportListViewProps> = ({
  reports,
  projectName,
  lang,
  onSelectReport,
  onCreateNew,
  onOpenPreview,
}) => {
  const t = translations[lang];

  return (
    <div className="max-w-lg mx-auto px-3 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">{projectName}</h2>
          <p className="text-[11px] text-slate-500">
            {lang === 'ja' ? `登録済日報: ${reports.length} 件` : `Total ${reports.length} laporan`}
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center space-x-1 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ja' ? '新規日報' : 'Buat Baru'}</span>
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-slate-200 text-slate-500 text-sm">
          {lang === 'ja' ? '日報の記録がまだありません。' : 'Belum ada catatan laporan harian.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((rep) => {
            const isApproved = rep.status === 'APPROVED';
            const isSubmitted = rep.status === 'SUBMITTED';
            const isReturned = rep.status === 'RETURNED';

            return (
              <div
                key={rep.id}
                className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 transition"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelectReport(rep.id)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">{rep.work_date}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isSubmitted
                          ? 'bg-blue-100 text-blue-800'
                          : isReturned
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.status[rep.status as keyof typeof t.status] || rep.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{lang === 'ja' ? '報告者: ' : 'Pelapor: '}{rep.reporter_name}</span>
                    <span>{lang === 'ja' ? '天候: ' : 'Cuaca: '}{rep.weather}</span>
                    <span>{lang === 'ja' ? '作業員: ' : 'Pekerja: '}{rep.worker_count || 0}{lang === 'ja' ? '名' : ' org'}</span>
                  </div>

                  {rep.rejection_reason && (
                    <div className="text-[11px] text-rose-600 mt-1 truncate max-w-xs">
                      {lang === 'ja' ? '差戻し理由: ' : 'Alasan Dikembalikan: '}{rep.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <button
                    onClick={() => onOpenPreview(rep.id)}
                    className="p-2 text-slate-400 hover:text-teal-700 rounded"
                    title={lang === 'ja' ? 'プレビュー' : 'Preview'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectReport(rep.id)}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded"
                    title={lang === 'ja' ? '開く' : 'Buka'}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
