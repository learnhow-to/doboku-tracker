import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Language } from '../../i18n/index.js';

interface ConflictModalProps {
  isOpen: boolean;
  localData: any;
  serverData: any;
  onKeepLocal: () => void;
  onUseServer: () => void;
  onCancel: () => void;
  lang: Language;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  localData,
  serverData,
  onKeepLocal,
  onUseServer,
  onCancel,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4">
        <div className="flex items-center space-x-2 text-amber-700">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <h3 className="text-lg font-bold">
            {lang === 'ja' ? 'バージョン衝突の解決 (HTTP 409)' : 'Resolusi Konflik Versi (HTTP 409)'}
          </h3>
        </div>

        <p className="text-sm text-slate-600">
          {lang === 'ja'
            ? 'サーバー上の日報が別の端末で更新されました。ローカルの入力内容を破棄せずに維持しています。どちらの内容を採用するか選択してください。'
            : 'Laporan di server telah diperbarui oleh perangkat lain. Input lokal Anda tetap dipertahankan. Pilih versi data yang ingin Anda gunakan.'}
        </p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="border border-slate-300 rounded p-3 bg-slate-50">
            <div className="font-bold text-slate-800 mb-1">
              {lang === 'ja' ? '📱 端末のローカル入力' : '📱 Input Lokal di Perangkat'}
            </div>
            <div>天候: {localData?.weather || '-'}</div>
            <div>作業員数: {localData?.workers?.length || 0} 名</div>
            <div>作業項目: {localData?.workItems?.length || 0} 件</div>
          </div>

          <div className="border border-blue-300 rounded p-3 bg-blue-50">
            <div className="font-bold text-blue-900 mb-1">
              {lang === 'ja' ? '☁️ サーバーの最新データ' : '☁️ Data Terkini di Server'}
            </div>
            <div>バージョン: v{serverData?.version || '-'}</div>
            <div>天候: {serverData?.weather || '-'}</div>
            <div>作業員数: {serverData?.workers?.length || 0} 名</div>
            <div>作業項目: {serverData?.workItems?.length || 0} 件</div>
          </div>
        </div>

        <div className="flex flex-col space-y-2 pt-2">
          <button
            onClick={onKeepLocal}
            className="w-full btn-touch bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-sm"
          >
            {lang === 'ja'
              ? '端末の内容を維持してサーバーへ上書き再送 (最新版として再試行)'
              : 'Pertahankan Input Lokal & Simpan Ulang sebagai Versi Baru'}
          </button>
          <button
            onClick={onUseServer}
            className="w-full btn-touch bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded text-sm"
          >
            {lang === 'ja'
              ? 'サーバーの最新版を採用 (端末の入力を破棄)'
              : 'Gunakan Versi Server (Buang Input Lokal)'}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
          >
            {lang === 'ja' ? '閉じる (後で確認)' : 'Batal / Tinjau Nanti'}
          </button>
        </div>
      </div>
    </div>
  );
};
