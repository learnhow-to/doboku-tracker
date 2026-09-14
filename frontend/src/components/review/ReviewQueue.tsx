import React, { useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Eye,
  ShieldCheck,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { Language } from '../../i18n/index.js';
import { batchApproveReports } from '../../services/api.js';

interface ReviewQueueProps {
  reports: any[];
  currentUserId: string;
  userRole: string;
  lang: Language;
  onApprove: (reportId: string) => Promise<void>;
  onReturn: (reportId: string, reason: string) => Promise<void>;
  onViewReport: (reportId: string) => void;
  onRefreshReports?: () => void;
  onToast?: (msg: string) => void;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({
  reports,
  currentUserId,
  userRole,
  lang,
  onApprove,
  onReturn,
  onViewReport,
  onRefreshReports,
  onToast,
}) => {
  const [returnModalReportId, setReturnModalReportId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  const submittedReports = reports.filter((r) => r.status === 'SUBMITTED');
  const isEligibleReviewer = userRole === 'foreman' || userRole === 'office' || userRole === 'admin';

  // Only reports not created by the current user can be approved by this user
  const eligibleForApproval = submittedReports.filter(
    (rep) => rep.reporter_id !== currentUserId
  );

  const handleToggleSelect = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedReportIds.length === eligibleForApproval.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(eligibleForApproval.map((r) => r.id));
    }
  };

  const handleBatchApprove = async () => {
    if (selectedReportIds.length === 0) return;
    const confirmMsg =
      lang === 'ja'
        ? `選択した ${selectedReportIds.length} 件の日報を一括承認しますか？`
        : `Setujui ${selectedReportIds.length} laporan terpilih sekaligus?`;
    if (!window.confirm(confirmMsg)) return;

    setProcessing(true);
    try {
      const res = await batchApproveReports(selectedReportIds);
      const msg =
        lang === 'ja'
          ? `${res.approvedCount} 件の日報を一括承認しました。`
          : `${res.approvedCount} laporan berhasil disetujui sekaligus.`;
      setBatchSuccessMsg(msg);
      if (onToast) onToast(msg);
      setSelectedReportIds([]);
      if (onRefreshReports) onRefreshReports();
      setTimeout(() => setBatchSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Gagal batch approve: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReturnSubmit = async () => {
    if (!returnModalReportId || !returnReason.trim()) return;
    setProcessing(true);
    try {
      await onReturn(returnModalReportId, returnReason);
      setReturnModalReportId(null);
      setReturnReason('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-3 pb-24 space-y-4">
      <div className="bg-slate-800 text-white rounded-lg p-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <div>
            <h2 className="font-bold text-sm">
              {lang === 'ja' ? '提出日報の点検・承認キュー' : 'Antrean Review & Persetujuan Nippou'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === 'ja'
                ? `現在 ${submittedReports.length} 件の日報が確認待ちです`
                : `Ada ${submittedReports.length} laporan menunggu review`}
            </p>
          </div>
        </div>
      </div>

      {batchSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg p-3 text-xs flex items-center space-x-2 font-bold animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{batchSuccessMsg}</span>
        </div>
      )}

      {/* Batch Approval Action Bar */}
      {isEligibleReviewer && eligibleForApproval.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={
                selectedReportIds.length > 0 &&
                selectedReportIds.length === eligibleForApproval.length
              }
              onChange={handleSelectAll}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
            />
            <span>
              {lang === 'ja' ? '全選択' : 'Pilih Semua'} ({selectedReportIds.length}/{eligibleForApproval.length})
            </span>
          </label>

          <button
            onClick={handleBatchApprove}
            disabled={selectedReportIds.length === 0 || processing}
            className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer disabled:cursor-not-allowed"
          >
            {processing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            <span>
              {lang === 'ja'
                ? `一括承認 (${selectedReportIds.length}件)`
                : `Setujui Terpilih (${selectedReportIds.length})`}
            </span>
          </button>
        </div>
      )}

      {!isEligibleReviewer && (
        <div className="bg-amber-50 border border-amber-300 rounded p-3 text-amber-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>
            {lang === 'ja'
              ? '現在の権限 (作業員) では日報の承認や差戻しは行えません。現場監督・事務・管理者のアカウントで実施してください。'
              : 'Peran Anda (Pekerja) tidak memiliki kewenangan approve/return. Gunakan akun Mandor, Kantor, atau Admin.'}
          </span>
        </div>
      )}

      {submittedReports.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-slate-200 text-slate-500 text-sm">
          {lang === 'ja' ? '現在、確認待ちの提出日報はありません。' : 'Tidak ada laporan yang sedang menunggu review.'}
        </div>
      ) : (
        <div className="space-y-3">
          {submittedReports.map((rep) => {
            const isSelfReport = rep.reporter_id === currentUserId;
            return (
              <div
                key={rep.id}
                className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-2.5">
                    {isEligibleReviewer && (
                      <input
                        type="checkbox"
                        checked={selectedReportIds.includes(rep.id)}
                        disabled={isSelfReport || processing}
                        onChange={() => handleToggleSelect(rep.id)}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          isSelfReport
                            ? lang === 'ja'
                              ? '自己作成日報は承認不可 (職責分離)'
                              : 'Tidak bisa menyetujui laporan sendiri'
                            : ''
                        }
                      />
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-800">{rep.work_date}</span>
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                        {lang === 'ja' ? '提出済' : 'SUBMITTED'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{rep.project_name}</span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">
                      {lang === 'ja' ? '報告者: ' : 'Pelapor: '}
                    </span>
                    {rep.reporter_name} {isSelfReport && <span className="text-amber-600 font-bold">(あなた)</span>}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">
                      {lang === 'ja' ? '天候 / 時間: ' : 'Cuaca / Jam: '}
                    </span>
                    {rep.weather} | {rep.site_start_time} ～ {rep.site_end_time}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">
                      {lang === 'ja' ? '作業員数: ' : 'Jumlah Pekerja: '}
                    </span>
                    {rep.worker_count || 0} 名
                  </div>
                </div>

                {isSelfReport && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    {lang === 'ja'
                      ? '※ 職責分離ポリシーにより、自身が作成した日報を承認することはできません。'
                      : '※ Kebijakan separation of duties: Anda tidak dapat menyetujui laporan buatan Anda sendiri.'}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <button
                    onClick={() => onViewReport(rep.id)}
                    className="btn-touch bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{lang === 'ja' ? '詳細確認' : 'Detail'}</span>
                  </button>

                  <button
                    onClick={() => setReturnModalReportId(rep.id)}
                    disabled={!isEligibleReviewer || processing}
                    className="btn-touch bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'ja' ? '差戻し' : 'Return'}</span>
                  </button>

                  <button
                    onClick={() => onApprove(rep.id)}
                    disabled={!isEligibleReviewer || isSelfReport || processing}
                    className="btn-touch bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold space-x-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ja' ? '承認確定' : 'Approve'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Reason Modal */}
      {returnModalReportId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
            <h3 className="font-bold text-sm text-slate-800">
              {lang === 'ja' ? '日報の差戻し (修正理由の入力)' : 'Kembalikan Laporan (Alasan Perbaikan)'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ja'
                ? '現場作業員が修正できるように具体的な不備内容や指示を入力してください。'
                : 'Tuliskan catatan detail hal yang perlu diperbaiki oleh pelapor.'}
            </p>
            <textarea
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="例: 残土搬出数量の確認、作業員の残業時間の確認など"
              className="w-full p-2 border border-slate-300 rounded text-xs"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setReturnModalReportId(null);
                  setReturnReason('');
                }}
                className="flex-1 btn-touch bg-slate-100 text-slate-700 text-xs font-bold"
              >
                {lang === 'ja' ? 'キャンセル' : 'Batal'}
              </button>
              <button
                onClick={handleReturnSubmit}
                disabled={!returnReason.trim() || processing}
                className="flex-1 btn-touch bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {lang === 'ja' ? '差戻し実行' : 'Kirim Pengembalian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
