import React from 'react';
import { ShipModule, ThemeMode, DockConnector } from '../../types/shipOrg';
import { ShipDockConnectorSVG } from './ShipDockConnectorSVG';
import { AstronautSVG } from './AstronautSVG';

interface ShipDepartmentSVGProps {
  module: ShipModule;
  themeMode: ThemeMode;
  isSelected?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  zoom?: number;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onDockClick?: (dock: DockConnector) => void;
  onEditDepartment?: (module: ShipModule) => void;
  onEmployeeClick?: (employee: any) => void;
  onEmployeeDragStart?: (e: React.MouseEvent, employee: any) => void;
}

export const ShipDepartmentSVG: React.FC<ShipDepartmentSVGProps> = ({
  module,
  themeMode,
  isSelected,
  isDragging,
  isDropTarget,
  zoom = 1,
  onClick,
  onMouseDown,
  onDockClick,
  onEditDepartment,
  onEmployeeClick,
  onEmployeeDragStart
}) => {
  const isLight = themeMode.includes('light');

  // Palette according to theme
  const palette = isLight
    ? {
        armorOuter: '#E2E8F0',
        armorRim: '#CBD5E1',
        armorAccent: '#D4AF37',
        innerBody: '#FFFFFF',
        glassBg: 'rgba(255, 255, 255, 0.82)',
        textMain: '#0F172A',
        goldGlow: '#D4AF37',
        holoTable: 'rgba(212, 175, 55, 0.18)'
      }
    : {
        armorOuter: '#18130C',
        armorRim: '#0D0A06',
        armorAccent: '#E7C768',
        innerBody: '#0A0805',
        glassBg: 'rgba(20, 15, 9, 0.92)',
        textMain: '#FFF8E7',
        goldGlow: '#E7C768',
        holoTable: 'rgba(231, 199, 104, 0.22)'
      };

  // Find docks or fallback to defaults
  const docks = module.docks || [];
  const topDock = docks.find(d => d.type === 'top') || { id: `${module.id}-dock-top`, type: 'top' as const, localX: 0, localY: -120, worldX: module.x, worldY: module.y - 120, status: 'free' as const, connectedToId: null };
  const bottomDock = docks.find(d => d.type === 'bottom') || { id: `${module.id}-dock-bottom`, type: 'bottom' as const, localX: 0, localY: 120, worldX: module.x, worldY: module.y + 120, status: 'free' as const, connectedToId: null };
  const leftDock = docks.find(d => d.type === 'left') || { id: `${module.id}-dock-left`, type: 'left' as const, localX: -120, localY: 0, worldX: module.x - 120, worldY: module.y, status: 'free' as const, connectedToId: null };
  const rightDock = docks.find(d => d.type === 'right') || { id: `${module.id}-dock-right`, type: 'right' as const, localX: 120, localY: 0, worldX: module.x + 120, worldY: module.y, status: 'free' as const, connectedToId: null };

  const employeesList = module.employees && module.employees.length > 0 ? module.employees : [];

  return (
    <g
      id={`module-department-${module.id}`}
      transform={`translate(${module.x}, ${module.y})`}
      className={`select-none cursor-grab active:cursor-grabbing transition-transform ${isDragging ? 'scale-105 z-50' : ''}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {/* 1. <g id="armor"/> Outer Armored Rim */}
      <g id="armor">
        {/* Drop target halo indicator */}
        {isDropTarget && (
          <circle
            cx={0}
            cy={0}
            r={132}
            fill="none"
            stroke="#F4EE8E"
            strokeWidth="4"
            strokeDasharray="12 8"
            className="animate-spin"
            style={{ animationDuration: '6s' }}
          />
        )}
        <circle
          cx={0}
          cy={0}
          r={120}
          fill={isDropTarget ? (isLight ? '#FEF3C7' : '#2A1804') : palette.armorOuter}
          stroke={isDropTarget ? '#F4EE8E' : (isSelected ? palette.goldGlow : palette.armorRim)}
          strokeWidth={isDropTarget ? '4' : (isSelected ? '3.5' : '2')}
          filter="drop-shadow(0px 8px 20px rgba(0,0,0,0.4))"
        />

        {/* Outer Concentric Facet Ring */}
        <circle
          cx={0}
          cy={0}
          r={112}
          fill="none"
          stroke={palette.armorAccent}
          strokeWidth="1.5"
          strokeDasharray="16 8"
        />

        {/* Technological Service Panels */}
        <g stroke={palette.armorAccent} strokeWidth="2" opacity="0.7">
          <line x1="-112" y1="0" x2="-102" y2="0" />
          <line x1="102" y1="0" x2="112" y2="0" />
          <line x1="0" y1="-112" x2="0" y2="-102" />
          <line x1="0" y1="102" x2="0" y2="112" />
        </g>
      </g>

      {/* 2. <g id="module-body"/> Inner Metal Ring */}
      <g id="module-body">
        <circle
          cx={0}
          cy={0}
          r={98}
          fill={palette.innerBody}
          stroke={palette.armorRim}
          strokeWidth="2"
        />
      </g>

      {/* 3. <g id="interior"/> Department Workspace & Holo Table */}
      <g id="interior">
        <circle
          cx={0}
          cy={0}
          r={86}
          fill={isLight ? '#F8FAFC' : '#080603'}
        />

        {/* Central Holographic Tactical Table */}
        <ellipse
          cx={0}
          cy={10}
          rx={38}
          ry={16}
          fill={palette.holoTable}
          stroke={palette.goldGlow}
          strokeWidth="1.2"
        />
        <circle cx={0} cy={10} r={5} fill={palette.goldGlow} className="animate-ping" opacity="0.6" />

        {/* Terminal Consoles */}
        <path d="M -60 -20 L -35 -20 L -40 -32 L -65 -32 Z" fill={isLight ? '#E2E8F0' : '#2A2114'} stroke={palette.goldGlow} strokeWidth="1" />
        <path d="M 35 -20 L 60 -20 L 65 -32 L 40 -32 Z" fill={isLight ? '#E2E8F0' : '#2A2114'} stroke={palette.goldGlow} strokeWidth="1" />
      </g>

      {/* 4. <g id="glass"/> Panoramic Glass Dome */}
      <g id="glass" pointerEvents="none">
        <circle
          cx={0}
          cy={0}
          r={86}
          fill={palette.glassBg}
          stroke={palette.goldGlow}
          strokeWidth="1"
          opacity="0.85"
        />

        {/* Glass Reflection Arc */}
        <path
          d="M -70 -30 A 80 80 0 0 1 70 -30 Q 0 -60 -70 -30 Z"
          fill="#FFFFFF"
          opacity={isLight ? '0.35' : '0.12'}
        />
      </g>

      {/* 5. FOREGROUND LAYER: Real Astronaut Crew and Title Tag */}
      <g id="foreground">
        {/* Animated Clockwise Glowing Outer Department Title Tag */}
        <g
          id="department-title-tag"
          transform={`translate(0, -80) scale(${1 / zoom})`}
          pointerEvents="auto"
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onEditDepartment?.(module);
          }}
        >
          {/* Base Background Plate */}
          <rect
            x="-75"
            y="-13"
            width="150"
            height="26"
            rx="13"
            fill={isLight ? 'rgba(255,255,255,0.96)' : 'rgba(18,14,9,0.96)'}
            stroke={palette.goldGlow}
            strokeWidth="1.2"
            filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.4))"
          />

          {/* Clockwise Animated Glowing Dash Stroke */}
          <rect
            x="-75"
            y="-13"
            width="150"
            height="26"
            rx="13"
            fill="none"
            stroke="#F4EE8E"
            strokeWidth="2.5"
            strokeDasharray="40 180"
            style={{
              animation: 'clockwiseDash 3s linear infinite'
            }}
          />

          {/* SVG Keyframes for clockwise rotation around border */}
          <style>{`
            @keyframes clockwiseDash {
              0% { stroke-dashoffset: 220; }
              100% { stroke-dashoffset: 0; }
            }
          `}</style>

          {/* Department Name Text */}
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill={palette.textMain}
            fontSize="11"
            fontWeight="900"
            fontFamily="sans-serif"
            className="group-hover:fill-amber-300 transition-colors"
          >
            {module.name}
          </text>
        </g>

        {/* Separate Circular Edit Button Badge */}
        <g
          transform={`translate(92, -80) scale(${1 / zoom})`}
          pointerEvents="auto"
          className="cursor-pointer hover:scale-110 transition-transform group"
          onClick={(e) => {
            e.stopPropagation();
            onEditDepartment?.(module);
          }}
        >
          <circle
            cx="0"
            cy="0"
            r="12"
            fill={isLight ? 'rgba(255,255,255,0.98)' : 'rgba(18,14,9,0.98)'}
            stroke={palette.goldGlow}
            strokeWidth="1.5"
            filter="drop-shadow(0px 2px 6px rgba(0,0,0,0.35))"
          />
          <g transform="translate(0, 0)" stroke={palette.goldGlow} fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-amber-300">
            <path d="M -3 2 L 2 -3 L 4 -1 L -1 4 Z" />
            <path d="M -3 2 L -5 4 L -2 3 Z" fill={palette.goldGlow} />
          </g>
          <title>Редактировать отдел</title>
        </g>

        {/* Animated Gold Astronauts - Only rendered if real employees exist in module.employees */}
        {employeesList.length > 0 && employeesList.map((emp, idx) => {
          const isLeft = idx % 2 === 0;
          const offset = Math.min(idx * 15, 30);
          const initialX = isLeft ? -35 - offset : 35 + offset;
          const initialY = (idx % 3) * 5;
          return (
            <AstronautSVG
              key={emp.id || idx}
              id={`${module.id}-astro-${emp.id || idx}`}
              isLight={isLight}
              bounds={{ minX: -60, maxX: 60, minY: -25, maxY: 25 }}
              initialX={initialX}
              initialY={initialY}
              employeeName={emp.name || 'Сотрудник'}
              employee={emp}
              zoom={zoom}
              onClick={() => onEmployeeClick?.(emp)}
              onDragStart={(e, em) => onEmployeeDragStart?.(e, em || emp)}
            />
          );
        })}
      </g>

      {/* 6. <g id="lights"/> Status Beacons */}
      <g id="lights">
        <circle cx={-85} cy={-85} r={3} fill="#10B981" className="animate-pulse" />
        <circle cx={85} cy={-85} r={3} fill="#10B981" className="animate-pulse" />
      </g>

      {/* 7. Four Dock Connectors: Top, Bottom, Left, Right */}
      <ShipDockConnectorSVG dock={topDock} isLight={isLight} onClick={() => onDockClick && onDockClick(topDock)} />
      <ShipDockConnectorSVG dock={bottomDock} isLight={isLight} onClick={() => onDockClick && onDockClick(bottomDock)} />
      <ShipDockConnectorSVG dock={leftDock} isLight={isLight} onClick={() => onDockClick && onDockClick(leftDock)} />
      <ShipDockConnectorSVG dock={rightDock} isLight={isLight} onClick={() => onDockClick && onDockClick(rightDock)} />
    </g>
  );
};
