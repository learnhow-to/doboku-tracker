import React, { useState, useEffect } from 'react';
import { X, Printer, AlertTriangle, ExternalLink } from 'lucide-react';
import { apiRequest, getAuthToken } from '../../services/api.js';
import { Language } from '../../i18n/index.js';

interface NippouPreviewProps {
  reportId: string;
  onClose: () => void;
  lang: Language;
}

export const NippouPreview: React.FC<NippouPreviewProps> = ({ reportId, onClose, lang }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHtml() {
      try {
        setLoading(true);
        setError(null);
        const html = await apiRequest<string>(`/api/reports/${reportId}/export/html`);
        setHtmlContent(html);
      } catch (err: any) {
        console.error('Failed to load export html:', err);
        setError(err.message || 'Gagal memuat template laporan');
      } finally {
        setLoading(false);
      }
    }
    loadHtml();
  }, [reportId]);

  const handlePrint = () => {
    try {
      const iframe = document.getElementById('print-frame') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      }
    } catch (err) {
      console.warn('Iframe print error, falling back to popup window:', err);
    }

    // Reliable fallback: popup print window
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 300);
    } else {
      // If popup blocked, open URL directly
      const token = getAuthToken();
      window.open(`/api/reports/${reportId}/export/html?token=${token}`, '_blank');
    }
  };

  const handleOpenInNewTab = () => {
    const token = getAuthToken();
    window.open(`/api/reports/${reportId}/export/html?token=${token}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col animate-fade-in">
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xs sm:text-sm">
            {lang === 'ja' ? '作業日報 A4 印刷プレビュー' : 'Preview Cetak A4 作業日報'}
          </span>
          <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
            DRAFT TEMPLATE
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={handleOpenInNewTab}
            className="btn-touch bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center space-x-1"
            title={lang === 'ja' ? '新しいタブで開く' : 'Buka di Tab Baru'}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ja' ? '別タブ' : 'Tab Baru'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || !!error}
            className="btn-touch bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-xs font-bold flex items-center space-x-1 shadow"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ja' ? '印刷 / PDF' : 'Cetak / PDF'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-1.5 text-amber-900 text-[11px] sm:text-xs flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          {lang === 'ja'
            ? '【原本照合待ち】この帳票は14027.jpg/14028.jpgからの暫定再構成版です。原本照合完了まで公式原本として扱わないでください。'
            : 'Perhatian: Template ini adalah draft rekonstruksi dari foto 14027.jpg/14028.jpg (belum diverifikasi penuh oleh kantor).'}
        </span>
      </div>

      {/* Iframe content displaying real Japanese A4 */}
      <div className="flex-1 bg-slate-400 p-2 sm:p-4 overflow-auto flex justify-center">
        {loading ? (
          <div className="flex items-center justify-center text-slate-800 text-sm font-bold">
            日報帳票を生成中... (Memuat template...)
          </div>
        ) : error ? (
          <div className="text-rose-600 bg-white p-4 rounded shadow self-center max-w-md text-sm">
            <div className="font-bold mb-1">エラーが発生しました:</div>
            <div>{error}</div>
          </div>
        ) : (
          <div className="bg-white shadow-2xl rounded max-w-3xl w-full min-h-[842px] overflow-hidden">
            <iframe
              id="print-frame"
              srcDoc={htmlContent}
              title="A4 Nippou Document"
              className="w-full h-full min-h-[842px] border-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
