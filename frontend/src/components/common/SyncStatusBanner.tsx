import React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { Language, translations } from '../../i18n/index.js';

interface SyncStatusBannerProps {
  isOnline: boolean;
  pendingCount: number;
  hasConflict: boolean;
  onSync: () => void;
  onResolveConflict?: () => void;
  lang: Language;
}

export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = ({
  isOnline,
  pendingCount,
  hasConflict,
  onSync,
  onResolveConflict,
  lang,
}) => {
  const t = translations[lang];

  if (hasConflict) {
    return (
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between text-amber-900 text-sm">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />
          <span className="font-semibold">{t.sync.conflict}</span>
        </div>
        {onResolveConflict && (
          <button
            onClick={onResolveConflict}
            className="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded text-xs font-bold shadow-sm"
          >
            {lang === 'ja' ? '内容を確認・解決' : 'Tinjau & Selesaikan'}
          </button>
        )}
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>{t.sync.offline}</span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
            {pendingCount} {t.sync.pending}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-blue-900 text-xs">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          <span>
            {pendingCount} {t.sync.pending}
          </span>
        </div>
        <button
          onClick={onSync}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-semibold"
        >
          {lang === 'ja' ? '今すぐ同期' : 'Sinkronkan'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-slate-600 text-xs">
      <div className="flex items-center space-x-1.5">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>{t.sync.synced}</span>
      </div>
      <div className="flex items-center space-x-1 text-slate-400">
        <Wifi className="w-3 h-3 text-emerald-600" />
        <span className="font-mono">Online</span>
      </div>
    </div>
  );
};
