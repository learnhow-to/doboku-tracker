import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Wrench,
  Fuel,
  Building,
  ArrowRight,
  Eye,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { getAnalyticsSummary } from '../../services/api.js';
import { Language } from '../../i18n/index.js';

interface AdminSummaryViewProps {
  onNavigate: (tab: string) => void;
  onOpenReportPreview: (reportId: string) => void;
  lang: Language;
}

export const AdminSummaryView: React.FC<AdminSummaryViewProps> = ({
  onNavigate,
  onOpenReportPreview,
  lang,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const kpi = data?.kpi || {
    totalReports: 0,
    approvedCount: 0,
    submittedCount: 0,
    returnedCount: 0,
    draftCount: 0,
    totalRegularHours: 0,
    totalOvertimeHours: 0,
    uniqueWorkersCount: 0,
    totalOperatingHours: 0,
    totalDieselLiters: 0,
    uniqueEquipmentCount: 0,
  };

  const todayMatrix = data?.todayMatrix || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>{lang === 'ja' ? '本社統括ダッシュボード' : 'Dashboard Monitoring Kantor Pusat'}</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              {new Date().toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ja'
              ? '全現場の稼働状況、日報進捗、人工・重機集計をリアルタイムに把握します。'
              : 'Pantau status operasional seluruh proyek, absensi tenaga kerja, dan armada alat berat real-time.'}
          </p>
        </div>

        <button
          onClick={loadSummary}
          disabled={loading}
          className="btn-touch bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-2 rounded shadow-sm flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>{lang === 'ja' ? '最新に更新' : 'Perbarui'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reports Status Card */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'ja' ? '日報進捗・件数' : 'Status Laporan'}
            </span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{kpi.totalReports}</span>
            <span className="text-xs text-slate-500">{lang === 'ja' ? '件 (今月)' : 'laporan'}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{kpi.approvedCount} {lang === 'ja' ? '承認済' : 'Approved'}</span>
            </span>
            <span className="text-blue-700 font-bold flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{kpi.submittedCount} {lang === 'ja' ? '点検待ち' : 'Submitted'}</span>
            </span>
            {kpi.returnedCount > 0 && (
              <span className="text-rose-600 font-bold">
                {kpi.returnedCount} {lang === 'ja' ? '差戻' : 'Ret'}
              </span>
            )}
          </div>
        </div>

        {/* Workforce Card */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'ja' ? '稼働人工・労働時間' : 'Tenaga Kerja & Jam'}
            </span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {(Number(kpi.totalRegularHours) + Number(kpi.totalOvertimeHours)).toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">{lang === 'ja' ? '総時間 (h)' : 'total jam'}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              {lang === 'ja' ? '通常: ' : 'Normal: '}
              <strong className="text-slate-800">{Number(kpi.totalRegularHours).toFixed(0)}h</strong>
            </span>
            <span>
              {lang === 'ja' ? '残業: ' : 'Lembur: '}
              <strong className="text-amber-700">{Number(kpi.totalOvertimeHours).toFixed(1)}h</strong>
            </span>
            <span>
              {kpi.uniqueWorkersCount} {lang === 'ja' ? '名' : 'org'}
            </span>
          </div>
        </div>

        {/* Equipment Card */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'ja' ? '重機稼働時間' : 'Jam Kerja Alat Berat'}
            </span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {Number(kpi.totalOperatingHours).toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">{lang === 'ja' ? '稼働時間 (h)' : 'jam jalan'}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>{lang === 'ja' ? '稼働機材数' : 'Unit aktif'}:</span>
            <strong className="text-slate-900">{kpi.uniqueEquipmentCount} {lang === 'ja' ? '機種/台' : 'unit'}</strong>
          </div>
        </div>

        {/* Fuel Card */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              {lang === 'ja' ? '軽油・給油量' : 'Konsumsi Solar'}
            </span>
            <Fuel className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {Number(kpi.totalDieselLiters).toFixed(0)}
            </span>
            <span className="text-xs text-slate-500">{lang === 'ja' ? 'リットル (L)' : 'Liter'}</span>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>{lang === 'ja' ? '燃料管理' : 'Bahan bakar'}:</span>
            <strong className="text-teal-800 font-bold">{lang === 'ja' ? '集計正常' : 'Tercatat'}</strong>
          </div>
        </div>
      </div>

      {/* Main Table: Today's Progress Across All Projects */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">
              {lang === 'ja' ? '本日の各現場・日報提出状況' : 'Status Pengiriman Laporan Seluruh Proyek Hari Ini'}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate('export')}
              className="text-xs text-teal-700 font-bold hover:underline flex items-center space-x-1"
            >
              <span>{lang === 'ja' ? '集計・エクスポート画面へ' : 'Buka Halaman Rekap & Ekspor'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {todayMatrix.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {lang === 'ja' ? '稼働中の現場が登録されていません。' : 'Tidak ada proyek aktif.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">{lang === 'ja' ? '現場コード' : 'Kode'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '工事現場名称' : 'Nama Proyek'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '元請会社' : 'Kontraktor Utama'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '提出状況' : 'Status Hari Ini'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '報告者' : 'Pelapor'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? 'アクション' : 'Aksi'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {todayMatrix.map((item: any) => {
                  const status = item.today_status;
                  const isApproved = status === 'APPROVED';
                  const isSubmitted = status === 'SUBMITTED';
                  const isReturned = status === 'RETURNED';
                  const isDraft = status === 'DRAFT';
                  const notCreated = !status;

                  return (
                    <tr key={item.project_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.project_code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.project_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.main_contractor || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {isApproved ? (
                          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lang === 'ja' ? '承認済 (確定)' : 'APPROVED'}</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                            <Clock className="w-3 h-3" />
                            <span>{lang === 'ja' ? '点検待ち' : 'SUBMITTED'}</span>
                          </span>
                        ) : isReturned ? (
                          <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{lang === 'ja' ? '差戻し修正中' : 'RETURNED'}</span>
                          </span>
                        ) : isDraft ? (
                          <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                            <span>{lang === 'ja' ? '下書き作成中' : 'DRAFT'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{lang === 'ja' ? '未作成' : 'Belum Dibuat'}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.today_reporter || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.today_report_id ? (
                          <button
                            onClick={() => onOpenReportPreview(item.today_report_id)}
                            className="btn-touch bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-300 text-xs font-bold px-2.5 py-1 rounded inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{lang === 'ja' ? '帳票A4' : 'A4'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};