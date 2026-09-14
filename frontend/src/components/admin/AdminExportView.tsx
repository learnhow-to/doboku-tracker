import React, { useState, useEffect } from 'react';
import {
  Download,
  Users,
  Wrench,
  Layers,
  Calendar,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Building,
} from 'lucide-react';
import {
  getWorkforceSummary,
  getEquipmentSummary,
  getWorkItemsSummary,
  getCsvDownloadUrl,
  getExcelDownloadUrl,
} from '../../services/api.js';
import { Language } from '../../i18n/index.js';

interface AdminExportViewProps {
  projects: any[];
  currentProjectId?: string;
  lang: Language;
}

type TabType = 'workforce' | 'equipment' | 'work-items';

export const AdminExportView: React.FC<AdminExportViewProps> = ({
  projects,
  currentProjectId,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('workforce');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Date range defaults: current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(lastDay);

  const [loading, setLoading] = useState<boolean>(false);
  const [workforceData, setWorkforceData] = useState<any>(null);
  const [equipmentData, setEquipmentData] = useState<any>(null);
  const [workItemsData, setWorkItemsData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        projectId: selectedProjectId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      if (activeTab === 'workforce') {
        const res = await getWorkforceSummary(params);
        setWorkforceData(res);
      } else if (activeTab === 'equipment') {
        const res = await getEquipmentSummary(params);
        setEquipmentData(res);
      } else if (activeTab === 'work-items') {
        const res = await getWorkItemsSummary(params);
        setWorkItemsData(res);
      }
    } catch (err) {
      console.error('Failed to load export data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedProjectId, startDate, endDate]);

  const handleDownloadExcel = () => {
    const url = getExcelDownloadUrl(activeTab, {
      projectId: selectedProjectId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    window.open(url, '_blank');
  };

  const handleDownloadCsv = () => {
    const url = getCsvDownloadUrl(activeTab, {
      projectId: selectedProjectId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>{lang === 'ja' ? '集計・エクスポート (Excel / CSV)' : 'Rekapitulasi & Ekspor Excel/CSV'}</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>EXCEL READY</span>
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ja'
              ? '公式帳票Excel（装飾・合計枠線付き）および基幹システム連携用CSVを出力します。'
              : 'Ekspor laporan resmi format Excel (.xlsx dengan styling korporat) dan CSV untuk payroll/sistem akuntansi.'}
          </p>
        </div>

        {/* Action Buttons: Dual Excel & CSV */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleDownloadCsv}
            className="btn-touch bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-2 rounded shadow-sm flex items-center space-x-1.5 transition"
            title={lang === 'ja' ? 'UTF-8 BOM付きCSV (基幹給与・外部システム連携用)' : 'Ekspor CSV BOM UTF-8'}
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'ja' ? 'CSV形式 (.csv)' : 'Format CSV'}</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="btn-touch bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded shadow flex items-center space-x-2 transition"
            title={lang === 'ja' ? '公式帳票 (Meiryoフォント・装飾枠線・合計数式完備)' : 'Ekspor Excel Resmi'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>
              {lang === 'ja'
                ? activeTab === 'workforce'
                  ? '労務台帳 Excel (.xlsx)'
                  : activeTab === 'equipment'
                  ? '重機・燃料台帳 Excel (.xlsx)'
                  : '出来高台帳 Excel (.xlsx)'
                : 'Unduh Excel (.xlsx)'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-700">{lang === 'ja' ? '絞り込み条件:' : 'Filter:'}</span>
        </div>

        {/* Project Selector */}
        <div className="flex items-center space-x-1.5">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800"
          >
            <option value="">{lang === 'ja' ? '【全社】すべての現場' : 'Semua Proyek'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono"
          />
          <span className="text-slate-400">～</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-mono"
          />
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn-touch bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded border border-slate-300 ml-auto flex items-center space-x-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'ja' ? '再集計' : 'Hitung Ulang'}</span>
        </button>
      </div>

      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('workforce')}
          className={`pb-3 px-1 flex items-center space-x-1.5 border-b-2 transition ${
            activeTab === 'workforce'
              ? 'border-teal-600 text-teal-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'ja' ? '労務・人工集計' : 'Rekap Tenaga Kerja'}</span>
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          className={`pb-3 px-1 flex items-center space-x-1.5 border-b-2 transition ${
            activeTab === 'equipment'
              ? 'border-teal-600 text-teal-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>{lang === 'ja' ? '重機・燃料(軽油)集計' : 'Rekap Alat Berat & Solar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('work-items')}
          className={`pb-3 px-1 flex items-center space-x-1.5 border-b-2 transition ${
            activeTab === 'work-items'
              ? 'border-teal-600 text-teal-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{lang === 'ja' ? '出来高・工種集計' : 'Rekap Volume Pekerjaan'}</span>
        </button>
      </div>

      {/* Tab Contents: On-screen Summary Table */}
      {loading ? (
        <div className="bg-white rounded-lg p-12 text-center text-slate-500 text-xs border border-slate-200">
          {lang === 'ja' ? 'データを集計中...' : 'Menghitung rekapitulasi data...'}
        </div>
      ) : activeTab === 'workforce' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span>
              {lang === 'ja' ? '集計対象作業員数: ' : 'Jumlah pekerja tercatat: '}
              <strong>{workforceData?.summary?.length || 0}</strong> {lang === 'ja' ? '名' : 'orang'}
            </span>
            <span className="text-[11px] text-slate-400">
              ※ 通常時間は8時間基準、超過分は残業時間として分別計算
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">{lang === 'ja' ? '作業員氏名' : 'Nama'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '所属会社' : 'Perusahaan'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '工種・職種' : 'Trade'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '出勤日数' : 'Hari Kerja'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '通常時間(h)' : 'Normal (h)'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '残業時間(h)' : 'Lembur (h)'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '合計時間(h)' : 'Total (h)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {workforceData?.summary?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      {lang === 'ja' ? '指定期間の労務データがありません。' : 'Tidak ada data pada periode ini.'}
                    </td>
                  </tr>
                ) : (
                  workforceData?.summary?.map((w: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{w.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.company === '自社' ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>
                          {w.company}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{w.trade}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">{w.work_days} 日</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">{Number(w.total_regular_hours).toFixed(1)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">{Number(w.total_overtime_hours).toFixed(1)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{Number(w.total_hours).toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'equipment' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <span>
              {lang === 'ja' ? '集計対象重機数: ' : 'Jumlah alat berat tercatat: '}
              <strong>{equipmentData?.summary?.length || 0}</strong> {lang === 'ja' ? '機種' : 'unit'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">{lang === 'ja' ? '重機・車両名' : 'Nama Alat'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '調達先' : 'Vendor'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '出番日数' : 'Hari Pakai'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '稼働時間(h)' : 'Jam Operasi'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '軽油給油量(L)' : 'Solar (Liter)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {equipmentData?.summary?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      {lang === 'ja' ? '指定期間の重機データがありません。' : 'Tidak ada data alat pada periode ini.'}
                    </td>
                  </tr>
                ) : (
                  equipmentData?.summary?.map((eq: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{eq.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{eq.vendor}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">{eq.deployment_days} 日</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-teal-800">{Number(eq.total_operating_hours).toFixed(1)} h</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">{Number(eq.total_diesel_liters).toFixed(0)} L</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <span>
              {lang === 'ja' ? '工種別出来高項目数: ' : 'Total item pekerjaan: '}
              <strong>{workItemsData?.summary?.length || 0}</strong> {lang === 'ja' ? '区分' : 'item'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">{lang === 'ja' ? '工種名称' : 'Jenis Pekerjaan'}</th>
                  <th className="py-2.5 px-4">{lang === 'ja' ? '単位' : 'Satuan'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '累計出来高数量' : 'Total Volume'}</th>
                  <th className="py-2.5 px-4 text-right">{lang === 'ja' ? '施工記録回数' : 'Frekuensi'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {workItemsData?.summary?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      {lang === 'ja' ? '指定期間の出来高データがありません。' : 'Tidak ada data volume pada periode ini.'}
                    </td>
                  </tr>
                ) : (
                  workItemsData?.summary?.map((wi: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{wi.work_type}</td>
                      <td className="py-2.5 px-4 text-slate-600">{wi.unit}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{Number(wi.total_quantity).toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{wi.entry_count} 回</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};