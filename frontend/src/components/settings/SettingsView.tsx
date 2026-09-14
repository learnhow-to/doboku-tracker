import React from 'react';
import { User, LogOut, RefreshCw, Globe, AlertTriangle, Building, HardHat, Database } from 'lucide-react';
import { Language } from '../../i18n/index.js';

interface SettingsViewProps {
  currentUser: any;
  projects: any[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  pendingCount: number;
  onSync: () => void;
  lang: Language;
  onToggleLang: () => void;
  onSelectLang?: (lang: Language) => void;
  onOpenMasterData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  projects,
  currentProjectId,
  onSelectProject,
  onSwitchUser,
  onLogout,
  pendingCount,
  onSync,
  lang,
  onToggleLang,
  onSelectLang,
  onOpenMasterData,
}) => {
  const demoUsers = [
    { id: 'usr-worker-1', name: '佐藤 健太', role: 'worker', desc: '現場作業員 (渋谷現場)' },
    { id: 'usr-foreman', name: '鈴木 一郎', role: 'foreman', desc: '現場主任/監督 (全現場承認権限)' },
    { id: 'usr-office', name: '渡辺 美咲', role: 'office', desc: '事務・事務所承認者' },
    { id: 'usr-admin', name: '田中 宏', role: 'admin', desc: '会社全体管理者' },
  ];

  return (
    <div className="max-w-lg mx-auto px-3 pb-24 space-y-4">
      {/* Current User Card */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-800 text-white p-2.5 rounded-full">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-slate-800">{currentUser?.displayName}</div>
            <div className="text-xs text-slate-500">{currentUser?.email}</div>
            <span className="inline-block mt-1 bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {currentUser?.orgRole || 'worker'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Master Data Navigation */}
      {currentUser?.orgRole === 'admin' && onOpenMasterData && (
        <div className="bg-slate-800 text-white rounded-lg p-4 shadow-sm border border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300">
                {lang === 'ja' ? 'マスターデータ管理' : 'Kelola Master Data'}
              </h3>
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              {lang === 'ja'
                ? '現場プロジェクト、作業員、重機・機材の追加・編集'
                : 'Pusat master proyek, daftar pekerja & armada alat berat'}
            </p>
          </div>
          <button
            onClick={onOpenMasterData}
            className="btn-touch bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow ml-3 flex-shrink-0"
          >
            {lang === 'ja' ? '開く' : 'Buka'}
          </button>
        </div>
      )}

      {/* Project Switcher */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
          <Building className="w-4 h-4 text-teal-600" />
          <span>{lang === 'ja' ? '担当現場の切り替え' : 'Pilih Proyek Aktif'}</span>
        </h3>
        <div className="space-y-1.5">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className={`w-full text-left p-2.5 rounded text-xs flex items-center justify-between border ${
                currentProjectId === p.id
                  ? 'border-teal-600 bg-teal-50/70 font-bold text-teal-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div>
                <div>{p.name}</div>
                <div className="text-[10px] text-slate-400">{p.code} | {p.main_contractor}</div>
              </div>
              {currentProjectId === p.id && (
                <span className="text-[10px] bg-teal-700 text-white px-2 py-0.5 rounded">
                  {lang === 'ja' ? '選択中' : 'Aktif'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Switch Demo Role (Pilot Simulation) */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
          <HardHat className="w-4 h-4 text-amber-600" />
          <span>{lang === 'ja' ? 'パイロット確認用: ユーザー切り替え' : 'Simulasi Peran Pilot'}</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          {lang === 'ja'
            ? '作業員による提出、および監督・事務による点検・承認の分離フローを確認できます。'
            : 'Uji alur pemisahan tugas: pengajuan oleh pekerja vs approval oleh mandor/kantor.'}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {demoUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => onSwitchUser(u.id)}
              className={`p-2 rounded text-left border text-xs ${
                currentUser?.id === u.id
                  ? 'border-amber-600 bg-amber-50 font-bold text-amber-950'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-bold">{u.name}</div>
              <div className="text-[10px] text-slate-500">{u.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Language Toggle */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold text-slate-700">
            {lang === 'ja' ? '言語切替 (Bahasa)' : 'Bahasa Tampilan (Language)'}
          </span>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-300 text-xs font-bold shadow-xs">
          <button
            type="button"
            onClick={() => (onSelectLang ? onSelectLang('ja') : onToggleLang())}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition cursor-pointer ${
              lang === 'ja'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇯🇵</span>
            <span>日本語</span>
          </button>
          <button
            type="button"
            onClick={() => (onSelectLang ? onSelectLang('id') : onToggleLang())}
            className={`flex items-center space-x-1 px-3 py-1 rounded transition cursor-pointer ${
              lang === 'id'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇮🇩</span>
            <span>Indonesia</span>
          </button>
        </div>
      </div>

      {/* Sync Queue Card */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-700">
              {lang === 'ja' ? '端末ストレージ (IndexedDB)' : 'Penyimpanan Lokal (IndexedDB)'}
            </span>
          </div>
          <button
            onClick={onSync}
            disabled={pendingCount === 0}
            className="text-xs text-teal-700 font-bold hover:underline disabled:opacity-40"
          >
            {lang === 'ja' ? '今すぐ同期' : 'Sync Sekarang'}
          </button>
        </div>
        <div className="text-xs text-slate-500">
          {pendingCount > 0 ? (
            <span className="text-amber-700 font-semibold">
              ⚠️ {pendingCount} {lang === 'ja' ? '件のデータが送信待ちです' : 'item menunggu sinkronisasi'}
            </span>
          ) : (
            <span className="text-emerald-700 font-semibold">
              ✓ {lang === 'ja' ? 'すべてのデータが同期完了しています' : 'Semua data telah tersinkron'}
            </span>
          )}
        </div>
      </div>

      {/* Safe Logout Button */}
      <div className="pt-2">
        <button
          onClick={onLogout}
          className="w-full btn-touch bg-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold space-x-1.5 border border-slate-300 rounded"
        >
          <LogOut className="w-4 h-4" />
          <span>{lang === 'ja' ? 'ログアウト (安全確認あり)' : 'Logout (Dengan Peringatan Aman)'}</span>
        </button>
      </div>
    </div>
  );
};
