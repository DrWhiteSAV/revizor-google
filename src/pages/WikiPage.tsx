import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles, AlertCircle, Filter, X, Check } from 'lucide-react';
import { wikiFAQ as defaultWikiFAQ } from '../data/wikiData';
import InteractiveGoldenWaves from '../components/InteractiveGoldenWaves';
import { getEffectiveUserId } from '../utils/guestUser';
import { MiniAudioField } from '../components/voice/MiniAudioField';

export interface WikiFAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags?: string;
}

export default function WikiPage() {
  const [faqItems, setFaqItems] = useState<WikiFAQItem[]>(defaultWikiFAQ);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Все']);
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  
  // Modals state for mobile/responsive UX
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // AI Smart Question state
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Group FAQ items by category
  const categories = ['Все', 'Общие вопросы', 'Заполнение отчетов', 'Конструктор и настройки', 'Тарифы и оплата', 'Аналитика и Саммари', 'Графики работы', 'Безопасность и аккаунты'];

  // Fetch FAQ from server PostgreSQL BD ProTalk database
  useEffect(() => {
    fetch('/api/wiki')
      .then(async res => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
      .then(data => {
        if (data && data.success && Array.isArray(data.items) && data.items.length > 0) {
          setFaqItems(data.items);
        }
      })
      .catch(err => {
        console.warn("Could not fetch wiki FAQ from server API:", err);
      });
  }, []);

  // Multi-select category toggle helper
  const handleCategoryToggle = (cat: string) => {
    if (cat === 'Все') {
      setSelectedCategories(['Все']);
      return;
    }
    let updated = selectedCategories.filter(c => c !== 'Все');
    if (updated.includes(cat)) {
      updated = updated.filter(c => c !== cat);
      if (updated.length === 0) updated = ['Все'];
    } else {
      updated.push(cat);
    }
    setSelectedCategories(updated);
  };

  // Filter FAQ items
  const filteredFAQ = faqItems.filter(item => {
    const matchesSearch = 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      selectedCategories.includes('Все') || 
      selectedCategories.length === 0 || 
      selectedCategories.includes(item.category);
    
    return matchesSearch && matchesCategory;
  });

  const toggleExpand = (idx: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleAiSmartSearch = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsAiLoading(true);
    setAiAnswer(null);
    setAiError(null);

    try {
      const effectiveUserId = getEffectiveUserId();

      const response = await fetch('/api/ai/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: q,
          userId: effectiveUserId
        })
      });

      if (!response.ok) throw new Error('Ошибка связи с ИИ-моделью');
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      setAiAnswer(data.reply);
    } catch (err: any) {
      setAiError(err.message || 'Не удалось получить ответ от ИИ-поиска. Пожалуйста, попробуйте позже.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Selected categories label preview
  const getFilterButtonLabel = () => {
    if (selectedCategories.includes('Все') || selectedCategories.length === 0) {
      return 'Все категории';
    }
    if (selectedCategories.length === 1) {
      return selectedCategories[0];
    }
    return `Выбрано: ${selectedCategories.length}`;
  };

  return (
    <div className="w-full min-h-screen text-white bg-[#070707] font-sans selection:bg-[#D4AF37]/30 selection:text-white px-4 sm:px-6 py-4 pt-2 sm:pt-4 relative" id="wiki-page-root">
      
      {/* Global Interactive Golden Waves Parallax Background */}
      <InteractiveGoldenWaves />

      <div className="mx-auto max-w-5xl space-y-5 relative z-10">
        
        {/* UNIFIED SEARCH & FILTER CONTAINER */}
        <div className="rounded-3xl border border-amber-400/30 bg-zinc-900/80 backdrop-blur-md p-3.5 sm:p-5 space-y-3 shadow-xl shadow-black/40" id="wiki-unified-search-box">
          
          {/* DESKTOP VIEW (hidden md:flex): Mascot + Search Bar + Multi-select Filter in 1 Row */}
          <div className="hidden md:flex items-center gap-3">
            
            {/* Mascot on the left */}
            <img 
              src="/file/29/iirr3.png" 
              alt="Робот RR Вики" 
              className="w-12 h-12 object-contain animate-pulse-slow drop-shadow-[0_0_12px_rgba(231,199,104,0.4)] flex-shrink-0"
            />

            {/* Desktop Search Input Form with MiniAudioField */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  handleAiSmartSearch(searchQuery);
                }
              }} 
              className="flex-1 flex items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <MiniAudioField
                  value={searchQuery}
                  onChange={(val) => {
                    setSearchQuery(val);
                    if (aiAnswer) setAiAnswer(null);
                    if (aiError) setAiError(null);
                  }}
                  placeholder="Введите вопрос или надиктуйте голосом..."
                  isLightTheme={false}
                  showPlayer={false}
                  multiline={false}
                />
              </div>

              <button
                type="submit"
                disabled={isAiLoading || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-2xl font-bold bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm tracking-wide hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(244,238,142,0.25)] shrink-0"
              >
                {isAiLoading ? (
                  <>
                    <Sparkles size={16} className="animate-spin text-amber-950" />
                    <span>ИИ ищет...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} className="text-amber-950" />
                    <span>Спросить ИИ</span>
                  </>
                )}
              </button>
            </form>

            {/* Desktop Multi-select Filter Trigger */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-black/60 border border-amber-400/40 text-[#F4EE8E] text-xs font-bold hover:bg-amber-400/10 hover:border-amber-300 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 shadow-sm"
              title="Мультивыбор категорий"
            >
              <Filter size={15} className="text-[#E7C768]" />
              <span>{getFilterButtonLabel()}</span>
              {!selectedCategories.includes('Все') && selectedCategories.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black flex items-center justify-center">
                  {selectedCategories.length}
                </span>
              )}
            </button>
          </div>

          {/* MOBILE VIEW (flex md:hidden): Mascot + Icon Search Button + Filter Button */}
          <div className="flex md:hidden items-center justify-between gap-2.5">
            
            {/* Mascot on Left */}
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src="/file/29/iirr3.png" 
                alt="Робот RR Вики" 
                className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(231,199,104,0.4)] flex-shrink-0"
              />
              <span className="text-xs font-black text-[#F4EE8E] truncate">База Знаний</span>
            </div>

            {/* Action Buttons: Search Modal Button & Filter Modal Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  searchQuery.trim() 
                    ? 'bg-amber-400/20 border-amber-400/60 text-[#F4EE8E]' 
                    : 'bg-black/60 border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                }`}
                title="Поиск и ИИ Вопросы"
              >
                <Search size={18} className="text-[#E7C768]" />
                <span className="text-[11px] hidden sm:inline">Поиск</span>
              </button>

              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !selectedCategories.includes('Все') 
                    ? 'bg-amber-400/20 border-amber-400/60 text-[#F4EE8E]' 
                    : 'bg-black/60 border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                }`}
                title="Фильтры Категорий"
              >
                <Filter size={18} className="text-[#E7C768]" />
                <span className="text-[11px] hidden sm:inline">Фильтр</span>
                {!selectedCategories.includes('Все') && (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-zinc-950 text-[9px] font-black flex items-center justify-center">
                    {selectedCategories.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Filters Pill Bar (If search or multi-filters applied) */}
          {(searchQuery.trim() || !selectedCategories.includes('Все')) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20 text-xs">
              <span className="text-amber-200/60 text-[11px] font-mono">Активные фильтры:</span>
              
              {searchQuery.trim() && (
                <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-[#F4EE8E] text-[11px] font-semibold flex items-center gap-1.5">
                  <span>Запрос: «{searchQuery}»</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-white cursor-pointer"><X size={12} /></button>
                </span>
              )}

              {!selectedCategories.includes('Все') && selectedCategories.map(cat => (
                <span key={cat} className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
                  <span>{cat}</span>
                  <button onClick={() => handleCategoryToggle(cat)} className="hover:text-white cursor-pointer"><X size={12} /></button>
                </span>
              ))}

              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategories(['Все']);
                  setAiAnswer(null);
                }}
                className="text-[11px] text-amber-400/80 hover:text-amber-200 underline font-mono cursor-pointer ml-auto"
              >
                Сбросить всё
              </button>
            </div>
          )}

          {/* AI Response Display */}
          {aiAnswer && (
            <div className="p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-zinc-100 text-xs sm:text-sm leading-relaxed animate-fade-in space-y-2" id="ai-search-response">
              <p className="font-bold text-[#F4EE8E] flex items-center gap-1.5 text-xs sm:text-sm">
                <Sparkles size={16} className="text-[#E7C768] animate-pulse" />
                Ответ ИИ-Ассистента:
              </p>
              <div className="whitespace-pre-line text-zinc-200 text-xs sm:text-sm leading-relaxed">{aiAnswer}</div>
            </div>
          )}

          {aiError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2" id="ai-search-error">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
          )}
        </div>

        {/* Regular FAQ Accordions Header Info */}
        <div className="flex items-center justify-between text-xs text-amber-200/80 font-mono px-1">
          <span>{getFilterButtonLabel()}</span>
          <span>Найдено вопросов: {filteredFAQ.length}</span>
        </div>

        {/* Accordion List */}
        <div className="space-y-3" id="faq-accordions">
          {filteredFAQ.length > 0 ? (
            filteredFAQ.map((faq, index) => {
              const isExpanded = !!expandedIndices[index];
              return (
                <div 
                  key={index} 
                  className="rounded-2xl border border-amber-400/20 bg-zinc-900/50 hover:bg-zinc-900/70 hover:border-amber-400/40 transition-all overflow-hidden backdrop-blur-sm shadow-md"
                  id={`faq-item-${index}`}
                >
                  <button
                    onClick={() => toggleExpand(index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 font-sans focus:outline-none cursor-pointer"
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-200 font-mono tracking-wider uppercase">
                        {faq.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-100 hover:text-amber-100 transition-colors">
                        {faq.question}
                      </h4>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white/10 text-amber-200 flex-shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-zinc-200 text-xs sm:text-sm leading-relaxed border-t border-amber-500/10 bg-zinc-950/60 animate-fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border border-amber-500/20 bg-zinc-900/40 text-zinc-300 text-xs sm:text-sm backdrop-blur-sm space-y-3">
              <p className="text-zinc-400">По выбранным параметрам ничего не найдено.</p>
              {!aiAnswer && !isAiLoading && searchQuery.trim() && (
                <button
                  onClick={() => handleAiSmartSearch(searchQuery)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-zinc-950 font-extrabold text-xs flex items-center gap-2 mx-auto hover:brightness-110 transition-all cursor-pointer shadow-md"
                >
                  <Sparkles size={14} />
                  <span>Спросить у ИИ-помощника «{searchQuery}»</span>
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* MOBILE / RESPONSIVE SEARCH FLOATING POPOVER */}
      {isSearchModalOpen && (
        <div className="fixed inset-x-3 top-16 sm:top-20 z-50 pointer-events-none flex justify-end animate-fade-in">
          <div className="pointer-events-auto w-full max-w-lg p-4 sm:p-5 rounded-3xl bg-black/25 backdrop-blur-md border border-amber-400/50 shadow-2xl shadow-black/80 space-y-3 relative">
            
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <h3 className="text-xs sm:text-sm font-extrabold text-[#F4EE8E] flex items-center gap-2">
                <Search size={16} className="text-[#E7C768]" />
                <span>Быстрый поиск & ИИ</span>
              </h3>
              <button 
                onClick={() => setIsSearchModalOpen(false)}
                className="p-1 rounded-full bg-amber-400/10 text-amber-200 hover:text-white hover:bg-amber-400/20 transition-all cursor-pointer"
                title="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                handleAiSmartSearch(searchQuery);
              }
            }} className="space-y-3">
              <div>
                <MiniAudioField
                  value={searchQuery}
                  onChange={(val) => {
                    setSearchQuery(val);
                    if (aiAnswer) setAiAnswer(null);
                    if (aiError) setAiError(null);
                  }}
                  placeholder="Поиск по вики или вопрос ИИ (голосом или текстом)..."
                  isLightTheme={false}
                  showPlayer={false}
                  multiline={false}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAiLoading || !searchQuery.trim()}
                  className="flex-1 py-2.5 rounded-2xl font-bold bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-sm tracking-wide hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {isAiLoading ? <Sparkles size={16} className="animate-spin text-amber-950" /> : <Search size={16} />}
                  <span>{isAiLoading ? 'ИИ ищет...' : 'Спросить ИИ'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 hover:text-white text-sm font-bold transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </form>

            {/* AI Response Display inside popover */}
            {aiAnswer && (
              <div className="p-3 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-100 text-xs space-y-1 max-h-52 overflow-y-auto">
                <p className="font-bold text-[#F4EE8E] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#E7C768]" />
                  Ответ ИИ-Ассистента:
                </p>
                <div className="whitespace-pre-line text-zinc-100 leading-relaxed text-xs">{aiAnswer}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MULTI-SELECT CATEGORIES FILTER MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-4 sm:p-6 rounded-3xl bg-transparent border border-transparent backdrop-blur-xl shadow-none space-y-4 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="text-sm sm:text-base font-extrabold text-[#F4EE8E] flex items-center gap-2">
                <Filter size={18} className="text-[#E7C768]" />
                <span>Фильтр Категорий (Мультивыбор)</span>
              </h3>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1.5 rounded-full bg-amber-400/10 text-amber-200 hover:text-white hover:bg-amber-400/20 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleCategoryToggle(cat)}
                    className={`w-full p-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-400/25 border-amber-400/60 text-[#F4EE8E] shadow-[0_0_12px_rgba(244,238,142,0.15)]' 
                        : 'bg-black/50 border-amber-950/40 text-amber-200/70 hover:bg-amber-400/10 hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check size={16} className="text-[#E7C768]" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-amber-500/20">
              <button
                onClick={() => setSelectedCategories(['Все'])}
                className="flex-1 py-2.5 rounded-xl border border-amber-400/30 text-amber-200/80 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Сбросить ("Все")
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-zinc-950 text-xs font-extrabold uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
