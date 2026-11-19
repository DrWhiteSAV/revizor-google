import React from 'react';
import { ShipModule, ThemeMode, DockConnector } from '../../types/shipOrg';
import { ShipDockConnectorSVG } from './ShipDockConnectorSVG';
import { AstronautSVG } from './AstronautSVG';

interface ShipFlagshipSVGProps {
  module: ShipModule;
  themeMode: ThemeMode;
  isSelected?: boolean;
  isDropTarget?: boolean;
  zoom?: number;
  activeView?: 'map' | 'employees' | 'schedule';
  onViewChange?: (view: 'map' | 'employees' | 'schedule') => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onAutoCenter?: () => void;
  onClick?: () => void;
  onDockClick?: (dock: DockConnector) => void;
  onEditFlagship?: () => void;
  onAddDepartment?: () => void;
  onEmployeeClick?: (employee: any) => void;
  onEmployeeDragStart?: (e: React.MouseEvent, employee: any) => void;
}

export const ShipFlagshipSVG: React.FC<ShipFlagshipSVGProps> = ({
  module,
  themeMode,
  isSelected,
  isDropTarget,
  zoom = 1,
  activeView = 'map',
  onViewChange,
  onZoomIn,
  onZoomOut,
  onAutoCenter,
  onClick,
  onDockClick,
  onEditFlagship,
  onAddDepartment,
  onEmployeeClick,
  onEmployeeDragStart
}) => {
  const isLight = themeMode.includes('light');

  // Theme palettes for hull, armor, glass, and lights
  const palette = isLight
    ? {
        hullBase: '#F1F5F9',
        hullDark: '#E2E8F0',
        armorBorder: '#CBD5E1',
        armorAccent: '#D4AF37',
        glassBg: 'rgba(255, 255, 255, 0.92)',
        innerSpaceBg: '#F8FAFC',
        starColor: '#94A3B8',
        chairFill: '#CBD5E1',
        consoleFill: '#E2E8F0',
        textMain: '#0F172A',
        goldGlow: '#D4AF37'
      }
    : {
        hullBase: '#18130C',
        hullDark: '#0D0A06',
        armorBorder: '#2E2213',
        armorAccent: '#E7C768',
        glassBg: 'rgba(20, 15, 9, 0.92)',
        innerSpaceBg: '#080603',
        starColor: '#FFE57F',
        chairFill: '#2E2213',
        consoleFill: '#1A130A',
        textMain: '#FFF8E7',
        goldGlow: '#E7C768'
      };

  const bottomDock = module.docks?.find(d => d.type === 'bottom') || {
    id: 'flagship-dock-bottom',
    type: 'bottom' as const,
    localX: 0,
    localY: 120,
    worldX: module.x,
    worldY: module.y + 120,
    status: 'free' as const,
    connectedToId: null
  };

  return (
    <g
      id={`module-flagship-${module.id}`}
      transform={`translate(${module.x}, ${module.y})`}
      className="select-none cursor-pointer transition-transform duration-300"
      onClick={onClick}
    >
      {/* 1. <g id="module-body"/> Main Horizontal Hull Shell (720x240) */}
      <g id="module-body">
        {/* Drop target outer halo */}
        {isDropTarget && (
          <path
            d="M -350 -110 
               L 350 -110 
               Q 375 -110 385 -85 
               L 385 75 
               Q 375 105 340 110 
               L 125 110 
               L 85 130 
               L -85 130 
               L -125 110 
               L -340 110 
               Q -375 105 -385 75 
               L -385 -85 
               Q -375 -110 -350 -110 Z"
            fill="none"
            stroke="#F4EE8E"
            strokeWidth="4"
            strokeDasharray="14 8"
            className="animate-spin"
            style={{ animationDuration: '8s' }}
          />
        )}
        {/* Outer Shadow and Ambient Gold Glow */}
        <path
          d="M -340 -100 
             L 340 -100 
             Q 360 -100 370 -80 
             L 370 70 
             Q 360 95 330 100 
             L 120 100 
             L 80 120 
             L -80 120 
             L -120 100 
             L -330 100 
             Q -360 95 -370 70 
             L -370 -80 
             Q -360 -100 -340 -100 Z"
          fill={isDropTarget ? (isLight ? '#FEF3C7' : '#2A1804') : palette.hullDark}
          stroke={isDropTarget ? '#F4EE8E' : (isSelected ? palette.goldGlow : palette.armorBorder)}
          strokeWidth={isDropTarget ? '4' : (isSelected ? '3' : '1.5')}
          filter="drop-shadow(0px 8px 24px rgba(0,0,0,0.5))"
        />

        {/* Inner Composite Hull Plate */}
        <path
          d="M -330 -90 L 330 -90 Q 350 -90 358 -74 L 358 62 Q 350 85 320 88 L 110 88 L 75 106 L -75 106 L -110 88 L -320 88 Q -350 85 -358 62 L -358 -74 Q -350 -90 -330 -90 Z"
          fill={palette.hullBase}
        />
      </g>

      {/* 2. <g id="armor"/> Heavy Aerodynamic Plates & Gold Bevels */}
      <g id="armor">
        {/* Top Heavy Armor Ridge */}
        <path
          d="M -320 -95 L 320 -95 L 280 -82 L -280 -82 Z"
          fill={palette.armorBorder}
          opacity="0.6"
        />

        {/* Side Heavy Thruster Mounting Facets */}
        <path
          d="M -360 -60 L -330 -60 L -330 40 L -360 20 Z"
          fill={palette.armorAccent}
          opacity="0.8"
        />
        <path
          d="M 360 -60 L 330 -60 L 330 40 L 360 20 Z"
          fill={palette.armorAccent}
          opacity="0.8"
        />

        {/* Gold Trim Accents */}
        <line x1="-310" y1="-80" x2="-180" y2="-80" stroke={palette.goldGlow} strokeWidth="2" />
        <line x1="180" y1="-80" x2="310" y2="-80" stroke={palette.goldGlow} strokeWidth="2" />
      </g>

      {/* 3. <g id="interior"/> Captain's Bridge & Space View Window */}
      <g id="interior">
        {/* Panoramic Glass Window Frame (Center) */}
        <rect
          x="-170"
          y="-72"
          width="340"
          height="124"
          rx="18"
          fill={palette.glassBg}
          stroke={palette.goldGlow}
          strokeWidth="1"
        />

        {/* Deep Space Background behind window */}
        <rect
          x="-166"
          y="-68"
          width="332"
          height="116"
          rx="14"
          fill={palette.innerSpaceBg}
          stroke={isLight ? '#CBD5E1' : '#1E293B'}
          strokeWidth="1"
        />

        {/* Stars in Space Window */}
        <circle cx="-120" cy="-40" r="1" fill={palette.starColor} opacity="0.9" />
        <circle cx="-80" cy="-20" r="1.5" fill="#E7C768" opacity="0.8" />
        <circle cx="100" cy="-45" r="1" fill="#38BDF8" opacity="0.9" />
        <circle cx="130" cy="-10" r="1.2" fill={palette.starColor} opacity="0.7" />
        <circle cx="-30" cy="-50" r="1" fill={palette.starColor} opacity="0.8" />

        {/* Nebula Glow in Window */}
        <ellipse cx="0" cy="-30" rx="90" ry="25" fill="url(#flagshipNebula)" opacity={isLight ? "0.2" : "0.35"} />

        {/* Captain's Central Command Chair */}
        <path
          d="M -12 28 L 12 28 L 10 0 L -10 0 Z M -8 -12 L 8 -12 L 6 0 L -6 0 Z"
          fill={palette.chairFill}
          stroke={palette.armorBorder}
          strokeWidth="1"
        />

        {/* Side Holographic Consoles */}
        <path d="M -140 18 L -90 18 L -80 32 L -150 32 Z" fill={palette.consoleFill} stroke={palette.goldGlow} strokeWidth="1" opacity="0.9" />
        <path d="M 90 18 L 140 18 L 150 32 L 80 32 Z" fill={palette.consoleFill} stroke={palette.goldGlow} strokeWidth="1" opacity="0.9" />

        {/* Rotating Central Holographic Globe Sphere */}
        <g transform="translate(0, -10)">
          <circle cx="0" cy="0" r="22" fill="rgba(231, 199, 104, 0.08)" stroke={palette.goldGlow} strokeWidth="1" strokeDasharray="4 2" />
          <ellipse cx="0" cy="0" rx="22" ry="8" fill="none" stroke={palette.goldGlow} strokeWidth="1.2" className="animate-spin" style={{ animationDuration: '8s' }} />
          <ellipse cx="0" cy="0" rx="8" ry="22" fill="none" stroke="#38BDF8" strokeWidth="1" className="animate-spin" style={{ animationDuration: '12s' }} />
          <circle cx="0" cy="0" r="4" fill={palette.goldGlow} className="animate-pulse" />
        </g>
      </g>

      {/* 4. <g id="glass"/> Glass Reflections */}
      <g id="glass" pointerEvents="none">
        <path
          d="M -160 -60 L -100 -68 L -140 40 L -164 40 Z"
          fill="#FFFFFF"
          opacity={isLight ? '0.25' : '0.08'}
        />
        <path
          d="M 100 -68 L 150 -68 L 110 40 L 80 40 Z"
          fill="#FFFFFF"
          opacity={isLight ? '0.2' : '0.06'}
        />
      </g>

      {/* 5. FOREGROUND LAYER: Real Astronauts, Title Badge, and Scale/Zoom HUD */}
      <g id="foreground">
        {/* Clean Title Badge for Flagship */}
        <g
          id="flagship-title-tag"
          transform={`translate(0, -112) scale(${1 / zoom})`}
          pointerEvents="auto"
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            if (onEditFlagship) onEditFlagship();
            else onClick?.();
          }}
        >
          <rect
            x="-140"
            y="-15"
            width="280"
            height="30"
            rx="15"
            fill={isLight ? 'rgba(255,255,255,0.96)' : 'rgba(18,14,9,0.96)'}
            stroke={palette.goldGlow}
            strokeWidth="1.5"
            filter="drop-shadow(0px 4px 12px rgba(0,0,0,0.45))"
          />
          <text
            x={-10}
            y={4}
            textAnchor="middle"
            fill={palette.textMain}
            fontSize="13"
            fontWeight="900"
            letterSpacing="0.5"
            fontFamily="sans-serif"
            className="group-hover:fill-amber-300 transition-colors"
          >
            {module.name}
          </text>

          {/* Edit Pencil Icon */}
          <g transform="translate(82, -2)" stroke={palette.goldGlow} fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-amber-300">
            <path d="M -3 2 L 2 -3 L 4 -1 L -1 4 Z" />
            <path d="M -3 2 L -5 4 L -2 3 Z" fill={palette.goldGlow} />
            <title>Редактировать мостик флагмана и структуру компании</title>
          </g>

          {/* Add Department (+) Button */}
          <g
            transform="translate(112, 0)"
            className="hover:scale-110 transition-transform cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (onAddDepartment) onAddDepartment();
              else if (onDockClick) onDockClick(bottomDock);
            }}
          >
            <circle cx="0" cy="0" r="10" fill={palette.goldGlow} />
            <path d="M -4 0 L 4 0 M 0 -4 L 0 4" stroke="#120E08" strokeWidth="2.2" strokeLinecap="round" />
            <title>Пристыковать новый отдел к флагману</title>
          </g>
        </g>

        {/* Integrated Scale & Zoom Control Deck ON Flagship (Positioned right under inner window and above bottom dock at y=78) */}
        {(onZoomIn || onZoomOut || onAutoCenter) && (
          <g id="flagship-zoom-controls" transform={`translate(0, 78) scale(${1 / zoom})`}>
            {/* Control Panel Plate */}
            <rect
              x="-85"
              y="-15"
              width="170"
              height="30"
              rx="15"
              fill={isLight ? 'rgba(255,255,255,0.95)' : 'rgba(18,14,9,0.95)'}
              stroke={palette.goldGlow}
              strokeWidth="1.5"
              filter="drop-shadow(0px 4px 12px rgba(0,0,0,0.5))"
            />

            {/* Zoom Out (-) Button */}
            <g
              transform="translate(-60, 0)"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onZoomOut?.(); }}
            >
              <circle cx="0" cy="0" r="11" fill={isLight ? '#F1F5F9' : '#2A2114'} stroke={palette.goldGlow} strokeWidth="1" />
              <line x1="-5" y1="0" x2="5" y2="0" stroke={palette.goldGlow} strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* Scale Percentage readout */}
            <text
              x="-20"
              y="4"
              textAnchor="middle"
              fill={palette.textMain}
              fontSize="11"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              {Math.round(zoom * 100)}%
            </text>

            {/* Zoom In (+) Button */}
            <g
              transform="translate(20, 0)"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onZoomIn?.(); }}
            >
              <circle cx="0" cy="0" r="11" fill={isLight ? '#F1F5F9' : '#2A2114'} stroke={palette.goldGlow} strokeWidth="1" />
              <line x1="-5" y1="0" x2="5" y2="0" stroke={palette.goldGlow} strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="-5" x2="0" y2="5" stroke={palette.goldGlow} strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* Re-center (↺) Button */}
            <g
              transform="translate(58, 0)"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onAutoCenter?.(); }}
            >
              <circle cx="0" cy="0" r="11" fill={isLight ? '#F1F5F9' : '#2A2114'} stroke={palette.goldGlow} strokeWidth="1" />
              <path
                d="M -3 -1 A 3.5 3.5 0 1 1 3.5 1 M 1.5 -3 L 3.5 1 L 0 0"
                fill="none"
                stroke={palette.goldGlow}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        )}

        {/* Real Captain / Director & Flagship Employees without mock bots */}
        {module.employees && module.employees.length > 0 ? (
          module.employees.map((emp, idx) => {
            const isLeft = idx % 2 === 0;
            const offset = Math.floor(idx / 2) * 50;
            const initX = isLeft ? -60 - offset : 60 + offset;
            return (
              <AstronautSVG
                key={emp.id || idx}
                id={`${module.id}-astro-flagship-${emp.id || idx}`}
                isLight={isLight}
                bounds={{ minX: -250, maxX: 250, minY: -50, maxY: 35 }}
                initialX={initX}
                initialY={-5}
                employeeName={emp.name || 'Сотрудник'}
                employee={emp}
                zoom={zoom}
                onClick={() => onEmployeeClick?.(emp)}
                onDragStart={(e, em) => onEmployeeDragStart?.(e, em || emp)}
              />
            );
          })
        ) : (() => {
          let realDir: any = {
            id: '91827364501',
            name: module.leadName || 'Генеральный директор',
            role: 'DIRECTOR',
            position: 'Генеральный директор',
            department_id: null,
            email: 'director@company.local'
          };
          try {
            const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
            if (userStr) {
              const u = JSON.parse(userStr);
              if (u.id && u.id !== 'flagship-director') {
                realDir = {
                  id: String(u.id),
                  name: u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || module.leadName || 'Генеральный директор',
                  role: u.role || 'DIRECTOR',
                  position: u.position || 'Генеральный директор',
                  department_id: null,
                  email: u.email || `${u.id}@company.local`
                };
              }
            }
          } catch (e) {}

          return (
            <AstronautSVG
              id={`${module.id}-astro-${realDir.id}`}
              isLight={isLight}
              bounds={{ minX: -250, maxX: 250, minY: -50, maxY: 35 }}
              initialX={0}
              initialY={-5}
              employeeName={`${realDir.name} (Директор)`}
              employee={realDir}
              zoom={zoom}
              onClick={() => onEmployeeClick?.(realDir)}
              onDragStart={(e, em) => onEmployeeDragStart?.(e, em || realDir)}
            />
          );
        })()}
      </g>

      {/* 6. <g id="lights"/> Structural Status Beacons */}
      <g id="lights">
        <circle cx="-330" cy="-70" r="3" fill="#10B981" className="animate-pulse" />
        <circle cx="330" cy="-70" r="3" fill="#10B981" className="animate-pulse" />
      </g>

      {/* 7. Lower Dock Connector */}
      <ShipDockConnectorSVG
        dock={bottomDock}
        isLight={isLight}
        onClick={() => onDockClick && onDockClick(bottomDock)}
      />

      <defs>
        <radialGradient id="flagshipNebula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E7C768" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#0284C7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#030712" stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  );
};
