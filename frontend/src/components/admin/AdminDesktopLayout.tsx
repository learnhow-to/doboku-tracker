import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  FileSpreadsheet,
  Database,
  CheckSquare,
  FileText,
  Smartphone,
  LogOut,
  Globe,
  Building,
  HardHat,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Language } from '../../i18n/index.js';

interface AdminDesktopLayoutProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  currentUser: any;
  projects: any[];
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onLogout: () => void;
  onSwitchToMobile: () => void;
  lang: Language;
  onToggleLang: () => void;
  onSelectLang?: (lang: Language) => void;
  reviewCount: number;
  children: React.ReactNode;
}

export const AdminDesktopLayout: React.FC<AdminDesktopLayoutProps> = ({
  currentTab,
  onChangeTab,
  currentUser,
  projects,
  currentProjectId,
  onSelectProject,
  onLogout,
  onSwitchToMobile,
  lang,
  onToggleLang,
  onSelectLang,
  reviewCount,
  children,
}) => {
  const navItems = [
    { id: 'dashboard', label: lang === 'ja' ? '統括ダッシュボード' : 'Dashboard Ringkasan', icon: LayoutDashboard },
    { id: 'calendar', label: lang === 'ja' ? '月次カレンダー' : 'Kalender Bulanan', icon: Calendar },
    { id: 'export', label: lang === 'ja' ? '集計・CSVエクスポート' : 'Rekap & Ekspor Excel', icon: FileSpreadsheet },
    { id: 'master', label: lang === 'ja' ? 'マスターデータ管理' : 'Kelola Master Data', icon: Database },
    { id: 'review', label: lang === 'ja' ? '日報点検・承認' : 'Review & Persetujuan', icon: CheckSquare, badge: reviewCount },
    { id: 'reports', label: lang === 'ja' ? '現場日報台帳' : 'Buku Daftar Laporan', icon: FileText },
  ];

  const activeProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-row font-sans text-slate-800">
      {/* Left Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 border-r border-slate-800 z-20">
        {/* Company Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded shadow-sm flex items-center justify-center">
              <img src="/logo.png" alt="株式会社グレイス" className="h-7 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-100">株式会社グレイス</h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[10px] bg-teal-900/80 text-teal-300 px-1.5 py-0.5 rounded font-mono font-bold border border-teal-700/50">
                  本社管理システム
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
            {lang === 'ja' ? '業務メニュー' : 'Menu Utama'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
              {lang === 'ja' ? '現場連携・表示切替' : 'Tampilan Lapangan'}
            </div>
            <button
              onClick={onSwitchToMobile}
              className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-bold text-teal-300 hover:bg-slate-800 border border-teal-800/60 transition"
            >
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span>{lang === 'ja' ? '現場スマホ画面 (プレビュー)' : 'Mode HP Lapangan'}</span>
            </button>
          </div>
        </nav>

        {/* Current User & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold text-xs">
                {currentUser?.displayName?.[0] || 'A'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-200 truncate">
                  {currentUser?.displayName}
                </div>
                <div className="text-[10px] text-teal-400 font-mono uppercase">
                  {currentUser?.orgRole || 'admin'}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-4">
            {/* Project Filter */}
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">
                {lang === 'ja' ? '作業現場:' : 'Proyek Aktif:'}
              </span>
              <select
                value={currentProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="text-xs font-bold text-slate-800 border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 hover:bg-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Language Switcher Segmented Control */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-300 text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => (onSelectLang ? onSelectLang('ja') : onToggleLang())}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded transition cursor-pointer ${
                  lang === 'ja'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="日本語に切替"
              >
                <span>🇯🇵</span>
                <span>日本語</span>
              </button>
              <button
                type="button"
                onClick={() => (onSelectLang ? onSelectLang('id') : onToggleLang())}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded transition cursor-pointer ${
                  lang === 'id'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ganti ke Bahasa Indonesia"
              >
                <span>🇮🇩</span>
                <span>Indonesia</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content View Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};