import React, { useEffect, useState, useMemo } from 'react';
import { useAdminStore, ColumnInfo } from '../store/useAdminStore';
import CabinetCRM from './cabinet/CabinetCRM';
import BlogPostEditorPage from './BlogPostEditorPage';
import { SystemAdminGallery } from '../components/gallery/SystemAdminGallery';
import { SystemAdminProxySection } from '../components/SystemAdminProxySection';
import { SystemAdminGoogleSheetsLoggingCard } from '../components/raport/SystemAdminGoogleSheetsLoggingCard';
import { AcademyAdminEditor } from '../components/academy/AcademyAdminEditor';
import { broadcastAppVersionUpdate } from '../hooks/useAppVersion';
import { 
  Database, Table, Plus, Edit2, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, 
  RefreshCw, Zap, Clock, ShieldCheck, Check, X, AlertCircle, Play, Server,
  LayoutGrid, TableProperties, BarChart3, Package, Download, Upload, FileSpreadsheet,
  Sun, Moon, Lock, LogOut, CheckCircle2, TrendingUp, DollarSign, Award, Layers, BookOpen, FileText, HardDrive,
  Globe, GraduationCap
} from 'lucide-react';

interface SystemAdminPageProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export default function SystemAdminPage({ currentPath, onNavigate }: SystemAdminPageProps) {
  const {
    tables,
    selectedTable,
    tableColumns,
    tableRows,
    loading,
    error,
    triggers,
    triggerLogs,
    cronJobs,
    searchQuery,
    sortField,
    sortOrder,
    lastSyncedAt,
    realtimeConnected,
    setRealtimeConnected,
    handleDbChangeEvent,
    fetchTables,
    fetchTableData,
    createRow,
    updateRow,
    updateCell,
    deleteRow,
    fetchTriggers,
    fetchCronJobs,
    runCronJob,
    setSearchQuery,
    setSort,
    exportCurrentTableCsv,
    exportAllTablesCsv,
    exportFullJsonBackup,
    importTableCsv,
    importFullJsonBackup
  } = useAdminStore();

