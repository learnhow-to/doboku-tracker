import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  ShieldAlert,
  Users,
  Wrench,
  Package,
  Clock,
  Camera,
  Image as ImageIcon,
  Lock,
  Edit3,
  CheckCircle2,
  Tag,
  Copy,
  Sparkles,
} from 'lucide-react';
import { Language, translations } from '../../i18n/index.js';
import { apiRequest, getAuthToken, getMasterWorkers, getMasterEquipment, getLatestPreviousReport } from '../../services/api.js';
import { HankoApprovalBlock } from '../common/HankoStamp.js';

async function applyKokubanOverlay(
  file: File,
  meta: {
    projectName: string;
    workType: string;
    locationSta: string;
    stage: string;
    date: string;
    company: string;
  }
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // 1. Draw original photo
        ctx.drawImage(img, 0, 0);

        // 2. Kokuban dimensions
        const kbW = Math.max(img.width * 0.38, 280);
        const kbH = Math.max(img.height * 0.22, 170);
        const pad = Math.max(img.width * 0.02, 12);
        const kbX = pad;
        const kbY = img.height - kbH - pad;

        // 3. Dark green chalkboard background
        ctx.save();
        ctx.fillStyle = '#1B382B'; // Japanese construction chalkboard green
        ctx.fillRect(kbX, kbY, kbW, kbH);

        // White border line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(img.width * 0.003, 2);
        ctx.strokeRect(kbX + 4, kbY + 4, kbW - 8, kbH - 8);

        // Header division line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(img.width * 0.0015, 1);
        const rowH = (kbH - 12) / 5;

        for (let i = 1; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(kbX + 4, kbY + 4 + i * rowH);
          ctx.lineTo(kbX + kbW - 4, kbY + 4 + i * rowH);
          ctx.stroke();
        }

        // Vertical label divider
        const labelW = kbW * 0.28;
        ctx.beginPath();
        ctx.moveTo(kbX + 4 + labelW, kbY + 4);
        ctx.lineTo(kbX + 4 + labelW, kbY + kbH - 4);
        ctx.stroke();

        // Typography
        ctx.fillStyle = '#FFFFFF';
        const fontSize = Math.max(Math.floor(rowH * 0.52), 11);
        ctx.font = `bold ${fontSize}px "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif`;
        ctx.textBaseline = 'middle';

        const stageLabel = meta.stage === 'before' ? '施工前' : meta.stage === 'after' ? '施工完了' : '施工中';

        const fields = [
          { label: '工事件名', value: meta.projectName || '道路改良工事' },
          { label: '工　　種', value: meta.workType || '土木工事' },
          { label: '測点/STA', value: meta.locationSta || '現場一円' },
          { label: '施工状況', value: stageLabel },
          { label: '施工会社', value: `${meta.company} (${meta.date})` },
        ];

        fields.forEach((f, idx) => {
          const y = kbY + 4 + idx * rowH + rowH / 2;
          ctx.fillText(f.label, kbX + 8, y);
          ctx.fillText(f.value, kbX + labelW + 10, y, kbW - labelW - 16);
        });

        ctx.restore();

        // Convert canvas back to file
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const stampedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '_kokuban.jpg', {
            type: 'image/jpeg',
          });
          resolve(stampedFile);
        }, 'image/jpeg', 0.92);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface NippouEditorProps {
  report: any;
  projectId: string;
  projectName: string;
  lang: Language;
  onSaveDraft: (data: any) => Promise<any>;
  onSubmit: (reportId: string) => Promise<void>;
  onOpenPreview: (reportId: string) => void;
  onOpenCorrection?: (reportId: string, reason: string) => Promise<void>;
  isSaving: boolean;
  isLocked: boolean; // if APPROVED
}

