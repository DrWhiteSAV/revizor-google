import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, BookOpen, Home, FileText } from 'lucide-react';
import { getEffectiveUserId } from '../utils/guestUser';
import { MiniAudioField } from './voice/MiniAudioField';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AIAssistantProps {
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

// Simple custom markdown renderer to style output in elegant UI layout
function parseMarkdownToUI(text: string, theme: 'dark' | 'light' = 'dark') {
  if (!text) return null;
  
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Headers: ###, ##, #
    if (line.startsWith('### ')) {
      return <h4 key={idx} className={`text-sm font-bold mt-2 mb-1 ${theme === 'dark' ? 'text-amber-200' : 'text-amber-800'}`}>{line.slice(4)}</h4>;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      const cleanLine = line.replace(/^#+\s+/, '');
      return <h3 key={idx} className={`text-base font-bold mt-3 mb-1 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-900'}`}>{cleanLine}</h3>;
    }
    
    // Lists: * or -
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const content = line.trim().substring(2);
      return (
        <div key={idx} className="flex items-start gap-1.5 my-1 pl-2">
          <span className="text-amber-400 mt-1">●</span>
          <span className={`text-sm ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800'}`}>{content}</span>
        </div>
      );
    }
    
    // Bold / italic processing using custom regex replacement inside standard text
    let formattedText: React.ReactNode = line;
    const boldRegex = /\*\*(.*?)\*\*/g;
    
    if (boldRegex.test(line)) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      formattedText = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className={theme === 'dark' ? 'text-[#F4EE8E] font-semibold' : 'text-amber-950 font-bold'}>{part}</strong>;
        }
        return part;
      });
    }

    if (line.trim() === '') return <div key={idx} className="h-2" />;

    return <p key={idx} className={`text-sm leading-relaxed mb-1 ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>{formattedText}</p>;
  });
}

export default function AIAssistant({ onNavigate, currentPath: propPath }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return document.documentElement.classList.contains('theme-light') ? 'light' : (localStorage.getItem('cabinet_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const handleThemeChange = (e?: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      } else {
        setTheme(document.documentElement.classList.contains('theme-light') ? 'light' : 'dark');
      }
    };

    handleThemeChange();

    window.addEventListener('cabinet-theme-change', handleThemeChange);
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('cabinet-theme-change', handleThemeChange);
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '**Привет!** Я твой умный ассистент **ИИ Рапорт RR**.\n\nЯ могу ответить на любые вопросы о сервисе, подсказать тарифы, помочь настроить отчеты или найти нужную информацию в Вики.\n\nЗадай мне свой вопрос в поле ниже!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const assistantRef = useRef<HTMLDivElement>(null);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const activeRoutePath = propPath || currentPath;

  // Monitor location changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    const interval = setInterval(() => {
      if (window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    }, 500);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [currentPath]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Click outside to close assistant
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (isOpen && assistantRef.current && !assistantRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle global event to open AI assistant
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-ai-assistant', handleOpenEvent);
    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenEvent);
    };
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = Date.now().toString();
    const newMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const effectiveUserId = getEffectiveUserId();
      const recentHistory = messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text }));

      // Cascade RAG: Ask Academy + DB knowledge base first
      const res = await fetch('/api/academy/ask-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          currentRoute: activeRoutePath,
          role: 'all',
          userRole: 'guest',
          userId: effectiveUserId,
          history: recentHistory
        })
      });

      let replyText = '';
      if (res.ok) {
        const data = await res.json();
        replyText = data.answer || data.reply;
      }

      if (!replyText) {
        // Fallback to general AI chat grounded on PostgreSQL tables
        const fallbackRes = await fetch('/api/ai/assistant/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: textToSend,
            userId: effectiveUserId,
            history: recentHistory
          })
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          replyText = fallbackData.reply;
        }
      }

      if (!replyText) {
        replyText = "К сожалению, сейчас не удалось получить ответ от ИИ Ассистента.";
      }

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date()
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Извините, сейчас я испытываю временные трудности с подключением. Попробуйте повторить вопрос или откройте раздел «Академия» на сайте.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isCabinetPath = currentPath.startsWith('/cabinet');
  const isSystemAdminPath = currentPath.startsWith('/system-admin');
  const isDocLight = document.documentElement.classList.contains('theme-light');
  // On public landing pages (outside cabinet/admin), AI Assistant MUST ALWAYS be in dark theme mode
  const effectiveTheme = (isCabinetPath || isSystemAdminPath) && isDocLight ? 'light' : 'dark';

  // Only hide floating button when the assistant dialog is already open
  const shouldHideButton = isOpen;

  return (
    <>
      {/* Transparent click-outside backdrop on mobile without any dimming or blur */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-transparent z-[80] sm:hidden" 
          id="ai-assistant-mobile-backdrop"
        />
      )}

      <div className={`fixed ${isOpen ? 'z-[90]' : 'z-30 sm:z-40'} transition-all duration-300 ${isCabinetPath ? 'md:bottom-6 md:left-6 bottom-20 right-6' : 'bottom-4 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto'}`} id="ai-assistant-root" ref={assistantRef}>
        <div className="flex items-center justify-between gap-2 w-full max-w-lg">
          {/* Floating Toggle Button */}
          {!shouldHideButton && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`shrink-0 flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] shadow-[0_8px_25px_rgba(212,175,55,0.35)] hover:scale-110 active:scale-95 transition-all cursor-pointer group relative animate-fade-in ${
                effectiveTheme === 'dark'
                  ? 'bg-gradient-to-r from-zinc-900 via-zinc-950 to-black text-white'
                  : 'bg-gradient-to-r from-[#FFFBF5] via-[#FAF5EA] to-[#FAF6EE] text-amber-950'
              }`}
              id="ai-assistant-toggle-btn"
              title="AI Ассистент"
            >
              {/* Inner shimmer element to prevent overflow clipping of the badge */}
              <div className="absolute inset-0 rounded-full shimmer-effect pointer-events-none" />

              <img 
                src="/file/36/rr-logo.png" 
                alt="RR AI" 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300 relative z-10"
              />

              {/* "AI" badge on top of logo and outside the circle boundary */}
              <span className={`absolute -bottom-1 -right-1 z-25 flex items-center justify-center bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 text-[10px] font-black font-mono px-1 rounded-md border-2 ${
                effectiveTheme === 'dark' ? 'border-zinc-950' : 'border-white'
              } shadow-[0_2px_8px_rgba(217,158,65,0.4)] h-4 min-w-4.5 sm:h-4.5 sm:min-w-5`}>
                AI
              </span>
            </button>
          )}

          {/* Mobile 3D Golden Planet Navigation Buttons (Distributed evenly across remaining width) */}
          {!isOpen && !isCabinetPath && (
            <div className="grid grid-cols-3 flex-1 gap-1.5 pl-2 md:hidden" id="mobile-3d-planets-nav">
              {/* Planet 1: Главная */}
              {(() => {
                const isActive = activeRoutePath === '/';
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('/');
                      else window.location.href = '/';
                    }}
                    className={`relative flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group ${
                      isActive 
                        ? 'opacity-100 scale-105' 
                        : 'opacity-80 hover:opacity-100 scale-95'
                    }`}
                    title="Главная страница"
                    id="planet-nav-home"
                  >
                    {/* 3D Sphere Ball with spinning background */}
                    <div className={`relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-black/40 border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.95),inset_0_0_12px_rgba(212,175,55,0.4)]' 
                        : 'border border-amber-300/70 shadow-[0_4px_14px_rgba(0,0,0,0.6)]'
                    }`}>
                      {/* Rotating 3D planet texture layer */}
                      <div className={`absolute -inset-2 rounded-full animate-planet-spin transition-opacity duration-300 ${
                        isActive 
                          ? 'opacity-30 bg-[conic-gradient(from_0deg,#D4AF37,#FFF9C4,transparent,#D4AF37)]' 
                          : 'opacity-100 bg-[conic-gradient(from_0deg,#FFF9C4,#D4AF37,#543800,#D4AF37,#FFF9C4)]'
                      }`} />

                      {/* Static 3D lighting mask overlay */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_45%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
                      )}

                      {/* Icon */}
                      <Home size={16} className={`relative z-10 transition-colors duration-300 ${
                        isActive 
                          ? 'text-[#F4EE8E] drop-shadow-[0_0_8px_rgba(212,175,55,0.9)]' 
                          : 'text-amber-950 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                      }`} />
                    </div>

                    {/* Text Badge: Gold background in inactive, Transparent + Gold Contour in active */}
                    <span className={`mt-1 text-[9px] sm:text-[10px] font-black tracking-tight uppercase px-2 py-0.5 rounded-full border transition-all duration-300 whitespace-nowrap font-sans text-center ${
                      isActive
                        ? 'bg-transparent text-[#F4EE8E] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.85)]'
                        : 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300/80 shadow-xs'
                    }`}>
                      Главная
                    </span>
                  </button>
                );
              })()}

              {/* Planet 2: Академия */}
              {(() => {
                const isActive = activeRoutePath === '/academy' || activeRoutePath === '/wiki';
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('/academy');
                      else window.location.href = '/academy';
                    }}
                    className={`relative flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group ${
                      isActive 
                        ? 'opacity-100 scale-105' 
                        : 'opacity-80 hover:opacity-100 scale-95'
                    }`}
                    title="Академия Рапорт"
                    id="planet-nav-academy"
                  >
                    {/* 3D Sphere Ball with spinning background */}
                    <div className={`relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-black/40 border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.95),inset_0_0_12px_rgba(212,175,55,0.4)]' 
                        : 'border border-amber-300/70 shadow-[0_4px_14px_rgba(0,0,0,0.6)]'
                    }`}>
                      {/* Rotating 3D planet texture layer */}
                      <div className={`absolute -inset-2 rounded-full animate-planet-spin transition-opacity duration-300 ${
                        isActive 
                          ? 'opacity-30 bg-[conic-gradient(from_0deg,#D4AF37,#FFF9C4,transparent,#D4AF37)]' 
                          : 'opacity-100 bg-[conic-gradient(from_0deg,#FFF9C4,#D4AF37,#543800,#D4AF37,#FFF9C4)]'
                      }`} />

                      {/* Static 3D lighting mask overlay */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_45%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
                      )}

                      {/* Icon */}
                      <BookOpen size={16} className={`relative z-10 transition-colors duration-300 ${
                        isActive 
                          ? 'text-[#F4EE8E] drop-shadow-[0_0_8px_rgba(212,175,55,0.9)]' 
                          : 'text-amber-950 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                      }`} />
                    </div>

                    {/* Text Badge: Gold background in inactive, Transparent + Gold Contour in active */}
                    <span className={`mt-1 text-[9px] sm:text-[10px] font-black tracking-tight uppercase px-2 py-0.5 rounded-full border transition-all duration-300 whitespace-nowrap font-sans text-center ${
                      isActive
                        ? 'bg-transparent text-[#F4EE8E] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.85)]'
                        : 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300/80 shadow-xs'
                    }`}>
                      Вики
                    </span>
                  </button>
                );
              })()}

              {/* Planet 3: Блог */}
              {(() => {
                const isActive = Boolean(activeRoutePath && activeRoutePath.startsWith('/blog'));
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('/blog');
                      else window.location.href = '/blog';
                    }}
                    className={`relative flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group ${
                      isActive 
                        ? 'opacity-100 scale-105' 
                        : 'opacity-80 hover:opacity-100 scale-95'
                    }`}
                    title="Блог компании"
                    id="planet-nav-blog"
                  >
                    {/* 3D Sphere Ball with spinning background */}
                    <div className={`relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-black/40 border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.95),inset_0_0_12px_rgba(212,175,55,0.4)]' 
                        : 'border border-amber-300/70 shadow-[0_4px_14px_rgba(0,0,0,0.6)]'
                    }`}>
                      {/* Rotating 3D planet texture layer */}
                      <div className={`absolute -inset-2 rounded-full animate-planet-spin transition-opacity duration-300 ${
                        isActive 
                          ? 'opacity-30 bg-[conic-gradient(from_0deg,#D4AF37,#FFF9C4,transparent,#D4AF37)]' 
                          : 'opacity-100 bg-[conic-gradient(from_0deg,#FFF9C4,#D4AF37,#543800,#D4AF37,#FFF9C4)]'
                      }`} />

                      {/* Static 3D lighting mask overlay */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0)_45%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
                      )}

                      {/* Icon */}
                      <FileText size={16} className={`relative z-10 transition-colors duration-300 ${
                        isActive 
                          ? 'text-[#F4EE8E] drop-shadow-[0_0_8px_rgba(212,175,55,0.9)]' 
                          : 'text-amber-950 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]'
                      }`} />
                    </div>

                    {/* Text Badge: Gold background in inactive, Transparent + Gold Contour in active */}
                    <span className={`mt-1 text-[9px] sm:text-[10px] font-black tracking-tight uppercase px-2 py-0.5 rounded-full border transition-all duration-300 whitespace-nowrap font-sans text-center ${
                      isActive
                        ? 'bg-transparent text-[#F4EE8E] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.85)]'
                        : 'bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border-amber-300/80 shadow-xs'
                    }`}>
                      Блог
                    </span>
                  </button>
                );
              })()}
            </div>
          )}
        </div>

        {/* Dialog Window - 100% transparent container (no borders, blur, or fill), only bubbles + input field visible */}
        {isOpen && (
          <div 
            className={`fixed sm:absolute bottom-24 sm:top-auto ${isCabinetPath ? 'sm:bottom-24' : 'sm:bottom-6'} left-3 right-3 sm:left-0 sm:right-auto w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm h-auto max-h-[calc(100vh-8rem)] sm:max-h-[540px] z-[90] bg-transparent border-0 shadow-none backdrop-blur-none flex flex-col justify-end pointer-events-none animate-fade-in`}
            id="ai-assistant-window"
          >
            {/* Floating minimal close button directly above top bubble */}
            <div className="flex justify-end px-0.5 pb-1.5 pointer-events-auto">
              <button 
                onClick={() => setIsOpen(false)}
                className={`p-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                  effectiveTheme === 'dark'
                    ? 'border-amber-400/50 bg-[#1A0F02]/80 text-[#F4EE8E] hover:bg-amber-400/20 shadow-[0_0_15px_rgba(244,238,142,0.2)]'
                    : 'border-amber-900/35 bg-[#FFFBF5]/90 text-amber-950 hover:bg-amber-100 shadow-md'
                }`}
                id="ai-assistant-close-btn"
                title="Закрыть диалог"
              >
                <X size={15} />
              </button>
            </div>

            {/* Chat Log: grows upwards above input field up to max-h then scrolls */}
            <div className="max-h-[calc(100vh-14.5rem)] sm:max-h-[430px] overflow-y-auto px-0.5 py-1 space-y-2 pointer-events-auto scrollbar-none flex flex-col justify-end bg-transparent border-0" id="ai-assistant-chatlog">
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[88%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div 
                      className={`p-3 rounded-2xl shadow-lg border backdrop-blur-xl transition-all ${
                        msg.sender === 'user' 
                          ? (effectiveTheme === 'dark'
                              ? 'bg-[#1A0F02]/80 border-amber-400/50 text-[#F4EE8E] rounded-tr-none shadow-[0_0_20px_rgba(244,238,142,0.18)]' 
                              : 'bg-[#FFFBF5]/95 border-amber-900/40 text-amber-950 font-semibold rounded-tr-none shadow-md')
                          : (effectiveTheme === 'dark'
                              ? 'bg-[#140A01]/80 border-amber-400/40 text-stone-100 rounded-tl-none shadow-[0_0_25px_rgba(0,0,0,0.5)]'
                              : 'bg-[#FAF6EC]/95 border-amber-800/35 text-amber-950 rounded-tl-none shadow-md')
                      }`}
                    >
                      {parseMarkdownToUI(msg.text, effectiveTheme)}
                    </div>
                    <span className={`text-sm font-mono mt-0.5 px-1 ${effectiveTheme === 'dark' ? 'text-amber-200/70' : 'text-amber-900/70'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className={`flex items-center gap-2 text-sm font-bold p-2.5 rounded-xl border backdrop-blur-md w-fit ${
                    effectiveTheme === 'dark' 
                      ? 'border-amber-400/40 bg-[#1A0F02]/80 text-[#E7C768]' 
                      : 'border-amber-800/35 bg-[#FFFBF5]/90 text-amber-950'
                  }`}>
                    <Sparkles size={15} className="animate-spin text-[#D4AF37]" />
                    <span>ИИ Рапорт подбирает ответ...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input Form directly attached below bubbles */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className={`mt-1.5 p-1.5 rounded-2xl border backdrop-blur-xl flex gap-1.5 items-center pointer-events-auto shadow-xl ${
                effectiveTheme === 'dark'
                  ? 'border-amber-400/45 bg-[#1A0F02]/80 shadow-[0_0_25px_rgba(244,238,142,0.15)]'
                  : 'border-amber-900/35 bg-[#FFFBF5]/90 shadow-lg'
              }`}
            >
              <div className="flex-1 min-w-0">
                <MiniAudioField
                  value={inputValue}
                  onChange={setInputValue}
                  placeholder="Задайте вопрос или надиктуйте голосом..."
                  isLightTheme={effectiveTheme === 'light'}
                  showPlayer={false}
                  multiline={false}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={`p-2.5 rounded-xl border text-amber-950 shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shrink-0 ${
                  effectiveTheme === 'dark'
                    ? 'border-amber-400/50 bg-gradient-to-r from-[#F4EE8E] to-[#D99E41]'
                    : 'border-amber-800/40 bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] font-black'
                }`}
                id="ai-assistant-send-btn"
                title="Отправить сообщение"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
