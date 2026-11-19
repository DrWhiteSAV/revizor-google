import React, { useState, useEffect } from 'react';
import { User, LogOut, Layers, Sun, Moon, Menu, X } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  currentUser: { name: string; role: UserRole; id: string } | null;
  onLogout: () => void;
  onOpenLoginModal: () => void;
}

export default function Header({
  currentPath,
  onNavigate,
  currentUser,
  onLogout,
  onOpenLoginModal
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => !document.documentElement.classList.contains('theme-light'));

  const isCabinetOrAdmin = currentPath.startsWith('/cabinet') || currentPath.startsWith('/system-admin');

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    const checkTheme = () => {
      if (!isCabinetOrAdmin) {
        if (document.documentElement.classList.contains('theme-light')) {
          document.documentElement.classList.remove('theme-light');
          document.documentElement.classList.add('theme-dark');
        }
        setIsDarkTheme(true);
      } else {
        setIsDarkTheme(!document.documentElement.classList.contains('theme-light'));
      }
    };

    checkTheme();

    const handleThemeChange = () => {
      checkTheme();
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, [currentPath, isCabinetOrAdmin]);

  const toggleTheme = () => {
    if (!isCabinetOrAdmin) return;

    if (isDarkTheme) {
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.classList.add('theme-light');
      setIsDarkTheme(false);
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.classList.add('theme-dark');
      setIsDarkTheme(true);
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 w-full h-[72px] flex items-center transition-all duration-300 rounded-b-[24px] bg-transparent ${
        isDarkTheme ? 'text-white' : 'text-amber-950'
      }`} 
      id="app-header"
    >
      {/* 100% Transparent Header Golden Glowing Border */}
      {isDarkTheme && (
        <div className="header-glow-container rounded-b-[24px] overflow-hidden">
          <div className="header-glow-shadow" />
          <div className="header-glow-border" />
        </div>
      )}
      <div className="mx-auto flex w-full h-[72px] items-center justify-between px-4 sm:px-6 max-w-7xl relative z-10">
        
        {/* Logo and Brand */}
        <div 
          onClick={() => onNavigate('/')} 
          className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          id="header-logo-container"
        >
          <img 
            src="/file/36/rr-logo.png" 
            alt="RR Logo" 
            className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.3)] shrink-0"
          />
          <div className="min-w-0">
            <h1 className={`text-lg sm:text-xl font-black leading-none font-sans tracking-wide truncate ${
              isDarkTheme 
                ? 'bg-gradient-to-r from-white via-slate-100 to-[#D4AF37] bg-clip-text text-transparent brand-title-glow'
                : 'text-amber-950 font-black'
            }`}>
              ИИ Ревизор
            </h1>
          </div>
        </div>

        {/* Center Navigation - Desktop */}
        <nav className={`hidden md:flex items-center gap-1.5 p-1 rounded-[18px] border ${
          isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-amber-100/60 border-amber-800/20'
        }`}>
          <button
            onClick={() => onNavigate('/')}
            className={`px-5 py-2 rounded-[14px] text-sm font-bold tracking-wide transition-all cursor-pointer ${
              currentPath === '/' 
                ? (isDarkTheme ? 'bg-gradient-to-r from-[#F4D06F] to-[#D4AF37] text-amber-950 shadow-md' : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md font-black')
                : (isDarkTheme ? 'text-amber-100/80 hover:text-white hover:bg-white/5' : 'text-amber-950 hover:bg-amber-200/50')
            }`}
            id="nav-home"
          >
            Главная
          </button>
          <button
            onClick={() => onNavigate('/academy')}
            className={`px-5 py-2 rounded-[14px] text-sm font-bold tracking-wide transition-all cursor-pointer ${
              currentPath === '/academy' || currentPath === '/wiki'
                ? (isDarkTheme ? 'bg-gradient-to-r from-[#F4D06F] to-[#D4AF37] text-amber-950 shadow-md' : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md font-black')
                : (isDarkTheme ? 'text-amber-100/80 hover:text-white hover:bg-white/5' : 'text-amber-950 hover:bg-amber-200/50')
            }`}
            id="nav-academy"
          >
            Академия
          </button>
          <button
            onClick={() => onNavigate('/blog')}
            className={`px-5 py-2 rounded-[14px] text-sm font-bold tracking-wide transition-all cursor-pointer ${
              currentPath.startsWith('/blog') 
                ? (isDarkTheme ? 'bg-gradient-to-r from-[#F4D06F] to-[#D4AF37] text-amber-950 shadow-md' : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 shadow-md font-black')
                : (isDarkTheme ? 'text-amber-100/80 hover:text-white hover:bg-white/5' : 'text-amber-950 hover:bg-amber-200/50')
            }`}
            id="nav-blog"
          >
            Блог
          </button>
        </nav>

        {/* Right Section: Auth / Quick Dashboard */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Header Theme Toggle - Only visible in Cabinet or System Admin */}
          {isCabinetOrAdmin && (
            <button
              onClick={toggleTheme}
              className={`min-w-[44px] min-h-[44px] p-2 rounded-[14px] border transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95 ${
                isDarkTheme
                  ? 'border-[#D4AF37]/40 bg-transparent text-[#D4AF37] hover:bg-[#D4AF37]/20'
                  : 'border-amber-800/30 bg-amber-100 text-amber-950 hover:bg-amber-200'
              }`}
              title={isDarkTheme ? 'Переключить на дневную тему' : 'Переключить на ночную тему'}
              id="header-theme-toggle-btn"
            >
              {isDarkTheme ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* Desktop view buttons */}
              <div className="hidden md:flex items-center gap-2.5">
                <button
                  onClick={() => onNavigate('/cabinet/profile')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-[14px] border transition-colors cursor-pointer text-sm font-bold ${
                    isDarkTheme
                      ? 'border-amber-400/30 bg-transparent hover:bg-amber-400/10 text-[#F4EE8E]'
                      : 'border-amber-800/30 bg-amber-100/70 hover:bg-amber-200/70 text-amber-950'
                  }`}
                  id="header-profile-btn"
                >
                  <User size={15} />
                  <span>{currentUser.name}</span>
                </button>

                <button
                  onClick={() => onNavigate('/cabinet')}
                  className={`px-5 py-2 text-sm font-bold rounded-[14px] flex items-center gap-1.5 cursor-pointer ${
                    isDarkTheme
                      ? 'btn-primary-gold text-amber-950'
                      : 'bg-gradient-to-r from-[#D4AF37] to-[#B38C1E] text-amber-950 font-black shadow-md hover:brightness-105'
                  }`}
                  id="header-cabinet-btn"
                >
                  <Layers size={15} />
                  <span>Кабинет</span>
                </button>

                <button
                  onClick={onLogout}
                  className={`p-2.5 rounded-[14px] border transition-colors cursor-pointer ${
                    isDarkTheme
                      ? 'border-amber-400/20 bg-transparent text-amber-200 hover:text-rose-400 hover:bg-rose-500/10'
                      : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                  title="Выйти из аккаунта"
                  id="header-logout-btn"
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Mobile View Button - Logged in */}
              <button
                onClick={() => onNavigate('/cabinet')}
                className="md:hidden min-h-[44px] px-3.5 py-2 text-sm font-bold rounded-[14px] bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300/80 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 font-sans"
                id="mobile-header-cabinet-btn"
              >
                <Layers size={16} />
                <span>Кабинет</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Login Button (both Desktop & Mobile) */}
              <button
                onClick={onOpenLoginModal}
                className="min-h-[44px] px-4 md:px-5 py-2 text-sm font-bold rounded-[14px] bg-gradient-to-r from-[#FFF8B4] via-[#D4AF37] to-[#AA7C11] text-amber-950 border border-amber-300/80 shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 font-sans"
                id="header-login-trigger-btn"
              >
                <User size={16} />
                <span>Войти</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button (< md) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className={`md:hidden min-w-[44px] min-h-[44px] p-2 rounded-[14px] border flex items-center justify-center transition-all cursor-pointer ${
              isDarkTheme
                ? 'border-[#D4AF37]/40 bg-transparent text-[#F4EE8E] hover:bg-amber-400/15'
                : 'border-amber-800/30 bg-transparent text-amber-950 hover:bg-amber-100'
            }`}
            aria-label="Открыть меню навигации"
            id="mobile-public-menu-btn"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          className={`md:hidden fixed top-[74px] left-3 right-3 z-50 rounded-2xl border-2 p-3 backdrop-blur-md space-y-2 transition-all ${
            isDarkTheme
              ? 'bg-[#1A0F02]/95 border-[#E7C768]/50 text-white shadow-[0_0_25px_rgba(244,238,142,0.25)]'
              : 'bg-[#FFFBF5]/95 border-amber-800/35 text-amber-950 shadow-xl'
          }`}
          id="mobile-public-menu-drawer"
        >
          {[
            { path: '/', label: 'Главная' },
            { path: '/academy', label: 'Академия' },
            { path: '/blog', label: 'Блог' },
          ].map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : item.path === '/academy'
                ? currentPath === '/academy' || currentPath === '/wiki'
                : currentPath.startsWith('/blog');
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  onNavigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-left text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 shadow-sm'
                    : isDarkTheme
                    ? 'border border-amber-400/25 text-[#F4EE8E] hover:bg-amber-400/10'
                    : 'border border-amber-800/20 text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
