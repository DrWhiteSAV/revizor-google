import React, { useState } from 'react';
import { ArrowRightLeft, Plus, Sparkles, UserCheck, Users } from 'lucide-react';
import {
  OffboardingOptions,
  OffboardingPreflight,
  SuccessorCandidate,
  SuccessorMap,
  formatRoleRu,
} from './types';

interface StepSuccessorProps {
  preflight: OffboardingPreflight;
  transferMode: 'full_successor' | 'split_by_domain' | 'archive_only';
  setTransferMode: (mode: 'full_successor' | 'split_by_domain' | 'archive_only') => void;
  successorMap: SuccessorMap;
  setSuccessorMap: (val: SuccessorMap) => void;
  options: OffboardingOptions;
  setOptions: (val: OffboardingOptions) => void;
  onSuccessorCreated: (candidate: SuccessorCandidate) => void;
}

export const StepSuccessor: React.FC<StepSuccessorProps> = ({
  preflight,
  transferMode,
  setTransferMode,
  successorMap,
  setSuccessorMap,
  options,
  setOptions,
  onSuccessorCreated,
}) => {
  const { target, eligible_successors } = preflight;
  const isBoss = target.is_boss;

  const [showQuickCreate, setShowQuickCreate] = useState(eligible_successors.length === 0);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTgId, setNewTgId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const handleCreateInline = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      setCreateErr('Укажите ФИО и электронную почту нового преемника');
      return;
    }
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await fetch('/api/offboarding/create-successor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
          telegram_id: newTgId.trim() || undefined,
          role: isBoss ? 'DIRECTOR' : 'MANAGER',
          position: isBoss ? 'Генеральный директор' : 'Руководитель',
          company_id: target.company_id,
          director_id: target.director_id,
        }),
      });
      const json = await res.json();
      if (!json.success || !json.successor) {
        setCreateErr(json.error || 'Не удалось создать преемника');
      } else {
        onSuccessorCreated(json.successor);
        setSuccessorMap({
          ...successorMap,
          primary: json.successor.id,
          directorFinance: json.successor.id,
        });
        setShowQuickCreate(false);
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewTgId('');
      }
    } catch (e: any) {
      setCreateErr(e.message || 'Ошибка соединения');
    } finally {
      setCreating(false);
    }
  };

  const renderSelect = (
    label: string,
    value: string | undefined,
    onChange: (val: string) => void
  ) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-bold text-amber-950 dark:text-[#F4EE8E]">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-amber-400/40 bg-[#FFFBF5]/90 dark:bg-[#140A01]/70 text-amber-950 dark:text-[#F4EE8E] outline-none focus:border-amber-400"
      >
        <option value="">Выберите сотрудника...</option>
        {eligible_successors.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({formatRoleRu(s.role)} — {s.position})
          </option>
        ))}
      </select>
    </div>
  );

  const toggleOpt = (key: keyof OffboardingOptions) => {
    setOptions({ ...options, [key]: !options[key] });
  };

  const modeButtons: Array<{
    id: 'full_successor' | 'split_by_domain' | 'archive_only';
    title: string;
    desc: string;
    disabled?: boolean;
  }> = [
    {
      id: 'full_successor',
      title: 'Единый преемник',
      desc: 'Передать все дела, права и балансы одному сотруднику или новому директору',
    },
    {
      id: 'split_by_domain',
      title: 'Разделить по блокам',
      desc: 'Назначить разных преемников для задач, отделов и финансов',
    },
    {
      id: 'archive_only',
      title: 'Только архив без передачи',
      desc: isBoss
        ? 'Недоступно для директора без назначения преемника'
        : 'Закрыть доступ и сохранить историю без переноса дел',
      disabled: isBoss,
    },
  ];

  return (
    <div className="space-y-4 text-sm">
      {/* Mode selector as mobile-friendly wrap cards (no horizontal scroll) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {modeButtons.map((m) => {
          const active = transferMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={m.disabled}
              onClick={() => setTransferMode(m.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                active
                  ? 'border-[#E7C768] bg-amber-500/20 shadow-[0_0_20px_rgba(244,238,142,0.2)]'
                  : 'border-amber-400/30 bg-amber-500/5 hover:bg-amber-500/10'
              } ${m.disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
            >
              <span className="font-bold text-amber-950 dark:text-[#F4EE8E]">
                {m.title}
              </span>
              <span className="text-sm text-amber-900/80 dark:text-amber-200/75 leading-snug">
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>

      {transferMode !== 'archive_only' && (
        <div className="p-4 rounded-2xl border border-amber-400/35 bg-amber-500/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E7C768] shrink-0" />
              <span>Выбор преемника</span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="px-3 py-1.5 rounded-xl text-sm font-bold border border-amber-400/40 bg-amber-500/10 text-amber-950 dark:text-[#F4EE8E] hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{showQuickCreate ? 'Скрыть форму' : 'Создать нового преемника'}</span>
            </button>
          </div>

          {showQuickCreate && (
            <div className="p-3.5 rounded-2xl border border-amber-400/40 bg-amber-500/10 space-y-3">
              <div className="font-bold text-amber-950 dark:text-[#F4EE8E]">
                Быстрое создание {isBoss ? 'нового директора компании' : 'преемника'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ФИО преемника *"
                  className="px-3 py-2 rounded-xl text-sm border border-amber-400/40 bg-[#FFFBF5]/90 dark:bg-[#140A01]/70 text-amber-950 dark:text-[#F4EE8E] outline-none"
                />
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="E-mail преемника *"
                  className="px-3 py-2 rounded-xl text-sm border border-amber-400/40 bg-[#FFFBF5]/90 dark:bg-[#140A01]/70 text-amber-950 dark:text-[#F4EE8E] outline-none"
                />
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Телефон"
                  className="px-3 py-2 rounded-xl text-sm border border-amber-400/40 bg-[#FFFBF5]/90 dark:bg-[#140A01]/70 text-amber-950 dark:text-[#F4EE8E] outline-none"
                />
                <input
                  value={newTgId}
                  onChange={(e) => setNewTgId(e.target.value)}
                  placeholder="Telegram ID (необязательно)"
                  className="px-3 py-2 rounded-xl text-sm border border-amber-400/40 bg-[#FFFBF5]/90 dark:bg-[#140A01]/70 text-amber-950 dark:text-[#F4EE8E] outline-none"
                />
              </div>
              {createErr && (
                <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {createErr}
                </div>
              )}
              <button
                type="button"
                disabled={creating}
                onClick={handleCreateInline}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300 hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {creating ? 'Создание...' : 'Создать и выбрать преемником'}
              </button>
            </div>
          )}

          {transferMode === 'full_successor' ? (
            renderSelect(
              isBoss
                ? 'Новый директор и владелец компании'
                : 'Кому передать все дела и права',
              successorMap.primary,
              (val) =>
                setSuccessorMap({
                  primary: val,
                  tasks: val,
                  management: val,
                  directorFinance: val,
                  referrals: val,
                })
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderSelect('Задачи, графики и файлы', successorMap.tasks, (val) =>
                setSuccessorMap({ ...successorMap, tasks: val, primary: successorMap.primary || val })
              )}
              {renderSelect('Отделы, проекты и проверка отчетов', successorMap.management, (val) =>
                setSuccessorMap({ ...successorMap, management: val })
              )}
              {renderSelect(
                isBoss ? 'Новый директор, компания и балансы' : 'Балансы и оплаты',
                successorMap.directorFinance,
                (val) => setSuccessorMap({ ...successorMap, directorFinance: val })
              )}
              {renderSelect('Реферальная сеть', successorMap.referrals, (val) =>
                setSuccessorMap({ ...successorMap, referrals: val })
              )}
            </div>
          )}
        </div>
      )}

      {/* Granular checkboxes */}
      {transferMode !== 'archive_only' && (
        <div className="p-4 rounded-2xl border border-amber-400/35 bg-amber-500/5 space-y-2.5">
          <div className="font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#E7C768] shrink-0" />
            <span>Объем каскадной передачи</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: 'transferOpenTasks' as const, label: 'Передать активные и текущие задачи' },
              { key: 'transferProjectsAndDepts' as const, label: 'Передать проекты и руководство отделами' },
              { key: 'transferTemplatesAndPendingReports' as const, label: 'Переназначить шаблоны и проверку отчетов' },
              { key: 'transferSchedulesAndFiles' as const, label: 'Передать будущие смены и файлы' },
              { key: 'transferRoutingRules' as const, label: 'Обновить правила Telegram-маршрутизации' },
              { key: 'transferReferrals' as const, label: 'Перенести рефералов и приглашенных' },
              { key: 'transferBalancesAndTariffs' as const, label: 'Перенести раздельные балансы и тарифы' },
              { key: 'replaceDirectorInCompany' as const, label: 'Заменить директора компании и перепривязать команду' },
              { key: 'generateAiHandoverBrief' as const, label: 'Сформировать ИИ-памятку передачи дел' },
              { key: 'notifyTelegram' as const, label: 'Отправить пакет передачи дел в Telegram' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-amber-400/25 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={Boolean(options[item.key])}
                  onChange={() => toggleOpt(item.key)}
                  className="mt-1 w-4 h-4 accent-[#D4AF37] cursor-pointer shrink-0"
                />
                <span className="text-sm text-amber-950 dark:text-amber-100 leading-snug break-words">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 rounded-xl border border-amber-400/30 bg-amber-500/10 text-sm text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#E7C768] shrink-0" />
        <span>
          Все раздельные балансы переносятся с фиксацией уникальных транзакций (защита от двойного списания при повторах).
        </span>
      </div>
    </div>
  );
};
