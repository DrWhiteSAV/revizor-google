import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  Plus, Trash2, Edit2, Users, Check, X, Building, Info, MessageSquare, 
  HelpCircle, Activity, Link, Share2, Landmark, RefreshCw, GripVertical, 
  Play, Pause, Sparkles, Radio, Globe, Search, User, Shield, Zap, Award, 
  Send, ChevronRight, ChevronDown, ChevronUp, Mail, Phone, Compass, Eye, Settings, Bot, Calendar,
  SlidersHorizontal, Bell, CheckCircle2, AlertCircle, ArrowUpRight, TrendingUp,
  ZoomIn, ZoomOut, RotateCcw, BarChart2, Filter, Layers, Maximize2, Minimize2, Move,
  Terminal, Cpu, Crosshair, Grid, Unlink, Lock, Unlock, PlayCircle, Star
} from 'lucide-react';
import { Department, UserProfile, UserRole, CompanyInfo } from '../../types';
import CabinetEmployees from './CabinetEmployees';
import CabinetScheduleGantt from './CabinetScheduleGantt';
import { ShipOrgBuilder } from '../../components/ship/ShipOrgBuilder';
import { CompanyHeaderNav } from '../../components/ship/CompanyHeaderNav';

interface CabinetDepartmentsProps {
  departments: Department[];
  setDepartments: (val: Department[]) => void;
  saveStateToServer: (updated: any) => void;
  company: CompanyInfo;
  setCompany?: (val: CompanyInfo) => void;
  improveFieldWithAI?: (fieldKey: 'name' | 'productDescription' | 'workSystemDescription', text: string) => void;
  templates: any;
  reports: any;
  transactions: any;
  notifications: any;
  tariff: any;
  crmCompanies: any;
  mockEmployees: UserProfile[];
  setMockEmployees?: (val: UserProfile[]) => void;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

// Default fallback hierarchy if departments list is empty
const defaultDepartmentHierarchy: Department[] = [
  { id: 'dep-dir', name: 'Дирекция', managerId: 'm-1', employeeIds: ['emp-101', 'emp-102', 'emp-103', 'emp-104', 'emp-105'], telegramChatId: '-10012345601', parentId: null },
  { id: 'dep-mkt', name: 'Маркетинг', managerId: 'm-2', employeeIds: ['emp-201', 'emp-202', 'emp-203', 'emp-204', 'emp-205', 'emp-206', 'emp-207', 'emp-208'], telegramChatId: '-10012345602', parentId: null },
  { id: 'dep-dev', name: 'Разработка', managerId: 'm-3', employeeIds: ['emp-301', 'emp-302', 'emp-303', 'emp-304', 'emp-305', 'emp-306', 'emp-307', 'emp-308', 'emp-309', 'emp-310', 'emp-311', 'emp-312'], telegramChatId: '-10012345603', parentId: null },
  { id: 'dep-sup', name: 'Поддержка', managerId: 'm-4', employeeIds: ['emp-401', 'emp-402', 'emp-403', 'emp-404', 'emp-405', 'emp-406'], telegramChatId: '-10012345604', parentId: null },
  { id: 'dep-dev-back', name: 'Backend', managerId: 'm-31', employeeIds: ['emp-301', 'emp-302', 'emp-303', 'emp-304', 'emp-305'], telegramChatId: '-10012345631', parentId: 'dep-dev' },
  { id: 'dep-dev-front', name: 'Frontend', managerId: 'm-32', employeeIds: ['emp-306', 'emp-307', 'emp-308', 'emp-309'], telegramChatId: '-10012345632', parentId: 'dep-dev' },
  { id: 'dep-dev-qa', name: 'QA / Тестирование', managerId: 'm-33', employeeIds: ['emp-310', 'emp-311', 'emp-312'], telegramChatId: '-10012345633', parentId: 'dep-dev' },
];

// ================= 1. ANIMATED MINI ASTRONAUT CREW MEMBER =================
interface AstronautProps {
  id: string;
  name: string;
  role: string;
  suitColor: 'gold' | 'blue' | 'orange' | 'purple' | 'green' | 'cyan' | 'red';
  onClick?: () => void;
  index: number;
  totalInRoom: number;
}

const AstronautSprite: React.FC<AstronautProps> = ({ id, name, role, suitColor, onClick, index }) => {
  const [posX, setPosX] = useState(() => (index % 3) * 24 - 20);
  const [facingRight, setFacingRight] = useState(index % 2 === 0);
  const [isTyping, setIsTyping] = useState(index % 2 === 1);
  const [isWaving, setIsWaving] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);

  // Astronaut suit color palettes (White high-tech spacesuit base with color trims)
  const colorMap = {
    gold: { body: '#F8FAFC', accent: '#E7C768', dark: '#92400E', visor: '#38BDF8', glow: '#F4EE8E' },
    blue: { body: '#F1F5F9', accent: '#38BDF8', dark: '#0369A1', visor: '#F4EE8E', glow: '#7DD3FC' },
    orange: { body: '#F8FAFC', accent: '#FB923C', dark: '#C2410C', visor: '#38BDF8', glow: '#FDBA74' },
    purple: { body: '#FAF5FF', accent: '#C084FC', dark: '#7E22CE', visor: '#34D399', glow: '#E9D5FF' },
    green: { body: '#F0FDF4', accent: '#34D399', dark: '#15803D', visor: '#F4EE8E', glow: '#A7F3D0' },
    cyan: { body: '#ECFEFF', accent: '#22D3EE', dark: '#0E7490', visor: '#F4EE8E', glow: '#A5F3FC' },
    red: { body: '#FEF2F2', accent: '#F87171', dark: '#B91C1C', visor: '#38BDF8', glow: '#FCA5A5' }
  };

  const palette = colorMap[suitColor] || colorMap.gold;

