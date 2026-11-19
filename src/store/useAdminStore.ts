import { create } from 'zustand';

export interface TableSummary {
  name: string;
  count: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
}

export interface TriggerInfo {
  name: string;
  tbl_name: string;
  sql: string;
}

export interface CronJobInfo {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: string;
  lastResult: string;
}

interface AdminState {
  tables: TableSummary[];
  selectedTable: string | null;
  tableColumns: ColumnInfo[];
  tableRows: Record<string, any>[];
  loading: boolean;
  error: string | null;
  triggers: TriggerInfo[];
  triggerLogs: Record<string, any>[];
  cronJobs: CronJobInfo[];
  searchQuery: string;
  sortField: string | null;
  sortOrder: 'asc' | 'desc';
  lastSyncedAt: string | null;
  realtimeConnected: boolean;

  setRealtimeConnected: (connected: boolean) => void;
  handleDbChangeEvent: (table: string) => Promise<void>;
  fetchTables: (silent?: boolean) => Promise<void>;
  fetchTableData: (tableName: string, search?: string, sortField?: string, sortOrder?: 'asc' | 'desc', silent?: boolean) => Promise<void>;
  createRow: (tableName: string, rowData: Record<string, any>) => Promise<boolean>;
  updateRow: (tableName: string, id: any, rowData: Record<string, any>) => Promise<boolean>;
  updateCell: (tableName: string, pkValue: any, field: string, value: any, pkName?: string) => Promise<boolean>;
  deleteRow: (tableName: string, id: any) => Promise<boolean>;
  fetchTriggers: () => Promise<void>;
  fetchCronJobs: () => Promise<void>;
  runCronJob: (id: string) => Promise<string | null>;
  setSearchQuery: (q: string) => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;
  exportCurrentTableCsv: (tableName: string) => Promise<void>;
  exportAllTablesCsv: () => Promise<void>;
  exportFullJsonBackup: () => Promise<void>;
  importTableCsv: (tableName: string, csvData: string, mode: 'replace' | 'dedup') => Promise<string | null>;
  importFullJsonBackup: (backupPayload: any, mode: 'replace' | 'dedup') => Promise<string | null>;
}

const formatSyncTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const useAdminStore = create<AdminState>((set, get) => ({
  tables: [],
  selectedTable: null,
  tableColumns: [],
  tableRows: [],
  loading: false,
  error: null,
  triggers: [],
  triggerLogs: [],
  cronJobs: [],
  searchQuery: '',
  sortField: null,
  sortOrder: 'asc',
  lastSyncedAt: null,
  realtimeConnected: false,

  setRealtimeConnected: (connected) => set({ realtimeConnected: connected }),

  handleDbChangeEvent: async (table) => {
    const state = get();
    await state.fetchTables(true);

    if (state.selectedTable && (table === 'all' || state.selectedTable === table)) {
      await state.fetchTableData(
        state.selectedTable,
        state.searchQuery,
        state.sortField || '',
        state.sortOrder,
        true
      );
    }

    if (table === 'triggers_log' || table === 'all') {
      await state.fetchTriggers();
    }
    if (table === 'cron_jobs' || table === 'all') {
      await state.fetchCronJobs();
    }
    if (typeof window !== 'undefined') {
      if (table === 'users' || table === 'all') {
        window.dispatchEvent(new Event('db-users-updated'));
      }
      if (table === 'landing_reviews' || table === 'all') {
        window.dispatchEvent(new Event('db-reviews-updated'));
      }
      if (table === 'blog_posts' || table === 'all') {
        window.dispatchEvent(new Event('db-blog-updated'));
      }
    }
  },

  fetchTables: async (silent = false) => {
    if (!silent) {
      set({ loading: true, error: null });
    }
    try {
      const res = await fetch('/api/admin/tables', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        set({
          tables: data.tables,
          lastSyncedAt: formatSyncTime(),
          ...(silent ? {} : { loading: false })
        });
        if (data.tables.length > 0 && !get().selectedTable) {
          get().fetchTableData(data.tables[0].name);
        }
      } else if (!silent) {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      if (!silent) {
        set({ error: err.message, loading: false });
      }
    }
  },

  fetchTableData: async (
    tableName,
    search = get().searchQuery,
    sortField = get().sortField || '',
    sortOrder = get().sortOrder,
    silent = false
  ) => {
    if (!silent) {
      set({ loading: true, selectedTable: tableName, error: null });
    }
    try {
      const url = new URL(`/api/admin/table/${encodeURIComponent(tableName)}`, window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (sortField) url.searchParams.set('sortField', sortField);
      if (sortOrder) url.searchParams.set('sortOrder', sortOrder);

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();

      if (data.success) {
        set({
          tableColumns: data.columns,
          tableRows: data.rows,
          lastSyncedAt: formatSyncTime(),
          ...(silent ? {} : { loading: false })
        });
      } else if (!silent) {
        set({ error: data.error, loading: false });
      }
    } catch (err: any) {
      if (!silent) {
        set({ error: err.message, loading: false });
      }
    }
  },

  createRow: async (tableName, rowData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${encodeURIComponent(tableName)}/row`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData)
      });
      const data = await res.json();
      if (data.success) {
        if (tableName === 'users') {
          window.dispatchEvent(new Event('db-users-updated'));
        }
        await get().fetchTables();
        await get().fetchTableData(tableName);
        return true;
      } else {
        set({ error: data.error, loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateRow: async (tableName, id, rowData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${encodeURIComponent(tableName)}/row/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData)
      });
      const data = await res.json();
      if (data.success) {
        if (tableName === 'users') {
          window.dispatchEvent(new Event('db-users-updated'));
        }
        await get().fetchTableData(tableName);
        return true;
      } else {
        set({ error: data.error, loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  updateCell: async (tableName, pkValue, field, value, pkName) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${encodeURIComponent(tableName)}/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryKey: pkName,
          primaryKeyValue: pkValue,
          field,
          value
        })
      });
      const data = await res.json();
      if (data.success) {
        if (tableName === 'users') {
          window.dispatchEvent(new Event('db-users-updated'));
        }
        await get().fetchTableData(tableName);
        return true;
      } else {
        set({ error: data.error, loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  deleteRow: async (tableName, id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/table/${encodeURIComponent(tableName)}/row/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        if (tableName === 'users') {
          window.dispatchEvent(new Event('db-users-updated'));
        }
        await get().fetchTables();
        await get().fetchTableData(tableName);
        return true;
      } else {
        set({ error: data.error, loading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  fetchTriggers: async () => {
    try {
      const res = await fetch('/api/admin/triggers');
      const data = await res.json();
      if (data.success) {
        set({ triggers: data.triggers, triggerLogs: data.logs });
      }
    } catch (err: any) {
      console.error('Error fetching triggers:', err);
    }
  },

  fetchCronJobs: async () => {
    try {
      const res = await fetch('/api/admin/cron');
      const data = await res.json();
      if (data.success) {
        set({ cronJobs: data.jobs });
      }
    } catch (err: any) {
      console.error('Error fetching cron jobs:', err);
    }
  },

  runCronJob: async (id) => {
    try {
      const res = await fetch(`/api/admin/cron/run/${encodeURIComponent(id)}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await get().fetchCronJobs();
        return data.message;
      }
      return null;
    } catch (err: any) {
      console.error('Error running cron job:', err);
      return null;
    }
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
    const sel = get().selectedTable;
    if (sel) {
      get().fetchTableData(sel, q);
    }
  },

  setSort: (field, order) => {
    set({ sortField: field, sortOrder: order });
    const sel = get().selectedTable;
    if (sel) {
      get().fetchTableData(sel, get().searchQuery, field, order);
    }
  },

  exportCurrentTableCsv: async (tableName) => {
    try {
      const res = await fetch(`/api/admin/export/csv/${encodeURIComponent(tableName)}`);
      if (!res.ok) throw new Error('Ошибка экспорта CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('CSV Export Error:', err);
      set({ error: err.message });
    }
  },

  exportAllTablesCsv: async () => {
    try {
      const res = await fetch('/api/admin/export/all-csv');
      const data = await res.json();
      if (data.success && data.tables) {
        for (const [tblName, csvStr] of Object.entries(data.tables)) {
          const blob = new Blob([csvStr as string], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${tblName}_all_tables_export.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (err: any) {
      console.error('All CSV Export Error:', err);
      set({ error: err.message });
    }
  },

  exportFullJsonBackup: async () => {
    try {
      const res = await fetch('/api/admin/backup/export-json');
      if (!res.ok) throw new Error('Ошибка экспорта резервной копии JSON');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_full_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Full JSON Backup Export Error:', err);
      set({ error: err.message });
    }
  },

  importFullJsonBackup: async (backupPayload: any, mode: 'replace' | 'dedup') => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/admin/backup/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPayload, mode })
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new Event('db-users-updated'));
        window.dispatchEvent(new Event('storage-updated'));
        await get().fetchTables();
        const sel = get().selectedTable;
        if (sel) {
          await get().fetchTableData(sel);
        }
        set({ loading: false });
        return data.message;
      } else {
        set({ error: data.error, loading: false });
        return null;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  importTableCsv: async (tableName, csvData, mode) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/admin/import/csv/${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, mode })
      });
      const data = await res.json();
      if (data.success) {
        if (tableName === 'users') {
          window.dispatchEvent(new Event('db-users-updated'));
        }
        await get().fetchTables();
        await get().fetchTableData(tableName);
        return data.message;
      } else {
        set({ error: data.error, loading: false });
        return null;
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return null;
    }
  }
}));
