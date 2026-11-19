import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Building, Users, FolderTree, CheckCheck, User, UserCheck } from 'lucide-react';
import { CustomCheckbox } from './CustomCheckbox';

export interface DropdownItem {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  parentId?: string | null;
  badge?: string;
  icon?: React.ReactNode;
}

interface MultiSelectDropdownProps {
  label: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLightTheme?: boolean;
  type?: 'departments' | 'employees';
  allOptionLabel?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder = 'Выберите...',
  items,
  selectedIds,
  onChange,
  isLightTheme = false,
  type = 'departments',
  allOptionLabel = 'Все'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
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

  const isAllSelected = selectedIds.includes('all') || (items.length > 0 && selectedIds.length === items.length);

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(['all']);
    }
  };

  const handleToggleItem = (id: string) => {
    let next: string[];
    if (selectedIds.includes('all')) {
      // Transition from 'all' to all individual items minus this one
      const allItemIds = items.map(i => i.id);
      next = allItemIds.filter(i => i !== id);
    } else if (selectedIds.includes(id)) {
      next = selectedIds.filter(i => i !== id);
    } else {
      next = [...selectedIds, id];
      // If now all individual items are selected, normalize to 'all'
      if (items.length > 0 && next.length >= items.length) {
        next = ['all'];
      }
    }
    onChange(next);
  };

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const lower = search.toLowerCase();
    return items.filter(
      item =>
        item.name.toLowerCase().includes(lower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lower))
    );
  }, [items, search]);

  // Group departments by hierarchy if applicable
  const hierarchicalItems = useMemo(() => {
    if (type !== 'departments') return null;
    const allIds = new Set(filteredItems.map(i => i.id));
    // An item is a root if it has no parentId or its parentId does not exist among the items (e.g. parent is company)
    const roots = filteredItems.filter(i => !i.parentId || !allIds.has(i.parentId));
    const childrenMap = new Map<string, DropdownItem[]>();

    filteredItems.forEach(i => {
      if (i.parentId && allIds.has(i.parentId)) {
        const list = childrenMap.get(i.parentId) || [];
        list.push(i);
        childrenMap.set(i.parentId, list);
      }
    });

    // Fallback: if roots is empty but there are items, treat all as roots so nothing is hidden
    if (roots.length === 0 && filteredItems.length > 0) {
      return { roots: filteredItems, childrenMap };
    }

    return { roots, childrenMap };
  }, [filteredItems, type]);

  // Generate trigger button summary label
  const summaryText = useMemo(() => {
    if (selectedIds.includes('all')) {
      return allOptionLabel;
    }
    if (selectedIds.length === 0) {
      return placeholder;
    }
    if (selectedIds.length === 1) {
      const found = items.find(i => i.id === selectedIds[0]);
      return found ? found.name : 'Выбран 1 элемент';
    }
    return `Выбрано: ${selectedIds.length}`;
  }, [selectedIds, items, placeholder, allOptionLabel]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className={`block text-sm font-bold mb-1.5 opacity-90 ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer flex items-center justify-between gap-2 text-left ${
          isLightTheme
            ? 'bg-amber-50/70 border-amber-300/90 text-amber-950 hover:bg-amber-100/70 focus:border-amber-500'
            : 'bg-amber-950/30 border-amber-400/40 text-amber-100 hover:bg-amber-900/30 hover:border-[#E7C768]'
        } ${isOpen ? (isLightTheme ? 'ring-2 ring-amber-400/50' : 'ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.2)]') : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
          {type === 'departments' ? (
            <Building size={18} className="text-amber-500 shrink-0" />
          ) : (
            <Users size={18} className="text-amber-500 shrink-0" />
          )}
          <span className="truncate text-sm font-bold">{summaryText}</span>
          {selectedIds.length > 0 && !selectedIds.includes('all') && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 border ${
                isLightTheme ? 'bg-amber-200/80 border-amber-300 text-amber-950' : 'bg-amber-400/20 text-[#F4EE8E] border border-amber-400/40'
              }`}
            >
              {selectedIds.length}
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform duration-200 text-amber-500 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border shadow-2xl p-2.5 flex flex-col gap-2 max-h-80 overflow-hidden ${
            isLightTheme
              ? 'backdrop-blur-xl bg-[#FFFBF5]/95 border-amber-400 text-zinc-900 shadow-[0_10px_30px_rgba(217,158,65,0.2)]'
              : 'backdrop-blur-xl bg-[#1A0F02]/95 border-amber-400/60 text-white shadow-[0_0_30px_rgba(244,238,142,0.25)]'
          }`}
        >
          {/* Search Header */}
          <div className="relative shrink-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по списку..."
              className={`w-full min-h-[38px] pl-9 pr-8 py-1.5 rounded-xl border text-sm font-medium focus:outline-none ${
                isLightTheme
                  ? 'bg-amber-50/60 border-amber-300 text-zinc-900 placeholder:text-zinc-500 focus:border-amber-500'
                  : 'bg-amber-950/40 border-amber-400/40 text-amber-100 placeholder:text-amber-300/40 focus:border-[#E7C768]'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 text-amber-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Select All Button */}
          <div className="shrink-0 pb-2 border-b border-amber-400/20 flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2">
              <CheckCheck size={18} className="text-amber-500 shrink-0" />
              <CustomCheckbox
                checked={isAllSelected}
                onChange={handleToggleAll}
                isLightTheme={isLightTheme}
                size="sm"
                label={<span className="text-sm font-bold">{allOptionLabel}</span>}
              />
            </div>
            <span className="text-xs opacity-75 font-medium">Всего: {items.length}</span>
          </div>

          {/* Items List */}
          <div className="overflow-y-auto space-y-1.5 pr-1 custom-scrollbar flex-1">
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm opacity-70">
                Ничего не найдено по запросу «{search}»
              </div>
            ) : type === 'departments' && hierarchicalItems && !search.trim() ? (
              // Hierarchical department view
              hierarchicalItems.roots.map(root => {
                const isRootChecked = selectedIds.includes('all') || selectedIds.includes(root.id);
                const children = hierarchicalItems.childrenMap.get(root.id) || [];

                return (
                  <div key={root.id} className="space-y-1">
                    <div
                      onClick={() => handleToggleItem(root.id)}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-colors border ${
                        isRootChecked
                          ? isLightTheme
                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold'
                            : 'bg-amber-400/20 border-amber-400/60 text-[#F4EE8E] font-bold shadow-[0_0_12px_rgba(244,238,142,0.2)]'
                          : isLightTheme
                            ? 'border-transparent hover:bg-amber-50 text-zinc-900'
                            : 'border-transparent hover:bg-white/5 text-amber-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CustomCheckbox
                          checked={isRootChecked}
                          onChange={() => handleToggleItem(root.id)}
                          isLightTheme={isLightTheme}
                          size="sm"
                        />
                        <Building size={18} className="text-amber-500 shrink-0" />
                        <span className="text-sm font-bold truncate">{root.name}</span>
                      </div>
                      {root.badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                          isLightTheme ? 'bg-amber-200/80 border-amber-300 text-amber-950' : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
                        }`}>
                          {root.badge}
                        </span>
                      )}
                    </div>

                    {/* Subdepartments (indented) */}
                    {children.map(child => {
                      const isChildChecked = selectedIds.includes('all') || selectedIds.includes(child.id);
                      return (
                        <div
                          key={child.id}
                          onClick={() => handleToggleItem(child.id)}
                          className={`ml-5 p-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors border ${
                            isChildChecked
                              ? isLightTheme
                                ? 'bg-amber-100/60 border-amber-300 text-amber-950 font-bold'
                                : 'bg-amber-400/15 border-amber-400/40 text-amber-200 font-bold'
                              : isLightTheme
                                ? 'border-transparent hover:bg-amber-50 text-zinc-900'
                                : 'border-transparent hover:bg-white/5 text-amber-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CustomCheckbox
                              checked={isChildChecked}
                              onChange={() => handleToggleItem(child.id)}
                              isLightTheme={isLightTheme}
                              size="sm"
                            />
                            <FolderTree size={16} className="text-amber-500 shrink-0 opacity-80" />
                            <span className="text-sm truncate">{child.name}</span>
                          </div>
                          <span className="text-xs opacity-75 px-1.5 py-0.5 rounded border border-amber-400/30 shrink-0">
                            Подотдел
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              // Flat list for employees or search results
              filteredItems.map(item => {
                const isChecked = selectedIds.includes('all') || selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={`p-2.5 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-colors border ${
                      isChecked
                        ? isLightTheme
                          ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold'
                          : 'bg-amber-400/20 border-amber-400/60 text-[#F4EE8E] font-bold shadow-[0_0_12px_rgba(244,238,142,0.2)]'
                        : isLightTheme
                          ? 'border-transparent hover:bg-amber-50 text-zinc-900'
                          : 'border-transparent hover:bg-white/5 text-amber-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CustomCheckbox
                        checked={isChecked}
                        onChange={() => handleToggleItem(item.id)}
                        isLightTheme={isLightTheme}
                        size="sm"
                      />
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.name}
                          className="w-7 h-7 rounded-full object-cover border border-amber-400/50 shrink-0"
                          onError={e => {
                            (e.target as any).src = '/file/27/iirr1.png';
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-500/20 border border-amber-400/40 text-amber-500 shrink-0">
                          {item.subtitle?.includes('Директор') || item.subtitle?.includes('Руководитель') ? (
                            <UserCheck size={16} />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-bold truncate">{item.name}</div>
                        {item.subtitle && (
                          <div className={`text-xs truncate ${
                            isChecked
                              ? isLightTheme ? 'text-amber-900' : 'text-amber-200'
                              : isLightTheme ? 'text-zinc-600' : 'text-amber-300/70'
                          }`}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                        isLightTheme ? 'bg-amber-200/80 border-amber-300 text-amber-950' : 'bg-amber-400/20 border-amber-400/40 text-[#F4EE8E]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
