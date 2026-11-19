import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { Sparkles, BarChart3, TrendingUp, AlertTriangle, Users, BookOpen, Volume2, Award, RefreshCw, UserCheck, ShieldAlert, CheckCircle, Clock, Send, Copy, Check, ChevronDown, ChevronUp, History, Calendar, AlertCircle, X } from 'lucide-react';
import { SubmittedReport, Department, UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { AiLoadingOverlay } from '../../components/common/AiLoadingOverlay';
import MarkdownRenderer from '../../components/MarkdownRenderer';

interface SavedSummaryItem {
  id: string;
  department_id: string;
  department_name: string;
  timeframe_days: number;
  summary_text: string;
  key_achievements?: string;
  identified_risks?: string;
  ai_recommendations?: string;
  created_by_name?: string;
  created_at: string;
}

interface CabinetAnalyticsProps {
  reports: SubmittedReport[];
  departments: Department[];
  currentUser?: UserProfile | null;
  mockEmployees: UserProfile[];
  triggerAI: (prompt: string, sys: string, cb: (text: string) => void, mascot?: any) => void;
  promptSummary?: string;
  theme?: 'dark' | 'light';
}

export default function CabinetAnalytics({
  reports,
  departments,
  currentUser,
  mockEmployees = [],
  triggerAI,
  promptSummary,
  theme = 'dark'
}: CabinetAnalyticsProps) {
  const isDark = theme === 'dark';
  const isLightTheme = theme === 'light';
  const [selectedAnalDept, setSelectedAnalDept] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedDays, setSelectedDays] = useState(30);
  const [aiSummaryResult, setAiSummaryResult] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('Формирование аналитической сводки');
  const [loadingSubtitle, setLoadingSubtitle] = useState('ИИ Ревизор анализирует структуру регламентов, рапорты и тренды KPI...');

  // Telegram sending state
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // History of past summaries state
  const [historySummaries, setHistorySummaries] = useState<SavedSummaryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Fetch past summaries from PostgreSQL BD ProTalk on mount
  const loadHistorySummaries = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/cabinet/summaries');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.summaries)) {
          setHistorySummaries(data.summaries);
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю сводок:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistorySummaries();
  }, []);

  // Filter reports according to selected department, employee, and days period
  const filteredReports = reports.filter(r => {
    // 1. Department filter
    if (selectedAnalDept !== 'All' && r.departmentId !== selectedAnalDept) return false;

    // 2. Employee filter (check ID or Name)
    if (selectedEmployee !== 'All') {
      const matchName = r.employeeName === selectedEmployee;
      const matchId = r.employeeId === selectedEmployee;
      if (!matchName && !matchId) return false;
    }

    // 3. Days filter (within last N calendar days)
    const reportDate = new Date(r.timestamp);
    const timeDiff = Date.now() - reportDate.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    if (daysDiff > selectedDays) return false;

    return true;
  });

  // Calculate Metrics from REAL database records
  const totalReportsCount = filteredReports.length;
  const avgQualityScore = totalReportsCount > 0 
    ? Math.round(filteredReports.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / totalReportsCount)
    : 0;

  const voiceReportsCount = filteredReports.filter(r => r.voiceInputUsed).length;
  const voiceRate = totalReportsCount > 0 
    ? Math.round((voiceReportsCount / totalReportsCount) * 100)
    : 0;

  // Timeliness: reports with qualityScore >= 80 or not marked with delay
  const onTimeReports = filteredReports.filter(r => (r.qualityScore || 0) >= 80).length;
  const timelinessRate = totalReportsCount > 0 
    ? Math.round((onTimeReports / totalReportsCount) * 100)
    : 0;

  // Trend Data by date from real reports
  const getTrendData = () => {
    if (filteredReports.length === 0) {
      return [];
    }

    const datesMap: Record<string, { count: number; totalScore: number }> = {};
    filteredReports.forEach(r => {
      const dateStr = new Date(r.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      if (!datesMap[dateStr]) {
        datesMap[dateStr] = { count: 0, totalScore: 0 };
      }
      datesMap[dateStr].count += 1;
      datesMap[dateStr].totalScore += (r.qualityScore || 0);
    });

    return Object.keys(datesMap).map(date => ({
      date,
      score: Math.round(datesMap[date].totalScore / datesMap[date].count)
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const trendData = getTrendData();

  // Department distribution from real reports
  const getDeptData = () => {
    return departments.map(d => {
      const deptCount = filteredReports.filter(r => r.departmentId === d.id).length;
      return {
        name: d.name,
        count: deptCount
      };
    });
  };

  const deptData = getDeptData();

  // Department Leaderboard from real reports
  const getDeptLeaderboard = () => {
    return departments.map(d => {
      const deptRep = filteredReports.filter(r => r.departmentId === d.id);
      const avg = deptRep.length > 0 
        ? Math.round(deptRep.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / deptRep.length)
        : 0;
      return {
        id: d.id,
        name: d.name,
        avgScore: avg,
        totalReports: deptRep.length
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  };
  const deptLeaderboard = getDeptLeaderboard();

  // Employee KPI Scorecards
  const getEmployeeScoring = () => {
    // List of active employees from mockEmployees or distinct employees in reports
    const employeeList: { id: string; name: string; position?: string; departmentId?: string }[] = [];
    
    mockEmployees.forEach(emp => {
      if (!employeeList.some(e => e.id === emp.id || e.name === emp.name)) {
        employeeList.push({
          id: emp.id,
          name: emp.name,
          position: emp.position || 'Специалист',
          departmentId: emp.departmentId
        });
      }
    });

    // Also include any employee from reports not in list
    reports.forEach(r => {
      if (r.employeeName && !employeeList.some(e => e.name === r.employeeName || e.id === r.employeeId)) {
        employeeList.push({
          id: r.employeeId || r.employeeName,
          name: r.employeeName,
          position: 'Сотрудник',
          departmentId: r.departmentId
        });
      }
    });

    return employeeList.map(emp => {
      const empReports = filteredReports.filter(r => r.employeeName === emp.name || r.employeeId === emp.id);
      const totalCount = empReports.length;
      const avgScore = totalCount > 0 
        ? Math.round(empReports.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / totalCount)
        : 0;

      const timelyCount = empReports.filter(r => (r.qualityScore || 0) >= 80).length;
      const empTimeliness = totalCount > 0 ? Math.round((timelyCount / totalCount) * 100) : 0;

      // Calculate dynamics: compare first half of interval with second half
      const halfDays = selectedDays / 2;
      const recent = empReports.filter(r => {
        const d = (Date.now() - new Date(r.timestamp).getTime()) / (1000 * 3600 * 24);
        return d <= halfDays;
      });
      const older = empReports.filter(r => {
        const d = (Date.now() - new Date(r.timestamp).getTime()) / (1000 * 3600 * 24);
        return d > halfDays && d <= selectedDays;
      });

      const recentAvg = recent.length > 0 ? Math.round(recent.reduce((s, r) => s + (r.qualityScore || 0), 0) / recent.length) : avgScore;
      const olderAvg = older.length > 0 ? Math.round(older.reduce((s, r) => s + (r.qualityScore || 0), 0) / older.length) : avgScore;
      const dynamicsDiff = recentAvg - olderAvg;

      let statusTag = 'Стабильно';
      let statusColor = isDark 
        ? 'text-amber-300 bg-amber-500/10 border-amber-400/30' 
        : 'text-amber-950 bg-amber-100 border-amber-300';
      if (totalCount === 0) {
        statusTag = 'Нет рапортов';
        statusColor = isDark 
          ? 'text-stone-400 bg-stone-500/10 border-stone-500/20' 
          : 'text-stone-600 bg-stone-100 border-stone-300';
      } else if (avgScore >= 85) {
        statusTag = 'Лидер качества';
        statusColor = isDark 
          ? 'text-[#F4EE8E] bg-[#F4EE8E]/10 border-amber-400/40' 
          : 'text-amber-950 bg-amber-100 border-amber-400 font-bold';
      } else if (avgScore < 70) {
        statusTag = 'Требует внимания';
        statusColor = isDark 
          ? 'text-rose-300 bg-rose-500/15 border-rose-400/30' 
          : 'text-rose-900 bg-rose-100 border-rose-300 font-bold';
      } else if (totalCount >= 5) {
        statusTag = 'Высокая активность';
        statusColor = isDark 
          ? 'text-amber-200 bg-amber-400/15 border-amber-300/30' 
          : 'text-amber-950 bg-amber-100 border-amber-300 font-bold';
      }

      return {
        ...emp,
        totalCount,
        avgScore,
        timeliness: empTimeliness,
        dynamicsDiff,
        statusTag,
        statusColor
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  };
  const employeeScoring = getEmployeeScoring();

  const handleGenerateSummary = () => {
    setLoadingTitle(`Анализ сводки за ${selectedDays} ${selectedDays === 1 ? 'день' : selectedDays < 5 ? 'дня' : 'дней'}`);
    setLoadingSubtitle('ИИ Ревизор извлекает все поданные рапорты из базы PostgreSQL BD ProTalk и формирует стратегический SWOT-отчет...');
    setIsSummaryLoading(true);
    
    const sysPrompt = promptSummary || `Ты — профессиональный финансовый и операционный аудитор компании. Твоя задача — составить глубокий, конструктивный аналитический SWOT-отчет по результатам рапортов сотрудников на русском языке. Ответ должен быть бодрым, вдохновляющим и четко структурированным.`;
    
    const selectedDeptName = selectedAnalDept === 'All' ? 'Все отделы' : departments.find(d => d.id === selectedAnalDept)?.name || selectedAnalDept;
    const selectedEmpName = selectedEmployee === 'All' ? 'Все сотрудники' : selectedEmployee;

    const promptText = `Проанализируй сводный набор последних отчетов сотрудников нашей компании за последние ${selectedDays} календарных дней.
Параметры выборки:
- Отдел: ${selectedDeptName}
- Сотрудник: ${selectedEmpName}
- Период анализа: последние ${selectedDays} дней (макс 30)

Список всех отчетов из базы данных PostgreSQL BD ProTalk (${filteredReports.length} шт.):
${filteredReports.length > 0 
  ? filteredReports.map((r, i) => `${i + 1}. [${new Date(r.timestamp).toLocaleDateString('ru-RU')}] Сотрудник: ${r.employeeName || 'Сотрудник'}, Отдел: ${r.departmentName || 'Отдел'}, Шаблон: ${r.templateTitle || 'Рапорт'}, Балл качества: ${r.qualityScore || 0}/100, Оценка/заметка: ${r.aiSummary || r.managerComment || 'В норме.'}`).join('\n')
  : 'Нет поданных рапортов за выбранный период.'
}

Составь развернутый аналитический отчет (Саммари ИИ) в 3 структурированных разделах:
1. Ключевые результаты и тенденции подразделений за ${selectedDays} дней.
2. Проблемные зоны, узкие места и дисциплина сдачи отчетов.
3. 3 конкретные рекомендации для руководства по оптимизации рабочих процессов.

Ответ напиши в красивом маркдаун формате без капслока.`;

    triggerAI(promptText, sysPrompt, async (text) => {
      setAiSummaryResult(text);
      setIsSummaryLoading(false);

      // Automatically persist generated summary into PostgreSQL BD ProTalk report_summaries table
      try {
        const payload = {
          company_id: currentUser?.company_id || 'flagship-main',
          director_id: currentUser?.director_id || currentUser?.id || null,
          department_id: selectedAnalDept,
          department_name: selectedDeptName,
          timeframe_days: selectedDays,
          summary_text: text,
          created_by_id: currentUser?.id || null,
          created_by_name: currentUser?.name || 'Руководитель'
        };

        const res = await fetch('/api/cabinet/summaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          loadHistorySummaries();
        }
      } catch (err) {
        console.warn('Ошибка сохранения сводки в базу данных:', err);
      }
    }, 'analyzer');
  };

  // Handler to send summary to user's Telegram via /api/telegram/send-rich
  const handleSendToMyTelegram = async () => {
    if (!aiSummaryResult.trim()) return;

    const tgId = currentUser?.telegram_id || (currentUser as any)?.telegramId;
    if (!tgId) {
      setNoticeMessage('В вашем профиле не указан Telegram ID. Пожалуйста, укажите ваш Telegram ID или свяжите аккаунт в разделе Профиль.');
      return;
    }

    setIsSendingTelegram(true);
    setTelegramStatus(null);

    const selectedDeptName = selectedAnalDept === 'All' ? 'Все отделы' : departments.find(d => d.id === selectedAnalDept)?.name || selectedAnalDept;
    const headerTitle = `📊 *Аналитическая сводка эффективности*\n🗓 Период: *последние ${selectedDays} дн.*\n🏢 Подразделение: *${selectedDeptName}*\n`;
    const richMarkdown = `${headerTitle}\n${aiSummaryResult}\n\n_Сгенерировано ИИ Ревизором RR_`;

    try {
      const res = await fetch('/api/telegram/send-rich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: tgId,
          markdown: richMarkdown,
          buttons: `Открыть аналитику|${window.location.origin}/cabinet/raport/analytics`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramStatus({ success: true, message: 'Сводка успешно отправлена в ваш Telegram!' });
      } else {
        setTelegramStatus({ success: false, message: data.error || 'Не удалось отправить сообщение в Telegram' });
      }
    } catch (e: any) {
      setTelegramStatus({ success: false, message: e.message || 'Ошибка связи с сервером Telegram' });
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramStatus(null), 5000);
    }
  };

  const handleCopyCurrentSummary = () => {
    if (!aiSummaryResult) return;
    navigator.clipboard.writeText(aiSummaryResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyHistoryItem = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHistoryId(id);
    setTimeout(() => setCopiedHistoryId(null), 2000);
  };

  return (
    <div className="space-y-6 text-sm" id="panel-analytics">
      {/* Header section */}
      <div className={`p-4 sm:p-6 rounded-2xl border backdrop-blur-md space-y-1 ${
        isDark 
          ? 'bg-[#140A01]/70 border-amber-400/30' 
          : 'bg-white border-amber-900/15 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
            isDark 
              ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E]' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className={`text-lg sm:text-xl font-bold ${
              isDark ? 'text-amber-200' : 'text-amber-950'
            }`}>
              Аналитика Рапортов и KPI
            </h2>
            <p className={`text-sm ${
              isDark ? 'text-stone-300' : 'text-stone-600'
            }`}>
              Интерактивный сводный пульт показателей качества, дисциплины и скоркардов сотрудников
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-4 text-sm ${
        isDark 
          ? 'border-amber-400/30 bg-[#140A01]/70' 
          : 'border-amber-900/15 bg-white shadow-sm'
      }`}>
        {/* Department Filter */}
        <div className="space-y-1.5">
          <label className={`text-sm font-medium block ${
            isDark ? 'text-amber-300' : 'text-amber-950'
          }`}>Подразделение</label>
          <select 
            value={selectedAnalDept}
            onChange={(e) => {
              setSelectedAnalDept(e.target.value);
              setSelectedEmployee('All');
            }}
            className={`w-full px-3 py-2 rounded-xl border text-sm outline-none h-10 ${
              isDark 
                ? 'bg-[#1A0F02] border-amber-400/40 text-amber-100 focus:border-amber-300' 
                : 'bg-amber-50 border-amber-900/20 text-amber-950 focus:border-amber-600'
            }`}
          >
            <option value="All">Все отделы</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {/* Employee Filter */}
        <div className="space-y-1.5">
          <label className={`text-sm font-medium block ${
            isDark ? 'text-amber-300' : 'text-amber-950'
          }`}>Сотрудник</label>
          <select 
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-sm outline-none h-10 ${
              isDark 
                ? 'bg-[#1A0F02] border-amber-400/40 text-amber-100 focus:border-amber-300' 
                : 'bg-amber-50 border-amber-900/20 text-amber-950 focus:border-amber-600'
            }`}
          >
            <option value="All">Все сотрудники</option>
            {mockEmployees
              .filter(emp => selectedAnalDept === 'All' || emp.departmentId === selectedAnalDept)
              .map(emp => (
                <option key={emp.id} value={emp.name}>{emp.name} ({emp.position || 'Сотрудник'})</option>
              ))
            }
          </select>
        </div>

        {/* Period Filter */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className={`text-sm font-medium ${
              isDark ? 'text-amber-300' : 'text-amber-950'
            }`}>Период выборки</label>
            <span className={`font-bold text-sm ${
              isDark ? 'text-amber-200' : 'text-amber-900'
            }`}>{selectedDays} {selectedDays === 1 ? 'день' : selectedDays < 5 ? 'дня' : 'дней'}</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range" 
              min="1" 
              max="30" 
              value={selectedDays}
              onChange={(e) => setSelectedDays(parseInt(e.target.value) || 30)}
              className="flex-1 accent-amber-400 h-2 rounded-lg cursor-pointer"
            />
            <input 
              type="number" 
              min="1" 
              max="30" 
              value={selectedDays}
              onChange={(e) => {
                const val = Math.max(1, Math.min(30, parseInt(e.target.value) || 30));
                setSelectedDays(val);
              }}
              className={`w-14 px-2 py-1.5 text-center rounded-xl border text-sm outline-none ${
                isDark 
                  ? 'bg-[#1A0F02] border-amber-400/40 text-amber-100 focus:border-amber-300' 
                  : 'bg-amber-50 border-amber-900/20 text-amber-950 focus:border-amber-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 ${
          isDark 
            ? 'bg-[#140A01]/70 border-amber-400/30' 
            : 'bg-white border-amber-900/15 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark 
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            <BookOpen size={20} />
          </div>
          <div>
            <span className={`block text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>Рапортов сдано</span>
            <span className={`text-xl font-bold ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>{totalReportsCount}</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 ${
          isDark 
            ? 'bg-[#140A01]/70 border-amber-400/30' 
            : 'bg-white border-amber-900/15 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark 
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            <Award size={20} />
          </div>
          <div>
            <span className={`block text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>Средний балл качества</span>
            <span className={`text-xl font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>{avgQualityScore} / 100</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 ${
          isDark 
            ? 'bg-[#140A01]/70 border-amber-400/30' 
            : 'bg-white border-amber-900/15 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark 
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            <Volume2 size={20} />
          </div>
          <div>
            <span className={`block text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>Голосовой ввод</span>
            <span className={`text-xl font-bold ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>{voiceRate}%</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 ${
          isDark 
            ? 'bg-[#140A01]/70 border-amber-400/30' 
            : 'bg-white border-amber-900/15 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark 
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' 
              : 'bg-amber-100 border-amber-300 text-amber-900'
          }`}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span className={`block text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>Своевременность</span>
            <span className={`text-xl font-bold ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>{timelinessRate}%</span>
          </div>
        </div>
      </div>

      {/* Graphical Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend area chart */}
        <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md space-y-4 ${
          isDark 
            ? 'border-amber-400/30 bg-[#140A01]/70' 
            : 'border-amber-900/15 bg-white shadow-sm'
        }`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${
            isDark ? 'text-amber-200' : 'text-amber-950'
          }`}>
            <TrendingUp size={18} className={isDark ? 'text-amber-400' : 'text-amber-700'} />
            <span>Динамика качества рапортов за {selectedDays} дней</span>
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? '#E7C768' : '#D97706'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={isDark ? '#E7C768' : '#D97706'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke={isDark ? '#d4d4d8' : '#78716c'} fontSize={12} tickLine={false} />
                  <YAxis stroke={isDark ? '#d4d4d8' : '#78716c'} fontSize={12} domain={[0, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1A0F02' : '#FFFBF5', 
                      borderColor: isDark ? '#E7C768' : '#D97706', 
                      borderRadius: '12px', 
                      color: isDark ? '#F4EE8E' : '#451a03', 
                      fontSize: '14px' 
                    }}
                    labelStyle={{ color: isDark ? '#E7C768' : '#92400e', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="score" stroke={isDark ? '#E7C768' : '#D97706'} strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 space-y-2">
                <BarChart3 size={32} className={`mx-auto ${isDark ? 'text-amber-400/60' : 'text-amber-700/60'}`} />
                <p className={`font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>За выбранный период нет сданных рапортов</p>
                <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Сдайте рапорты для отображения графиков динамики качества</p>
              </div>
            )}
          </div>
        </div>

        {/* Department workload bar chart */}
        <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md space-y-4 ${
          isDark 
            ? 'border-amber-400/30 bg-[#140A01]/70' 
            : 'border-amber-900/15 bg-white shadow-sm'
        }`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${
            isDark ? 'text-amber-200' : 'text-amber-950'
          }`}>
            <Users size={18} className={isDark ? 'text-amber-400' : 'text-amber-700'} />
            <span>Активность подразделений за {selectedDays} дней</span>
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {totalReportsCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke={isDark ? '#d4d4d8' : '#78716c'} fontSize={12} tickLine={false} />
                  <YAxis stroke={isDark ? '#d4d4d8' : '#78716c'} fontSize={12} allowDecimals={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1A0F02' : '#FFFBF5', 
                      borderColor: isDark ? '#E7C768' : '#D97706', 
                      borderRadius: '12px', 
                      color: isDark ? '#F4EE8E' : '#451a03', 
                      fontSize: '14px' 
                    }}
                    labelStyle={{ color: isDark ? '#E7C768' : '#92400e', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill={isDark ? '#E7C768' : '#D97706'} radius={[8, 8, 0, 0]}>
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? (isDark ? '#E7C768' : '#D97706') : (isDark ? '#F4EE8E' : '#F59E0B')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center p-6 space-y-2">
                <Users size={32} className={`mx-auto ${isDark ? 'text-amber-400/60' : 'text-amber-700/60'}`} />
                <p className={`font-medium ${isDark ? 'text-amber-200' : 'text-amber-950'}`}>Нет активности за выбранный период</p>
                <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>После сдачи рапортов здесь появится распределение по отделам</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI & Employee Scorecards Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Module 1: Рейтинг подразделений */}
        <div className={`xl:col-span-5 p-5 rounded-2xl border backdrop-blur-md space-y-4 ${
          isDark 
            ? 'border-amber-400/30 bg-[#140A01]/70' 
            : 'border-amber-900/15 bg-white shadow-sm'
        }`}>
          <div className="flex justify-between items-start">
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? 'text-amber-200' : 'text-amber-950'
            }`}>
              <Award size={18} className={isDark ? 'text-amber-300' : 'text-amber-800'} />
              <span>Рейтинг отделов по качеству</span>
            </h3>
            <span className={`text-xs font-mono ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>PostgreSQL BD ProTalk</span>
          </div>

          <div className="space-y-3 pt-1">
            {deptLeaderboard.map((dept, index) => {
              const badgeColor = dept.avgScore >= 85 
                ? (isDark ? 'bg-amber-400/15 text-[#F4EE8E] border-amber-400/30' : 'bg-amber-100 text-amber-950 border-amber-400 font-bold')
                : dept.avgScore >= 70 
                  ? (isDark ? 'bg-amber-500/10 text-amber-200 border-amber-500/20' : 'bg-amber-50 text-amber-900 border-amber-300 font-semibold')
                  : (isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-900 border-rose-300 font-semibold');

              return (
                <div key={dept.id} className={`space-y-1.5 p-3 rounded-xl border ${
                  isDark 
                    ? 'bg-[#1A0F02] border-amber-400/20' 
                    : 'bg-amber-50/50 border-amber-900/15'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-900'}`}>#{index + 1}</span>
                      <span className={`font-medium ${isDark ? 'text-amber-100' : 'text-stone-900'}`}>{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>({dept.totalReports} рап.)</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${badgeColor}`}>
                        {dept.avgScore} / 100
                      </span>
                    </div>
                  </div>

                  <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-stone-900' : 'bg-stone-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDark 
                          ? 'bg-gradient-to-r from-amber-500 to-[#F4EE8E]' 
                          : 'bg-gradient-to-r from-amber-500 to-amber-600'
                      }`}
                      style={{ width: `${dept.avgScore}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 2: Персональные скоркарды сотрудников (Интеграция KPI) */}
        <div className={`xl:col-span-7 p-5 rounded-2xl border backdrop-blur-md space-y-4 ${
          isDark 
            ? 'border-amber-400/30 bg-[#140A01]/70' 
            : 'border-amber-900/15 bg-white shadow-sm'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                isDark ? 'text-amber-200' : 'text-amber-950'
              }`}>
                <UserCheck size={18} className={isDark ? 'text-amber-300' : 'text-amber-800'} />
                <span>Скоркарды сотрудников и персональный KPI</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                Индивидуальный балл, своевременность и количество сданных рапортов
              </p>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
              {employeeScoring.length} сотр.
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {employeeScoring.map((emp) => {
              const initials = emp.name.split(' ').map((n: string) => n[0]).join('');
              return (
                <div key={emp.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                  isDark 
                    ? 'bg-[#1A0F02] border-amber-400/20 hover:border-amber-400/40' 
                    : 'bg-amber-50/50 border-amber-900/15 hover:border-amber-500 hover:bg-white'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${
                      isDark 
                        ? 'bg-amber-400/10 border-amber-400/40 text-amber-200' 
                        : 'bg-amber-100 border-amber-300 text-amber-950'
                    }`}>
                      {initials}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-amber-100' : 'text-stone-900'}`}>{emp.name}</h4>
                      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                        <span>{emp.position}</span>
                        <span>•</span>
                        <span>{emp.totalCount} рапортов</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className={`block text-sm font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                        {emp.avgScore > 0 ? `${emp.avgScore} / 100` : '—'}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                        Своевременность: {emp.totalCount > 0 ? `${emp.timeliness}%` : '0%'}
                      </span>
                    </div>

                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border whitespace-nowrap ${emp.statusColor}`}>
                      {emp.statusTag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI SWOT Summary Generator */}
      <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-5 ${
        isDark 
          ? 'border-amber-400/30 bg-[#140A01]/70' 
          : 'border-amber-900/15 bg-white shadow-sm'
      }`} id="ai-swot-generator">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? 'text-amber-200' : 'text-amber-950'
            }`}>
              <Sparkles size={18} className={isDark ? 'text-[#E7C768]' : 'text-amber-800'} />
              <span>Комплексный ИИ-анализ эффективности за {selectedDays} {selectedDays === 1 ? 'день' : selectedDays < 5 ? 'дня' : 'дней'}</span>
            </h3>
            <p className={`text-sm ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
              Нейросеть сформирует глубокую сводку по результатам всех рапортов из базы PostgreSQL BD ProTalk
            </p>
          </div>

          {/* Action cluster: Period Selector Dropdown + Generate Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Period selector dropdown (1 to 30 days) */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                Период:
              </span>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(Number(e.target.value) || 30)}
                disabled={isSummaryLoading}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold outline-none transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-[#140A01] border-amber-400/40 text-[#F4EE8E] focus:border-amber-300' 
                    : 'bg-amber-50 border-amber-900/25 text-amber-950 focus:border-amber-600'
                }`}
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic summary button with changing label */}
            <button
              onClick={handleGenerateSummary}
              disabled={isSummaryLoading}
              className={`px-5 py-2.5 rounded-xl font-bold border text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 ${
                isDark 
                  ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border-amber-400/50 shadow-[0_0_15px_rgba(244,238,142,0.15)]' 
                  : 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500 shadow-sm'
              }`}
            >
              {isSummaryLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Формируем сводку ({selectedDays} дн.)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Сформировать сводку ({selectedDays} дн.)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Telegram status feedback banner */}
        {telegramStatus && (
          <div className={`p-3 rounded-xl border text-sm flex items-center gap-2.5 transition-all ${
            telegramStatus.success
              ? isDark ? 'bg-amber-400/10 border-amber-400/40 text-amber-200' : 'bg-amber-100/80 border-amber-400 text-amber-950'
              : isDark ? 'bg-rose-500/15 border-rose-400/40 text-rose-200' : 'bg-rose-100 border-rose-400 text-rose-950'
          }`}>
            {telegramStatus.success ? <CheckCircle size={18} className="shrink-0" /> : <AlertTriangle size={18} className="shrink-0" />}
            <span className="flex-1 font-medium">{telegramStatus.message}</span>
            <button type="button" onClick={() => setTelegramStatus(null)} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}

        {/* AI summary formatted output block */}
        {aiSummaryResult ? (
          <div className={`p-5 sm:p-6 rounded-2xl border text-sm leading-relaxed ${
            isDark 
              ? 'bg-[#1A0F02] border-amber-400/30 text-amber-100 shadow-[0_0_20px_rgba(244,238,142,0.08)]' 
              : 'bg-amber-50/60 border-amber-900/15 text-stone-900'
          }`} id="ai-summary-output">
            {/* Header & Action buttons */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b mb-4 gap-3 ${
              isDark ? 'border-amber-400/20' : 'border-amber-900/15'
            }`}>
              <div className="space-y-0.5">
                <h4 className={`font-bold text-base flex items-center gap-2 ${
                  isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
                }`}>
                  <Sparkles size={18} />
                  <span>Сводный аудит нейросети (за {selectedDays} {selectedDays === 1 ? 'день' : selectedDays < 5 ? 'дня' : 'дней'}):</span>
                </h4>
                <div className={`text-xs ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>
                  Подразделение: <span className="font-semibold">{selectedAnalDept === 'All' ? 'Все отделы' : departments.find(d => d.id === selectedAnalDept)?.name || selectedAnalDept}</span> • Выборка: <span className="font-semibold">{filteredReports.length} рапортов</span>
                </div>
              </div>

              {/* Action buttons: Send to Telegram (Rich) & Copy */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSendToMyTelegram}
                  disabled={isSendingTelegram}
                  className={`px-3.5 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                    isDark 
                      ? 'bg-amber-400/15 hover:bg-amber-400/25 border-amber-400/40 text-[#F4EE8E]' 
                      : 'bg-amber-200/80 hover:bg-amber-200 border-amber-400 text-amber-950'
                  }`}
                  title="Отправить полную сводку в свой Telegram (формат Rich)"
                >
                  {isSendingTelegram ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  <span>Отправить в Telegram</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCurrentSummary}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30 text-amber-200' 
                      : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950'
                  }`}
                  title="Скопировать текст сводки"
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{isCopied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>
            </div>

            {/* Rendered beautiful markdown UI body */}
            <div className="mt-2 text-sm leading-relaxed">
              <MarkdownRenderer 
                content={aiSummaryResult} 
                theme={theme}
                isLightTheme={isLightTheme}
              />
            </div>
          </div>
        ) : (
          <div className={`p-6 text-center border border-dashed rounded-2xl text-sm space-y-2 ${
            isDark 
              ? 'border-amber-400/30 text-stone-300 bg-[#1A0F02]/40' 
              : 'border-amber-900/20 text-stone-700 bg-amber-50/30'
          }`}>
            <Sparkles size={28} className={`mx-auto ${isDark ? 'text-amber-400/60' : 'text-amber-700/60'}`} />
            <p className="font-medium">
              Выберите период от 1 до 30 дней и нажмите «Сформировать сводку».
            </p>
            <p className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
              Нейросеть проанализирует все рапорты за выбранный период и структурирует выводы.
            </p>
          </div>
        )}

        {/* History of Saved Summaries in PostgreSQL BD ProTalk */}
        <div className={`mt-8 pt-6 border-t ${isDark ? 'border-amber-400/20' : 'border-amber-900/15'} space-y-4`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-base font-bold flex items-center gap-2 ${
              isDark ? 'text-[#F4EE8E]' : 'text-amber-950'
            }`}>
              <History size={18} className={isDark ? 'text-amber-400' : 'text-amber-800'} />
              <span>История ранее сформированных сводок ({historySummaries.length})</span>
            </h4>
            <button
              type="button"
              onClick={loadHistorySummaries}
              disabled={isLoadingHistory}
              className={`p-1.5 rounded-lg border text-sm transition-colors cursor-pointer ${
                isDark 
                  ? 'border-amber-400/30 text-amber-300 hover:bg-amber-400/10' 
                  : 'border-amber-900/20 text-amber-950 hover:bg-amber-100'
              }`}
              title="Обновить историю сводок"
            >
              <RefreshCw size={15} className={isLoadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-4 text-center text-sm opacity-70">
              Загрузка истории сводок из базы PostgreSQL BD ProTalk...
            </div>
          ) : historySummaries.length === 0 ? (
            <div className={`p-4 rounded-xl border text-sm text-center ${
              isDark ? 'border-amber-400/20 text-stone-400' : 'border-amber-900/15 text-stone-600'
            }`}>
              Ранее сохраненных сводок еще нет. Нажмите «Сформировать сводку», чтобы создать первую запись.
            </div>
          ) : (
            <div className="space-y-3">
              {historySummaries.map((item) => {
                const isExpanded = expandedHistoryId === item.id;
                const formattedDate = new Date(item.created_at).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDark 
                        ? 'bg-[#140A01]/80 border-amber-400/30' 
                        : 'bg-white border-amber-900/15 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                            {item.department_name || 'Все отделы'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            isDark 
                              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' 
                              : 'bg-amber-100 border-amber-300 text-amber-950'
                          }`}>
                            {item.timeframe_days} {item.timeframe_days === 1 ? 'день' : item.timeframe_days < 5 ? 'дня' : 'дней'}
                          </span>
                          <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                            <Calendar size={12} />
                            {formattedDate}
                          </span>
                        </div>
                        {item.created_by_name && (
                          <div className={`text-xs ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
                            Сформировал: {item.created_by_name}
                          </div>
                        )}
                      </div>

                      {/* History actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyHistoryItem(item.summary_text, item.id)}
                          className={`p-2 rounded-lg border text-sm flex items-center gap-1 cursor-pointer transition-colors ${
                            isDark 
                              ? 'bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] border-amber-400/30' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                          }`}
                          title="Скопировать текст"
                        >
                          {copiedHistoryId === item.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                          className={`py-1.5 px-3 rounded-lg border text-sm flex items-center gap-1.5 cursor-pointer transition-colors ${
                            isDark 
                              ? 'bg-amber-400/10 hover:bg-amber-400/20 text-[#F4EE8E] border-amber-400/30' 
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                          }`}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <span>{isExpanded ? 'Свернуть' : 'Открыть'}</span>
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className={`mt-3 p-4 rounded-xl border text-sm ${
                        isDark 
                          ? 'bg-[#1A0F02] border-amber-400/25' 
                          : 'bg-amber-50/50 border-amber-900/15'
                      }`}>
                        <MarkdownRenderer 
                          content={item.summary_text}
                          theme={theme}
                          isLightTheme={isLightTheme}
                        />
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm line-clamp-2 ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
                        {item.summary_text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Standardized AiLoadingOverlay (identical to create report modal) */}
      <AiLoadingOverlay 
        isOpen={isSummaryLoading}
        title={loadingTitle}
        subtitle={loadingSubtitle}
        isLightTheme={isLightTheme}
        maxSeconds={120}
        onCancel={() => setIsSummaryLoading(false)}
      />

      {/* Custom styled notice modal (no window.alert) */}
      {noticeMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
            isDark 
              ? 'bg-[#1A0F02] border-amber-400/50 text-amber-100 shadow-[0_0_30px_rgba(244,238,142,0.2)]' 
              : 'bg-white border-amber-900/30 text-stone-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark 
                  ? 'bg-amber-400/10 border-amber-400/40 text-[#F4EE8E]' 
                  : 'bg-amber-100 border-amber-300 text-amber-900'
              }`}>
                <AlertCircle size={22} />
              </div>
              <h4 className={`text-base font-bold ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Уведомление
              </h4>
            </div>

            <p className="text-sm leading-relaxed">
              {noticeMessage}
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setNoticeMessage(null)}
                className={`py-2 px-5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-stone-950 hover:brightness-105' 
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:brightness-105'
                }`}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
