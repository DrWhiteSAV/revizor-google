import React, { useState, useEffect } from 'react';
import { Check, Send, User, Globe, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { OnboardingPayload, StepDefinition } from '../types';
import { MiniAudioField } from '../../voice/MiniAudioField';
import { useOnboardingStore } from '../../../store/useOnboardingStore';

interface StepProps {
  step: StepDefinition;
  data: OnboardingPayload;
  isLightTheme: boolean;
  onJumpToTab: (tabId: string) => void;
}

const TIMEZONES = [
  { value: '+02:00', label: 'UTC+2 (Калининград)' },
  { value: '+03:00', label: 'UTC+3 (Москва)' },
  { value: '+04:00', label: 'UTC+4 (Самара)' },
  { value: '+05:00', label: 'UTC+5 (Екатеринбург)' },
  { value: '+06:00', label: 'UTC+6 (Омск)' },
  { value: '+07:00', label: 'UTC+7 (Новосибирск / Красноярск)' },
  { value: '+08:00', label: 'UTC+8 (Иркутск)' },
  { value: '+09:00', label: 'UTC+9 (Якутск)' },
  { value: '+10:00', label: 'UTC+10 (Владивосток)' },
];

export const ProfileTelegramSteps: React.FC<StepProps> = ({ step, data, isLightTheme }) => {
  const { runAiAction, verifyStep, isProcessingAi, isVerifying } = useOnboardingStore();
  const userCtx = data.context.user || {};
  const userId = data.user_id;

  const [name, setName] = useState<string>(userCtx.name || '');
  const [position, setPosition] = useState<string>(userCtx.position || '');
  const [phone, setPhone] = useState<string>(userCtx.phone || '');
  const [timezone, setTimezone] = useState<string>(userCtx.timezone || '+03:00');

  const [tgHandle, setTgHandle] = useState<string>(userCtx.telegramHandle || '');
  const [tgId, setTgId] = useState<string>(userCtx.telegram_id || '');
  const [chatId, setChatId] = useState<string>(data.context.savedChats?.[0]?.chat_id || '');
  const [chatTitle, setChatTitle] = useState<string>(data.context.savedChats?.[0]?.title || '');

  useEffect(() => {
    setName(userCtx.name || '');
    setPosition(userCtx.position || '');
    setPhone(userCtx.phone || '');
    setTimezone(userCtx.timezone || '+03:00');
    setTgHandle(userCtx.telegramHandle || '');
    setTgId(userCtx.telegram_id || '');
  }, [userCtx.name, userCtx.position, userCtx.phone, userCtx.timezone, userCtx.telegramHandle, userCtx.telegram_id]);

  const cardClass = isLightTheme
    ? 'rounded-2xl border border-amber-700/35 bg-[#FFFBF5]/85 p-4 text-amber-950'
    : 'rounded-2xl border border-[#E7C768]/35 bg-[#1A0F02]/55 p-4 text-amber-100';

  const inputClass = isLightTheme
    ? 'w-full rounded-xl border border-amber-700/40 bg-[#FFFBF5]/90 px-3.5 py-2.5 text-sm text-amber-950 placeholder-amber-900/45 focus:outline-none focus:border-amber-800'
    : 'w-full rounded-xl border border-[#E7C768]/35 bg-[#140A01]/65 px-3.5 py-2.5 text-sm text-white placeholder-amber-200/35 focus:outline-none focus:border-[#F4EE8E]';

  const labelClass = isLightTheme
    ? 'block text-sm font-bold text-amber-950 mb-1.5'
    : 'block text-sm font-bold text-[#F4EE8E] mb-1.5';

  if (step.id === 'profile') {
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className={cardClass}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <MiniAudioField
                label="ФИО *"
                value={name}
                onChange={setName}
                placeholder="Введите или продиктуйте ФИО"
                isLightTheme={isLightTheme}
                showPlayer={false}
              />
            </div>

            <div className="min-w-0">
              <MiniAudioField
                label="Должность *"
                value={position}
                onChange={setPosition}
                placeholder="Например: Генеральный директор"
                isLightTheme={isLightTheme}
                showPlayer={false}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={15} />
                  <span>Телефон для связи</span>
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className={inputClass}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={15} />
                  <span>Часовой пояс</span>
                </span>
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputClass}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className={isLightTheme ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#140A01] text-white'}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isProcessingAi || !name.trim()}
              onClick={() =>
                runAiAction(userId, 'profile', {
                  action: 'save',
                  payload: { name, position, phone, timezone },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Сохранить профиль</span>
            </button>

            <span className={`text-sm flex items-center gap-1.5 ${isLightTheme ? 'text-amber-900' : 'text-amber-200/80'}`}>
              <User size={15} />
              <span className="break-words">Продиктуйте ФИО или должность нажав на сферу справа в поле</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // STEP: TELEGRAM
  return (
    <div className="space-y-4 w-full min-w-0">
      <div className={cardClass}>
        <div className="space-y-4">
          <div className={`rounded-xl border p-3.5 text-sm leading-relaxed ${
            isLightTheme ? 'border-amber-700/35 bg-amber-100/50 text-amber-950' : 'border-[#E7C768]/30 bg-[#140A01]/50 text-amber-100'
          }`}>
            <p className="font-bold mb-1">Быстрая инструкция:</p>
            <p className="break-words">
              1. Откройте бота <a href="https://t.me/ii_rrbot" target="_blank" rel="noreferrer" className="underline font-bold">@ii_rrbot</a> в Telegram и нажмите «Запустить» (/start).
            </p>
            <p className="break-words">
              2. Укажите ваш @username или числовой Telegram ID ниже, чтобы бот отправлял вам задачи и рапорты.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <MiniAudioField
                label="Ваш Telegram @username"
                value={tgHandle}
                onChange={setTgHandle}
                placeholder="@ivanov"
                isLightTheme={isLightTheme}
                showPlayer={false}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Числовой Telegram ID (для тестов)</label>
              <input
                type="text"
                value={tgId}
                onChange={(e) => setTgId(e.target.value)}
                placeholder="Например: 169262990"
                className={inputClass}
              />
            </div>
          </div>

          {data.onboarding_type === 'director' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-amber-500/20">
              <div className="min-w-0">
                <label className={labelClass}>ID группового чата / канала (опционально)</label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-100..."
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <MiniAudioField
                  label="Название корпоративного чата"
                  value={chatTitle}
                  onChange={setChatTitle}
                  placeholder="Например: Отчеты команды"
                  isLightTheme={isLightTheme}
                  showPlayer={false}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() =>
                runAiAction(userId, 'telegram', {
                  action: 'save',
                  payload: {
                    telegramHandle: tgHandle,
                    telegram_id: tgId,
                    chat_id: chatId,
                    chat_title: chatTitle,
                  },
                })
              }
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-sm shadow-md hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessingAi ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Сохранить данные Telegram</span>
            </button>

            <button
              type="button"
              disabled={isVerifying || (!tgId.trim() && !chatId.trim())}
              onClick={() =>
                verifyStep(userId, 'telegram', {
                  send_test_telegram: true,
                  test_chat_id: (chatId || tgId).trim(),
                })
              }
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-45 ${
                isLightTheme
                  ? 'border-amber-800/50 text-amber-950 hover:bg-amber-200/60'
                  : 'border-[#E7C768]/50 text-[#F4EE8E] hover:bg-amber-400/10'
              }`}
            >
              {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Отправить тестовый пинг ботом</span>
            </button>

            <a
              href="https://t.me/ii_rrbot"
              target="_blank"
              rel="noreferrer"
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all ${
                isLightTheme
                  ? 'border-amber-700/40 text-amber-950 hover:bg-amber-100'
                  : 'border-[#E7C768]/35 text-amber-200 hover:bg-white/5'
              }`}
            >
              <MessageSquare size={16} />
              <span>Открыть @ii_rrbot</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