  // Living Astronaut AI Animation Loop
  useEffect(() => {
    const speechOptions = ['Шлюз ОК', 'KPI +15%', 'Код собран', 'Сервер 100%', 'Герметично', 'Отчет готов'];

    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.35) {
        const nextX = Math.floor(Math.random() * 50) - 25;
        setFacingRight(nextX > posX);
        setPosX(nextX);
        setIsTyping(false);
      } else if (rand < 0.65) {
        setIsTyping(true);
      } else if (rand < 0.8) {
        setIsWaving(true);
        setTimeout(() => setIsWaving(false), 2000);
      } else {
        const msg = speechOptions[Math.floor(Math.random() * speechOptions.length)];
        setSpeechBubble(msg);
        setTimeout(() => setSpeechBubble(null), 2800);
      }
    }, 3800 + index * 500);

    return () => clearInterval(interval);
  }, [index, posX]);

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      style={{ transform: `translateX(${posX}px)` }}
      className="relative flex flex-col items-center group cursor-pointer transition-all duration-1000 ease-in-out z-20 shrink-0 select-none"
      title={`${name} (${role})`}
    >
      {/* Speech Bubble */}
      {speechBubble && (
        <div className="absolute -top-7 bg-zinc-950/95 text-[#F4EE8E] border border-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg animate-bounce whitespace-nowrap z-30 font-mono">
          {speechBubble}
        </div>
      )}

      {/* SVG Detailed High-Tech Astronaut Character */}
      <div className={`relative transition-transform duration-300 ${facingRight ? 'scale-x-100' : 'scale-x-[-1]'}`}>
        <svg viewBox="0 0 36 46" className="w-8 h-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
          <defs>
            <linearGradient id={`suit-body-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor={palette.body} />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            <linearGradient id={`visor-glass-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor={palette.visor} />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id={`accent-strip-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={palette.accent} />
              <stop offset="100%" stopColor={palette.dark} />
            </linearGradient>
          </defs>

          {/* OXYGEN TANK BACKPACK */}
          <rect x="2" y="12" width="6" height="22" rx="3" fill="#334155" stroke="#0F172A" strokeWidth="1" />
          <rect x="3" y="14" width="4" height="4" rx="1" fill={palette.accent} />

          {/* SPACESUIT MAIN TORSO */}
          <rect x="7" y="10" width="22" height="26" rx="10" fill={`url(#suit-body-${id})`} stroke="#0F172A" strokeWidth="1.5" />

          {/* CHEST LIFE SUPPORT CONTROL PANEL */}
          <rect x="12" y="21" width="12" height="9" rx="2" fill="#1E293B" stroke={palette.accent} strokeWidth="1" />
          <circle cx="15" cy="24" r="1.2" fill={isTyping ? "#34D399" : "#F4EE8E"} className="animate-ping" />
          <circle cx="18" cy="24" r="1.2" fill="#38BDF8" />
          <circle cx="21" cy="24" r="1.2" fill={palette.accent} />
          <rect x="14" y="27" width="8" height="1.5" rx="0.75" fill="#64748B" />

          {/* SPACESUIT LEGS & BOOTS */}
          <rect x="10" y="33" width="7" height="11" rx="3.5" fill={`url(#suit-body-${id})`} stroke="#0F172A" strokeWidth="1.2" />
          <rect x="19" y="33" width="7" height="11" rx="3.5" fill={`url(#suit-body-${id})`} stroke="#0F172A" strokeWidth="1.2" />
          {/* Heavy Boots */}
          <path d="M 8 41 C 8 39, 17 39, 17 41 L 17 44 L 8 44 Z" fill="#334155" stroke="#0F172A" strokeWidth="1" />
          <path d="M 19 41 C 19 39, 28 39, 28 41 L 28 44 L 19 44 Z" fill="#334155" stroke="#0F172A" strokeWidth="1" />

          {/* HELMET & GLOWING VISOR */}
          <circle cx="18" cy="12" r="10" fill={`url(#suit-body-${id})`} stroke="#0F172A" strokeWidth="1.5" />
          {/* Helmet Gold/Cyan Accent Stripe */}
          <path d="M 12 4 Q 18 2 24 4" fill="none" stroke={`url(#accent-strip-${id})`} strokeWidth="2.5" strokeLinecap="round" />
          {/* Panoramic Visor */}
          <ellipse cx="20" cy="13" rx="7" ry="5.5" fill={`url(#visor-glass-${id})`} stroke="#0F172A" strokeWidth="1" />
          <ellipse cx="18.5" cy="11.5" rx="2.5" ry="1.5" fill="#FFFFFF" opacity="0.85" />

          {/* ARMS & WAVING HAND */}
          {isWaving ? (
            <path d="M 23 20 C 28 15, 32 10, 30 6" stroke={`url(#suit-body-${id})`} strokeWidth="4" strokeLinecap="round" fill="none" className="animate-bounce" />
          ) : (
            <path d="M 8 18 C 5 22, 5 28, 9 30" stroke={`url(#suit-body-${id})`} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          )}
        </svg>
      </div>

      {/* Name Label */}
      <span className="text-[8px] font-black text-amber-950 dark:text-amber-200 bg-white/90 dark:bg-black/90 px-1.5 py-0.2 rounded border border-amber-400/60 max-w-[60px] truncate font-mono shadow-xs -mt-1 z-10">
        {name.split(' ')[0]}
      </span>
    </div>
  );
};

// ================= 2. ROOM INTERIOR BACKGROUND SCENE =================
const CompartmentInterior: React.FC<{ name: string; isDark: boolean }> = ({ name, isDark }) => {
  const lower = name.toLowerCase();

  let isDev = lower.includes('разработ') || lower.includes('backend') || lower.includes('front') || lower.includes('it');
  let isMkt = lower.includes('маркетинг') || lower.includes('pr') || lower.includes('реклам');
  let isSales = lower.includes('продаж') || lower.includes('коммерц');
  let isExec = lower.includes('дирекц') || lower.includes('руковод') || lower.includes('главн');
  let isSup = lower.includes('поддерж') || lower.includes('сервис') || lower.includes('help');
  let isQA = lower.includes('qa') || lower.includes('тест');

  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-0 opacity-90">
      {/* Flooring Metallic Grid */}
      <div className={`absolute inset-0 bg-gradient-to-b ${
        isDark 
          ? 'from-zinc-950/90 via-zinc-900/60 to-amber-950/30' 
          : 'from-slate-100/90 via-zinc-50/70 to-amber-100/40'
      }`}>
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#e7c768_1px,transparent_1px),linear-gradient(to_bottom,#e7c768_1px,transparent_1px)] bg-[size:16px_16px]" />
      </div>

      {/* Ceiling & Wall Illumination Beams */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#F4EE8E] to-transparent opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500/30 via-amber-400 to-amber-500/30" />

      {/* Custom Decorative Equipment per Department */}
      <div className="absolute inset-0 flex items-center justify-between px-3 pt-4">
        {/* Left Side Equipment */}
        {isDev ? (
          <div className="flex flex-col gap-1 opacity-75">
            {/* Server Rack with blinking LEDs */}
            <div className="w-4 h-12 rounded bg-zinc-800 border border-cyan-400/50 p-0.5 flex flex-col justify-between shadow-xs">
              <div className="w-full h-1 bg-emerald-400 animate-ping" />
              <div className="w-full h-1 bg-cyan-400 animate-pulse" />
              <div className="w-full h-1 bg-amber-400" />
              <div className="w-full h-1 bg-emerald-400 animate-pulse" />
            </div>
          </div>
        ) : isMkt ? (
          <div className="opacity-75">
            {/* Social Media Wall Screen */}
            <div className="w-6 h-8 rounded bg-amber-950/80 border border-amber-400 p-1 flex flex-col justify-around">
              <div className="w-full h-1 bg-amber-300 rounded-full" />
              <div className="w-3/4 h-1 bg-orange-400 rounded-full" />
              <div className="w-1/2 h-1 bg-[#F4EE8E] rounded-full" />
            </div>
          </div>
        ) : isExec ? (
          <div className="opacity-80">
            {/* Captain Trophy / Flag */}
            <div className="w-5 h-10 border-l-2 border-amber-400 flex flex-col items-center">
              <Star size={12} className="text-amber-400 fill-amber-300 animate-pulse" />
              <div className="w-3 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-xs mt-1 opacity-80" />
            </div>
          </div>
        ) : (
          <div className="w-4 h-8 border border-amber-500/30 rounded bg-amber-500/10 flex items-center justify-center">
            <Cpu size={10} className="text-amber-400 animate-pulse" />
          </div>
        )}

        {/* Center Screen / Hologram Background */}
        <div className="flex flex-col items-center justify-center opacity-30">
          <div className="w-16 h-10 rounded-lg border border-amber-400/40 bg-amber-500/10 flex items-center justify-center overflow-hidden">
            <Activity size={18} className="text-amber-300 animate-pulse" />
          </div>
        </div>

        {/* Right Side Equipment */}
        {isQA ? (
          <div className="w-5 h-10 rounded bg-emerald-950/80 border border-emerald-400 p-0.5 flex flex-col justify-between items-center opacity-80">
            <Check size={10} className="text-emerald-400 font-bold" />
            <div className="w-3 h-1 bg-emerald-400 animate-ping" />
            <div className="w-3 h-1 bg-emerald-400" />
          </div>
        ) : isSup ? (
          <div className="w-5 h-9 rounded bg-purple-950/80 border border-purple-400/80 p-1 flex flex-col justify-center items-center opacity-80">
            <Radio size={12} className="text-purple-300 animate-spin" />
          </div>
        ) : (
          <div className="w-4 h-9 rounded bg-amber-950/60 border border-amber-400/40 p-0.5 flex flex-col justify-around items-center opacity-70">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <div className="w-2.5 h-1 bg-amber-300 rounded" />
          </div>
        )}
      </div>
    </div>
  );
};

// ================= 3. DOCKING PORT AIRLOCK (ШЛЮЗ) =================
interface DockingPortProps {
  position: 'top' | 'bottom' | 'left' | 'right';
  isConnected?: boolean;
  isEditMode: boolean;
  onClick: (e: React.MouseEvent) => void;
  label?: string;
}

const DockingPort: React.FC<DockingPortProps> = ({ position, isConnected, isEditMode, onClick, label }) => {
  const positionClasses = {
    top: '-top-3 left-1/2 -translate-x-1/2',
    bottom: '-bottom-3 left-1/2 -translate-x-1/2',
    left: '-left-3 top-1/2 -translate-y-1/2',
    right: '-right-3 top-1/2 -translate-y-1/2'
  };

  return (
    <div 
      onClick={onClick}
      className={`absolute ${positionClasses[position]} z-30 group cursor-pointer select-none transition-transform duration-200 hover:scale-125 active:scale-95`}
      title={label || `Шлюз ${position}`}
    >
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
        isConnected 
          ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-emerald-500/50' 
          : isEditMode 
          ? 'bg-amber-950/95 border-amber-300 text-[#F4EE8E] animate-pulse shadow-amber-400/80 ring-2 ring-amber-400/40' 
          : 'bg-zinc-900/90 border-amber-500/60 text-amber-400 shadow-amber-500/20'
      }`}>
        {isEditMode ? (
          <Plus size={12} className="stroke-[3] text-amber-300" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
        )}
      </div>

      {/* Hover Ring Pulse */}
      <div className="absolute inset-0 rounded-full border border-amber-300 opacity-0 group-hover:opacity-100 animate-ping pointer-events-none" />
    </div>
  );
};

// ================= 4. MAIN COMMAND BRIDGE ("ГЛАВНАЯ РУБКА") =================
interface CommandBridgeProps {
  companyName: string;
  totalEmployees: number;
  totalDepartments: number;
  overallKPI: string;
  isDark: boolean;
  isEditMode: boolean;
  onOpenDockingMenu: (e: React.MouseEvent, parentId: string, pos: 'bottom' | 'left' | 'right') => void;
  mockEmployees: UserProfile[];
  onSelectAstronaut: (emp: UserProfile) => void;
}

const CommandBridgeHull: React.FC<CommandBridgeProps> = ({
  companyName,
  totalEmployees,
  totalDepartments,
  overallKPI,
  isDark,
  isEditMode,
  onOpenDockingMenu,
  mockEmployees,
  onSelectAstronaut
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none z-20 group">
      
      {/* Flagship Outer Curved Hull Structure */}
      <div className={`relative min-w-[340px] sm:min-w-[560px] px-8 py-5 rounded-[2.5rem] border-2 transition-all duration-300 shadow-2xl backdrop-blur-md ${
        isDark
          ? 'bg-gradient-to-b from-zinc-950/95 via-amber-950/40 to-zinc-950/95 border-amber-400 shadow-[0_0_60px_rgba(231,199,104,0.4)]'
          : 'bg-gradient-to-b from-white/95 via-amber-50/90 to-zinc-100/95 border-amber-400/90 shadow-[0_15px_40px_rgba(231,199,104,0.35)]'
      }`}>
        
        {/* Exterior Heavy Ion Thrusters with Particle Glow */}
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-16 bg-gradient-to-r from-amber-500 to-amber-300 rounded-l-lg shadow-[0_0_20px_#E7C768] animate-pulse flex items-center justify-center">
          <div className="w-1 h-8 bg-cyan-300 rounded-full animate-ping opacity-75" />
        </div>
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-16 bg-gradient-to-l from-amber-500 to-amber-300 rounded-r-lg shadow-[0_0_20px_#E7C768] animate-pulse flex items-center justify-center">
          <div className="w-1 h-8 bg-cyan-300 rounded-full animate-ping opacity-75" />
        </div>

        {/* Top Metallic Crown Badge */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-[10px] sm:text-[11px] tracking-widest uppercase border border-amber-200 shadow-lg flex items-center gap-1.5 whitespace-nowrap z-30">
          <Shield size={13} className="text-amber-950 shrink-0 fill-amber-950/40" />
          <span>ФЛАГМАНСКИЙ КОРАБЛЬ • ГЛАВНАЯ РУБКА</span>
        </div>

        {/* Inner Command Bridge Viewport Chamber */}
        <div className="relative mt-2 p-3 sm:p-4 rounded-2xl border border-amber-400/50 bg-zinc-950/80 overflow-hidden flex flex-col items-center text-center">
          
          {/* Panoramic Viewport Glass Reflection Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-amber-400/15 to-transparent pointer-events-none" />

          {/* Company Display Title */}
          <h2 className="text-xl sm:text-2xl font-black text-[#F4EE8E] dark:text-[#F4EE8E] uppercase tracking-widest drop-shadow-md flex items-center justify-center gap-2">
            <Building size={22} className="text-amber-400 shrink-0" />
            <span>{companyName || 'ООО «РЕНТРОП СИСТЕМЫ»'}</span>
          </h2>

          {/* Captain & Flagship KPI Status Badges */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-bold font-mono">
            <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-center gap-1.5 shadow-xs">
              <Users size={13} className="text-amber-400" />
              <span>{totalEmployees || 89} сотрудников</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-center gap-1.5 shadow-xs">
              <Layers size={13} className="text-amber-400" />
              <span>{totalDepartments || 7} отделов</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 shadow-xs">
              <Zap size={13} className="text-emerald-400" />
              <span>KPI {overallKPI || '94.8%'}</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 flex items-center gap-1 text-[10px] uppercase font-black">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Герметично</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-[#F4EE8E] border border-amber-400/60 flex items-center gap-1">
              <Radio size={12} className="text-amber-400 animate-pulse" />
              <span>ШТАДТНЫЙ РЕЖИМ</span>
            </div>
          </div>

          {/* Captain & Senior Officers Living Astronaut Crew inside Main Bridge */}
          <div className="mt-4 flex items-center justify-center gap-5 w-full pt-2 border-t border-amber-500/25 relative z-20">
            {(mockEmployees.filter(e => e.role === 'SUPER_ADMIN' || e.role === 'DIRECTOR' || e.role === 'MANAGER').slice(0, 4)).map((emp, idx) => (
              <AstronautSprite
                key={`captain-ast-${emp.id || idx}`}
                id={emp.id || `capt-${idx}`}
                name={emp.name || 'Капитан'}
                role={emp.position || 'Директор'}
                suitColor="gold"
                index={idx}
                totalInRoom={Math.min(mockEmployees.length, 4)}
                onClick={() => onSelectAstronaut(emp)}
              />
            ))}
          </div>
        </div>

        {/* Interlocking Airlock Docking Ports on Bridge */}
        <DockingPort 
          position="bottom" 
          isConnected={true} 
          isEditMode={isEditMode} 
          onClick={(e) => onOpenDockingMenu(e, 'bridge', 'bottom')} 
          label="Нижний главный шлюз"
        />
        <DockingPort 
          position="left" 
          isConnected={false} 
          isEditMode={isEditMode} 
          onClick={(e) => onOpenDockingMenu(e, 'bridge', 'left')} 
          label="Левый боковой шлюз"
        />
        <DockingPort 
          position="right" 
          isConnected={false} 
          isEditMode={isEditMode} 
          onClick={(e) => onOpenDockingMenu(e, 'bridge', 'right')} 
          label="Правый боковой шлюз"
        />

      </div>
    </div>
  );
};

// ================= 5. MODULAR SPACESHIP DEPARTMENT ROOM =================
interface ModularRoomProps {
  department: Department;
  employees: UserProfile[];
  isDark: boolean;
  isEditMode: boolean;
  isDragMode?: boolean;
  onSelectDepartment: (dep: Department) => void;
  onSelectAstronaut: (emp: UserProfile) => void;
  onOpenDockingMenu: (e: React.MouseEvent, parentId: string, pos: 'bottom' | 'left' | 'right' | 'top') => void;
  isSubDept?: boolean;
  onMouseDownDept?: (e: React.MouseEvent, dep: Department) => void;
  isBeingDragged?: boolean;
}

const ModularSpaceshipRoom: React.FC<ModularRoomProps> = ({
  department,
  employees,
  isDark,
  isEditMode,
  isDragMode,
  onSelectDepartment,
  onSelectAstronaut,
  onOpenDockingMenu,
  isSubDept,
  onMouseDownDept,
  isBeingDragged
}) => {
  const suitColors: ('gold' | 'blue' | 'orange' | 'purple' | 'green' | 'cyan' | 'red')[] = [
    'blue', 'gold', 'orange', 'purple', 'green', 'cyan', 'red'
  ];

  return (
    <div 
      onMouseDown={(e) => {
        if (isDragMode && onMouseDownDept) {
          onMouseDownDept(e, department);
        }
      }}
      onClick={(e) => {
        if (!isDragMode) {
          onSelectDepartment(department);
        }
      }}
      style={{
        transform: department.x || department.y ? `translate(${department.x || 0}px, ${department.y || 0}px)` : undefined
      }}
      className={`relative flex flex-col items-center justify-between select-none group transition-all duration-200 z-20 ${
        isDragMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400/80 rounded-2xl' : 'cursor-pointer hover:scale-[1.02]'
      } ${isBeingDragged ? 'scale-105 ring-4 ring-amber-400 shadow-[0_0_35px_#E7C768] z-30' : ''} ${
        isSubDept ? 'w-[210px] sm:w-[240px]' : 'w-[250px] sm:w-[285px]'
      }`}
    >
      {/* Compartment Outer Metallic Hull */}
      <div className={`relative w-full p-3 rounded-2xl border-2 transition-all shadow-xl backdrop-blur-md overflow-hidden ${
        isDark
          ? 'bg-zinc-950/95 border-amber-400/70 hover:border-amber-400 shadow-[0_0_30px_rgba(231,199,104,0.25)]'
          : 'bg-white/95 border-amber-500/60 hover:border-amber-400 shadow-lg'
      }`}>
        
        {/* Corner Metallic Bolts & Wall Texture */}
        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-xs" />
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-xs" />
        <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-xs" />
        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400/80 shadow-xs" />

        {/* Room Header Label */}
        <div className="relative z-10 flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1 rounded-lg bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black shadow-xs shrink-0">
              <Building size={12} />
            </span>
            <div className="truncate">
              <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider truncate">
                {department.name}
              </h4>
              <span className="text-[10px] text-zinc-500 dark:text-slate-400 font-bold block">
                {department.employeeIds?.length || 0} сотрудников
              </span>
            </div>
          </div>

          {/* Edit / Drag Handle Indicator */}
          {isDragMode ? (
            <div className="p-1 rounded bg-amber-400 text-amber-950 font-black text-[10px] flex items-center gap-1 shadow-xs animate-pulse">
              <Move size={12} />
              <span>Тянуть</span>
            </div>
          ) : (
            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              KPI 96%
            </span>
          )}
        </div>

        {/* Room Interior View with Custom Floor & Living Astronaut Crew */}
        <div className="relative min-h-[75px] sm:min-h-[85px] rounded-xl border border-amber-400/30 overflow-hidden p-2 flex items-end justify-center gap-2">
          
          {/* Room Scene Decoration */}
          <CompartmentInterior name={department.name} isDark={isDark} />

          {/* Living Mini Astronaut Crew Members */}
          {employees.slice(0, 4).map((emp, aIdx) => (
            <AstronautSprite
              key={`room-ast-${department.id}-${emp.id || aIdx}`}
              id={emp.id || `${department.id}-${aIdx}`}
              name={emp.name}
              role={emp.position || 'Специалист'}
              suitColor={suitColors[aIdx % suitColors.length]}
              index={aIdx}
              totalInRoom={employees.length}
              onClick={() => onSelectAstronaut(emp)}
            />
          ))}

          {employees.length === 0 && (
            <span className="text-[10px] text-zinc-500 dark:text-slate-400 font-bold font-mono relative z-10 my-auto">
              Ожидает назначения...
            </span>
          )}
        </div>

        {/* Tightly Interlocking Airlock Docking Ports (Шлюзы) */}
        <DockingPort 
          position="bottom" 
          isConnected={true} 
          isEditMode={isEditMode || isDragMode} 
          onClick={(e) => onOpenDockingMenu(e, department.id, 'bottom')} 
          label="Нижний шлюз"
        />
        <DockingPort 
          position="left" 
          isConnected={false} 
          isEditMode={isEditMode || isDragMode} 
          onClick={(e) => onOpenDockingMenu(e, department.id, 'left')} 
          label="Левый шлюз"
        />
        <DockingPort 
          position="right" 
          isConnected={false} 
          isEditMode={isEditMode || isDragMode} 
          onClick={(e) => onOpenDockingMenu(e, department.id, 'right')} 
          label="Правый шлюз"
        />
        <DockingPort 
          position="top" 
          isConnected={true} 
          isEditMode={isEditMode || isDragMode} 
          onClick={(e) => onOpenDockingMenu(e, department.id, 'top')} 
          label="Верхний стыковочный шлюз"
        />

      </div>
    </div>
  );
};

// ================= MAIN CABINET DEPARTMENTS COMPONENT =================
export default function CabinetDepartments({
  departments = [],
  setDepartments,
  saveStateToServer,
  company,
  setCompany,
  improveFieldWithAI,
  templates,
  reports,
  transactions,
  notifications,
  tariff,
  crmCompanies,
  mockEmployees = [],
  setMockEmployees,
  currentPath,
  onNavigate
}: CabinetDepartmentsProps) {
  
  // Navigation View Switcher ('map' | 'employees' | 'schedule')
  const [activeView, setActiveView] = useState<'map' | 'employees' | 'schedule'>('map');

  useEffect(() => {
    const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (path.includes('/employers') || path.includes('/employees')) {
      setActiveView('employees');
    } else if (path.includes('/schedule')) {
      setActiveView('schedule');
    } else {
      setActiveView('map');
    }
  }, [currentPath]);

  // Ensure default departments if empty
  const activeDepartments = departments.length > 0 ? departments : defaultDepartmentHierarchy;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('all');

  // Interactive Modes: 'view' (Режим просмотра) vs 'drag' (Режим перетаскивания)
  const [canvasMode, setCanvasMode] = useState<'view' | 'drag'>('view');
  const [isEditMode, setIsEditMode] = useState(false);

  // Department Dragging State
  const [draggedDept, setDraggedDept] = useState<{ id: string; startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Theme Detection
  const [isLightTheme, setIsLightTheme] = useState(() => {
    return document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const handleThemeChange = () => {
      setIsLightTheme(document.documentElement.classList.contains('theme-light') || !document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('cabinet-theme-change', handleThemeChange);
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('cabinet-theme-change', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  // Zoom & Camera Controls
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);

  // Mobile Centering Container Ref
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollLeft = (mobileScrollRef.current.scrollWidth - mobileScrollRef.current.clientWidth) / 2;
    }
  }, [activeView]);

  const handleZoomIn = () => setZoom(prev => Math.min(1.8, +(prev + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom(prev => Math.max(0.4, +(prev - 0.15).toFixed(2)));
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Canvas Mouse Pan & Department Drag Handlers
  const handleMouseDownDept = (e: React.MouseEvent, dep: Department) => {
    e.stopPropagation();
    if (canvasMode !== 'drag') return;
    setDraggedDept({
      id: dep.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: dep.x || 0,
      initY: dep.y || 0
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (draggedDept) return;
    if ((e.target as HTMLElement).closest('.group') || (e.target as HTMLElement).closest('button')) return;
    if (canvasMode === 'drag') return;
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggedDept) {
      const dx = (e.clientX - draggedDept.startX) / zoom;
      const dy = (e.clientY - draggedDept.startY) / zoom;
      const updated = activeDepartments.map(d => {
        if (d.id === draggedDept.id) {
          return {
            ...d,
            x: Math.round(draggedDept.initX + dx),
            y: Math.round(draggedDept.initY + dy)
          };
        }
        return d;
      });
      setDepartments(updated);
      return;
    }

    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggedDept) {
      setDraggedDept(null);
      saveStateToServer({ company, departments: activeDepartments, templates, reports, transactions, notifications, tariff, crmCompanies, mockEmployees });
    }
    setIsDraggingCanvas(false);
  };

  // Selected Department Modal
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingChat, setEditingChat] = useState('');
  const [editingParent, setEditingParent] = useState<string>('none');
  const [quickEmployeeId, setQuickEmployeeId] = useState('');

  // Selected Astronaut Modal
  const [selectedAstronaut, setSelectedAstronaut] = useState<UserProfile | null>(null);

  // Docking Action Menu State
  const [dockingMenu, setDockingMenu] = useState<{ isOpen: boolean; parentId: string | null; x: number; y: number } | null>(null);

  // Cinematic Docking Animation Overlay State
  const [dockingAnim, setDockingAnim] = useState<{ isAnimating: boolean; name: string } | null>(null);

  // Mobile Drilldown Sub-department View
  const [mobileActiveDept, setMobileActiveDept] = useState<Department | null>(null);

  // Group departments into Root (under bridge) and Sub-departments
  const rootDepartments = activeDepartments.filter(d => !d.parentId);
  const getSubDepartments = (parentId: string) => activeDepartments.filter(d => d.parentId === parentId);

  // Trigger Cinematic Module Docking Animation & Add Department
  const handleTriggerDocking = (name: string, parentId: string | null) => {
    setDockingMenu(null);
    setDockingAnim({ isAnimating: true, name });

    setTimeout(() => {
      const newDep: Department = {
        id: 'dep-' + Date.now().toString().slice(-6),
        name,
        managerId: 'm-1',
        employeeIds: [],
        telegramChatId: '-10012345678',
        parentId,
        x: 0,
        y: 0
      };

      const updated = [...activeDepartments, newDep];
      setDepartments(updated);
      saveStateToServer({ company, departments: updated, templates, reports, transactions, notifications, tariff, crmCompanies, mockEmployees });
      setDockingAnim(null);
    }, 2200);
  };

  // Open Docking Action Menu
  const handleOpenDockingMenu = (e: React.MouseEvent, parentId: string, pos: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDockingMenu({
      isOpen: true,
      parentId,
      x: rect.left,
      y: rect.bottom + 5
    });
  };

  return (
    <div className={`space-y-6 font-sans transition-colors animate-fade-in ${isLightTheme ? 'text-zinc-900' : 'text-zinc-100'}`} id="company-spaceship-constructor">
      
      {/* ================= 1. FLOATING NAVIGATION BAR FOR OTHER VIEWS ================= */}
      {activeView !== 'map' && (
        <CompanyHeaderNav
          activeView={activeView}
          onNavigate={onNavigate}
          onViewChange={(v) => setActiveView(v)}
          isLightTheme={isLightTheme}
        />
      )}

      {/* ================= 2. MAIN SPACESHIP CANVAS CONSTRUCTOR (FULL BLOCK) ================= */}
      {activeView === 'map' && (
        <div className="w-full h-full -mt-2">
          <ShipOrgBuilder
            isLightTheme={isLightTheme}
            activeView={activeView}
            onViewChange={(view) => {
              setActiveView(view);
              if (onNavigate) {
                if (view === 'map') onNavigate('/cabinet/company/map');
                if (view === 'employees') onNavigate('/cabinet/company/employers');
                if (view === 'schedule') onNavigate('/cabinet/company/schedule');
              }
            }}
          />
        </div>
      )}
      {false && (
        <div className="hidden md:block relative w-full rounded-3xl border shadow-2xl overflow-hidden min-h-[680px] bg-zinc-950 select-none">
          
          {/* Deep Space Background Canvas without Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/25 via-zinc-950 to-black" />
          </div>

          {/* Interactive Draggable & Scalable Canvas Container */}
          <div 
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            style={{ 
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
              transformOrigin: 'center top', 
              transition: isDraggingCanvas || draggedDept ? 'none' : 'transform 0.2s ease-out' 
            }}
            className={`relative w-full min-h-[680px] pt-12 pb-24 flex flex-col items-center justify-start ${
              canvasMode === 'drag' ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            
            {/* SVG Connecting Energy Tunnels */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <linearGradient id="tunnel-laser" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#E7C768" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#D99E41" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Vertical Conduit Lines from Bridge to Root Departments */}
              {rootDepartments.map((dep, idx) => {
                const totalRoots = rootDepartments.length;
                const startX = 500;
                const startY = 160;
                const endX = 200 + idx * (600 / Math.max(totalRoots - 1, 1));
                const endY = 270;

                return (
                  <g key={`tunnel-root-${dep.id}`}>
                    <path
                      d={`M ${startX} ${startY} C ${startX} ${startY + 60}, ${endX} ${endY - 60}, ${endX} ${endY}`}
                      fill="none"
                      stroke="url(#tunnel-laser)"
                      strokeWidth="3"
                      strokeDasharray="6 6"
                      className="animate-pulse"
                    />
                    <circle cx={endX} cy={endY - 20} r="4" fill="#F4EE8E" className="animate-ping" />
                  </g>
                );
              })}
            </svg>

            {/* MAIN COMMAND BRIDGE AT TOP */}
            <CommandBridgeHull
              companyName={company?.name}
              totalEmployees={mockEmployees.length || 89}
              totalDepartments={activeDepartments.length}
              overallKPI="94.8%"
              isDark={!isLightTheme}
              isEditMode={isEditMode}
              onOpenDockingMenu={handleOpenDockingMenu}
              mockEmployees={mockEmployees}
              onSelectAstronaut={(emp) => setSelectedAstronaut(emp)}
            />

            {/* ROOT DEPARTMENTS LAYER (TIGHTLY PACKED MODULES) */}
            <div className="mt-12 flex flex-wrap items-start justify-center gap-1 sm:gap-2 max-w-[1240px] relative z-20">
              {rootDepartments.map((rootDep) => {
                const rootEmployees = mockEmployees.filter(e => rootDep.employeeIds?.includes(e.id));
                const subDeps = getSubDepartments(rootDep.id);

                return (
                  <div key={`root-module-group-${rootDep.id}`} className="flex flex-col items-center gap-2">
                    
                    {/* Parent Department Compartment */}
                    <ModularSpaceshipRoom
                      department={rootDep}
                      employees={rootEmployees}
                      isDark={!isLightTheme}
                      isEditMode={isEditMode}
                      isDragMode={canvasMode === 'drag'}
                      onSelectDepartment={(d) => setSelectedDept(d)}
                      onSelectAstronaut={(a) => setSelectedAstronaut(a)}
                      onOpenDockingMenu={handleOpenDockingMenu}
                      onMouseDownDept={handleMouseDownDept}
                      isBeingDragged={draggedDept?.id === rootDep.id}
                    />

                    {/* Sub-departments Vertical/Horizontal Tree Branch */}
                    {subDeps.length > 0 && (
                      <div className="flex flex-wrap items-start justify-center gap-1 relative pt-2 border-t-2 border-amber-400/50">
                        {subDeps.map((subDep) => {
                          const subEmployees = mockEmployees.filter(e => subDep.employeeIds?.includes(e.id));
                          return (
                            <ModularSpaceshipRoom
                              key={`sub-module-${subDep.id}`}
                              department={subDep}
                              employees={subEmployees}
                              isDark={!isLightTheme}
                              isEditMode={isEditMode}
                              isDragMode={canvasMode === 'drag'}
                              onSelectDepartment={(d) => setSelectedDept(d)}
                              onSelectAstronaut={(a) => setSelectedAstronaut(a)}
                              onOpenDockingMenu={handleOpenDockingMenu}
                              isSubDept={true}
                              onMouseDownDept={handleMouseDownDept}
                              isBeingDragged={draggedDept?.id === subDep.id}
                            />
                          );
                        })}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          {/* FLOATING CANVAS TOOLBAR */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-zinc-950/90 border-2 border-amber-400/80 shadow-2xl backdrop-blur-md flex items-center gap-2 z-40 text-white">
            <button
              onClick={() => setCanvasMode(canvasMode === 'drag' ? 'view' : 'drag')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                canvasMode === 'drag' ? 'bg-amber-400 text-amber-950 shadow-md animate-pulse' : 'hover:bg-amber-500/20 text-slate-300'
              }`}
              title="Переключение между просмотром и перетаскиванием"
            >
              <Move size={15} />
              <span>{canvasMode === 'drag' ? 'Перетаскивание ВКЛ' : 'Перетаскивание ВЫКЛ'}</span>
            </button>

            <button
              onClick={handleResetView}
              className="p-2 rounded-xl hover:bg-amber-500/20 text-slate-300 transition-colors cursor-pointer"
              title="Центрировать главную рубку"
            >
              <Crosshair size={16} />
            </button>

            <button
              onClick={() => setShowMinimap(!showMinimap)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showMinimap ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-amber-500/20 text-slate-300'
              }`}
              title="Миникарта корабля"
            >
              <Grid size={16} />
            </button>

            <div className="w-px h-5 bg-amber-500/30 my-auto" />

            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl hover:bg-amber-500/20 text-slate-300 transition-colors cursor-pointer"
              title="Уменьшить масштаб"
            >
              <ZoomOut size={16} />
            </button>

            <span className="px-2 text-xs font-black font-mono text-[#F4EE8E]">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl hover:bg-amber-500/20 text-slate-300 transition-colors cursor-pointer"
              title="Увеличить масштаб"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* FLOATING INTERACTIVE MINIMAP PREVIEW */}
          {showMinimap && (
            <div className="absolute top-4 right-4 p-2 rounded-2xl bg-zinc-950/90 border border-amber-400/60 shadow-2xl backdrop-blur-md z-40 hidden lg:block">
              <span className="text-[9px] font-mono font-black text-amber-300 uppercase block mb-1">
                Миникарта флота
              </span>
              <div className="w-36 h-24 rounded-lg bg-black/80 border border-amber-500/30 relative overflow-hidden flex items-center justify-center">
                <div className="w-12 h-3 rounded bg-amber-400 absolute top-2 left-1/2 -translate-x-1/2" />
                <div className="flex gap-1 absolute top-8">
                  {rootDepartments.map((r) => (
                    <div key={`mini-${r.id}`} className="w-5 h-4 rounded bg-amber-500/50 border border-amber-300" />
                  ))}
                </div>
                <div className="absolute inset-2 border-2 border-amber-400 rounded pointer-events-none animate-pulse" />
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= 3. MOBILE INTERACTIVE CANVAS VIEW (CENTERED ON MAIN BRIDGE) ================= */}
      {activeView === 'map' && (
        <div className="block md:hidden relative w-full rounded-3xl border border-amber-400/80 shadow-2xl overflow-hidden bg-zinc-950 select-none">
          
          <div 
            ref={mobileScrollRef}
            className="w-full overflow-x-auto min-h-[520px] py-6 px-4 flex flex-col items-center justify-start relative scroll-smooth"
          >
            {/* Deep Space Background without Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/25 via-zinc-950 to-black" />

            {/* MAIN COMMAND BRIDGE AT TOP (CENTERED) */}
            <div className="relative z-20 shrink-0">
              <CommandBridgeHull
                companyName={company?.name}
                totalEmployees={mockEmployees.length || 89}
                totalDepartments={activeDepartments.length}
                overallKPI="94.8%"
                isDark={!isLightTheme}
                isEditMode={isEditMode}
                onOpenDockingMenu={handleOpenDockingMenu}
                mockEmployees={mockEmployees}
                onSelectAstronaut={(emp) => setSelectedAstronaut(emp)}
              />
            </div>

            {/* STACKED DEPARTMENTS LAYER */}
            <div className="mt-8 flex flex-col items-center gap-3 relative z-20 w-full max-w-sm">
              {rootDepartments.map((rootDep) => {
                const rootEmployees = mockEmployees.filter(e => rootDep.employeeIds?.includes(e.id));
                const subDeps = getSubDepartments(rootDep.id);

                return (
                  <div key={`mob-root-group-${rootDep.id}`} className="w-full flex flex-col items-center gap-2">
                    <ModularSpaceshipRoom
                      department={rootDep}
                      employees={rootEmployees}
                      isDark={!isLightTheme}
                      isEditMode={isEditMode}
                      isDragMode={canvasMode === 'drag'}
                      onSelectDepartment={(d) => setSelectedDept(d)}
                      onSelectAstronaut={(a) => setSelectedAstronaut(a)}
                      onOpenDockingMenu={handleOpenDockingMenu}
                      onMouseDownDept={handleMouseDownDept}
                    />

                    {subDeps.length > 0 && (
                      <div className="flex flex-col items-center gap-2 pt-1 border-t border-amber-400/40 w-full">
                        {subDeps.map((subDep) => {
                          const subEmployees = mockEmployees.filter(e => subDep.employeeIds?.includes(e.id));
                          return (
                            <ModularSpaceshipRoom
                              key={`mob-sub-${subDep.id}`}
                              department={subDep}
                              employees={subEmployees}
                              isDark={!isLightTheme}
                              isEditMode={isEditMode}
                              isDragMode={canvasMode === 'drag'}
                              onSelectDepartment={(d) => setSelectedDept(d)}
                              onSelectAstronaut={(a) => setSelectedAstronaut(a)}
                              onOpenDockingMenu={handleOpenDockingMenu}
                              isSubDept={true}
                              onMouseDownDept={handleMouseDownDept}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ================= 4. EMPLOYEES & SCHEDULE SUB-VIEWS ================= */}
      {activeView === 'employees' && (
        <CabinetEmployees
          currentUser={mockEmployees[0] || null}
          mockEmployees={mockEmployees}
          setMockEmployees={setMockEmployees || (() => {})}
          departments={activeDepartments}
          saveStateToServer={saveStateToServer}
          company={company}
          templates={templates}
          reports={reports}
          transactions={transactions}
          notifications={notifications}
          tariff={tariff}
          crmCompanies={crmCompanies}
        />
      )}

      {activeView === 'schedule' && (
        <CabinetScheduleGantt
          currentUser={mockEmployees[0] || null}
          mockEmployees={mockEmployees}
          reports={reports}
          onNavigate={onNavigate}
        />
      )}

      {/* ================= 5. DOCKING ACTION MENU POPUP (WITH CLICK OUTSIDE BACKDROP) ================= */}
      {dockingMenu && (
        <>
          {/* Backdrop Overlay to close menu on click outside */}
          <div 
            className="fixed inset-0 z-40 bg-black/10" 
            onClick={() => setDockingMenu(null)} 
          />

          <div 
            style={{ top: dockingMenu.y, left: dockingMenu.x }}
            className="fixed z-50 p-2.5 rounded-2xl bg-zinc-950 border-2 border-amber-400 text-white shadow-2xl animate-fade-in flex flex-col gap-1.5 min-w-[185px]"
          >
            <span className="text-[9px] font-mono font-black text-amber-300 uppercase px-2 pt-1 border-b border-amber-500/20 pb-1">
              Управление шлюзом
            </span>

            <button
              onClick={() => handleTriggerDocking('Новый отдел', dockingMenu.parentId)}
              className="px-3 py-1.5 rounded-xl hover:bg-amber-500/20 text-xs font-bold text-left flex items-center gap-2 cursor-pointer"
            >
              <Plus size={14} className="text-amber-400" />
              <span>Добавить отдел</span>
            </button>

            <button
              onClick={() => handleTriggerDocking('Новый подотдел', dockingMenu.parentId)}
              className="px-3 py-1.5 rounded-xl hover:bg-amber-500/20 text-xs font-bold text-left flex items-center gap-2 cursor-pointer"
            >
              <Layers size={14} className="text-amber-400" />
              <span>Добавить подотдел</span>
            </button>

            <button
              onClick={() => {
                setDockingMenu(null);
                setCanvasMode('drag');
              }}
              className="px-3 py-1.5 rounded-xl hover:bg-amber-500/20 text-xs font-bold text-left flex items-center gap-2 cursor-pointer"
            >
              <Move size={14} className="text-amber-400" />
              <span>Переместить модуль</span>
            </button>

            <button
              onClick={() => setDockingMenu(null)}
              className="px-3 py-1.5 rounded-xl hover:bg-red-500/20 text-xs font-bold text-left text-red-400 flex items-center gap-2 border-t border-amber-500/20 pt-1.5 cursor-pointer"
            >
              <X size={14} />
              <span>Закрыть</span>
            </button>
          </div>
        </>
      )}

      {/* ================= 6. CINEMATIC DOCKING ANIMATION OVERLAY ================= */}
      {dockingAnim?.isAnimating && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in text-white">
          <div className="relative flex flex-col items-center gap-6 max-w-md text-center">
            
            {/* Holographic Laser Alignment Grid */}
            <div className="w-32 h-32 rounded-full border-4 border-amber-400/80 flex items-center justify-center animate-spin relative shadow-[0_0_50px_#E7C768]">
              <Crosshair size={48} className="text-amber-300" />
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400 rounded-full animate-ping" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#F4EE8E] uppercase tracking-wider">
                Стыковка модуля «{dockingAnim.name}»
              </h3>
              <p className="text-xs text-amber-200 font-bold font-mono animate-pulse">
                ВЫРАВНИВАНИЕ ШЛЮЗОВ • ГЕРМЕТИЗАЦИЯ ОТСЕКА
              </p>
            </div>

            {/* Pressurized Vapor Progress Bar */}
            <div className="w-full h-3 rounded-full bg-zinc-800 border border-amber-400 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] animate-pulse w-full transition-all duration-1000" />
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. ASTRONAUT PROFILE MODAL ================= */}
      {selectedAstronaut && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="p-6 rounded-3xl bg-zinc-950 border-2 border-amber-400 text-white max-w-sm w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedAstronaut(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-amber-500/20 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#F4EE8E] to-[#D99E41] text-amber-950 font-black flex items-center justify-center text-lg shadow-md">
                {selectedAstronaut.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-black text-base text-white">{selectedAstronaut.name}</h4>
                <span className="text-xs text-amber-300 font-bold">{selectedAstronaut.position || 'Специалист'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between">
                <span>KPI эффективность:</span>
                <span className="text-emerald-400 font-bold">98.4%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between">
                <span>Текущий статус:</span>
                <span className="text-amber-300 font-bold">На смене (В рубке)</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedAstronaut(null)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs shadow-md uppercase tracking-wider"
            >
              Закрыть профиль
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
