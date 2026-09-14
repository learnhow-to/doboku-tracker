import React from 'react';
import { HardHat, Globe } from 'lucide-react';
import { Language } from '../../i18n/index.js';

interface HeaderProps {
  currentProjectName?: string;
  userDisplayName?: string;
  userRole?: string;
  lang: Language;
  onToggleLang?: () => void;
  onSelectLang?: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProjectName,
  userDisplayName,
  userRole,
  lang,
  onToggleLang,
  onSelectLang,
}) => {
  const handleSwitch = (target: Language) => {
    if (onSelectLang) {
      onSelectLang(target);
    } else if (onToggleLang) {
      onToggleLang();
    }
  };

  const roleLabel =
    lang === 'ja'
      ? userRole === 'admin'
        ? '管理者'
        : userRole === 'foreman'
        ? '職長'
        : userRole === 'office'
        ? '事務'
        : '作業員'
      : userRole === 'admin'
      ? 'Admin'
      : userRole === 'foreman'
      ? 'Mandor'
      : userRole === 'office'
      ? 'Kantor'
      : 'Pekerja';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 shadow-md">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-white px-1.5 py-0.5 rounded shadow-sm flex items-center justify-center">
            <img src="/logo.png" alt="株式会社グレイス" className="h-6 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-100 flex items-center space-x-1.5">
              <span>株式会社グレイス</span>
              <span className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono font-bold">
                {lang === 'ja' ? '土木日報' : 'Nippou Sipil'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
              {currentProjectName || (lang === 'ja' ? '現場未選択' : 'Proyek Belum Dipilih')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Segmented Language Switcher */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleSwitch('ja')}
              className={`px-2 py-0.5 rounded text-[11px] transition flex items-center space-x-0.5 ${
                lang === 'ja'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="日本語に切替"
            >
              <span>🇯🇵</span>
              <span>JP</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitch('id')}
              className={`px-2 py-0.5 rounded text-[11px] transition flex items-center space-x-0.5 ${
                lang === 'id'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ganti ke Bahasa Indonesia"
            >
              <span>🇮🇩</span>
              <span>ID</span>
            </button>
          </div>

          {userDisplayName && (
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200 leading-tight">
                {userDisplayName.split(' ')[0]}
              </div>
              <div className="text-[10px] text-teal-400 font-mono uppercase">
                {roleLabel}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
