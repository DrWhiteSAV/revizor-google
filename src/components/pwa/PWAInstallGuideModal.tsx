import React from 'react';
import { createPortal } from 'react-dom';
import { Share, PlusSquare, MoreVertical, Smartphone, X } from 'lucide-react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  isIOS: boolean;
  theme: 'dark' | 'light';
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  isIOS,
  theme,
  onClose,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  const isDark = theme === 'dark';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md bg-transparent"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border-2 p-5 sm:p-6 space-y-4 transition-all ${
          isDark
            ? 'bg-[#1A0F02]/90 border-[#E7C768]/60 text-white shadow-[0_0_30px_rgba(244,238,142,0.3)]'
            : 'bg-[#FFFBF5]/95 border-amber-800/40 text-amber-950 shadow-2xl'
        }`}
      >
        <div className="w-10 h-1.5 rounded-full bg-amber-500/40 mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-3 border-b border-amber-500/25 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone size={22} />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-extrabold leading-snug ${isDark ? 'text-[#F4EE8E]' : 'text-amber-950'}`}>
                Установка на рабочий стол
              </h3>
              <p className={`text-[14px] ${isDark ? 'text-amber-100/80' : 'text-amber-900'}`}>
                {isIOS
                  ? 'Для iPhone и iPad (Safari): уведомления о отчетах и KPI на экран «Домой»'
                  : 'Для Android и ПК: мгновенные уведомления с отчетами прямо на телефон'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
              isDark
                ? 'border-amber-400/40 text-[#F4EE8E] hover:bg-amber-400/15'
                : 'border-amber-800/30 text-amber-950 hover:bg-amber-100'
            }`}
            aria-label="Закрыть инструкцию"
          >
            <X size={20} />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-[14px] leading-relaxed">
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-transparent border-amber-400/35 text-white' : 'bg-transparent border-amber-800/25 text-amber-950'
            }`}>
              <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div className="min-w-0">
                <p className="font-bold">Откройте сайт в браузере Safari</p>
                <p className={isDark ? 'text-amber-100/80' : 'text-amber-900'}>
                  Нажмите на иконку <span className="inline-flex items-center gap-1 font-bold"><Share size={15} /> Поделиться</span> на нижней панели экрана.
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-transparent border-amber-400/35 text-white' : 'bg-transparent border-amber-800/25 text-amber-950'
            }`}>
              <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div className="min-w-0">
                <p className="font-bold">Выберите пункт меню</p>
                <p className={isDark ? 'text-amber-100/80' : 'text-amber-900'}>
                  Пролистайте список вниз и нажмите <span className="inline-flex items-center gap-1 font-bold"><PlusSquare size={15} /> На экран «Домой»</span>, затем «Добавить».
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-[14px] leading-relaxed">
            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-transparent border-amber-400/35 text-white' : 'bg-transparent border-amber-800/25 text-amber-950'
            }`}>
              <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div className="min-w-0">
                <p className="font-bold">Откройте меню браузера</p>
                <p className={isDark ? 'text-amber-100/80' : 'text-amber-900'}>
                  Нажмите кнопку <span className="inline-flex items-center gap-1 font-bold"><MoreVertical size={15} /> меню</span> в правом верхнем углу Chrome, Edge или Яндекс Браузера.
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-transparent border-amber-400/35 text-white' : 'bg-transparent border-amber-800/25 text-amber-950'
            }`}>
              <span className="w-7 h-7 rounded-full bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div className="min-w-0">
                <p className="font-bold">Установите приложение</p>
                <p className={isDark ? 'text-amber-100/80' : 'text-amber-900'}>
                  Нажмите «Установить приложение» или «Добавить на главный экран», чтобы запускать кабинет как отдельное приложение.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-[14px] shadow-md hover:brightness-105 active:scale-98 transition-all cursor-pointer"
        >
          Понятно
        </button>
      </div>
    </div>,
    document.body
  );
};
