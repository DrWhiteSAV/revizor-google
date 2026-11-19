import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Layers } from 'lucide-react';

export interface RaportDropdownOption<T = string> {
  value: T;
  label: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  category?: string;
}

export interface RaportDropdownGroup<T = string> {
  category: string;
  categoryLabel: string;
  categoryIcon?: React.ReactNode;
  options: RaportDropdownOption<T>[];
}

interface RaportDropdownProps<T = string> {
  label?: React.ReactNode;
  placeholder?: string;
  value: T;
  onChange: (value: T) => void;
  options?: RaportDropdownOption<T>[];
  groups?: RaportDropdownGroup<T>[];
  isLightTheme?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  triggerIcon?: React.ReactNode;
  id?: string;
}

export function RaportDropdown<T extends string = string>({
  label,
  placeholder = 'Выберите вариант...',
  value,
  onChange,
  options = [],
  groups,
  isLightTheme = false,
  searchable = false,
  disabled = false,
  className = '',
  triggerIcon,
  id
}: RaportDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Flatten all options
  const allOptions = useMemo(() => {
    if (groups && groups.length > 0) {
      return groups.flatMap(g => g.options);
    }
    return options;
  }, [groups, options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return allOptions.find(opt => opt.value === value);
  }, [allOptions, value]);

  // Filtered list by search term
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups || [];
    const lower = search.toLowerCase();
    return (groups || [])
      .map(group => ({
        ...group,
        options: group.options.filter(
          opt =>
            opt.label.toLowerCase().includes(lower) ||
            (opt.subtitle && opt.subtitle.toLowerCase().includes(lower))
        )
      }))
      .filter(group => group.options.length > 0);
  }, [groups, search]);

  const filteredOptions = useMemo(() => {
    if (groups && groups.length > 0) return [];
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(lower) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(lower))
    );
  }, [groups, options, search]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const renderOptionItem = (opt: RaportDropdownOption<T>) => {
    const isSelected = opt.value === value;
    const itemIcon = opt.icon || <Layers size={18} className="text-amber-500" />;

    return (
      <button
        key={String(opt.value)}
        type="button"
        onClick={() => handleSelect(opt.value)}
        className={`w-full min-h-[52px] sm:min-h-[58px] p-3 rounded-xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
          isSelected
            ? isLightTheme
              ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-bold shadow-sm'
              : 'bg-amber-400/25 border-amber-400/70 text-[#F4EE8E] font-bold shadow-[0_0_20px_rgba(244,238,142,0.3)]'
            : isLightTheme
              ? 'bg-transparent border-transparent text-amber-950 hover:bg-amber-100/60 hover:border-amber-300'
              : 'bg-transparent border-transparent text-amber-100 hover:bg-amber-400/10 hover:border-amber-400/40'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {/* Individual SVG Icon Badge */}
          <div className={`shrink-0 p-2.5 rounded-xl border transition-colors ${
            isSelected
              ? isLightTheme 
                ? 'bg-amber-200/90 border-amber-500 text-amber-950' 
                : 'bg-amber-400/30 border-amber-400/70 text-[#F4EE8E] shadow-[0_0_12px_rgba(244,238,142,0.35)]'
              : isLightTheme 
                ? 'bg-amber-50/70 border-amber-300/70 text-amber-800' 
                : 'bg-white/5 border-amber-400/30 text-amber-400'
          }`}>
            {itemIcon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-bold leading-snug break-words">
              {opt.label}
            </div>
            {opt.subtitle && (
              <div className={`text-sm mt-0.5 leading-relaxed break-words font-normal ${
                isSelected
                  ? isLightTheme ? 'text-amber-950' : 'text-amber-200'
                  : isLightTheme ? 'text-amber-950/80' : 'text-amber-300/80'
              }`}>
                {opt.subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-1">
          {opt.badge && (
            <span className={`text-sm px-2.5 py-1 rounded-full font-bold border shrink-0 ${
              isLightTheme
                ? 'bg-amber-200/80 border-amber-300 text-amber-950'
                : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
            }`}>
              {opt.badge}
            </span>
          )}
          {isSelected && (
            <div className={`p-1.5 rounded-full shrink-0 ${
              isLightTheme 
                ? 'bg-amber-500 text-amber-950 shadow-sm' 
                : 'bg-gradient-to-r from-[#F4EE8E] to-[#E7C768] text-amber-950 shadow-[0_0_12px_rgba(244,238,142,0.4)]'
            }`}>
              <Check size={16} className="stroke-[3]" />
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef} id={id}>
      {label && (
        <label className={`block text-sm sm:text-base font-bold mb-1.5 opacity-90 ${
          isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
        }`}>
          {label}
        </label>
      )}

      {/* Trigger Button: Extended 2x length & height on desktop, touch-friendly on mobile */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[58px] sm:min-h-[64px] px-4 py-3 rounded-2xl border text-sm transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
          isLightTheme
            ? 'bg-[#FFFBF5]/60 backdrop-blur-md border-amber-400/70 text-amber-950 hover:bg-[#FFFBF5]/80 hover:border-amber-600 shadow-sm'
            : 'bg-[#1A0F02]/35 backdrop-blur-md border-amber-400/50 text-amber-100 hover:bg-[#1A0F02]/50 hover:border-[#E7C768] shadow-[0_0_20px_rgba(244,238,142,0.12)]'
        } ${isOpen ? (isLightTheme ? 'ring-2 ring-amber-500/70' : 'ring-2 ring-amber-400/50 shadow-[0_0_25px_rgba(244,238,142,0.25)]') : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-start sm:items-center gap-3 overflow-hidden flex-1 min-w-0 py-0.5">
          {/* Main Selected / Trigger Icon */}
          {selectedOption?.icon ? (
            <div className={`p-2 rounded-xl border shrink-0 ${
              isLightTheme
                ? 'bg-amber-100/70 border-amber-300 text-amber-800'
                : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
            }`}>
              {selectedOption.icon}
            </div>
          ) : triggerIcon ? (
            <div className={`p-2 rounded-xl border shrink-0 ${
              isLightTheme
                ? 'bg-amber-100/70 border-amber-300 text-amber-800'
                : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
            }`}>
              {triggerIcon}
            </div>
          ) : (
            <div className={`p-2 rounded-xl border shrink-0 ${
              isLightTheme
                ? 'bg-amber-100/70 border-amber-300 text-amber-800'
                : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
            }`}>
              <Layers size={18} />
            </div>
          )}

          {/* 2-line spacious layout: label + subtitle */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sm:text-base font-bold leading-snug break-words">
                {selectedOption ? selectedOption.label : placeholder}
              </span>
              {selectedOption?.badge && (
                <span className={`text-sm px-2.5 py-0.5 rounded-full font-bold shrink-0 border ${
                  isLightTheme
                    ? 'bg-amber-200/80 border-amber-300 text-amber-950'
                    : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
                }`}>
                  {selectedOption.badge}
                </span>
              )}
            </div>
            {selectedOption?.subtitle && (
              <div className={`text-sm mt-0.5 leading-relaxed break-words font-normal ${
                isLightTheme ? 'text-amber-950/75' : 'text-amber-300/75'
              }`}>
                {selectedOption.subtitle}
              </div>
            )}
          </div>
        </div>

        <ChevronDown
          size={20}
          className={`shrink-0 transition-transform duration-200 text-amber-500 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Extended length with transparent glass styling and mobile viewport fit */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border p-2.5 flex flex-col gap-2 max-h-[55vh] sm:max-h-[520px] overflow-hidden ${
            isLightTheme
              ? 'backdrop-blur-xl bg-[#FFFBF5]/90 border-amber-500/80 text-amber-950 shadow-[0_12px_35px_rgba(217,158,65,0.25)]'
              : 'backdrop-blur-xl bg-[#140A01]/85 border-amber-400/60 text-stone-100 shadow-[0_0_35px_rgba(244,238,142,0.25)]'
          }`}
        >
          {/* Search Header if searchable */}
          {searchable && (
            <div className="relative shrink-0">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по списку..."
                className={`w-full min-h-[44px] pl-10 pr-9 py-2.5 rounded-xl border text-sm sm:text-base font-medium focus:outline-none ${
                  isLightTheme
                    ? 'bg-[#FFFBF5]/70 border-amber-400/80 text-amber-950 placeholder:text-amber-900/50 focus:border-amber-600'
                    : 'bg-[#1A0F02]/40 border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
                }`}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 text-amber-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {/* List of Options / Category Groups */}
          <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
            {groups && groups.length > 0 ? (
              filteredGroups.length === 0 ? (
                <div className="py-8 text-center text-sm font-medium opacity-70">
                  Ничего не найдено
                </div>
              ) : (
                filteredGroups.map(group => (
                  <div key={group.category} className="space-y-1.5">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-b border-amber-400/20 text-sm font-bold ${
                      isLightTheme ? 'text-amber-950 bg-amber-50/40' : 'text-[#F4EE8E] bg-white/5'
                    }`}>
                      {group.categoryIcon && (
                        <span className="text-amber-500 shrink-0">{group.categoryIcon}</span>
                      )}
                      <span>{group.categoryLabel}</span>
                      <span className="opacity-70 font-normal">({group.options.length})</span>
                    </div>
                    <div className="space-y-1 pt-0.5">
                      {group.options.map(opt => renderOptionItem(opt))}
                    </div>
                  </div>
                ))
              )
            ) : filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-sm font-medium opacity-70">
                Ничего не найдено
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map(opt => renderOptionItem(opt))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
