import React from 'react';
import { Compass, Users, Calendar } from 'lucide-react';

interface CompanyHeaderNavProps {
  activeView: 'map' | 'employees' | 'schedule';
  onNavigate?: (path: string) => void;
  onViewChange?: (view: 'map' | 'employees' | 'schedule') => void;
  isLightTheme?: boolean;
}

export const CompanyHeaderNav: React.FC<CompanyHeaderNavProps> = ({
  activeView,
  onNavigate,
  onViewChange,
  isLightTheme
}) => {
  const isLight = isLightTheme ?? (typeof document !== 'undefined' && (
    document.documentElement.classList.contains('light') || 
    document.documentElement.classList.contains('theme-light') || 
    document.body.classList.contains('light') ||
    !document.documentElement.classList.contains('dark')
  ));

  const handleSelect = (view: 'map' | 'employees' | 'schedule') => {
    if (onViewChange) onViewChange(view);
    if (onNavigate) {
      if (view === 'map') onNavigate('/cabinet/company/map');
      if (view === 'employees') onNavigate('/cabinet/company/employers');
      if (view === 'schedule') onNavigate('/cabinet/company/schedule');
    }
  };

  const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
  const userObj = userStr ? JSON.parse(userStr) : null;
  const role = String(userObj?.role || '').toLowerCase();
  const isEmployee = role === 'employee' || role === 'сотрудник';

  return (
    <div className="flex justify-center w-full z-30 pt-1 pb-3 pointer-events-auto select-none">
      <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-md transition-colors ${
        isLight
          ? 'bg-white/95 border-amber-400/80 shadow-amber-900/10 text-amber-950'
          : 'bg-[#120E08]/95 border-amber-500/40 text-amber-100'
      }`}>
        {!isEmployee && (
          <button
            type="button"
            onClick={() => handleSelect('map')}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'map'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md scale-105'
                : isLight
                  ? 'text-amber-950 hover:text-black hover:bg-amber-100'
                  : 'text-amber-200/80 hover:text-amber-100 hover:bg-amber-500/10'
            }`}
          >
            <Compass size={16} />
            <span>Карта</span>
          </button>
        )}

        {!isEmployee && (
          <button
            type="button"
            onClick={() => handleSelect('employees')}
            className={`px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'employees'
                ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md scale-105'
                : isLight
                  ? 'text-amber-950 hover:text-black hover:bg-amber-100'
                  : 'text-amber-200/80 hover:text-amber-100 hover:bg-amber-500/10'
            }`}
          >
            <Users size={16} />
            <span>Сотрудники</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleSelect('schedule')}
          className={`px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeView === 'schedule'
              ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-md scale-105'
              : isLight
                ? 'text-amber-950 hover:text-black hover:bg-amber-100'
                : 'text-amber-200/80 hover:text-amber-100 hover:bg-amber-500/10'
          }`}
        >
          <Calendar size={16} />
          <span>График</span>
        </button>
      </div>
    </div>
  );
};
