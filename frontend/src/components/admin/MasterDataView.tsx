import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Wrench,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle,
  X,
  Search,
  HardHat,
} from 'lucide-react';
import {
  getMasterWorkers,
  createMasterWorker,
  updateMasterWorker,
  deleteMasterWorker,
  getMasterEquipment,
  createMasterEquipment,
  updateMasterEquipment,
  deleteMasterEquipment,
  createProject,
  updateProject,
} from '../../services/api.js';
import { Language } from '../../i18n/index.js';

interface MasterDataViewProps {
  projects: any[];
  onRefreshProjects: () => Promise<void>;
  onBack: () => void;
  lang: Language;
}

type MasterTab = 'projects' | 'workers' | 'equipment';

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  projects,
  onRefreshProjects,
  onBack,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<MasterTab>('projects');
  const [workers, setWorkers] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form States for Project
  const [projName, setProjName] = useState<string>('');
  const [projCode, setProjCode] = useState<string>('');
  const [projContractor, setProjContractor] = useState<string>('');
  const [projLocation, setProjLocation] = useState<string>('');

  // Form States for Worker
  const [workerName, setWorkerName] = useState<string>('');
  const [workerCompany, setWorkerCompany] = useState<string>('自社');
  const [workerTrade, setWorkerTrade] = useState<string>('普通作業員');
  const [workerHours, setWorkerHours] = useState<number>(8.0);
  const [workerPhone, setWorkerPhone] = useState<string>('');

  // Form States for Equipment
  const [equipName, setEquipName] = useState<string>('');
  const [equipCode, setEquipCode] = useState<string>('');
  const [equipCategory, setEquipCategory] = useState<string>('heavy_machinery');
  const [equipVendor, setEquipVendor] = useState<string>('自社');
  const [equipUnit, setEquipUnit] = useState<string>('台');

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'workers') {
        const data = await getMasterWorkers(true);
        setWorkers(data);
      } else if (activeTab === 'equipment') {
        const data = await getMasterEquipment(true);
        setEquipment(data);
      } else if (activeTab === 'projects') {
        await onRefreshProjects();
      }
    } catch (err: any) {
      console.error('Failed to load master data:', err);
      alert(err.message || 'Gagal memuat master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSearchQuery('');
  }, [activeTab]);

  const openAddModal = () => {
    setEditingItem(null);
    if (activeTab === 'projects') {
      setProjName('');
      setProjCode(`GENBA-${new Date().getFullYear()}-${Math.floor(Math.random() * 90 + 10)}`);
      setProjContractor('');
      setProjLocation('');
    } else if (activeTab === 'workers') {
      setWorkerName('');
      setWorkerCompany('自社');
      setWorkerTrade('普通作業員');
      setWorkerHours(8.0);
      setWorkerPhone('');
    } else {
      setEquipName('');
      setEquipCode('');
      setEquipCategory('heavy_machinery');
      setEquipVendor('自社');
      setEquipUnit('台');
    }
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'projects') {
      setProjName(item.name || '');
      setProjCode(item.code || '');
      setProjContractor(item.main_contractor || '');
      setProjLocation(item.location || '');
    } else if (activeTab === 'workers') {
      setWorkerName(item.name || '');
      setWorkerCompany(item.company || '自社');
      setWorkerTrade(item.trade || '普通作業員');
      setWorkerHours(item.default_work_hours || 8.0);
      setWorkerPhone(item.phone || '');
    } else {
      setEquipName(item.name || '');
      setEquipCode(item.code_number || '');
      setEquipCategory(item.category || 'heavy_machinery');
      setEquipVendor(item.vendor || '自社');
      setEquipUnit(item.unit || '台');
    }
    setModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'projects') {
        if (editingItem) {
          await updateProject(editingItem.id, {
            name: projName,
            code: projCode,
            main_contractor: projContractor,
            location: projLocation,
          });
        } else {
          await createProject({
            name: projName,
            code: projCode,
            main_contractor: projContractor,
            location: projLocation,
          });
        }
        await onRefreshProjects();
      } else if (activeTab === 'workers') {
        if (editingItem) {
          await updateMasterWorker(editingItem.id, {
            name: workerName,
            company: workerCompany,
            trade: workerTrade,
            default_work_hours: Number(workerHours),
            phone: workerPhone,
          });
        } else {
          await createMasterWorker({
            name: workerName,
            company: workerCompany,
            trade: workerTrade,
            default_work_hours: Number(workerHours),
            phone: workerPhone,
          });
        }
        const data = await getMasterWorkers(true);
        setWorkers(data);
      } else {
        if (editingItem) {
          await updateMasterEquipment(editingItem.id, {
            name: equipName,
            code_number: equipCode,
            category: equipCategory,
            vendor: equipVendor,
            unit: equipUnit,
          });
        } else {
          await createMasterEquipment({
            name: equipName,
            code_number: equipCode,
            category: equipCategory,
            vendor: equipVendor,
            unit: equipUnit,
          });
        }
        const data = await getMasterEquipment(true);
        setEquipment(data);
      }
      setModalOpen(false);
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    const confirm = window.confirm(
      lang === 'ja'
        ? `【確認】「${name}」をマスターから削除（無効化）しますか？`
        : `Yakin ingin menonaktifkan "${name}" dari master data?`
    );
    if (!confirm) return;

    try {
      if (activeTab === 'workers') {
        await deleteMasterWorker(id);
        const data = await getMasterWorkers(true);
        setWorkers(data);
      } else if (activeTab === 'equipment') {
        await deleteMasterEquipment(id);
        const data = await getMasterEquipment(true);
        setEquipment(data);
      }
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    }
  };

  // Filtered lists
  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.main_contractor && p.main_contractor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.trade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEquipment = equipment.filter(
    (eq) =>
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.code_number && eq.code_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      eq.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-lg mx-auto px-3 pb-24 space-y-4">
      {/* Top Header with Back */}
      <div className="flex items-center justify-between bg-slate-800 text-white rounded-lg p-3.5 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-sm flex items-center space-x-1.5">
              <span>{lang === 'ja' ? 'マスターデータ管理' : 'Kelola Master Data'}</span>
              <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded font-mono">
                ADMIN
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === 'ja'
                ? '現場・作業員・重機の標準リストを整備・管理します'
                : 'Pusat pengaturan proyek, pekerja tetap/subkon, dan armada alat berat'}
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-lg text-xs font-bold">
        <button
          onClick={() => setActiveTab('projects')}
          className={`py-2 px-1 rounded flex items-center justify-center space-x-1 transition ${
            activeTab === 'projects'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>{lang === 'ja' ? '現場' : 'Proyek'}</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`py-2 px-1 rounded flex items-center justify-center space-x-1 transition ${
            activeTab === 'workers'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{lang === 'ja' ? '作業員' : 'Pekerja'}</span>
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          className={`py-2 px-1 rounded flex items-center justify-center space-x-1 transition ${
            activeTab === 'equipment'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>{lang === 'ja' ? '重機・機材' : 'Alat Berat'}</span>
        </button>
      </div>

      {/* Action Bar (Search & + Add Button) */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === 'ja'
                ? activeTab === 'projects'
                  ? '現場名・元請で検索...'
                  : activeTab === 'workers'
                  ? '氏名・所属・工種で検索...'
                  : '機械名・コードで検索...'
                : 'Cari kata kunci...'
            }
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-800"
          />
        </div>

        <button
          onClick={openAddModal}
          className="btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded flex items-center space-x-1 shadow flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>
            {lang === 'ja'
              ? activeTab === 'projects'
                ? '新規現場'
                : activeTab === 'workers'
                ? '作業員登録'
                : '機材登録'
              : 'Tambah Baru'}
          </span>
        </button>
      </div>

      {/* Content List by Tab */}
      {loading ? (
        <div className="bg-white rounded-lg p-8 text-center text-slate-500 text-xs border border-slate-200">
          {lang === 'ja' ? 'データを読み込み中...' : 'Memuat data...'}
        </div>
      ) : activeTab === 'projects' ? (
        <div className="space-y-2.5">
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-slate-500 text-xs border border-slate-200">
              {lang === 'ja' ? '登録された現場がありません。' : 'Tidak ada data proyek.'}
            </div>
          ) : (
            filteredProjects.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">{p.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                      {p.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold">{lang === 'ja' ? '元請: ' : 'Kontraktor Utama: '}</span>
                    {p.main_contractor || '-'}
                  </div>
                  {p.location && (
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">
                      📍 {p.location}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded"
                    title="Ubah Proyek"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'workers' ? (
        <div className="space-y-2.5">
          {filteredWorkers.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-slate-500 text-xs border border-slate-200">
              {lang === 'ja' ? '登録された作業員がありません。' : 'Tidak ada master pekerja.'}
            </div>
          ) : (
            filteredWorkers.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">{w.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        w.company === '自社'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {w.company}
                    </span>
                    {!w.is_active && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                        {lang === 'ja' ? '無効' : 'Non-aktif'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center space-x-3">
                    <span>
                      <span className="font-semibold">{lang === 'ja' ? '工種: ' : 'Trade: '}</span>
                      {w.trade}
                    </span>
                    <span>
                      <span className="font-semibold">{lang === 'ja' ? '基準時間: ' : 'Jam: '}</span>
                      {w.default_work_hours || 8}h
                    </span>
                  </div>
                  {w.phone && (
                    <div className="text-[11px] text-slate-500">
                      📞 {w.phone}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <button
                    onClick={() => openEditModal(w)}
                    className="p-2 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {w.is_active && (
                    <button
                      onClick={() => handleDeleteItem(w.id, w.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Nonaktifkan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredEquipment.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-slate-500 text-xs border border-slate-200">
              {lang === 'ja' ? '登録された機材がありません。' : 'Tidak ada master alat berat.'}
            </div>
          ) : (
            filteredEquipment.map((eq) => (
              <div
                key={eq.id}
                className="bg-white rounded-lg p-3.5 border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">{eq.name}</span>
                    {eq.code_number && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                        {eq.code_number}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        eq.vendor === '自社'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {eq.vendor}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center space-x-3">
                    <span>
                      <span className="font-semibold">{lang === 'ja' ? '単位: ' : 'Satuan: '}</span>
                      {eq.unit || '台'}
                    </span>
                    <span>
                      <span className="font-semibold">{lang === 'ja' ? '種別: ' : 'Kategori: '}</span>
                      {eq.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  <button
                    onClick={() => openEditModal(eq)}
                    className="p-2 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {eq.is_active && (
                    <button
                      onClick={() => handleDeleteItem(eq.id, eq.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Nonaktifkan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Form for Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                {editingItem
                  ? lang === 'ja'
                    ? 'マスター編集'
                    : 'Ubah Data Master'
                  : lang === 'ja'
                  ? '新規マスター登録'
                  : 'Tambah Data Master Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              {activeTab === 'projects' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '現場名 (工事名称)' : 'Nama Proyek'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      placeholder="例: 渋谷区本町道路改良工事"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '現場管理コード' : 'Kode Proyek'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={projCode}
                      onChange={(e) => setProjCode(e.target.value)}
                      placeholder="例: SHIBUYA-2026-01"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '元請会社名' : 'Kontraktor Utama (Moto-uke)'}
                    </label>
                    <input
                      type="text"
                      value={projContractor}
                      onChange={(e) => setProjContractor(e.target.value)}
                      placeholder="例: 大林道路株式会社"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '現場住所・施工箇所' : 'Lokasi Proyek'}
                    </label>
                    <input
                      type="text"
                      value={projLocation}
                      onChange={(e) => setProjLocation(e.target.value)}
                      placeholder="例: 東京都渋谷区本町3丁目"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                </>
              )}

              {activeTab === 'workers' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '作業員氏名' : 'Nama Lengkap Pekerja'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      placeholder="例: 山田 太郎"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '所属会社 (自社 / 協力会社名)' : 'Perusahaan (自社 / Subkon)'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={workerCompany}
                      onChange={(e) => setWorkerCompany(e.target.value)}
                      placeholder="例: 自社 または 株式会社〇〇"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '工種・職種' : 'Kategori Pekerjaan / Trade'} *
                    </label>
                    <select
                      value={workerTrade}
                      onChange={(e) => setWorkerTrade(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    >
                      <option value="普通作業員">普通作業員</option>
                      <option value="特殊作業員">特殊作業員</option>
                      <option value="重機オペレーター">重機オペレーター</option>
                      <option value="土工">土工</option>
                      <option value="型枠大工">型枠大工</option>
                      <option value="鉄筋工">鉄筋工</option>
                      <option value="ダンプ運転手">ダンプ運転手</option>
                      <option value="警備員・合図員">警備員・合図員</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'ja' ? '基準時間(h)' : 'Jam Default'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={workerHours}
                        onChange={(e) => setWorkerHours(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'ja' ? '連絡先電話' : 'No. HP / Telp'}
                      </label>
                      <input
                        type="tel"
                        value={workerPhone}
                        onChange={(e) => setWorkerPhone(e.target.value)}
                        placeholder="090-..."
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'equipment' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '機材・重機名称' : 'Nama Alat Berat / Armada'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={equipName}
                      onChange={(e) => setEquipName(e.target.value)}
                      placeholder="例: 0.45BH (バックホウ)"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'ja' ? '号車・管理番号' : 'No. Unit/Plat'}
                      </label>
                      <input
                        type="text"
                        value={equipCode}
                        onChange={(e) => setEquipCode(e.target.value)}
                        placeholder="BH-02"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {lang === 'ja' ? '単位' : 'Satuan'}
                      </label>
                      <input
                        type="text"
                        value={equipUnit}
                        onChange={(e) => setEquipUnit(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {lang === 'ja' ? '所有区分・調達先' : 'Kepemilikan / Vendor'}
                    </label>
                    <input
                      type="text"
                      value={equipVendor}
                      onChange={(e) => setEquipVendor(e.target.value)}
                      placeholder="自社 または レンタル会社名"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 btn-touch bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded"
                >
                  {lang === 'ja' ? 'キャンセル' : 'Batal'}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-touch bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded shadow"
                >
                  {lang === 'ja' ? '保存する' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};