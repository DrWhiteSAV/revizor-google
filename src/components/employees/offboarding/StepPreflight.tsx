import React from 'react';
import {
  Briefcase,
  Building2,
  CheckSquare,
  CreditCard,
  FileText,
  FolderOpen,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { OffboardingPreflight, formatRoleRu } from './types';

interface StepPreflightProps {
  preflight: OffboardingPreflight;
}

export const StepPreflight: React.FC<StepPreflightProps> = ({ preflight }) => {
  const { target, counts, balances } = preflight;
  const totalBalance =
    balances.payment_balance +
    balances.local_bonus +
    balances.referral_bonus +
    balances.welcome_bonus;

  const cards = [
    {
      icon: CheckSquare,
      label: 'Активные задачи',
      value: counts.open_tasks,
      sub: `На проверке/в архиве: ${counts.completed_tasks}`,
    },
    {
      icon: Briefcase,
      label: 'Проекты и отделы',
      value: counts.projects + counts.managed_departments,
      sub: `Проектов: ${counts.projects}, Отделов: ${counts.managed_departments}`,
    },
    {
      icon: FileText,
      label: 'Отчеты и шаблоны',
      value: counts.pending_reports + counts.report_templates,
      sub: `На рецензии: ${counts.pending_reports}, Шаблонов: ${counts.report_templates}`,
    },
    {
      icon: Send,
      label: 'Правила Telegram',
      value: counts.routing_rules,
      sub: `Смен впереди: ${counts.future_shifts}, Файлов: ${counts.files}`,
    },
    {
      icon: Users,
      label: 'Команда и рефералы',
      value: counts.subordinates + counts.referrals,
      sub: `Подчиненных: ${counts.subordinates}, Рефералов: ${counts.referrals}`,
    },
    {
      icon: CreditCard,
      label: 'Балансы (RR)',
      value: totalBalance.toLocaleString('ru-RU'),
      sub: `Осн.: ${balances.payment_balance} • Бонусы: ${balances.local_bonus + balances.referral_bonus + balances.welcome_bonus}`,
    },
  ];

  return (
    <div className="space-y-4 text-sm">
      <div className="p-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="text-base font-black text-amber-950 dark:text-[#F4EE8E] break-words">
            {target.name}
          </div>
          <div className="text-sm text-amber-900/90 dark:text-amber-200/85 break-words">
            {formatRoleRu(target.role)} • {target.position || 'Специалист'}
          </div>
          {target.email && (
            <div className="text-sm text-amber-900/75 dark:text-amber-300/75 break-all">
              {target.email}
            </div>
          )}
        </div>
        {target.is_boss && (
          <div className="px-3 py-2 rounded-xl border border-amber-500/50 bg-amber-500/15 text-sm font-bold text-amber-950 dark:text-[#F4EE8E] flex items-center gap-2 shrink-0">
            <Building2 className="w-4 h-4 text-[#E7C768] shrink-0" />
            <span>Владелец / Директор компании</span>
          </div>
        )}
      </div>

      {target.is_main_platform_owner && (
        <div className="p-4 rounded-2xl border border-orange-500/50 bg-orange-500/15 text-sm font-semibold text-amber-950 dark:text-[#F4EE8E] flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <span>
            Учетная запись главного супер-администратора платформы защищена от увольнения.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="p-3.5 rounded-2xl border border-amber-400/35 bg-amber-500/5 flex flex-col gap-1.5 min-w-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-900 dark:text-amber-200 break-words">
                  {c.label}
                </span>
                <Icon className="w-4 h-4 text-[#E7C768] shrink-0" />
              </div>
              <div className="text-xl font-black text-amber-950 dark:text-[#F4EE8E]">
                {c.value}
              </div>
              <div className="text-sm text-amber-900/75 dark:text-amber-200/70 break-words leading-snug">
                {c.sub}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3.5 rounded-2xl border border-amber-400/30 bg-amber-500/5 text-sm text-amber-950 dark:text-amber-100/90 flex items-start gap-2.5 leading-relaxed">
        <FolderOpen className="w-5 h-5 text-[#E7C768] shrink-0 mt-0.5" />
        <span>
          При запуске каскадного увольнения доступ сотрудника будет закрыт сразу, а передача всех отмеченных данных пройдет пошагово с автоматическим допрохождением в фоне при любых сбоях связи.
        </span>
      </div>
    </div>
  );
};
