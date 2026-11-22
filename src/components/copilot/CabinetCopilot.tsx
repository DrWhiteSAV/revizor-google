import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Camera,
  Compass,
  BookOpen,
  ArrowRight,
  HelpCircle,
  FileText,
  CheckCircle,
  Minimize2,
  Maximize2,
  AlertCircle
} from 'lucide-react';
import { CabinetCopilotProps, CopilotMessage, CopilotActionPayload } from './types';
import { captureActiveScreen, dispatchCabinetFillForm, dispatchCabinetOpenModal, dispatchCopilotOverlay } from './copilotActions';
import MarkdownRenderer from '../MarkdownRenderer';
import { MiniAudioField } from '../voice/MiniAudioField';

export const CabinetCopilot: React.FC<CabinetCopilotProps> = ({
  currentUser,
  activeTab,
  onNavigateTab,
  onOpenModal,
  theme = 'dark',
  onOpenAcademyHelp
}) => {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingScreenshot, setPendingScreenshot] = useState<string | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine user role and title
  const roleCode = currentUser?.role || 'employee';
  const roleTitle =
    roleCode === 'super_admin'
      ? 'ИИ-Копилот Директора'
      : roleCode === 'head_of_department'
      ? 'ИИ-Копилот Руководителя'
      : 'ИИ-Копилот Сотрудника';

  const defaultGreeting =
    roleCode === 'super_admin'
      ? `Здравствуйте, ${currentUser?.name || 'Руководитель компании'}! Я ваш стратегический **ИИ-Копилот Директора**.\n\nПомогу с анализом компании, контролем финансов, проверкой структуры отделов, тарифами и переходом по разделам. Также умею делать снимки экрана и заполнять формы.`
      : roleCode === 'head_of_department'
      ? `Приветствую, ${currentUser?.name || 'Руководитель отдела'}! Я ваш оперативный **ИИ-Копилот Руководителя**.\n\nПомогу проверить рапорты команды в Ревизоре, выставить вердикт, скорректировать смены в Графике, назначить задачи и заполнить карточки.`
      : `Привет, ${currentUser?.name || 'Сотрудник'}! Я твой рабочий **ИИ-Копилот Сотрудника**.\n\nПомогу быстро сдать утренний или вечерний рапорт, настроить карточки задач на Орбите, прикрепить аудиоотчет и найти нужную инструкцию в Академии.`;

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: defaultGreeting,
      timestamp: new Date()
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, isLoading, isOpen]);

  const handleTakeScreenshot = async () => {
    try {
      setIsCapturingScreen(true);
      setNotificationStatus('Выберите окно или экран для снимка...');
      const dataUrl = await captureActiveScreen();
      setPendingScreenshot(dataUrl);
      setNotificationStatus('Снимок экрана готов! Напишите вопрос к нему.');
      setTimeout(() => setNotificationStatus(null), 3000);
    } catch (err: any) {
      console.warn('Screenshot capture cancelled or failed:', err);
      setNotificationStatus('Захват экрана отменен или недоступен.');
      setTimeout(() => setNotificationStatus(null), 3000);
    } finally {
      setIsCapturingScreen(false);
    }
  };

  const handleExecuteAction = async (action: CopilotActionPayload) => {
    // Trigger visual AI processing overlay with step animation
    if (action.type === 'navigate' && action.tab) {
      dispatchCopilotOverlay({
        active: true,
        title: 'ИИ-Копилот навигация',
        phrase: `Перенаправляю в раздел «${action.tab}»...`,
        countdown: 3,
        mascot: 'happy'
      });
      setTimeout(() => {
        onNavigateTab(action.tab!);
        dispatchCopilotOverlay({ active: false });
        setNotificationStatus(`Перешли во вкладку: ${action.tab}`);
        setTimeout(() => setNotificationStatus(null), 2500);
      }, 900);
    } else if (action.type === 'open_modal' && action.modal) {
      dispatchCopilotOverlay({
        active: true,
        title: 'ИИ-Копилот запуск формы',
        phrase: `Открываю форму «${action.modal}» и инициализирую внутренние алгоритмы...`,
        countdown: 3,
        mascot: 'welcome'
      });
      setTimeout(() => {
        if (onOpenModal) onOpenModal(action.modal!, action.fields);
        setTimeout(() => {
          dispatchCabinetOpenModal(action.modal!, action.fields);
        }, 160);
        dispatchCopilotOverlay({ active: false });
        setNotificationStatus(`Открыли форму: ${action.modal}`);
        setTimeout(() => setNotificationStatus(null), 2500);
      }, 900);
    } else if (action.type === 'fill_form' && action.fields) {
      dispatchCopilotOverlay({
        active: true,
        title: 'ИИ-Копилот автозаполнение',
        phrase: 'Нейросеть заполняет поля формы данными и верифицирует значения...',
        countdown: 4,
        mascot: 'success'
      });
      setTimeout(() => {
        dispatchCabinetFillForm(action.fields!);
        dispatchCopilotOverlay({ active: false });
        setNotificationStatus('Поля формы заполнены автоматически!');
        setTimeout(() => setNotificationStatus(null), 2500);
      }, 1200);
    } else if (action.type === 'open_article' && (action.articleId || action.target)) {
      if (onOpenAcademyHelp) {
        onOpenAcademyHelp(action.articleId || action.target);
      }
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text && !pendingScreenshot) return;

    const currentScreenshot = pendingScreenshot;
    setPendingScreenshot(null);

    const userMessage: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text || (currentScreenshot ? 'Посмотри на этот экран и подскажи что делать.' : ''),
      timestamp: new Date(),
      screenshotUrl: currentScreenshot || undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/academy/ask-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text || 'Что на этом экране?',
          currentRoute: activeTab,
          role: roleCode,
          userRole: roleCode,
          userId: currentUser?.id,
          history: messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text })),
          context: `Текущая вкладка кабинета: ${activeTab}. Пользователь: ${currentUser?.name || 'Пользователь'}, роль: ${roleCode}`,
          screenshotBase64: currentScreenshot ? currentScreenshot.split(',')[1] || currentScreenshot : undefined
        })
      });

      const data = await response.json();

      if (data.success && data.answer) {
        const assistantMessage: CopilotMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date(),
          actions: data.actions || [],
          matchedArticleId: data.matched_article_id,
          matchedArticleTitle: data.matched_article_title
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Auto execute actions if requested
        if (data.actions && data.actions.length > 0) {
          const autoNav = data.actions.find((a: CopilotActionPayload) => a.type === 'navigate');
          if (autoNav && autoNav.tab && autoNav.tab !== activeTab) {
            // Offer instant action chip
          }
        }
      } else {
        throw new Error(data.error || 'Не удалось получить ответ');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Извините, возникла задержка при обращении к серверу. Вы можете открыть контекстную справку через знак вопроса (?) в шапке или повторить вопрос.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Copilot Dock Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 transition-all cursor-pointer shadow-2xl hover:scale-105 active:scale-95 group ${
            isDark
              ? 'bg-[#1A0F02]/95 border-amber-400/50 text-[#F4EE8E] shadow-[0_0_25px_rgba(244,238,142,0.25)]'
              : 'bg-[#FFFBF5]/95 border-amber-900/40 text-amber-950 shadow-[0_4px_20px_rgba(180,110,40,0.25)]'
          }`}
          title="Открыть ИИ-Копилот"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-400/20 border border-amber-400/40 text-[#E7C768]">
              <Sparkles size={18} className="animate-spin-slow" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </div>

          <div className="text-left hidden sm:block">
            <div className="text-xs font-black tracking-wide">{roleTitle}</div>
            <div className={`text-[11px] leading-none ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
              Помощник и навигатор
            </div>
          </div>
        </button>
      )}

      {/* Floating Copilot Window - 100% transparent container without borders, blur, or fill */}
      {isOpen && (
        <div
          id="cabinet-copilot-window"
          className={`fixed z-50 flex flex-col justify-end overflow-hidden transition-all duration-300 pointer-events-none ${
            isExpanded
              ? 'top-16 bottom-24 inset-x-3 sm:inset-10'
              : 'bottom-24 sm:top-auto sm:bottom-6 right-3 left-3 sm:left-auto sm:right-6 w-auto sm:w-[460px] h-auto max-h-[calc(100vh-8rem)] sm:max-h-[620px]'
          } bg-transparent border-0 shadow-none backdrop-blur-none`}
        >
          {/* Floating Minimal Control Bar */}
          <div className="flex items-center justify-between p-1.5 pointer-events-auto">
            {/* Role indicator pill */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-xl ${
              isDark
                ? 'border-amber-400/40 bg-[#1A0F02]/85 text-[#F4EE8E] shadow-[0_0_15px_rgba(244,238,142,0.15)]'
                : 'border-amber-900/30 bg-[#FFFBF5]/90 text-amber-950 shadow-md'
            }`}>
              <Sparkles size={14} className="text-[#E7C768]" />
              <span className="text-xs font-bold">{roleTitle}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5">
              {onOpenAcademyHelp && (
                <button
                  type="button"
                  onClick={() => onOpenAcademyHelp(activeTab)}
                  className={`p-1.5 rounded-full border shadow-lg backdrop-blur-xl transition-all cursor-pointer ${
                    isDark
                      ? 'border-amber-400/30 bg-[#1A0F02]/85 text-[#F4EE8E] hover:bg-amber-400/20'
                      : 'border-amber-900/30 bg-[#FFFBF5]/90 text-amber-950 hover:bg-amber-100'
                  }`}
                  title="Открыть инструкцию этой страницы"
                >
                  <HelpCircle size={15} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`hidden sm:block p-1.5 rounded-full border shadow-lg backdrop-blur-xl transition-all cursor-pointer ${
                  isDark
                    ? 'border-amber-400/30 bg-[#1A0F02]/85 text-[#F4EE8E] hover:bg-amber-400/20'
                    : 'border-amber-900/30 bg-[#FFFBF5]/90 text-amber-950 hover:bg-amber-100'
                }`}
                title={isExpanded ? 'Свернуть' : 'Развернуть'}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-full border shadow-lg backdrop-blur-xl transition-all cursor-pointer ${
                  isDark
                    ? 'border-amber-400/40 bg-[#1A0F02]/85 text-[#F4EE8E] hover:bg-amber-400/20 shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                    : 'border-amber-900/30 bg-[#FFFBF5]/90 text-amber-950 hover:bg-amber-100 shadow-md'
                }`}
                title="Закрыть"
              >
                <X size={15} />
              </button>
            </div>
          </div>
          {/* Toast Notification Bar */}
          {notificationStatus && (
            <div className="mx-2 my-1 px-3 py-1.5 text-xs bg-[#1A0F02]/85 border border-amber-400/40 rounded-xl flex items-center gap-2 text-[#F4EE8E] animate-in fade-in backdrop-blur-md pointer-events-auto shadow-md">
              <AlertCircle size={14} className="shrink-0 text-[#E7C768]" />
              <span className="truncate">{notificationStatus}</span>
            </div>
          )}

          {/* Chat Messages Log: transparent area pushing bubbles to bottom right above input field */}
          <div id="cabinet-copilot-chatlog" className={`${isExpanded ? 'flex-1' : 'max-h-[calc(100vh-15rem)] sm:max-h-[480px]'} overflow-y-auto px-0.5 py-1 space-y-2 pointer-events-auto scrollbar-none flex flex-col justify-end bg-transparent border-0`}>
            <div className="space-y-2">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[88%] ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl border text-sm leading-relaxed backdrop-blur-xl shadow-lg transition-all ${
                        isUser
                          ? isDark
                            ? 'border-amber-400/50 bg-[#1A0F02]/85 text-[#F4EE8E] rounded-tr-none shadow-[0_0_20px_rgba(244,238,142,0.15)]'
                            : 'border-amber-900/40 bg-[#FFFBF5]/95 text-amber-950 font-medium rounded-tr-none shadow-md'
                          : isDark
                          ? 'border-amber-400/35 bg-[#140A01]/85 text-stone-100 rounded-tl-none shadow-[0_0_25px_rgba(0,0,0,0.6)]'
                          : 'border-amber-800/30 bg-[#FAF6EC]/95 text-amber-950 rounded-tl-none shadow-md'
                      }`}
                    >
                      {/* User screenshot preview if attached */}
                      {msg.screenshotUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-amber-400/40">
                          <img
                            src={msg.screenshotUrl}
                            alt="Скриншот экрана"
                            className="w-full max-h-48 object-cover"
                          />
                        </div>
                      )}

                      <MarkdownRenderer
                        content={msg.text}
                        theme={isDark ? 'dark' : 'light'}
                      />

                      {/* Matched Academy Article Reference Badge */}
                      {msg.matchedArticleTitle && (
                        <div className="mt-2 pt-1.5 border-t border-amber-400/20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-[#E7C768]">
                            <BookOpen size={13} />
                            <span className="truncate font-semibold">
                              {msg.matchedArticleTitle}
                            </span>
                          </div>
                          {onOpenAcademyHelp && (
                            <button
                              type="button"
                              onClick={() => onOpenAcademyHelp(msg.matchedArticleId)}
                              className="text-xs underline hover:opacity-80 shrink-0 font-medium text-[#F4EE8E]"
                            >
                              Читать статью
                            </button>
                          )}
                        </div>
                      )}

                      {/* Autonomous Action Chips */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-amber-400/20 flex flex-wrap gap-1.5">
                          {msg.actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => handleExecuteAction(act)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                isDark
                                  ? 'border-amber-400/50 bg-amber-400/20 text-[#F4EE8E] hover:bg-amber-400/30'
                                  : 'border-amber-900/40 bg-amber-200/90 text-amber-950 hover:bg-amber-300'
                              }`}
                            >
                              <ArrowRight size={13} />
                              <span>
                                {act.label ||
                                  (act.type === 'navigate'
                                    ? `Перейти в «${act.tab}»`
                                    : act.type === 'open_modal'
                                    ? `Открыть форму «${act.modal}»`
                                    : act.type === 'fill_form'
                                    ? 'Заполнить поля'
                                    : 'Открыть инструкцию')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span
                      className={`text-sm mt-0.5 px-1 ${
                        isDark ? 'text-amber-200/70' : 'text-amber-900/70'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 p-2 rounded-xl border backdrop-blur-md w-fit text-sm text-[#E7C768] bg-[#1A0F02]/80 border-amber-400/30 animate-pulse">
                  <Sparkles size={15} className="animate-spin text-[#E7C768]" />
                  <span>ИИ анализирует контекст и сверяет с Академией...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Pending Screenshot Thumbnail Bar */}
          {pendingScreenshot && (
            <div className="mx-2 mb-1 p-2 rounded-2xl border backdrop-blur-xl flex items-center justify-between pointer-events-auto shadow-md bg-[#1A0F02]/85 border-amber-400/40">
              <div className="flex items-center gap-2">
                <img
                  src={pendingScreenshot}
                  alt="Предпросмотр снимка"
                  className="w-12 h-8 object-cover rounded-lg border border-amber-400/50"
                />
                <div className="text-xs text-[#E7C768]">
                  Снимок прикреплен к запросу
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingScreenshot(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
                title="Удалить снимок"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Input & Action Controls Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className={`mt-1.5 p-2 rounded-2xl border backdrop-blur-xl flex items-center gap-2 pointer-events-auto shadow-xl ${
              isDark
                ? 'border-amber-400/45 bg-[#1A0F02]/80 shadow-[0_0_25px_rgba(244,238,142,0.15)]'
                : 'border-amber-900/35 bg-[#FFFBF5]/90 shadow-lg'
            }`}
          >
            {/* Screenshot Action Button */}
            <button
              type="button"
              onClick={handleTakeScreenshot}
              disabled={isCapturingScreen || isLoading}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                pendingScreenshot
                  ? 'border-amber-400 bg-amber-400/30 text-[#F4EE8E]'
                  : isDark
                  ? 'border-amber-400/30 text-stone-300 hover:text-white hover:bg-amber-400/10'
                  : 'border-amber-800/30 text-stone-700 hover:text-stone-950 hover:bg-amber-100'
              }`}
              title="Сделать скриншот экрана для анализа"
            >
              <Camera size={18} />
            </button>

            {/* Input with Voice dictation */}
            <div className="flex-1 min-w-0">
              <MiniAudioField
                value={inputValue}
                onChange={setInputValue}
                placeholder="Спросите или попросите выполнить действие..."
                isLightTheme={!isDark}
                showPlayer={false}
                multiline={false}
              />
            </div>

            {/* Send Message Button */}
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && !pendingScreenshot)}
              className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer shrink-0 ${
                isDark
                  ? 'border-amber-400/60 bg-amber-400/25 text-[#F4EE8E] hover:bg-amber-400/40 disabled:opacity-40'
                  : 'border-amber-850 bg-amber-200/90 text-amber-950 hover:bg-amber-300 disabled:opacity-40'
              }`}
              title="Отправить запрос"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
