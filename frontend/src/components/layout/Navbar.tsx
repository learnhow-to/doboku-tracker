import React from 'react';
import { Calendar, FileText, CheckSquare, Settings } from 'lucide-react';
import { Language, translations } from '../../i18n/index.js';

export type TabType = 'today' | 'reports' | 'review' | 'settings';

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  reviewCount: number;
  lang: Language;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onChangeTab, reviewCount, lang }) => {
  const t = translations[lang];

  const navItems = [
    { id: 'today' as TabType, label: t.today, icon: Calendar },
    { id: 'reports' as TabType, label: t.reports, icon: FileText },
    { id: 'review' as TabType, label: t.review, icon: CheckSquare, badge: reviewCount },
    { id: 'settings' as TabType, label: t.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-white shadow-lg">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full py-1 relative focus:outline-none ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
              {isActive && <div className="absolute bottom-0 w-8 h-0.5 bg-teal-400 rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