export const NippouEditor: React.FC<NippouEditorProps> = ({
  report,
  projectId,
  projectName,
  lang,
  onSaveDraft,
  onSubmit,
  onOpenPreview,
  onOpenCorrection,
  isSaving,
  isLocked,
}) => {
  const t = translations[lang];

  // Core Form State
  const [workDate, setWorkDate] = useState<string>(
    report?.work_date || new Date().toISOString().split('T')[0]
  );
  const [weather, setWeather] = useState<string>(report?.weather || '晴');
  const [siteStartTime, setSiteStartTime] = useState<string>(report?.site_start_time || '08:00');
  const [siteEndTime, setSiteEndTime] = useState<string>(report?.site_end_time || '17:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(report?.break_minutes ?? 60);
  const [handoverNotes, setHandoverNotes] = useState<string>(report?.handover_notes || '');

  // Sub-items
  const [workers, setWorkers] = useState<any[]>(
    report?.workers && report.workers.length > 0
      ? report.workers
      : [{ name: '', company: '自社', trade: '普通作業員', workHours: 8, overtimeHours: 0 }]
  );

  const [workItems, setWorkItems] = useState<any[]>(
    report?.workItems && report.workItems.length > 0
      ? report.workItems
      : [{ workType: '土工', description: '', locationSta: '', quantity: 0, unit: 'm³' }]
  );

  const [equipment, setEquipment] = useState<any[]>(
    report?.equipment && report.equipment.length > 0
      ? report.equipment
      : [{ name: '2TDT', vendor: '自社', quantity: 1, unit: '台', operatingHours: 0, dieselLiters: 0, notes: '' }]
  );

  const [materials, setMaterials] = useState<any[]>(
    report?.materials && report.materials.length > 0 ? report.materials : []
  );

  const [ky, setKy] = useState<any>(
    report?.ky || {
      meetingTime: '07:50',
      attendeesCount: 1,
      specificHazards: '',
      countermeasures: '',
      supervisorName: '',
      isChecked: false,
    }
  );

  const [photos, setPhotos] = useState<any[]>(report?.photos || []);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [photoStage, setPhotoStage] = useState<'before' | 'during' | 'after' | 'other'>('during');
  const [photoLocation, setPhotoLocation] = useState<string>('');
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [correctionModalOpen, setCorrectionModalOpen] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Master Data Cache
  const [masterWorkers, setMasterWorkers] = useState<any[]>([]);
  const [masterEquipment, setMasterEquipment] = useState<any[]>([]);

  // Commercial Feature States
  const [copyingPrevious, setCopyingPrevious] = useState<boolean>(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [attachKokuban, setAttachKokuban] = useState<boolean>(true);

  const handleCopyPreviousReport = async () => {
    if (!projectId) return;
    setCopyingPrevious(true);
    setCopyNotice(null);
    try {
      const prev = await getLatestPreviousReport(projectId, workDate);
      if (!prev) {
        alert(lang === 'ja' ? '前日の日報データが見つかりませんでした。' : 'Tidak ada laporan sebelumnya untuk disalin.');
        return;
      }
      if (prev.workers && prev.workers.length > 0) {
        setWorkers(
          prev.workers.map((w: any) => ({
            name: w.name,
            company: w.company || '自社',
            trade: w.trade,
            workHours: w.workHours ?? 8,
            overtimeHours: 0,
          }))
        );
      }
      if (prev.equipment && prev.equipment.length > 0) {
        setEquipment(
          prev.equipment.map((e: any) => ({
            name: e.name,
            vendor: e.vendor || '自社',
            quantity: e.quantity || 1,
            unit: e.unit || '台',
            operatingHours: e.operatingHours,
            dieselLiters: 0,
            notes: e.notes || '',
          }))
        );
      }
      if (prev.workItems && prev.workItems.length > 0) {
        setWorkItems(
          prev.workItems.map((wi: any) => ({
            workType: wi.workType,
            description: wi.description,
            locationSta: wi.locationSta,
            quantity: 0,
            unit: wi.unit,
          }))
        );
      }
      setCopyNotice(
        lang === 'ja'
          ? `前日 (${prev.work_date}) の日報から作業員・重機・工種をコピーしました。`
          : `Data dari laporan sebelumnya (${prev.work_date}) berhasil disalin!`
      );
    } catch (err: any) {
      alert(err.message || 'Gagal menyalin data laporan sebelumnya');
    } finally {
      setCopyingPrevious(false);
    }
  };

  useEffect(() => {
    getMasterWorkers().then((data) => setMasterWorkers(data || [])).catch(() => {});
    getMasterEquipment().then((data) => setMasterEquipment(data || [])).catch(() => {});
  }, []);

  // Synchronize state when report prop updates asynchronously
  useEffect(() => {
    if (report) {
      if (report.work_date) setWorkDate(report.work_date);
      if (report.weather) setWeather(report.weather);
      if (report.site_start_time) setSiteStartTime(report.site_start_time);
      if (report.site_end_time) setSiteEndTime(report.site_end_time);
      if (report.break_minutes !== undefined) setBreakMinutes(report.break_minutes);
      if (report.handover_notes !== undefined) setHandoverNotes(report.handover_notes);
      if (report.workers && report.workers.length > 0) setWorkers(report.workers);
      if (report.workItems && report.workItems.length > 0) setWorkItems(report.workItems);
      if (report.equipment && report.equipment.length > 0) setEquipment(report.equipment);
      if (report.materials && report.materials.length > 0) setMaterials(report.materials);
      if (report.ky) setKy(report.ky);
      if (report.photos) setPhotos(report.photos);
    }
  }, [report]);

  // Worker helpers
  const addWorker = () => {
    setWorkers([...workers, { name: '', company: '自社', trade: '普通作業員', workHours: 8, overtimeHours: 0 }]);
  };
  const removeWorker = (index: number) => {
    setWorkers(workers.filter((_, i) => i !== index));
  };
  const updateWorker = (index: number, field: string, val: any) => {
    const updated = [...workers];
    updated[index] = { ...updated[index], [field]: val };
    setWorkers(updated);
  };

  // Work item helpers
  const addWorkItem = () => {
    setWorkItems([...workItems, { workType: '土工', description: '', locationSta: '', quantity: 0, unit: 'm³' }]);
  };
  const removeWorkItem = (index: number) => {
    setWorkItems(workItems.filter((_, i) => i !== index));
  };
  const updateWorkItem = (index: number, field: string, val: any) => {
    const updated = [...workItems];
    updated[index] = { ...updated[index], [field]: val };
    setWorkItems(updated);
  };

  // Equipment helpers
  const addEquipment = (presetName?: string, presetUnit?: string) => {
    setEquipment([
      ...equipment,
      {
        name: presetName || '',
        vendor: '自社',
        quantity: 1,
        unit: presetUnit || '台',
        operatingHours: 0,
        dieselLiters: 0,
        notes: '',
      },
    ]);
  };
  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };
  const updateEquipment = (index: number, field: string, val: any) => {
    const updated = [...equipment];
    updated[index] = { ...updated[index], [field]: val };
    setEquipment(updated);
  };

  // Material helpers
  const addMaterial = (presetName?: string, presetUnit?: string) => {
    setMaterials([
      ...materials,
      { name: presetName || '', vendor: '自社', quantity: 0, unit: presetUnit || '袋', isPurchased: false, notes: '' },
    ]);
  };
  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };
  const updateMaterial = (index: number, field: string, val: any) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], [field]: val };
    setMaterials(updated);
  };

  // Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!report?.id) {
      alert(lang === 'ja' ? '写真を追加する前に、まず下書きを保存してください。' : 'Simpan draft terlebih dahulu sebelum melampirkan foto.');
      return;
    }

    setUploadingPhoto(true);
    try {
      let uploadFile = file;
      if (attachKokuban) {
        try {
          uploadFile = await applyKokubanOverlay(file, {
            projectName,
            workType: workItems[0]?.workType || '土木工事',
            locationSta: photoLocation || '現場一円',
            stage: photoStage,
            date: workDate,
            company: '東京土木建設株式会社',
          });
        } catch (overlayErr) {
          console.error('Kokuban overlay failed, fallback to original:', overlayErr);
          uploadFile = file;
        }
      }

      const formData = new FormData();
      formData.append('photo', uploadFile);
      formData.append('reportId', report.id);
      formData.append('projectId', projectId);
      formData.append('stage', photoStage);
      formData.append('locationSta', photoLocation);
      formData.append('caption', photoCaption);

      const uploaded = await apiRequest('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      setPhotos([...photos, uploaded]);
      setPhotoCaption('');
      setPhotoLocation('');
      e.target.value = '';
    } catch (err: any) {
      alert(`Gagal mengunggah foto: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      projectId,
      workDate,
      weather,
      siteStartTime,
      siteEndTime,
      breakMinutes,
      handoverNotes,
      workers: workers.filter((w) => w.name && w.name.trim() !== ''),
      workItems: workItems.filter((wi) => wi.description && wi.description.trim() !== ''),
      equipment: equipment.filter((e) => e.name && e.name.trim() !== ''),
      materials: materials.filter((m) => m.name && m.name.trim() !== ''),
      ky,
      version: report?.version || 1,
    };
    return await onSaveDraft(payload);
  };

  const handlePreviewClick = async () => {
    if (report?.id) {
      onOpenPreview(report.id);
    } else {
      const saved: any = await handleSave();
      if (saved && saved.id) {
        onOpenPreview(saved.id);
      }
    }
  };

  const handleSubmit = async () => {
    if (!report?.id) {
      alert(lang === 'ja' ? '先に下書きを保存してください。' : 'Simpan draft terlebih dahulu sebelum mengirim.');
      return;
    }
    await onSubmit(report.id);
  };

  const handleCorrectionSubmit = async () => {
    if (!report?.id || !correctionReason.trim() || !onOpenCorrection) return;
    await onOpenCorrection(report.id, correctionReason);
    setCorrectionModalOpen(false);
    setCorrectionReason('');
  };

  return (
    <div className="pb-28 max-w-lg mx-auto px-3 space-y-4">
      {/* Approved / Immutable Notice Banner */}
      {isLocked && (
        <div className="bg-emerald-50 border-2 border-emerald-600 rounded-lg p-3 text-emerald-950 flex items-start justify-between shadow-sm">
          <div className="flex items-start space-x-2">
            <Lock className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs sm:text-sm">
                {lang === 'ja' ? '承認済・確定ロック中 (Immutable)' : 'Laporan Disetujui & Terkunci Permanen'}
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {lang === 'ja'
                  ? '承認済の日報は直接編集できません。内容を変更する場合は新改訂（修正版）を発行してください。'
                  : 'Laporan yang telah disetujui tidak dapat diubah langsung. Buka revisi baru untuk mengajukan koreksi.'}
              </p>
            </div>
          </div>

          {onOpenCorrection && (
            <button
              onClick={() => setCorrectionModalOpen(true)}
              className="btn-touch bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-2.5 py-1 rounded ml-2 flex-shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              <span>{lang === 'ja' ? '改訂を開く' : 'Koreksi'}</span>
            </button>
          )}
        </div>
      )}

      {/* Rejection / Returned notice banner if applicable */}
      {report?.status === 'RETURNED' && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-lg p-3 text-rose-900 shadow-sm">
          <div className="font-bold flex items-center space-x-1.5">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>{lang === 'ja' ? '差戻し理由 (要修正):' : 'Alasan Dikembalikan (Perlu Perbaikan):'}</span>
          </div>
          <p className="text-xs sm:text-sm mt-1 bg-white p-2.5 rounded border border-rose-200 font-medium">
            {report.rejection_reason}
          </p>
        </div>
      )}

      {/* Digital Hanko Approval Stamp (3-Box) */}
      {(report?.status === 'APPROVED' || report?.status === 'SUBMITTED') && (
        <div className="flex justify-center my-1">
          <HankoApprovalBlock
            status={report.status}
            reporterName={report.reporter_name || '佐藤 健太'}
            approvedBy={report.approved_by}
            workDate={workDate}
            approvedAt={report.approved_at}
            lang={lang}
            size="md"
          />
        </div>
      )}

      {/* Copy Previous Report Button (when editable) */}
      {!isLocked && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCopyPreviousReport}
            disabled={copyingPrevious}
            className="w-full btn-touch bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold py-2.5 px-3 rounded-lg shadow-sm flex items-center justify-center space-x-2 transition"
          >
            <Copy className={`w-4 h-4 ${copyingPrevious ? 'animate-spin' : ''}`} />
            <span className="text-xs sm:text-sm">
              {copyingPrevious
                ? (lang === 'ja' ? '前日データを照会中...' : 'Menyalin data...')
                : (lang === 'ja' ? '📋 前日の日報から複製 (作業員・重機・工種を一括入力)' : '📋 Salin dari Laporan Kemarin')}
            </span>
          </button>

          {copyNotice && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded text-xs flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{copyNotice}</span>
              </div>
              <button
                onClick={() => setCopyNotice(null)}
                className="text-emerald-800 font-bold ml-2 text-xs px-1.5 py-0.5 hover:bg-emerald-100 rounded"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Basic Info Card */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{projectName}</span>
          <span
            className={`text-xs px-2.5 py-1 rounded font-bold ${
              report?.status === 'APPROVED'
                ? 'bg-emerald-700 text-white'
                : report?.status === 'SUBMITTED'
                ? 'bg-blue-600 text-white'
                : report?.status === 'RETURNED'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-200 text-slate-800'
            }`}
          >
            {t.status[report?.status as keyof typeof t.status] || t.status.DRAFT}
            {report?.version ? ` (v${report.version})` : ''}
          </span>
        </div>

        {/* Date and Weather */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">{t.workDate}</label>
            <input
              type="date"
              disabled={isLocked}
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full input-touch px-3 border border-slate-300 rounded font-semibold text-slate-900 focus:ring-2 focus:ring-teal-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">{t.weather}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: '晴', label: lang === 'ja' ? '晴' : 'Cerah (晴)' },
                { val: '雨', label: lang === 'ja' ? '雨' : 'Hujan (雨)' },
                { val: '曇', label: lang === 'ja' ? '曇' : 'Mendung (曇)' },
              ].map((w) => (
                <button
                  key={w.val}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setWeather(w.val)}
                  className={`btn-touch text-xs sm:text-sm font-bold rounded border ${
                    weather === w.val
                      ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                      : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Site Work Hours */}
        <div className="border-t pt-2.5">
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.siteTimes}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-slate-600 font-semibold">{t.startTime}</span>
              <input
                type="time"
                disabled={isLocked}
                value={siteStartTime}
                onChange={(e) => setSiteStartTime(e.target.value)}
                className="w-full input-touch px-2 border border-slate-300 rounded text-center text-sm font-bold bg-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-semibold">{t.endTime}</span>
              <input
                type="time"
                disabled={isLocked}
                value={siteEndTime}
                onChange={(e) => setSiteEndTime(e.target.value)}
                className="w-full input-touch px-2 border border-slate-300 rounded text-center text-sm font-bold bg-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-semibold">{t.breakMinutes}</span>
              <input
                type="number"
                inputMode="numeric"
                disabled={isLocked}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full input-touch px-2 border border-slate-300 rounded text-center text-sm font-bold bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Workers Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-teal-700" />
            <span>{t.workers}</span>
            <span className="text-xs text-slate-600 font-semibold">({workers.length}名)</span>
          </h2>
          {!isLocked && (
            <button
              onClick={addWorker}
              className="btn-touch bg-slate-100 hover:bg-slate-200 text-teal-800 font-bold px-3 py-1 rounded flex items-center space-x-1 border border-slate-200 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addWorker}</span>
            </button>
          )}
        </div>

        {/* Quick Add Workers from Master Data */}
        {masterWorkers.length > 0 && !isLocked && (
          <div className="space-y-1">
            <span className="text-[11px] text-teal-800 font-bold flex items-center space-x-1">
              <Users className="w-3.5 h-3.5" />
              <span>{lang === 'ja' ? 'マスター登録作業員 (1タップ追加):' : 'Pekerja Master (1-Tap):'}</span>
            </span>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
              {masterWorkers.map((mw) => {
                const isAdded = workers.some((w) => w.name === mw.name);
                return (
                  <button
                    key={mw.id}
                    type="button"
                    disabled={isAdded}
                    onClick={() => {
                      if (workers.length === 1 && !workers[0].name.trim()) {
                        updateWorker(0, 'name', mw.name);
                        updateWorker(0, 'company', mw.company);
                        updateWorker(0, 'trade', mw.trade);
                        updateWorker(0, 'workHours', mw.default_work_hours || 8.0);
                      } else {
                        setWorkers([
                          ...workers,
                          {
                            name: mw.name,
                            company: mw.company,
                            trade: mw.trade,
                            workHours: mw.default_work_hours || 8.0,
                            overtimeHours: 0,
                          },
                        ]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded border whitespace-nowrap font-medium text-xs ${
                      isAdded
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-300 font-bold shadow-sm'
                    }`}
                  >
                    ＋ {mw.name} ({mw.company})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Trade Presets for outdoor quick entry */}
        {!isLocked && (
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 font-semibold whitespace-nowrap">{lang === 'ja' ? 'クイック職種:' : 'Pilihan Trade:'}</span>
            {['普通作業員', '重機オペレーター', '配管工', '型枠工', '土工'].map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => {
                  if (workers.length > 0) {
                    updateWorker(workers.length - 1, 'trade', trade);
                  }
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded border border-slate-300 whitespace-nowrap font-medium"
              >
                {trade}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {workers.map((w, idx) => (
            <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={t.workerName}
                  value={w.name}
                  onChange={(e) => updateWorker(idx, 'name', e.target.value)}
                  className="flex-1 input-touch px-3 border border-slate-300 rounded font-semibold text-sm bg-white"
                />
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={t.company}
                  value={w.company}
                  onChange={(e) => updateWorker(idx, 'company', e.target.value)}
                  className="w-24 input-touch px-2 border border-slate-300 rounded text-xs bg-white text-center font-medium"
                />
                {!isLocked && workers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorker(idx)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded border border-rose-200 flex-shrink-0"
                    title="削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 font-semibold">{t.trade}</span>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={w.trade}
                    onChange={(e) => updateWorker(idx, 'trade', e.target.value)}
                    className="w-full px-2 py-2 border border-slate-300 rounded bg-white font-medium"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-semibold">{t.workHours} (h)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    disabled={isLocked}
                    value={w.workHours}
                    onChange={(e) => updateWorker(idx, 'workHours', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-semibold">{t.overtimeHours} (h)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    disabled={isLocked}
                    value={w.overtimeHours}
                    onChange={(e) => updateWorker(idx, 'overtimeHours', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-2 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Work Items Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Wrench className="w-4 h-4 text-teal-700" />
            <span>{t.workItems}</span>
          </h2>
          {!isLocked && (
            <button
              onClick={addWorkItem}
              className="btn-touch bg-slate-100 hover:bg-slate-200 text-teal-800 font-bold px-3 py-1 rounded flex items-center space-x-1 border border-slate-200 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addItem}</span>
            </button>
          )}
        </div>

        {/* Quick Unit Presets */}
        {!isLocked && (
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 font-semibold whitespace-nowrap">{lang === 'ja' ? 'クイック単位:' : 'Pilihan Satuan:'}</span>
            {['m³', 'm²', 'm', 't', '件', '式', '箇所'].map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  if (workItems.length > 0) {
                    updateWorkItem(workItems.length - 1, 'unit', unit);
                  }
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded border border-slate-300 whitespace-nowrap font-medium"
              >
                {unit}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {workItems.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={t.workType}
                  value={item.workType}
                  onChange={(e) => updateWorkItem(idx, 'workType', e.target.value)}
                  className="input-touch px-2.5 border border-slate-300 rounded font-bold text-sm bg-white"
                />
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={t.locationSta}
                  value={item.locationSta}
                  onChange={(e) => updateWorkItem(idx, 'locationSta', e.target.value)}
                  className="col-span-2 input-touch px-2.5 border border-slate-300 rounded text-xs bg-white font-medium"
                />
              </div>

              <textarea
                disabled={isLocked}
                rows={2}
                placeholder={t.description}
                value={item.description}
                onChange={(e) => updateWorkItem(idx, 'description', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white"
              />

              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-600 font-semibold">{t.quantity}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    disabled={isLocked}
                    value={item.quantity}
                    onChange={(e) => updateWorkItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full input-touch px-2.5 border border-slate-300 rounded bg-white text-right font-mono font-bold text-base"
                  />
                </div>
                <div className="w-24">
                  <span className="text-[10px] text-slate-600 font-semibold">{t.unit}</span>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={item.unit}
                    onChange={(e) => updateWorkItem(idx, 'unit', e.target.value)}
                    className="w-full input-touch px-2 border border-slate-300 rounded bg-white text-center font-bold text-sm"
                  />
                </div>
                {!isLocked && workItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkItem(idx)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded border border-rose-200 flex-shrink-0 mt-3.5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment & Fuel Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Package className="w-4 h-4 text-teal-700" />
            <span>{t.equipment}</span>
          </h2>
          {!isLocked && (
            <button
              onClick={() => addEquipment()}
              className="btn-touch bg-slate-100 hover:bg-slate-200 text-teal-800 font-bold px-3 py-1 rounded flex items-center space-x-1 border border-slate-200 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addEquipment}</span>
            </button>
          )}
        </div>

        {/* Quick Add Equipment from Master Data */}
        {masterEquipment.length > 0 && !isLocked && (
          <div className="space-y-1">
            <span className="text-[11px] text-teal-800 font-bold flex items-center space-x-1">
              <Wrench className="w-3.5 h-3.5" />
              <span>{lang === 'ja' ? 'マスター登録機材 (1タップ追加):' : 'Alat Berat Master (1-Tap):'}</span>
            </span>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
              {masterEquipment.map((me) => (
                <button
                  key={me.id}
                  type="button"
                  onClick={() => {
                    setEquipment([
                      ...equipment,
                      {
                        name: me.name,
                        vendor: me.vendor || '自社',
                        quantity: 1,
                        unit: me.unit || '台',
                        operatingHours: 0,
                        dieselLiters: 0,
                        notes: me.code_number ? `号車: ${me.code_number}` : '',
                      },
                    ]);
                  }}
                  className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded whitespace-nowrap font-bold shadow-sm text-xs"
                >
                  ＋ {me.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Add Equipment from Confirmed Template 14027.jpg */}
        {!isLocked && (
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold">{lang === 'ja' ? '公式帳票プリセット:' : 'Preset Alat Standar:'}</span>
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
              {['2TDT', 'バックホウ', '発電機', 'プレート', 'ランマ', '丸ノコ'].map((eqName) => (
                <button
                  key={eqName}
                  type="button"
                  onClick={() => addEquipment(eqName, '台')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded border border-slate-300 whitespace-nowrap font-medium"
                >
                  +{eqName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {equipment.map((eq, idx) => (
            <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={lang === 'ja' ? '品名 (2TDT, 発電機など)' : 'Nama Alat (2TDT, Genset, dll)'}
                  value={eq.name}
                  onChange={(e) => updateEquipment(idx, 'name', e.target.value)}
                  className="flex-1 input-touch px-3 border border-slate-300 rounded text-sm bg-white font-bold"
                />
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder={lang === 'ja' ? '業者名 (自社)' : 'Vendor (Internal/Sewa)'}
                  value={eq.vendor}
                  onChange={(e) => updateEquipment(idx, 'vendor', e.target.value)}
                  className="w-20 input-touch px-2 border border-slate-300 rounded text-xs bg-white text-center font-medium"
                />
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => removeEquipment(idx)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded border border-rose-200 flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 font-semibold">{t.quantity}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    disabled={isLocked}
                    value={eq.quantity}
                    onChange={(e) => updateEquipment(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full input-touch px-2 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-semibold">{t.operatingHours} (h)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    disabled={isLocked}
                    value={eq.operatingHours}
                    onChange={(e) => updateEquipment(idx, 'operatingHours', parseFloat(e.target.value) || 0)}
                    className="w-full input-touch px-2 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-amber-800 font-bold">{t.dieselLiters}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    disabled={isLocked}
                    value={eq.dieselLiters}
                    onChange={(e) => updateEquipment(idx, 'dieselLiters', parseFloat(e.target.value) || 0)}
                    className="w-full input-touch px-2 border border-amber-300 rounded bg-amber-50 text-center font-bold text-amber-900 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Materials Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Tag className="w-4 h-4 text-teal-700" />
            <span>{t.materials}</span>
          </h2>
          {!isLocked && (
            <button
              onClick={() => addMaterial()}
              className="btn-touch bg-slate-100 hover:bg-slate-200 text-teal-800 font-bold px-3 py-1 rounded flex items-center space-x-1 border border-slate-200 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addMaterial}</span>
            </button>
          )}
        </div>

        {/* Quick Material Presets */}
        {!isLocked && (
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 font-semibold whitespace-nowrap">{lang === 'ja' ? 'プリセット:' : 'Preset Material:'}</span>
            {[
              { name: '砕石 (RC-40)', unit: 't' },
              { name: 'セメント', unit: '袋' },
              { name: '砂', unit: 'm³' },
            ].map((mat) => (
              <button
                key={mat.name}
                type="button"
                onClick={() => addMaterial(mat.name, mat.unit)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded border border-slate-300 whitespace-nowrap font-medium"
              >
                +{mat.name}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {materials.map((mat, idx) => (
            <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder="品名 (セメント、砕石など)"
                  value={mat.name}
                  onChange={(e) => updateMaterial(idx, 'name', e.target.value)}
                  className="flex-1 input-touch px-3 border border-slate-300 rounded text-sm bg-white font-bold"
                />
                <input
                  type="text"
                  disabled={isLocked}
                  placeholder="業者名"
                  value={mat.vendor}
                  onChange={(e) => updateMaterial(idx, 'vendor', e.target.value)}
                  className="w-20 input-touch px-2 border border-slate-300 rounded text-xs bg-white text-center font-medium"
                />
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => removeMaterial(idx)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded border border-rose-200 flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-600 font-semibold">{t.quantity}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    disabled={isLocked}
                    value={mat.quantity}
                    onChange={(e) => updateMaterial(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full input-touch px-2 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
                <div className="w-20">
                  <span className="text-[10px] text-slate-600 font-semibold">{t.unit}</span>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={mat.unit}
                    onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                    className="w-full input-touch px-2 border border-slate-300 rounded bg-white text-center font-bold"
                  />
                </div>
                <label className="flex items-center space-x-1.5 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={mat.isPurchased}
                    onChange={(e) => updateMaterial(idx, 'isPurchased', e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-700">{t.isPurchased}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Field Photos Section (現場写真) */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Camera className="w-4 h-4 text-teal-700" />
            <span>{lang === 'ja' ? '現場写真記録 (施工前/施工中/完了)' : 'Dokumentasi Foto Lapangan'}</span>
            <span className="text-xs text-slate-600 font-semibold">({photos.length}枚)</span>
          </h2>
        </div>

        {/* Upload Form */}
        {!isLocked && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-600 font-bold">
                  {lang === 'ja' ? '施工段階' : 'Tahapan Foto'}
                </span>
                <select
                  value={photoStage}
                  onChange={(e: any) => setPhotoStage(e.target.value)}
                  className="w-full input-touch px-2 border border-slate-300 rounded bg-white font-bold"
                >
                  <option value="before">{lang === 'ja' ? '着工前 (Before)' : 'Sebelum (Before)'}</option>
                  <option value="during">{lang === 'ja' ? '施工中 (During)' : 'Saat Pekerjaan (During)'}</option>
                  <option value="after">{lang === 'ja' ? '完了 (After)' : 'Selesai (After)'}</option>
                  <option value="other">{lang === 'ja' ? 'その他' : 'Lainnya'}</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-600 font-bold">
                  {lang === 'ja' ? '測点 / STA' : 'Lokasi / STA'}
                </span>
                <input
                  type="text"
                  placeholder="例: STA 1+20"
                  value={photoLocation}
                  onChange={(e) => setPhotoLocation(e.target.value)}
                  className="w-full input-touch px-2 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-600 font-bold">
                {lang === 'ja' ? '写真のメモ・内容' : 'Keterangan Foto'}
              </span>
              <input
                type="text"
                placeholder={lang === 'ja' ? '例: 路床転圧状況、配管埋設確認' : 'Contoh: Pemadatan subgrade, galian pipa'}
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                className="w-full input-touch px-2.5 border border-slate-300 rounded bg-white text-xs"
              />
            </div>

            {/* Kokuban Digital Blackboard Toggle */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded p-2 text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900 text-[11px]">
                    {lang === 'ja' ? '電子黒板の自動付与 (国交省工事写真基準)' : 'Sematkan Papan Nama Digital (Kokuban)'}
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    {lang === 'ja' ? '写真左下に工事名・工種・測点・会社名を自動印字' : 'Sematkan papan hijau standar Jepang di foto'}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                <input
                  type="checkbox"
                  checked={attachKokuban}
                  onChange={(e) => setAttachKokuban(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <label className="btn-touch w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded cursor-pointer flex items-center justify-center space-x-2 shadow">
              <Camera className="w-4 h-4" />
              <span>
                {uploadingPhoto
                  ? (lang === 'ja' ? '写真アップロード中...' : 'Mengunggah foto...')
                  : (lang === 'ja' ? '📷 写真を撮影・選択して追加' : '📷 Ambil / Pilih Foto')}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Photos Grid Display */}
        {photos.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500 bg-slate-50 rounded border border-dashed border-slate-300">
            {lang === 'ja' ? '登録された写真はありません。' : 'Belum ada foto yang dilampirkan.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {photos.map((p) => (
              <div key={p.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white uppercase ${
                      p.stage === 'before'
                        ? 'bg-blue-600'
                        : p.stage === 'after'
                        ? 'bg-emerald-600'
                        : 'bg-amber-600'
                    }`}
                  >
                    {p.stage}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {p.location_sta || '-'}
                  </span>
                </div>
                <div className="text-slate-800 font-medium truncate">{p.file_name}</div>
                {p.caption && <div className="text-slate-600 text-[10px] truncate">{p.caption}</div>}
                <div className="text-[8px] text-slate-400 font-mono truncate">
                  SHA: {p.file_hash?.substring(0, 16)}...
                </div>
                <a
                  href={`/api/photos/${p.id}/download?token=${getAuthToken()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-700 hover:underline text-[10px] font-bold block pt-1"
                >
                  {lang === 'ja' ? '写真原本を表示 ↗' : 'Lihat Foto Asli ↗'}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KY Safety Section */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-teal-700" />
            <span>{t.kyActivity}</span>
          </h2>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-600 font-semibold">{t.meetingTime}</span>
              <input
                type="time"
                disabled={isLocked}
                value={ky.meetingTime}
                onChange={(e) => setKy({ ...ky, meetingTime: e.target.value })}
                className="w-full input-touch px-2 border border-slate-300 rounded text-center text-sm font-bold bg-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-semibold">{t.attendees}</span>
              <input
                type="number"
                inputMode="numeric"
                disabled={isLocked}
                value={ky.attendeesCount}
                onChange={(e) => setKy({ ...ky, attendeesCount: parseInt(e.target.value, 10) || 0 })}
                className="w-full input-touch px-2 border border-slate-300 rounded text-center text-sm font-bold bg-white"
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-700 font-bold">{t.hazards}</span>
            <textarea
              disabled={isLocked}
              rows={2}
              value={ky.specificHazards}
              onChange={(e) => setKy({ ...ky, specificHazards: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
              placeholder={lang === 'ja' ? '例: 重機旋回範囲への立ち入り、掘削法面の崩落' : 'Contoh: Masuk ke radius manuver alat berat, bahaya lereng longsor'}
            />
          </div>

          <div>
            <span className="text-[10px] text-slate-700 font-bold">{t.countermeasures}</span>
            <textarea
              disabled={isLocked}
              rows={2}
              value={ky.countermeasures}
              onChange={(e) => setKy({ ...ky, countermeasures: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white font-medium"
              placeholder={lang === 'ja' ? '例: 合図確認の徹底、誘導員の配置、法肩から0.5m離隔' : 'Contoh: Disiplin aba-aba tangan, flagman siaga, jarak 0.5m dari bibir galian'}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex-1 mr-2">
              <span className="text-[10px] text-slate-600 font-semibold">{t.supervisor}</span>
              <input
                type="text"
                disabled={isLocked}
                value={ky.supervisorName}
                onChange={(e) => setKy({ ...ky, supervisorName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-bold bg-white"
              />
            </div>

            <label className="flex items-center space-x-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                disabled={isLocked}
                checked={ky.isChecked}
                onChange={(e) => setKy({ ...ky, isChecked: e.target.checked })}
                className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span className="text-xs font-bold text-slate-800">{t.isChecked}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Handover Notes */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300 space-y-2">
        <label className="block text-xs font-bold text-slate-800">{t.notes}</label>
        <textarea
          disabled={isLocked}
          rows={3}
          value={handoverNotes}
          onChange={(e) => setHandoverNotes(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white font-medium"
          placeholder={lang === 'ja' ? '事務所への伝達事項、明日の段取りなど' : 'Catatan koordinasi kantor, persiapan pekerjaan besok, dll'}
        />
      </div>

      {/* Sticky Bottom Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 p-2.5 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLocked}
            className="btn-touch bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold space-x-1 disabled:opacity-40"
          >
            <Save className="w-4 h-4 text-teal-400" />
            <span>{isSaving ? (lang === 'ja' ? '保存中...' : 'Menyimpan...') : t.saveDraft}</span>
          </button>

          <button
            type="button"
            onClick={handlePreviewClick}
            disabled={isSaving}
            className="btn-touch bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold space-x-1 shadow border border-teal-600"
          >
            <Eye className="w-4 h-4 text-teal-300" />
            <span>{t.exportHtml}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isLocked || report?.status === 'SUBMITTED'}
            className="btn-touch bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold space-x-1 shadow disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span>{report?.status === 'SUBMITTED' ? (lang === 'ja' ? '提出済' : 'Sudah Diajukan') : t.submitReport}</span>
          </button>
        </div>
      </div>

      {/* Correction Revision Modal */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-emerald-700" />
              <span>{lang === 'ja' ? '承認済日報の改訂発行' : 'Buka Koreksi Revisi Laporan'}</span>
            </h3>
            <p className="text-xs text-slate-600">
              {lang === 'ja'
                ? '改訂理由（なぜ修正が必要か）を必ず記録してください。以前の承認済スナップショットは履歴として永久保持されます。'
                : 'Tuliskan alasan koreksi revisi. Snapshot laporan yang sudah disetujui sebelumnya akan tetap tersimpan permanen di histori.'}
            </p>
            <textarea
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="例: マニフェスト照合による残土搬出数量の訂正"
              className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="flex-1 btn-touch bg-slate-100 text-slate-700 text-xs font-bold rounded"
              >
                {lang === 'ja' ? 'キャンセル' : 'Batal'}
              </button>
              <button
                onClick={handleCorrectionSubmit}
                disabled={!correctionReason.trim()}
                className="flex-1 btn-touch bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded disabled:opacity-50"
              >
                {lang === 'ja' ? '改訂版を作成' : 'Buat Revisi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
