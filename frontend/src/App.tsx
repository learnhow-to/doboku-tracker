import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header.js';
import { Navbar, TabType } from './components/layout/Navbar.js';
import { SyncStatusBanner } from './components/common/SyncStatusBanner.js';
import { ConflictModal } from './components/common/ConflictModal.js';
import { NippouEditor } from './components/reports/NippouEditor.js';
import { ReportListView } from './components/reports/ReportListView.js';
import { ReviewQueue } from './components/review/ReviewQueue.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { MasterDataView } from './components/admin/MasterDataView.js';
import { AdminDesktopLayout } from './components/admin/AdminDesktopLayout.js';
import { AdminSummaryView } from './components/admin/AdminSummaryView.js';
import { AdminExportView } from './components/admin/AdminExportView.js';
import { AdminCalendarView } from './components/admin/AdminCalendarView.js';
import { NippouPreview } from './components/reports/NippouPreview.js';
import { apiRequest, setAuthSession, processSyncQueue } from './services/api.js';
import { saveLocalDraft, getPendingQueueCount } from './services/db.js';
import { Language } from './i18n/index.js';

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('doboku_lang');
      if (saved === 'ja' || saved === 'id') return saved;
    } catch (e) {}
    return 'ja';
  });

  const handleSelectLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('doboku_lang', newLang);
    } catch (e) {}
  };

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Auth & Project State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('proj-shibuya');
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<any>(null);

  // Modals & UI States
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<{ local: any; server: any } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMasterData, setShowMasterData] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast(lang === 'ja' ? 'オンラインに復旧しました。未送信データを同期中...' : 'Koneksi pulih. Menyinkronkan antrean data...');
      if (currentUser?.id) {
        processSyncQueue(currentUser.id).then(({ processed }) => {
          updatePendingCount();
          if (processed > 0) {
            refreshReports();
            showToast(lang === 'ja' ? `${processed} 件のデータを同期しました。` : `${processed} item data berhasil disinkronkan.`);
          }
        });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(lang === 'ja' ? 'オフラインになりました。データは端末に安全に保存されます。' : 'Offline. Data akan tersimpan di IndexedDB perangkat.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, lang]);

  const updatePendingCount = async () => {
    if (currentUser?.id) {
      const count = await getPendingQueueCount(currentUser.id);
      setPendingCount(count);
    }
  };

  // Initialize or switch user
  const initLogin = async (userId: string) => {
    try {
      const res = await apiRequest('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ userId }),
        skipQueue: true,
      });
      setAuthSession(res.token, res.user.id);
      setCurrentUser(res.user);

      // Load projects for user
      const projRes = await apiRequest('/api/projects');
      setProjects(projRes);
      if (projRes.length > 0 && !projRes.find((p: any) => p.id === currentProjectId)) {
        setCurrentProjectId(projRes[0].id);
      }

      await updatePendingCount();

      // Automatically switch to Desktop Backoffice for Admin/Office, Mobile for Worker
      if (res.user.orgRole === 'admin' || res.user.orgRole === 'office') {
        setViewMode('desktop');
      } else {
        setViewMode('mobile');
      }
    } catch (err: any) {
      console.error('Login error:', err);
    }
  };

  const refreshProjects = async () => {
    try {
      const projRes = await apiRequest('/api/projects');
      setProjects(projRes);
    } catch (err) {
      console.error('Failed to reload projects:', err);
    }
  };

  useEffect(() => {
    initLogin('usr-worker-1'); // Default to worker 1 on initial load
  }, []);

  // Load reports whenever currentProjectId or currentUser changes
  const refreshReports = async () => {
    if (!currentProjectId || !currentUser) return;
    try {
      const res = await apiRequest(`/api/reports/project/${currentProjectId}`);
      setReports(res);
      // Auto-select latest report if none selected
      if (res && res.length > 0 && !selectedReportId) {
        setSelectedReportId(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  useEffect(() => {
    refreshReports();
  }, [currentProjectId, currentUser]);

  // Load single report detail when selected
  useEffect(() => {
    async function loadReportDetail() {
      if (!selectedReportId) {
        setCurrentReport(null);
        return;
      }
      try {
        const rep = await apiRequest(`/api/reports/${selectedReportId}`);
        setCurrentReport(rep);
      } catch (err) {
        console.error('Failed to load report detail:', err);
      }
    }
    loadReportDetail();
  }, [selectedReportId]);

  // Handle Save Draft (Offline IndexedDB first + Server Sync)
  const handleSaveDraft = async (data: any) => {
    setIsSaving(true);
    try {
      const isExisting = !!currentReport?.id;
      const url = isExisting ? `/api/reports/${currentReport.id}` : '/api/reports';
      const method = isExisting ? 'PUT' : 'POST';

      // Save to IndexedDB locally first
      const localId = currentReport?.id || `local-${Date.now()}`;
      await saveLocalDraft({
        localId,
        serverId: currentReport?.id,
        userId: currentUser.id,
        organizationId: currentUser.organizationId,
        projectId: currentProjectId,
        data,
        version: data.version,
        lastSavedAt: Date.now(),
        syncStatus: 'saved_locally',
      });

      // Attempt server save
      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });

      setCurrentReport(res);
      setSelectedReportId(res.id);
      showToast(lang === 'ja' ? '日報を保存しました (サーバー同期済)' : 'Laporan disimpan & disinkronkan ke server');
      refreshReports();
      updatePendingCount();
      return res;
    } catch (err: any) {
      if (err.status === 409) {
        // Concurrency conflict!
        setConflictData({ local: data, server: err.currentServerData });
        setConflictModalOpen(true);
      } else if (err.isOfflineQueued) {
        showToast(err.message);
        updatePendingCount();
      } else {
        alert(`Gagal menyimpan: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Report
  const handleSubmitReport = async (reportId: string) => {
    try {
      const res = await apiRequest(`/api/reports/${reportId}/submit`, { method: 'POST' });
      setCurrentReport(res);
      showToast(lang === 'ja' ? '日報を提出しました。点検待ちです。' : 'Laporan berhasil diajukan ke mandor/kantor.');
      refreshReports();
    } catch (err: any) {
      alert(`Gagal mengajukan: ${err.message}`);
    }
  };

  // Approve Report
  const handleApproveReport = async (reportId: string) => {
    try {
      await apiRequest(`/api/reports/${reportId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      showToast(lang === 'ja' ? '日報を承認しました (確定ロック)' : 'Laporan disetujui & terkunci secara permanen');
      refreshReports();
      if (selectedReportId === reportId) {
        const updated = await apiRequest(`/api/reports/${reportId}`);
        setCurrentReport(updated);
      }
    } catch (err: any) {
      alert(`Gagal approve: ${err.message}`);
    }
  };

  // Return Report
  const handleReturnReport = async (reportId: string, reason: string) => {
    try {
      await apiRequest(`/api/reports/${reportId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'return', reason }),
      });
      showToast(lang === 'ja' ? '日報を差戻しました' : 'Laporan dikembalikan ke pelapor untuk perbaikan');
      refreshReports();
      if (selectedReportId === reportId) {
        const updated = await apiRequest(`/api/reports/${reportId}`);
        setCurrentReport(updated);
      }
    } catch (err: any) {
      alert(`Gagal mengembalikan: ${err.message}`);
    }
  };

  // Open Correction Revision for APPROVED report
  const handleOpenCorrection = async (reportId: string, reason: string) => {
    try {
      const res = await apiRequest(`/api/reports/${reportId}/correction`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setCurrentReport(res);
      showToast(lang === 'ja' ? '改訂版を作成しました (編集可能)' : 'Revisi baru dibuka (dapat diedit)');
      refreshReports();
    } catch (err: any) {
      alert(`Gagal membuka koreksi revisi: ${err.message}`);
    }
  };

  const handleManualSync = async () => {
    if (!currentUser?.id) return;
    const { processed, errors } = await processSyncQueue(currentUser.id);
    await updatePendingCount();
    await refreshReports();
    showToast(
      lang === 'ja'
        ? `同期完了: ${processed} 件成功, ${errors} 件失敗`
        : `Sinkronisasi: ${processed} sukses, ${errors} gagal`
    );
  };

  const handleLogout = () => {
    if (pendingCount > 0) {
      const confirm = window.confirm(
        lang === 'ja'
          ? `【警告】端末内に未送信のデータが ${pendingCount} 件あります。ログアウトすると同期されません。本当にログアウトしますか？`
          : `[Peringatan] Ada ${pendingCount} data yang belum tersinkron ke server. Yakin ingin keluar?`
      );
      if (!confirm) return;
    }
    setAuthSession(null, null);
    setCurrentUser(null);
    window.location.reload();
  };

  const activeProject = projects.find((p) => p.id === currentProjectId);
  const currentProjectName = activeProject?.name || '渋谷区本町道路改良工事';
  const submittedReportsCount = reports.filter((r) => r.status === 'SUBMITTED').length;

  // Desktop Backoffice Layout for Admin & Office Staff
  if ((currentUser?.orgRole === 'admin' || currentUser?.orgRole === 'office') && viewMode === 'desktop') {
    return (
      <AdminDesktopLayout
        currentTab={adminTab}
        onChangeTab={setAdminTab}
        currentUser={currentUser}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => {
          setCurrentProjectId(id);
          setSelectedReportId(null);
          setCurrentReport(null);
          showToast(lang === 'ja' ? '現場を切り替えました' : 'Proyek dialihkan');
        }}
        onLogout={handleLogout}
        onSwitchToMobile={() => setViewMode('mobile')}
        lang={lang}
        onSelectLang={handleSelectLang}
        onToggleLang={() => handleSelectLang(lang === 'ja' ? 'id' : 'ja')}
        reviewCount={submittedReportsCount}
      >
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fade-in">
            {toastMessage}
          </div>
        )}

        {adminTab === 'dashboard' && (
          <AdminSummaryView
            onNavigate={(tab) => setAdminTab(tab)}
            onOpenReportPreview={(id) => setPreviewReportId(id)}
            lang={lang}
          />
        )}

        {adminTab === 'calendar' && (
          <AdminCalendarView
            projects={projects}
            currentProjectId={currentProjectId}
            lang={lang}
            onViewReport={(id) => {
              setSelectedReportId(id);
              setViewMode('mobile');
              setActiveTab('today');
            }}
            onCreateForDate={(date, projId) => {
              setCurrentProjectId(projId);
              setSelectedReportId(null);
              setCurrentReport(null);
              setViewMode('mobile');
              setActiveTab('today');
            }}
          />
        )}

        {adminTab === 'export' && (
          <AdminExportView
            projects={projects}
            currentProjectId={currentProjectId}
            lang={lang}
          />
        )}

        {adminTab === 'master' && (
          <MasterDataView
            projects={projects}
            onRefreshProjects={refreshProjects}
            onBack={() => setAdminTab('dashboard')}
            lang={lang}
          />
        )}

        {adminTab === 'review' && (
          <ReviewQueue
            reports={reports}
            currentUserId={currentUser?.id}
            userRole={currentUser?.orgRole}
            lang={lang}
            onApprove={handleApproveReport}
            onReturn={handleReturnReport}
            onViewReport={(id) => {
              setSelectedReportId(id);
              setViewMode('mobile');
              setActiveTab('today');
            }}
            onRefreshReports={refreshReports}
            onToast={showToast}
          />
        )}

        {adminTab === 'reports' && (
          <ReportListView
            reports={reports}
            projectName={currentProjectName}
            lang={lang}
            onSelectReport={(id) => {
              setSelectedReportId(id);
              setViewMode('mobile');
              setActiveTab('today');
            }}
            onCreateNew={() => {
              setSelectedReportId(null);
              setCurrentReport(null);
              setViewMode('mobile');
              setActiveTab('today');
            }}
            onOpenPreview={(id) => setPreviewReportId(id)}
          />
        )}

        {/* Japanese Printable A4 Preview Modal */}
        {previewReportId && (
          <NippouPreview
            reportId={previewReportId}
            onClose={() => setPreviewReportId(null)}
            lang={lang}
          />
        )}
      </AdminDesktopLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Banner when Admin is previewing Mobile Mode */}
      {(currentUser?.orgRole === 'admin' || currentUser?.orgRole === 'office') && (
        <div className="bg-slate-900 text-teal-300 text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <span className="font-bold flex items-center space-x-1.5">
            <span>📱 {lang === 'ja' ? '現場スマホ表示モード中' : 'Pratinjau Mode HP Lapangan'}</span>
          </span>
          <button
            onClick={() => setViewMode('desktop')}
            className="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1 rounded text-xs transition shadow-sm"
          >
            {lang === 'ja' ? 'PC・本社ダッシュボードへ戻る 🖥️' : 'Buka Dashboard PC 🖥️'}
          </button>
        </div>
      )}

      {/* Top App Header */}
      <Header
        currentProjectName={currentProjectName}
        userDisplayName={currentUser?.displayName}
        userRole={currentUser?.orgRole}
        lang={lang}
        onSelectLang={handleSelectLang}
        onToggleLang={() => handleSelectLang(lang === 'ja' ? 'id' : 'ja')}
      />

      {/* Sync Status Banner */}
      <SyncStatusBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        hasConflict={conflictModalOpen}
        onSync={handleManualSync}
        onResolveConflict={() => setConflictModalOpen(true)}
        lang={lang}
      />

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-slate-700 animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Main Tab Content */}
      <main className="flex-1 pt-3 pb-8">
        {activeTab === 'today' && (
          <NippouEditor
            report={currentReport}
            projectId={currentProjectId}
            projectName={currentProjectName}
            lang={lang}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmitReport}
            onOpenPreview={(id) => setPreviewReportId(id)}
            onOpenCorrection={handleOpenCorrection}
            isSaving={isSaving}
            isLocked={currentReport?.status === 'APPROVED'}
          />
        )}

        {activeTab === 'reports' && (
          <ReportListView
            reports={reports}
            projectName={currentProjectName}
            lang={lang}
            onSelectReport={(id) => {
              setSelectedReportId(id);
              setActiveTab('today');
            }}
            onCreateNew={() => {
              setSelectedReportId(null);
              setCurrentReport(null);
              setActiveTab('today');
            }}
            onOpenPreview={(id) => setPreviewReportId(id)}
          />
        )}

        {activeTab === 'review' && (
          <ReviewQueue
            reports={reports}
            currentUserId={currentUser?.id}
            userRole={currentUser?.orgRole}
            lang={lang}
            onApprove={handleApproveReport}
            onReturn={handleReturnReport}
            onViewReport={(id) => {
              setSelectedReportId(id);
              setActiveTab('today');
            }}
            onRefreshReports={refreshReports}
            onToast={showToast}
          />
        )}

        {activeTab === 'settings' && showMasterData && (
          <MasterDataView
            projects={projects}
            onRefreshProjects={refreshProjects}
            onBack={() => setShowMasterData(false)}
            lang={lang}
          />
        )}

        {activeTab === 'settings' && !showMasterData && (
          <SettingsView
            currentUser={currentUser}
            projects={projects}
            currentProjectId={currentProjectId}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
              setSelectedReportId(null);
              setCurrentReport(null);
              showToast(lang === 'ja' ? '現場を切り替えました' : 'Proyek dialihkan');
            }}
            onSwitchUser={(id) => {
              initLogin(id);
              setShowMasterData(false);
              showToast(lang === 'ja' ? 'ユーザーを切り替えました' : 'Pengguna dialihkan');
            }}
            onLogout={handleLogout}
            pendingCount={pendingCount}
            onSync={handleManualSync}
            lang={lang}
            onSelectLang={handleSelectLang}
            onToggleLang={() => handleSelectLang(lang === 'ja' ? 'id' : 'ja')}
            onOpenMasterData={() => setShowMasterData(true)}
          />
        )}
      </main>

      {/* Bottom Genba Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'settings') setShowMasterData(false);
        }}
        reviewCount={submittedReportsCount}
        lang={lang}
      />

      {/* Japanese Printable A4 Preview Modal */}
      {previewReportId && (
        <NippouPreview
          reportId={previewReportId}
          onClose={() => setPreviewReportId(null)}
          lang={lang}
        />
      )}

      {/* Version Conflict Modal */}
      <ConflictModal
        isOpen={conflictModalOpen}
        localData={conflictData?.local}
        serverData={conflictData?.server}
        onKeepLocal={async () => {
          if (conflictData?.server?.version) {
            // Re-submit with server's updated version counter to overwrite
            setConflictModalOpen(false);
            await handleSaveDraft({ ...conflictData.local, version: conflictData.server.version });
          }
        }}
        onUseServer={() => {
          setCurrentReport(conflictData?.server);
          setConflictModalOpen(false);
          showToast(lang === 'ja' ? 'サーバー最新版を取り込みました' : 'Versi server terkini dimuat');
        }}
        onCancel={() => setConflictModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

export default App;