  // Password Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('sys_admin_auth') === 'true' || localStorage.getItem('sys_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Theme Toggle State
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return !document.documentElement.classList.contains('theme-light');
  });

  // Listen to global theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDarkTheme(!document.documentElement.classList.contains('theme-light'));
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    if (isDarkTheme) {
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
      setIsDarkTheme(false);
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark');
      setIsDarkTheme(true);
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  // Row Modal States (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRowId, setEditingRowId] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Cell Modal State (Single Cell Edit)
  const [cellEditModal, setCellEditModal] = useState<{
    tableName: string;
    pkCol: string;
    pkValue: any;
    colName: string;
    colType: string;
    originalValue: any;
    value: string;
    isNull: boolean;
  } | null>(null);
  const [cellSaving, setCellSaving] = useState(false);
  const [cellError, setCellError] = useState<string | null>(null);

  // Logs Table Specialized Filter & Statistics States
  const [logsChatIdFilter, setLogsChatIdFilter] = useState('');
  const [logsMinRub, setLogsMinRub] = useState('');
  const [logsMaxRub, setLogsMaxRub] = useState('');

  // Balance adjustment state for users table
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<string>('admin');
  const [adjustReason, setAdjustReason] = useState<string>('Корректировка администратором');

  // Custom Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<any>(null);

  // CSV File Input State
  const [importMode, setImportMode] = useState<'replace' | 'dedup'>('dedup');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');

  // JSON Full Backup State
  const [isJsonBackupModalOpen, setIsJsonBackupModalOpen] = useState(false);
  const [jsonBackupMode, setJsonBackupMode] = useState<'replace' | 'dedup'>('dedup');
  const [jsonBackupContent, setJsonBackupContent] = useState<any>(null);
  const [jsonBackupFileName, setJsonBackupFileName] = useState<string>('');

  // App Version State
  const [appVersion, setAppVersion] = useState<string>('v.1.54');
  const [versionInput, setVersionInput] = useState<string>('v.1.54');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState<boolean>(false);
  const [versionSaving, setVersionSaving] = useState<boolean>(false);

  const fetchAppVersion = async () => {
    try {
      const res = await fetch(`/api/system/version?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.version) {
        setAppVersion(data.version);
        setVersionInput(data.version);
        broadcastAppVersionUpdate(data.version);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSaveAppVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionInput.trim()) return;
    try {
      setVersionSaving(true);
      const res = await fetch('/api/system/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: versionInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setAppVersion(data.version);
        broadcastAppVersionUpdate(data.version);
        setIsVersionModalOpen(false);
        showToast(`Версия приложения успешно обновлена на ${data.version}`);
      } else {
        showToast(data.error || 'Ошибка при сохранении версии');
      }
    } catch (err: any) {
      showToast('Ошибка сети: ' + err.message);
    } finally {
      setVersionSaving(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'wkL35eTm') {
      setIsAuthenticated(true);
      sessionStorage.setItem('sys_admin_auth', 'true');
      localStorage.setItem('sys_admin_auth', 'true');
      setAuthError(null);
    } else {
      setAuthError('Неверный пароль доступа!');
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('sys_admin_auth');
    localStorage.removeItem('sys_admin_auth');
    setPasswordInput('');
  };

  useEffect(() => {
    fetchTables();
    fetchTriggers();
    fetchCronJobs();
    fetchAppVersion();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    setRealtimeConnected(true);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('ii_rr_db_sync');
        bc.onmessage = (evt: MessageEvent) => {
          if (evt.data?.table) {
            handleDbChangeEvent(evt.data.table);
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable
    }

    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const st = useAdminStore.getState();
      st.fetchTables(true);
      if (st.selectedTable) {
        st.fetchTableData(st.selectedTable, st.searchQuery, st.sortField || '', st.sortOrder, true);
      }
    }, 20000);

    return () => {
      if (bc) bc.close();
      clearInterval(pollTimer);
      setRealtimeConnected(false);
    };
  }, [isAuthenticated]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handlePromptDelete = (id: any) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTable || deleteTargetId === null) return;
    const ok = await deleteRow(selectedTable, deleteTargetId);
    if (ok) {
      showToast(`Запись '${deleteTargetId}' успешно удалена из таблицы '${selectedTable}'`);
    }
    setDeleteModalOpen(false);
    setDeleteTargetId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!selectedTable || !csvFileContent) return;
    const msg = await importTableCsv(selectedTable, csvFileContent, importMode);
    if (msg) {
      showToast(msg);
      setIsImportModalOpen(false);
      setCsvFileContent('');
      setCsvFileName('');
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonBackupFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setJsonBackupContent(parsed);
      } catch (err) {
        showToast('Ошибка чтения JSON файла! Проверьте формат.');
        setJsonBackupContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteJsonImport = async () => {
    if (!jsonBackupContent) return;
    const msg = await importFullJsonBackup(jsonBackupContent, jsonBackupMode);
    if (msg) {
      showToast(msg);
      setIsJsonBackupModalOpen(false);
      setJsonBackupContent(null);
      setJsonBackupFileName('');
    }
  };

  const handleSubNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Determine active system-admin route
  const rawPath = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/system-admin');
  const path = rawPath.split('?')[0].replace(/\/$/, '') || '/system-admin';
  
  let activeNavPath = '/system-admin';
  if (path === '/system-admin/triggers') activeNavPath = '/system-admin/triggers';
  else if (path === '/system-admin/cron') activeNavPath = '/system-admin/cron';
  else if (path === '/system-admin/proxy' || path === '/system-admin/telegram') activeNavPath = '/system-admin/proxy';
  else if (path === '/system-admin/kanban' || path === '/system-admin/crm') activeNavPath = '/system-admin/kanban';
  else if (path === '/system-admin/table' || path === '/system-admin/crm/table') activeNavPath = '/system-admin/table';
  else if (path === '/system-admin/analytic' || path === '/system-admin/analitic' || path === '/system-admin/analytics') activeNavPath = '/system-admin/analytic';
  else if (path === '/system-admin/product' || path === '/system-admin/products' || path === '/system-admin/crm/products') activeNavPath = '/system-admin/product';
  else if (path === '/system-admin/blog' || path.startsWith('/system-admin/blog')) activeNavPath = '/system-admin/blog';
  else if (path === '/system-admin/gallery' || path.startsWith('/system-admin/gallery')) activeNavPath = '/system-admin/gallery';
  else if (path === '/system-admin/academy' || path.startsWith('/system-admin/academy')) activeNavPath = '/system-admin/academy';
  else if (path === '/system-admin/protalk' || path === '/system-admin/logging' || path === '/system-admin/sheets') activeNavPath = '/system-admin/protalk';
  else activeNavPath = '/system-admin';

  // Auto-select corresponding domain PostgreSQL BD ProTalk table when navigating between pages
  useEffect(() => {
    if (activeNavPath === '/system-admin/triggers') {
      fetchTableData('triggers_log');
    } else if (activeNavPath === '/system-admin/cron') {
      fetchTableData('cron_jobs');
    } else if (activeNavPath === '/system-admin/proxy') {
      fetchTableData('telegram_bot_config');
    } else if (activeNavPath === '/system-admin/kanban' || activeNavPath === '/system-admin/table') {
      fetchTableData('companies');
    } else if (activeNavPath === '/system-admin/analytic') {
      fetchTableData('reports');
    } else if (activeNavPath === '/system-admin/product') {
      fetchTableData('projects');
    } else if (activeNavPath === '/system-admin/blog') {
      fetchTableData('blog_posts');
    } else if (activeNavPath === '/system-admin/gallery') {
      fetchTableData('file_storage');
    } else if (activeNavPath === '/system-admin/academy') {
      fetchTableData('academy_posts');
    } else if (activeNavPath === '/system-admin/protalk') {
      fetchTableData('logs');
    }
  }, [activeNavPath]);

  const navItems = [
    { path: '/system-admin', label: `Таблицы PostgreSQL BD ProTalk (${tables.length})`, icon: Table },
    { path: '/system-admin/academy', label: 'Академия & Инструкции', icon: GraduationCap },
    { path: '/system-admin/protalk', label: 'Логирование функций & Google Таблицы', icon: FileSpreadsheet },
    { path: '/system-admin/triggers', label: `Триггеры БД (${triggers.length})`, icon: Zap },
    { path: '/system-admin/cron', label: `Крон-задачи (${cronJobs.length})`, icon: Clock },
    { path: '/system-admin/proxy', label: 'Telegram & Прокси', icon: Globe },
    { path: '/system-admin/kanban', label: 'CRM Канбан', icon: LayoutGrid },
    { path: '/system-admin/table', label: 'CRM Таблица', icon: TableProperties },
    { path: '/system-admin/analytic', label: 'Аналитика & Воронки', icon: BarChart3 },
    { path: '/system-admin/product', label: 'Каталог ИИ-Продуктов', icon: Package },
    { path: '/system-admin/blog', label: 'Управление Блогом', icon: BookOpen },
    { path: '/system-admin/gallery', label: 'Галерея & Storage', icon: HardDrive },
  ];

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingRowId(null);
    const initialForm: Record<string, any> = {};
    tableColumns.forEach(col => {
      if (col.name === 'id') {
        initialForm['id'] = 'id_' + Math.floor(100000 + Math.random() * 900000);
      } else {
        initialForm[col.name] = '';
      }
    });
    setFormData(initialForm);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (row: Record<string, any>) => {
    setModalMode('edit');
    const pkCol = tableColumns.find(c => c.pk)?.name || 'id';
    setEditingRowId(row[pkCol]);
    setFormData({ ...row });
    setModalError(null);
    setAdjustAmount(0);
    setAdjustType('admin');
    setAdjustReason('Корректировка администратором');
    setIsModalOpen(true);
  };

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    if (selectedTable === 'users' && adjustAmount !== 0) {
      try {
        await fetch('/api/admin/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingRowId,
            amount: Number(adjustAmount),
            type: adjustType,
            description: adjustReason || 'Корректировка администратором'
          })
        });
      } catch (err) {
        console.error('Failed to post balance adjustment transaction:', err);
      }
    }

    if (modalMode === 'create') {
      const ok = await createRow(selectedTable, formData);
      if (ok) {
        setIsModalOpen(false);
        showToast(`Запись успешно добавлена в таблицу '${selectedTable}'`);
        fetchTableData(selectedTable);
      } else {
        setModalError('Ошибка при создании записи');
      }
    } else {
      const ok = await updateRow(selectedTable, editingRowId, formData);
      if (ok) {
        setIsModalOpen(false);
        showToast(`Запись '${editingRowId}' успешно обновлена`);
        fetchTableData(selectedTable);
      } else {
        setModalError('Ошибка при обновлении записи');
      }
    }
  };

  const handleDeleteRow = (id: any) => {
    if (!selectedTable) return;
    handlePromptDelete(id);
  };

  const handleOpenCellEditModal = (e: React.MouseEvent, row: any, col: ColumnInfo) => {
    e.stopPropagation();
    const pkCol = tableColumns.find(c => c.pk)?.name || 'id';
    const pkValue = row[pkCol];
    const val = row[col.name];
    const isNull = val === null || val === undefined;
    setCellEditModal({
      tableName: selectedTable || '',
      pkCol,
      pkValue,
      colName: col.name,
      colType: col.type,
      originalValue: val,
      value: isNull ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val),
      isNull
    });
    setCellError(null);
  };

  const handleSaveCell = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cellEditModal) return;
    setCellSaving(true);
    setCellError(null);
    try {
      let finalVal: any = cellEditModal.isNull ? null : cellEditModal.value;
      if (!cellEditModal.isNull) {
        const typeUpper = (cellEditModal.colType || '').toUpperCase();
        if (typeUpper.includes('INT')) {
          const parsed = parseInt(finalVal, 10);
          if (!isNaN(parsed)) finalVal = parsed;
        } else if (typeUpper.includes('REAL') || typeUpper.includes('NUM') || typeUpper.includes('DEC') || typeUpper.includes('FLOAT')) {
          const parsed = parseFloat(finalVal);
          if (!isNaN(parsed)) finalVal = parsed;
        }
      }
      const ok = await updateCell(
        cellEditModal.tableName,
        cellEditModal.pkValue,
        cellEditModal.colName,
        finalVal,
        cellEditModal.pkCol
      );
      if (ok) {
        showToast(`Поле '${cellEditModal.colName}' успешно сохранено!`);
        setCellEditModal(null);
      } else {
        setCellError('Не удалось обновить ячейку');
      }
    } catch (err: any) {
      setCellError(err.message || 'Ошибка сохранения');
    } finally {
      setCellSaving(false);
    }
  };

  // Filtered rows for logs table or general table
  const displayedRows = useMemo(() => {
    if (selectedTable !== 'logs' && selectedTable !== 'telegram_messages_log') {
      return tableRows;
    }
    return tableRows.filter(row => {
      if (logsChatIdFilter) {
        const query = logsChatIdFilter.toLowerCase();
        const cid = String(row.chat_id || row.user_id || row.id || '').toLowerCase();
        if (!cid.includes(query)) return false;
      }
      const rubVal = parseFloat(row.rub) || 0;
      if (logsMinRub && rubVal < parseFloat(logsMinRub)) return false;
      if (logsMaxRub && rubVal > parseFloat(logsMaxRub)) return false;
      return true;
    });
  }, [tableRows, selectedTable, logsChatIdFilter, logsMinRub, logsMaxRub]);

  // Global & filtered stats for logs table
  const logsGlobalStats = useMemo(() => {
    if (selectedTable !== 'logs' && selectedTable !== 'telegram_messages_log') return null;
    const totalCount = tableRows.length;
    const totalRub = tableRows.reduce((acc, r) => acc + (parseFloat(r.rub) || 0), 0);
    const totalTokens = tableRows.reduce((acc, r) => acc + (parseInt(r.tokens_total || r.tokens || 0, 10) || 0), 0);

    const filteredCount = displayedRows.length;
    const filteredRub = displayedRows.reduce((acc, r) => acc + (parseFloat(r.rub) || 0), 0);
    const filteredTokens = displayedRows.reduce((acc, r) => acc + (parseInt(r.tokens_total || r.tokens || 0, 10) || 0), 0);

    return {
      totalCount,
      totalRub,
      totalTokens,
      filteredCount,
      filteredRub,
      filteredTokens
    };
  }, [tableRows, displayedRows, selectedTable]);

  const handleSortToggle = (colName: string) => {
    if (sortField === colName) {
      setSort(colName, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(colName, 'asc');
    }
  };

  // Password Login Screen
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300 ${
        isDarkTheme ? 'bg-[#140A01] text-amber-100' : 'bg-[#FAF6EC] text-amber-950'
      }`}>
        <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6 border ${
          isDarkTheme 
            ? 'bg-[#1A0F02]/95 border-amber-400/50 shadow-[0_0_40px_rgba(244,238,142,0.15)]' 
            : 'bg-[#FFFBF5] border-amber-900/30'
        }`}>
          <div className="text-center space-y-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
              isDarkTheme ? 'bg-amber-400/20 border-amber-400/50 text-[#F4EE8E]' : 'bg-amber-100 border-amber-800/30 text-amber-950'
            }`}>
              <Lock size={28} />
            </div>
            <h2 className={`text-xl font-black uppercase tracking-wide ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
              Системная Админ-панель
            </h2>
            <p className={`text-xs ${isDarkTheme ? 'text-amber-200/70' : 'text-amber-900/70'}`}>
              Введите пароль для доступа к управлению базой данных
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setAuthError(null); }}
                placeholder="Пароль доступа..."
                className={`w-full p-3.5 rounded-xl text-sm font-mono focus:outline-none transition-colors border ${
                  isDarkTheme 
                    ? 'bg-[#140A01] border-amber-400/60 text-amber-100 placeholder:text-amber-300/40 focus:border-amber-300' 
                    : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50 focus:border-amber-600'
                }`}
                autoFocus
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                isDarkTheme 
                  ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_20px_rgba(244,238,142,0.3)] hover:brightness-110' 
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md hover:brightness-105'
              }`}
            >
              Войти в систему
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Reusable Database Table Component rendered inside domain tabs
  const renderEmbeddedTableEditor = (titlePrefix?: string) => (
    <div className={`p-4 sm:p-6 rounded-3xl border shadow-xl space-y-4 ${
      isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-amber-500/20">
        <h3 className={`text-sm font-black flex items-center gap-2 ${
          isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
        }`}>
          <Database size={18} className="text-[#D4AF37]" />
          <span>{titlePrefix || 'Таблица PostgreSQL BD ProTalk'}: {selectedTable} ({tableRows.length} стр.)</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* JSON Full Database Backup & Restore */}
          <button
            onClick={() => exportFullJsonBackup()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isDarkTheme 
                ? 'bg-amber-500/20 border-amber-400 text-[#F4EE8E] hover:bg-amber-500/30' 
                : 'bg-amber-200 border-amber-800/40 text-amber-950 hover:bg-amber-300'
            }`}
            title="Полный экспорт всех таблиц PostgreSQL BD ProTalk в один JSON бэкап"
          >
            <Download size={13} className="text-[#D4AF37]" />
            <span>Бэкап JSON</span>
          </button>

          <button
            onClick={() => setIsJsonBackupModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isDarkTheme 
                ? 'bg-amber-500/20 border-amber-400 text-[#F4EE8E] hover:bg-amber-500/30' 
                : 'bg-amber-200 border-amber-800/40 text-amber-950 hover:bg-amber-300'
            }`}
            title="Восстановление всей базы данных из JSON бэкапа"
          >
            <Upload size={13} className="text-[#D4AF37]" />
            <span>Импорт JSON</span>
          </button>

          <button
            onClick={() => exportAllTablesCsv()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isDarkTheme 
                ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/20' 
                : 'bg-amber-100 border-amber-800/30 text-amber-950 hover:bg-amber-200'
            }`}
            title="Массовый экспорт всех таблиц в CSV"
          >
            <FileSpreadsheet size={13} />
            <span className="hidden md:inline">Все в CSV</span>
          </button>

          <button
            onClick={() => selectedTable && exportCurrentTableCsv(selectedTable)}
            disabled={!selectedTable}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 ${
              isDarkTheme 
                ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/20' 
                : 'bg-amber-100 border-amber-800/30 text-amber-950 hover:bg-amber-200'
            }`}
            title="Экспорт текущей таблицы в CSV"
          >
            <Download size={13} />
            <span>Экспорт CSV</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            disabled={!selectedTable}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 ${
              isDarkTheme 
                ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/20' 
                : 'bg-amber-100 border-amber-800/30 text-amber-950 hover:bg-amber-200'
            }`}
            title="Импорт в текущую таблицу из CSV"
          >
            <Upload size={13} />
            <span>Импорт CSV</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            disabled={!selectedTable}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
              isDarkTheme 
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110' 
                : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 hover:brightness-105'
            }`}
          >
            <Plus size={14} className="stroke-[3]" />
            <span>+ Новая строка</span>
          </button>
        </div>
      </div>

      {/* Table Controls Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
            isDarkTheme ? 'text-amber-300/60' : 'text-amber-900/60'
          }`} />
          <input
            type="text"
            placeholder={`Поиск в ${selectedTable || 'таблице'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-sans transition-colors border focus:outline-none ${
              isDarkTheme 
                ? 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-amber-300' 
                : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50 focus:border-amber-600'
            }`}
          />
        </div>
      </div>

      {/* Logs Table Specialized Filter & Statistics Panel */}
      {(selectedTable === 'logs' || selectedTable === 'telegram_messages_log') && logsGlobalStats && (
        <div className={`p-4 rounded-2xl border space-y-3 shadow-md ${
          isDarkTheme ? 'bg-[#1A0F02]/80 border-amber-400/40 text-amber-100' : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`text-xs uppercase font-mono font-black flex items-center gap-2 ${
              isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              📊 Статистика и фильтрация логов
            </span>
            <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                Сообщений: <strong>{logsGlobalStats.filteredCount}</strong> / {logsGlobalStats.totalCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#D4AF37] font-bold">
                Общая стоимость: <strong>{logsGlobalStats.totalRub.toFixed(2)} ₽</strong>
              </span>
              {(logsChatIdFilter || logsMinRub || logsMaxRub) && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 font-bold">
                  По фильтру: {logsGlobalStats.filteredRub.toFixed(2)} ₽
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по ID / chat_id..."
                value={logsChatIdFilter}
                onChange={(e) => setLogsChatIdFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none ${
                  isDarkTheme 
                    ? 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40' 
                    : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50'
                }`}
              />
            </div>
            <div>
              <input
                type="number"
                step="0.01"
                placeholder="Мин. стоимость (₽)..."
                value={logsMinRub}
                onChange={(e) => setLogsMinRub(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none ${
                  isDarkTheme 
                    ? 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40' 
                    : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50'
                }`}
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Макс. стоимость (₽)..."
                value={logsMaxRub}
                onChange={(e) => setLogsMaxRub(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none ${
                  isDarkTheme 
                    ? 'bg-[#140A01] border-amber-400/40 text-amber-100 placeholder:text-amber-300/40' 
                    : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50'
                }`}
              />
              {(logsChatIdFilter || logsMinRub || logsMaxRub) && (
                <button
                  type="button"
                  onClick={() => { setLogsChatIdFilter(''); setLogsMinRub(''); setLogsMaxRub(''); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    isDarkTheme ? 'bg-amber-400/10 border-amber-400/30 text-[#F4EE8E]' : 'bg-amber-100 border-amber-800/30 text-amber-950'
                  }`}
                >
                  Сброс
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-200 p-3 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Grid Viewer */}
      <div className={`rounded-2xl border overflow-hidden shadow-lg ${
        isDarkTheme ? 'border-amber-400/30 bg-[#140A01]' : 'border-amber-900/20 bg-white'
      }`}>
        <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead className={`border-b text-[11px] uppercase font-mono font-black ${
              isDarkTheme 
                ? 'bg-[#1A0F02] text-[#F4EE8E] border-amber-400/30' 
                : 'bg-amber-100/90 text-amber-950 border-amber-900/30'
            }`}>
              <tr>
                <th className="p-3 w-20 text-center border-r border-amber-500/20">Действия</th>
                {tableColumns.map(col => (
                  <th
                    key={col.name}
                    onClick={() => handleSortToggle(col.name)}
                    className="p-3 cursor-pointer transition-colors select-none border-r border-amber-500/20 last:border-r-0 hover:opacity-80"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.name}</span>
                      {col.pk && <span className="text-[9px] font-bold bg-amber-400/30 text-amber-950 px-1 rounded">(PK)</span>}
                      {sortField === col.name ? (
                        sortOrder === 'asc' ? <ArrowUp size={12} className="text-[#D4AF37]" /> : <ArrowDown size={12} className="text-[#D4AF37]" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30" />
                      )}
                    </div>
                    <span className="text-[9px] opacity-70 block font-normal lowercase mt-0.5">{col.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-500/15 font-mono text-[11px]">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length + 1} className="p-12 text-center italic font-sans text-xs">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={16} className="animate-spin text-[#D4AF37]" />
                        <span>Загрузка данных из PostgreSQL BD ProTalk...</span>
                      </div>
                    ) : (
                      'Записей в этой таблице не найдено'
                    )}
                  </td>
                </tr>
              ) : (
                displayedRows.map((row, idx) => {
                  const pkCol = tableColumns.find(c => c.pk)?.name || 'id';
                  const rowPkValue = row[pkCol] ?? idx;
                  return (
                    <tr 
                      key={idx} 
                      className={`transition-colors ${
                        isDarkTheme 
                          ? 'even:bg-[#1A0F02] odd:bg-[#140A01] hover:bg-amber-400/10 text-amber-100' 
                          : 'even:bg-[#FFFBF5] odd:bg-amber-50/50 hover:bg-amber-100/70 text-amber-950'
                      }`}
                    >
                      <td className="p-2 text-center whitespace-nowrap border-r border-amber-500/20">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(row); }}
                            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-400 hover:text-amber-950 transition-all cursor-pointer"
                            title="Редактировать строку целиком"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteRow(rowPkValue); }}
                            className="p-1.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                            title="Удалить строку"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                      {tableColumns.map(col => {
                        const val = row[col.name];
                        const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'NULL');
                        return (
                          <td 
                            key={col.name} 
                            onClick={(e) => handleOpenCellEditModal(e, row, col)}
                            className="p-2.5 max-w-[220px] truncate border-r border-amber-500/15 last:border-r-0 cursor-pointer hover:bg-amber-400/25 transition-colors" 
                            title={`Кликните для редактирования ячейки [${col.name}]: ${displayVal}`}
                          >
                            {val === null ? <span className="opacity-50 italic px-1.5 py-0.5 rounded text-[10px]">NULL</span> : displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 font-sans animate-fade-in p-3 sm:p-6 max-w-7xl mx-auto transition-colors duration-300 ${
      isDarkTheme ? 'text-amber-100' : 'text-amber-950'
    }`}>
      {/* Top Header & Navigation Tabs Bar */}
      <div className={`p-3 rounded-3xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        isDarkTheme 
          ? 'bg-[#1A0F02]/90 border-amber-400/40 shadow-[0_0_25px_rgba(244,238,142,0.12)]' 
          : 'bg-[#FFFBF5] border-amber-900/30'
      }`}>
        {/* Mobile Navigation Selector */}
        <div className="block md:hidden w-full">
          <label className={`block text-[10px] uppercase font-bold mb-1 ${
            isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-900'
          }`}>
            Раздел системной панели
          </label>
          <div className="relative">
            <select
              value={activeNavPath}
              onChange={(e) => handleSubNavigate(e.target.value)}
              className={`w-full font-extrabold text-xs px-3.5 py-3 rounded-2xl border appearance-none focus:outline-none pr-10 shadow-md ${
                isDarkTheme 
                  ? 'bg-[#140A01] text-[#F4EE8E] border-amber-400/50' 
                  : 'bg-white text-amber-950 border-amber-800/30'
              }`}
            >
              {navItems.map((item) => (
                <option key={item.path} value={item.path} className={isDarkTheme ? 'bg-[#1A0F02] text-amber-100' : 'bg-white text-amber-950'}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#D4AF37]">
              ▼
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex flex-wrap items-center gap-1.5 flex-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNavPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleSubNavigate(item.path)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? isDarkTheme
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-[0_0_15px_rgba(244,238,142,0.3)]'
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 font-black shadow-md'
                    : isDarkTheme
                      ? 'bg-[#140A01] text-amber-200 hover:text-white border border-amber-400/30 hover:bg-amber-400/10'
                      : 'bg-amber-100/70 text-amber-950 hover:bg-amber-200 border border-amber-800/20'
                }`}
              >
                <IconComponent size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
          {/* Live BD ProTalk Sync Indicator (Gold/Amber only, min 14px) */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-sm font-sans flex items-center gap-2 ${
              isDarkTheme
                ? 'bg-[#140A01]/70 border-amber-400/40 text-amber-100'
                : 'bg-amber-50 border-amber-800/30 text-amber-950'
            }`}
            title="Синхронизация таблиц с PostgreSQL BD ProTalk в реальном времени"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                realtimeConnected
                  ? 'bg-[#E7C768] shadow-[0_0_10px_#F4EE8E] animate-pulse'
                  : 'bg-amber-600/60'
              }`}
            />
            <span className="whitespace-nowrap">
              {realtimeConnected ? 'Синхронизация онлайн' : 'Автообновление'}
              {lastSyncedAt ? ` · ${lastSyncedAt}` : ''}
            </span>
          </div>

          {/* App Version Manager Button */}
          <button
            onClick={() => { setVersionInput(appVersion); setIsVersionModalOpen(true); }}
            className={`px-3 py-2 rounded-xl border text-sm font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
              isDarkTheme 
                ? 'bg-amber-400/10 border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/20 shadow-[0_0_12px_rgba(244,238,142,0.2)]' 
                : 'bg-amber-100 border-amber-800/30 text-amber-950 hover:bg-amber-200'
            }`}
            title="Управление версией приложения (нажмите для редактирования)"
          >
            <span className="text-[#D4AF37]">🏷</span>
            <span>{appVersion}</span>
          </button>

          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95 ${
              isDarkTheme 
                ? 'bg-amber-400/10 border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/20' 
                : 'bg-amber-100 border-amber-800/30 text-amber-950 hover:bg-amber-200'
            }`}
            title={isDarkTheme ? 'Переключить на дневную тему' : 'Переключить на ночную тему'}
          >
            {isDarkTheme ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={() => { fetchTables(); fetchTriggers(); fetchCronJobs(); }}
            className={`px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shadow-md active:scale-95 ${
              isDarkTheme 
                ? 'bg-amber-400/10 border-amber-400/50 text-[#F4EE8E] hover:bg-amber-400/20' 
                : 'bg-amber-100 border-amber-800/30 text-amber-950 hover:bg-amber-200'
            }`}
            title="Обновить данные системной панели"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#D4AF37]' : ''} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-500 dark:text-red-400 transition-all cursor-pointer flex items-center justify-center shadow-md active:scale-95"
            title="Заблокировать доступ к админ-панели"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fade-in shadow-xl ${
          isDarkTheme ? 'bg-amber-500/20 border-amber-400/60 text-amber-100' : 'bg-amber-100 border-amber-800/40 text-amber-950'
        }`}>
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <Check size={16} className="text-[#D4AF37]" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="cursor-pointer p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* PAGE 1: `/system-admin` -> PostgreSQL BD ProTalk Tables */}
      {activeNavPath === '/system-admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table Selector Sidebar */}
          <div className={`space-y-3 lg:col-span-1 p-4 rounded-3xl border shadow-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
          }`}>
            <h3 className={`text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 pb-2 border-b ${
              isDarkTheme ? 'text-[#F4EE8E] border-amber-400/30' : 'text-amber-950 border-amber-900/20'
            }`}>
              <Database size={14} className="text-[#D4AF37]" />
              <span>Выбор таблицы ({tables.length})</span>
            </h3>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto scrollbar-thin pr-1">
              {tables.map(t => (
                <button
                  key={t.name}
                  onClick={() => fetchTableData(t.name)}
                  className={`w-full p-3 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    selectedTable === t.name 
                      ? isDarkTheme 
                        ? 'bg-amber-400/20 border-amber-400 text-[#F4EE8E] font-extrabold shadow-md' 
                        : 'bg-amber-200/80 border-amber-800 text-amber-950 font-extrabold shadow-md'
                      : isDarkTheme 
                        ? 'bg-[#140A01] border-amber-400/20 text-amber-200 hover:bg-amber-400/10' 
                        : 'bg-white border-amber-800/20 text-amber-950 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Table size={14} className="text-[#D4AF37]" />
                    <span className="text-xs font-mono truncate">{t.name}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                    selectedTable === t.name 
                      ? 'bg-[#D4AF37] text-amber-950' 
                      : isDarkTheme ? 'bg-amber-400/10 text-amber-200' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content: Selected Table Viewer & Editor */}
          <div className="lg:col-span-3 space-y-4">
            {(selectedTable === 'logs' || selectedTable === 'protalk_config') && (
              <SystemAdminGoogleSheetsLoggingCard isDarkTheme={isDarkTheme} onSuccess={showToast} />
            )}
            {renderEmbeddedTableEditor('База данных PostgreSQL BD ProTalk (raport)')}
          </div>
        </div>
      )}

      {/* PAGE: `/system-admin/protalk` -> Function Logging & Google Sheets */}
      {activeNavPath === '/system-admin/protalk' && (
        <div className="space-y-6">
          <SystemAdminGoogleSheetsLoggingCard isDarkTheme={isDarkTheme} onSuccess={showToast} />
          {renderEmbeddedTableEditor('Журнал логов нейросети и функций')}
        </div>
      )}

      {/* PAGE 2: `/system-admin/triggers` -> Triggers (5) */}
      {activeNavPath === '/system-admin/triggers' && (
        <div className="space-y-6">
          <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
          }`}>
            <h3 className={`text-sm font-black flex items-center gap-2 ${
              isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              <Zap size={18} className="text-[#D4AF37]" />
              <span>Активные системные триггеры PostgreSQL BD ProTalk ({triggers.length})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {triggers.map((trig, i) => (
                <div key={i} className={`p-4 rounded-2xl border space-y-2 ${
                  isDarkTheme ? 'bg-[#140A01] border-amber-400/30' : 'bg-white border-amber-800/20'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-black text-[#D4AF37]">{trig.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isDarkTheme ? 'bg-amber-400/15 text-amber-200 border-amber-400/30' : 'bg-amber-100 text-amber-950 border-amber-800/20'
                    }`}>
                      Таблица: {trig.tbl_name}
                    </span>
                  </div>
                  <pre className={`p-3 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap border ${
                    isDarkTheme ? 'bg-[#0a0501] text-amber-200 border-amber-400/20' : 'bg-amber-50 text-amber-950 border-amber-800/20'
                  }`}>
                    {trig.sql}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded triggers_log Table Editor */}
          {renderEmbeddedTableEditor('Журнал аудита триггеров')}
        </div>
      )}

      {/* PAGE 3: `/system-admin/cron` -> Cron Jobs (3) */}
      {activeNavPath === '/system-admin/cron' && (
        <div className="space-y-6">
          <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
          }`}>
            <h3 className={`text-sm font-black flex items-center gap-2 ${
              isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              <Clock size={18} className="text-[#D4AF37]" />
              <span>Реестр фоновых Крон-задач Node.js ({cronJobs.length})</span>
            </h3>

            <div className="space-y-3">
              {cronJobs.map((job) => (
                <div key={job.id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDarkTheme ? 'bg-[#140A01] border-amber-400/30' : 'bg-white border-amber-800/20'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black">{job.name}</span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                        isDarkTheme ? 'bg-amber-400/20 text-[#F4EE8E] border-amber-400/40' : 'bg-amber-100 text-amber-950 border-amber-800/20'
                      }`}>
                        {job.schedule}
                      </span>
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                        isDarkTheme ? 'bg-amber-400/15 text-amber-200 border-amber-400/30' : 'bg-amber-200 text-amber-950 border-amber-800/30'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono opacity-80">
                      <strong>Последний запуск:</strong> {job.lastRun || 'Никогда'} | <strong>Результат:</strong> {job.lastResult || 'Ожидает выполнения'}
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      const msg = await runCronJob(job.id);
                      if (msg) showToast(msg);
                    }}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isDarkTheme 
                        ? 'bg-amber-400/20 hover:bg-amber-400 hover:text-amber-950 border-amber-400/50 text-[#F4EE8E]' 
                        : 'bg-amber-100 hover:bg-amber-200 border-amber-800/30 text-amber-950'
                    }`}
                  >
                    <Play size={14} />
                    <span>Запустить сейчас</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded cron_jobs Table Editor */}
          {renderEmbeddedTableEditor('Реестр крон-задач')}
        </div>
      )}

      {/* PAGE 3b: `/system-admin/proxy` -> Telegram Bot Token Security & Proxy Gateway */}
      {activeNavPath === '/system-admin/proxy' && (
        <div className="space-y-6">
          <SystemAdminProxySection isDarkTheme={isDarkTheme} onShowToast={showToast} />
          {renderEmbeddedTableEditor('Конфигурация Telegram бота (telegram_bot_config) в PostgreSQL BD ProTalk')}
        </div>
      )}

      {/* PAGE 4: `/system-admin/kanban` -> CRM Kanban */}
      {activeNavPath === '/system-admin/kanban' && (
        <div className="space-y-6">
          <CabinetCRM forcedSubTab="board" hideSubTabs={true} />
          {renderEmbeddedTableEditor('Таблица Лидов & Сделок CRM')}
        </div>
      )}

      {/* PAGE 5: `/system-admin/table` -> CRM Table */}
      {activeNavPath === '/system-admin/table' && (
        <div className="space-y-6">
          <CabinetCRM forcedSubTab="table" hideSubTabs={true} />
          {renderEmbeddedTableEditor('Таблица Компаний & Клиентов CRM')}
        </div>
      )}

      {/* PAGE 6: `/system-admin/analytic` -> Analytics & Funnels */}
      {activeNavPath === '/system-admin/analytic' && (
        <div className="space-y-6">
          <CabinetCRM forcedSubTab="funnel" hideSubTabs={true} />
          {renderEmbeddedTableEditor('Таблица Отчетов & Аналитики')}
        </div>
      )}

      {/* PAGE 7: `/system-admin/product` -> AI Products Catalog */}
      {activeNavPath === '/system-admin/product' && (
        <div className="space-y-6">
          <CabinetCRM forcedSubTab="products" hideSubTabs={true} />
          {renderEmbeddedTableEditor('Таблица ИИ-Продуктов & Проектов')}
        </div>
      )}

      {/* PAGE 8: `/system-admin/blog` -> Blog Post Management & RR AI Editor */}
      {activeNavPath === '/system-admin/blog' && (
        <div className="space-y-6">
          <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/90 border-amber-400/40' : 'bg-[#FFFBF5] border-amber-900/30'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
              <div>
                <h3 className={`text-base font-black flex items-center gap-2 ${
                  isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>
                  <BookOpen size={20} className="text-[#D4AF37]" />
                  <span>Управление Блогом & Редактор Статей RR</span>
                </h3>
                <p className={`text-sm mt-1 ${isDarkTheme ? 'text-amber-200/70' : 'text-amber-900/70'}`}>
                  Создание, редактирование и генерация экспертных статей через нейросеть с сохранением в PostgreSQL BD ProTalk
                </p>
              </div>
            </div>

            <BlogPostEditorPage 
              onNavigate={(p) => handleSubNavigate(p)} 
              currentUser={null}
            />
          </div>

          {renderEmbeddedTableEditor('Таблица блога (blog_posts) в PostgreSQL BD ProTalk')}
        </div>
      )}

      {/* PAGE 9: `/system-admin/gallery` -> RR File Storage & Gallery */}
      {activeNavPath === '/system-admin/gallery' && (
        <div className="space-y-6">
          <SystemAdminGallery isDarkTheme={isDarkTheme} />
          {renderEmbeddedTableEditor('Таблица файлов (file_storage) в PostgreSQL BD ProTalk')}
        </div>
      )}

      {/* PAGE 10: `/system-admin/academy` -> Academy Markdown Editor */}
      {activeNavPath === '/system-admin/academy' && (
        <div className="space-y-6">
          <AcademyAdminEditor theme={isDarkTheme ? 'dark' : 'light'} />
          {renderEmbeddedTableEditor('Таблица статей академии (academy_posts) в PostgreSQL BD ProTalk')}
        </div>
      )}

      {/* CREATE / EDIT ROW MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto border ${
            isDarkTheme ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100' : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
              <h3 className={`text-base font-black flex items-center gap-2 ${
                isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                <Table size={18} className="text-[#D4AF37]" />
                <span>{modalMode === 'create' ? `Добавление записи в ${selectedTable}` : `Редактирование записи (${editingRowId})`}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:opacity-75 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-200 p-3 rounded-xl text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveRow} className="space-y-3">
              {tableColumns.map(col => (
                <div key={col.name} className="space-y-1">
                  <label className="block text-xs font-mono flex items-center justify-between">
                    <span>{col.name} {col.notNull && <strong className="text-[#D4AF37]">*</strong>}</span>
                    <span className="text-[10px] opacity-60">{col.type}</span>
                  </label>
                  {selectedTable === 'users' && col.name === 'role' ? (
                    <select
                      value={formData[col.name] ?? 'EMPLOYEE'}
                      onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none ${
                        isDarkTheme ? 'bg-[#140A01] border-amber-400/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
                      }`}
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Супер-Админ)</option>
                      <option value="ADMIN">ADMIN (Администратор)</option>
                      <option value="DIRECTOR">DIRECTOR (Директор)</option>
                      <option value="MANAGER">MANAGER (Руководитель)</option>
                      <option value="EMPLOYEE">EMPLOYEE (Сотрудник)</option>
                    </select>
                  ) : selectedTable === 'users' && ['payment_balance', 'local_bonus', 'referral_bonus', 'welcome_bonus', 'bonusesEarned'].includes(col.name) ? (
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={formData[col.name] ?? 0}
                        className={`w-full px-3 py-2 rounded-xl font-mono text-xs border opacity-70 bg-amber-500/5 ${
                          isDarkTheme ? 'border-amber-400/20 text-amber-200' : 'border-amber-800/20 text-amber-950'
                        }`}
                      />
                      <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">🔒 Авто-расчет из таблицы transactions</span>
                    </div>
                  ) : (col.type && (col.type.toUpperCase().includes('TEXT') || col.type.toUpperCase().includes('JSON') || col.type.toUpperCase().includes('CLOB'))) || 
                     ['duties', 'protalk_notes', 'bio', 'description', 'prompt', 'system_prompt', 'user_message', 'bot_reply', 'features', 'websites', 'products', 'content', 'config_json', 'payload', 'error_log', 'function_error', 'function_call_params'].includes(col.name) ||
                     (typeof formData[col.name] === 'string' && formData[col.name].length > 60) ? (
                    <textarea
                      rows={3}
                      required={col.notNull && modalMode === 'create'}
                      disabled={col.pk && modalMode === 'edit'}
                      value={formData[col.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                      placeholder={`Значение поля ${col.name}...`}
                      className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none disabled:opacity-50 resize-y min-h-[50px] ${
                        isDarkTheme ? 'bg-[#140A01] border-amber-400/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
                      }`}
                    />
                  ) : (
                    <input
                      type="text"
                      required={col.notNull && modalMode === 'create'}
                      disabled={col.pk && modalMode === 'edit'}
                      value={formData[col.name] ?? ''}
                      onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none disabled:opacity-50 ${
                        isDarkTheme ? 'bg-[#140A01] border-amber-400/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
                      }`}
                    />
                  )}
                </div>
              ))}

              {selectedTable === 'users' && modalMode === 'edit' && (
                <div className={`p-4 rounded-2xl border space-y-3 mt-4 ${
                  isDarkTheme ? 'bg-[#140A01] border-amber-500/30' : 'bg-amber-500/10 border-amber-800/20'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E7C768]">
                    <Zap size={14} />
                    <span>Калькулятор изменения баланса (Корректировка через транзакцию)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono opacity-80 mb-1">Сумма (+ начисление, - списание)</label>
                      <input 
                        type="number"
                        step="any"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0 (например: 1000 или -500)"
                        className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none ${
                          isDarkTheme ? 'bg-[#1A0F02] border-amber-400/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono opacity-80 mb-1">Тип счета</label>
                      <select
                        value={adjustType}
                        onChange={(e) => setAdjustType(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none ${
                          isDarkTheme ? 'bg-[#1A0F02] border-amber-400/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
                        }`}
                      >
                        <option value="admin">payment_balance (Основной счет RR)</option>
                        <option value="local_bonus">local_bonus (Локальные бонусы)</option>
                        <option value="referral_bonus">referral_bonus (Реферальные бонусы)</option>
                        <option value="welcome_bonus">welcome_bonus (Приветственный бонус)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono opacity-80 mb-1">Причина / Комментарий</label>
                      <input 
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Корректировка администратором"
                        className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none ${
                          isDarkTheme ? 'bg-[#1A0F02] border-amber-400/40 text-amber-100' : 'bg-white border-amber-800/30 text-amber-950'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    isDarkTheme ? 'border-amber-400/30 text-amber-200' : 'border-amber-800/30 text-amber-950'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all cursor-pointer ${
                    isDarkTheme 
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.3)]' 
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md'
                  }`}
                >
                  {modalMode === 'create' ? 'Создать запись' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE CELL EDIT MODAL */}
      {cellEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border ${
            isDarkTheme 
              ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100 shadow-[0_0_30px_rgba(244,238,142,0.15)]' 
              : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
              <div className="space-y-1">
                <h3 className={`text-base font-black flex items-center gap-2 ${
                  isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>
                  <Edit2 size={18} className="text-[#D4AF37]" />
                  <span>Редактирование ячейки [{cellEditModal.colName}]</span>
                </h3>
                <p className="text-[11px] font-mono opacity-80">
                  Таблица: <span className="font-bold text-[#D4AF37]">{cellEditModal.tableName}</span> | {cellEditModal.pkCol}: <span className="font-bold">{String(cellEditModal.pkValue)}</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setCellEditModal(null)} 
                className="p-1.5 rounded-xl hover:bg-amber-500/20 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {cellError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-200 p-3 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{cellError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCell} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold font-mono">
                    Тип колонки: <span className="text-[#D4AF37]">{cellEditModal.colType || 'TEXT'}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cellEditModal.isNull}
                      onChange={(e) => setCellEditModal({ ...cellEditModal, isNull: e.target.checked })}
                      className="rounded border-amber-500/40 text-amber-500 focus:ring-amber-400"
                    />
                    <span>Значение NULL</span>
                  </label>
                </div>

                {!cellEditModal.isNull && (
                  <div>
                    {cellEditModal.colType?.toUpperCase().includes('TEXT') || cellEditModal.value.length > 50 || cellEditModal.value.includes('\n') ? (
                      <textarea
                        rows={5}
                        value={cellEditModal.value}
                        onChange={(e) => setCellEditModal({ ...cellEditModal, value: e.target.value })}
                        placeholder="Введите значение..."
                        className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none resize-y min-h-[100px] ${
                          isDarkTheme ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300' : 'bg-white border-amber-800/30 text-amber-950 focus:border-amber-600'
                        }`}
                        autoFocus
                      />
                    ) : (
                      <input
                        type="text"
                        value={cellEditModal.value}
                        onChange={(e) => setCellEditModal({ ...cellEditModal, value: e.target.value })}
                        placeholder="Введите значение..."
                        className={`w-full px-3 py-2 rounded-xl font-mono text-xs border focus:outline-none ${
                          isDarkTheme ? 'bg-[#140A01] border-amber-400/40 text-amber-100 focus:border-amber-300' : 'bg-white border-amber-800/30 text-amber-950 focus:border-amber-600'
                        }`}
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setCellEditModal(null)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    isDarkTheme ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-800/30 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={cellSaving}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                    isDarkTheme 
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-[0_0_15px_rgba(244,238,142,0.3)]' 
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md'
                  }`}
                >
                  {cellSaving ? 'Сохранение...' : 'Сохранить ячейку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border ${
            isDarkTheme ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100' : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-amber-500/20">
              <AlertCircle size={22} className="shrink-0" />
              <h3 className={`text-base font-black ${isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Подтверждение удаления
              </h3>
            </div>
            <p className="text-xs font-sans leading-relaxed">
              Вы действительно хотите навсегда удалить строку <strong className="font-mono text-[#D4AF37]">{deleteTargetId}</strong> из таблицы <strong className="font-mono text-[#D4AF37]">{selectedTable}</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-amber-500/20">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isDarkTheme ? 'border-amber-400/30 text-amber-200' : 'border-amber-800/30 text-amber-950'
                }`}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs font-black shadow-lg transition-all cursor-pointer"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border ${
            isDarkTheme ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100' : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
              <h3 className={`text-base font-black flex items-center gap-2 ${
                isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                <Upload size={18} className="text-[#D4AF37]" />
                <span>Импорт CSV в таблицу '{selectedTable}'</span>
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 rounded-lg hover:opacity-75 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-2">
                <label className="block text-xs font-bold">Выберите режим импорта:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('dedup')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      importMode === 'dedup'
                        ? isDarkTheme 
                          ? 'bg-amber-400/20 border-amber-400 text-[#F4EE8E] font-extrabold' 
                          : 'bg-amber-200 border-amber-800 text-amber-950 font-extrabold'
                        : isDarkTheme ? 'bg-[#140A01] border-amber-400/20' : 'bg-white border-amber-800/20'
                    }`}
                  >
                    <span className="font-bold">1. Дедубликация</span>
                    <span className="text-[10px] opacity-75">Обновляет по совпадению ключей, сохраняя старые</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? isDarkTheme 
                          ? 'bg-amber-400/20 border-amber-400 text-[#F4EE8E] font-extrabold' 
                          : 'bg-amber-200 border-amber-800 text-amber-950 font-extrabold'
                        : isDarkTheme ? 'bg-[#140A01] border-amber-400/20' : 'bg-white border-amber-800/20'
                    }`}
                  >
                    <span className="font-bold text-[#D4AF37]">2. Полная замена</span>
                    <span className="text-[10px] opacity-75">Очищает старые записи и вставляет новые</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold">Выберите .csv файл:</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className={`w-full text-xs font-mono p-3 rounded-xl border cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold ${
                    isDarkTheme 
                      ? 'bg-[#140A01] border-amber-400/30 text-amber-100 file:bg-amber-400/20 file:text-[#F4EE8E]' 
                      : 'bg-white border-amber-800/30 text-amber-950 file:bg-amber-100 file:text-amber-950'
                  }`}
                />
                {csvFileName && (
                  <p className="text-[11px] font-mono text-[#D4AF37]">Файл загружен: {csvFileName}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDarkTheme ? 'border-amber-400/30 text-amber-200' : 'border-amber-800/30 text-amber-950'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!csvFileContent}
                onClick={handleExecuteImport}
                className={`px-5 py-2.5 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                  isDarkTheme 
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md' 
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md'
                }`}
              >
                Запустить Импорт
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON FULL DATABASE BACKUP RESTORE MODAL */}
      {isJsonBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border ${
            isDarkTheme ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100' : 'bg-[#FFFBF5] border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
              <h3 className={`text-base font-black flex items-center gap-2 ${
                isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                <Database size={18} className="text-[#D4AF37]" />
                <span>Восстановление всех таблиц из JSON бэкапа</span>
              </h3>
              <button onClick={() => setIsJsonBackupModalOpen(false)} className="p-1 rounded-lg hover:opacity-75 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-2">
                <label className="block text-xs font-bold">Выберите режим восстановления базы:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJsonBackupMode('dedup')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      jsonBackupMode === 'dedup'
                        ? isDarkTheme 
                          ? 'bg-amber-400/20 border-amber-400 text-[#F4EE8E] font-extrabold' 
                          : 'bg-amber-200 border-amber-800 text-amber-950 font-extrabold'
                        : isDarkTheme ? 'bg-[#140A01] border-amber-400/20' : 'bg-white border-amber-800/20'
                    }`}
                  >
                    <span className="font-bold">1. Дедубликация</span>
                    <span className="text-[10px] opacity-75">Обновляет существующие записи, добавляет недостающие</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJsonBackupMode('replace')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      jsonBackupMode === 'replace'
                        ? isDarkTheme 
                          ? 'bg-amber-400/20 border-amber-400 text-[#F4EE8E] font-extrabold' 
                          : 'bg-amber-200 border-amber-800 text-amber-950 font-extrabold'
                        : isDarkTheme ? 'bg-[#140A01] border-amber-400/20' : 'bg-white border-amber-800/20'
                    }`}
                  >
                    <span className="font-bold text-[#D4AF37]">2. Полная замена</span>
                    <span className="text-[10px] opacity-75">Очищает все таблицы и загружает состояние бэкапа</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold">Выберите файл бэкапа (.json):</label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonFileUpload}
                  className={`w-full text-xs font-mono p-3 rounded-xl border cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold ${
                    isDarkTheme 
                      ? 'bg-[#140A01] border-amber-400/30 text-amber-100 file:bg-amber-400/20 file:text-[#F4EE8E]' 
                      : 'bg-white border-amber-800/30 text-amber-950 file:bg-amber-100 file:text-amber-950'
                  }`}
                />
                {jsonBackupFileName && (
                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-1">
                    <p className="text-[11px] font-mono text-[#D4AF37]">Файл: {jsonBackupFileName}</p>
                    {jsonBackupContent && (
                      <p className="text-[10px] opacity-80">
                        Таблиц в файле: {jsonBackupContent.tables ? Object.keys(jsonBackupContent.tables).length : (Array.isArray(jsonBackupContent) ? jsonBackupContent.length : 'OK')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setIsJsonBackupModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  isDarkTheme ? 'border-amber-400/30 text-amber-200' : 'border-amber-800/30 text-amber-950'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!jsonBackupContent}
                onClick={handleExecuteJsonImport}
                className={`px-5 py-2.5 rounded-xl text-xs font-black hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                  isDarkTheme 
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md' 
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md'
                }`}
              >
                Восстановить базу
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Version Edit Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`max-w-md w-full rounded-3xl p-6 border shadow-2xl backdrop-blur-xl ${
            isDarkTheme ? 'bg-[#1A0F02]/95 border-amber-400/50 text-amber-100' : 'bg-[#FFFBF5]/95 border-amber-900/30 text-amber-950'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                isDarkTheme ? 'text-[#F4EE8E]' : 'text-amber-950'
              }`}>
                <span>🏷</span>
                <span>Версия программного комплекса</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAppVersion} className="space-y-4">
              <p className="text-sm opacity-80 leading-relaxed font-sans">
                Укажите текущую версию платформы. Значение фиксируется в PostgreSQL BD ProTalk и автоматически отображается в подвале сайта, Telegram-бэкапах и публичной оферте.
              </p>

              <div>
                <label className="block text-sm font-bold mb-1.5">Номер версии:</label>
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="Например: v.1.54"
                  className={`w-full p-3 rounded-xl text-sm font-mono focus:outline-none transition-colors border ${
                    isDarkTheme 
                      ? 'bg-[#140A01] border-amber-400/60 text-amber-100 placeholder:text-amber-300/40 focus:border-amber-300' 
                      : 'bg-white border-amber-800/30 text-amber-950 placeholder:text-amber-800/50 focus:border-amber-600'
                  }`}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl border text-sm font-bold cursor-pointer ${
                    isDarkTheme ? 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10' : 'border-amber-800/30 text-amber-950 hover:bg-amber-100'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={versionSaving || !versionInput.trim()}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 ${
                    isDarkTheme 
                      ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 hover:brightness-110 shadow-amber-500/20' 
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 hover:brightness-105'
                  }`}
                >
                  {versionSaving ? 'Сохранение...' : 'Зафиксировать версию'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
