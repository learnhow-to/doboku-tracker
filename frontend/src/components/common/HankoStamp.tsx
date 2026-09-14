import React from 'react';

interface HankoStampProps {
  name: string;
  date?: string;
  label?: string; // e.g. '提出' | '確認' | '承認'
  size?: 'sm' | 'md' | 'lg';
  rotation?: number; // e.g. -3
  className?: string;
}

export const HankoStamp: React.FC<HankoStampProps> = ({
  name,
  date = new Date().toISOString().substring(0, 10),
  label = '承認',
  size = 'md',
  rotation = -3,
  className = '',
}) => {
  // Extract Japanese surname (first part of name)
  const surname = name ? name.trim().split(/[\s　]+/)[0] : '担当';
  const formattedDate = date ? date.substring(0, 10).replace(/-/g, '.') : '';

  const sizeClasses = {
    sm: 'w-10 h-10 text-[9px]',
    md: 'w-14 h-14 text-xs',
    lg: 'w-20 h-20 text-sm',
  };

  const topSizeClasses = {
    sm: 'text-[8px]',
    md: 'text-[11px]',
    lg: 'text-sm',
  };

  const dateSizeClasses = {
    sm: 'text-[6px]',
    md: 'text-[8px]',
    lg: 'text-[10px]',
  };

  const bottomSizeClasses = {
    sm: 'text-[7px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-full border-2 border-red-600 text-red-600 font-serif font-bold select-none shadow-sm transition transform hover:scale-105 ${sizeClasses[size]} ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        backgroundColor: 'rgba(254, 242, 242, 0.4)',
      }}
      title={`電子印鑑: ${surname} (${label} ${formattedDate})`}
    >
      <span className={`leading-none tracking-wider ${topSizeClasses[size]}`}>
        {surname}
      </span>
      <span
        className={`w-[85%] border-t border-b border-red-500 my-0.5 py-0.5 font-mono text-center leading-none ${dateSizeClasses[size]}`}
      >
        {formattedDate}
      </span>
      <span className={`leading-none tracking-widest ${bottomSizeClasses[size]}`}>
        {label}
      </span>
    </div>
  );
};

interface HankoApprovalBlockProps {
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';
  reporterName: string;
  approvedBy?: string;
  workDate: string;
  approvedAt?: string;
  lang?: 'ja' | 'id';
  size?: 'sm' | 'md';
}

export const HankoApprovalBlock: React.FC<HankoApprovalBlockProps> = ({
  status,
  reporterName,
  approvedBy,
  workDate,
  approvedAt,
  lang = 'ja',
  size = 'md',
}) => {
  const isSubmitted = status === 'SUBMITTED' || status === 'APPROVED';
  const isApproved = status === 'APPROVED';

  return (
    <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden inline-block text-center">
      <div className="bg-slate-100 text-slate-700 text-[10px] font-bold py-1 px-2 border-b border-slate-300">
        {lang === 'ja' ? '電子決裁・承認印 (3段階)' : 'Stempel Persetujuan Digital'}
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-300">
        {/* 1. 所長 / 検査 (Director / Approver) */}
        <div className="flex flex-col items-center p-2 min-w-[72px]">
          <span className="text-[10px] font-bold text-slate-600 mb-1">
            {lang === 'ja' ? '所長・確認' : 'Direktur'}
          </span>
          <div className="h-14 flex items-center justify-center">
            {isApproved ? (
              <HankoStamp
                name="東土"
                date={approvedAt || workDate}
                label="承認"
                size={size}
                rotation={-4}
              />
            ) : (
              <span className="text-[10px] text-slate-300 italic">
                {lang === 'ja' ? '未決' : 'Pending'}
              </span>
            )}
          </div>
        </div>

        {/* 2. 現場代理人 / 主任技術者 (Site Manager) */}
        <div className="flex flex-col items-center p-2 min-w-[72px]">
          <span className="text-[10px] font-bold text-slate-600 mb-1">
            {lang === 'ja' ? '現場代理人' : 'Site Mgr'}
          </span>
          <div className="h-14 flex items-center justify-center">
            {isApproved ? (
              <HankoStamp
                name={approvedBy || '代理人'}
                date={approvedAt || workDate}
                label="確認"
                size={size}
                rotation={2}
              />
            ) : (
              <span className="text-[10px] text-slate-300 italic">
                {lang === 'ja' ? '未決' : 'Pending'}
              </span>
            )}
          </div>
        </div>

        {/* 3. 担当 / 職長 (Foreman / Reporter) */}
        <div className="flex flex-col items-center p-2 min-w-[72px]">
          <span className="text-[10px] font-bold text-slate-600 mb-1">
            {lang === 'ja' ? '担当・作成' : 'Mandor'}
          </span>
          <div className="h-14 flex items-center justify-center">
            {isSubmitted ? (
              <HankoStamp
                name={reporterName}
                date={workDate}
                label="提出"
                size={size}
                rotation={-2}
              />
            ) : (
              <span className="text-[10px] text-slate-300 italic">
                {lang === 'ja' ? '作成中' : 'Draft'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
