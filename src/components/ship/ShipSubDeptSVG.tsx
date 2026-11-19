import React from 'react';
import { ShipModule, ThemeMode, DockConnector } from '../../types/shipOrg';
import { ShipDockConnectorSVG } from './ShipDockConnectorSVG';
import { AstronautSVG } from './AstronautSVG';

interface ShipSubDeptSVGProps {
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

export const ShipSubDeptSVG: React.FC<ShipSubDeptSVGProps> = ({
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

  const palette = isLight
    ? {
        armorOuter: '#E2E8F0',
        armorBorder: '#CBD5E1',
        armorAccent: '#D4AF37',
        innerBody: '#FFFFFF',
        glassBg: 'rgba(255, 255, 255, 0.88)',
        textMain: '#0F172A',
        goldGlow: '#D4AF37'
      }
    : {
        armorOuter: '#18130C',
        armorBorder: '#2E2213',
        armorAccent: '#E7C768',
        innerBody: '#0A0805',
        glassBg: 'rgba(20, 15, 9, 0.92)',
        textMain: '#FFF8E7',
        goldGlow: '#E7C768'
      };

  // Subdepartments strictly only have side docks (left and right), never top or bottom
  const docks = (module.docks || []).filter(d => d.type === 'left' || d.type === 'right');
  const leftDock = docks.find(d => d.type === 'left') || { id: `${module.id}-dock-left`, type: 'left' as const, localX: -100, localY: 0, worldX: module.x - 100, worldY: module.y, status: 'free' as const, connectedToId: null };
  const rightDock = docks.find(d => d.type === 'right') || { id: `${module.id}-dock-right`, type: 'right' as const, localX: 100, localY: 0, worldX: module.x + 100, worldY: module.y, status: 'free' as const, connectedToId: null };

  const employeesList = module.employees && module.employees.length > 0 ? module.employees : [];

  return (
    <g
      id={`module-subdepartment-${module.id}`}
      transform={`translate(${module.x}, ${module.y})`}
      className={`select-none cursor-grab active:cursor-grabbing transition-transform ${isDragging ? 'scale-105 z-50' : ''}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
    >
      {/* 1. <g id="module-body"/> Heavy Rounded Rectangular Hull (200x100) */}
      <g id="module-body">
        {isDropTarget && (
          <rect
            x="-110"
            y="-60"
            width="220"
            height="120"
            rx="28"
            fill="none"
            stroke="#F4EE8E"
            strokeWidth="3.5"
            strokeDasharray="10 6"
            className="animate-spin"
            style={{ animationDuration: '6s' }}
          />
        )}
        <rect
          x="-100"
          y="-50"
          width="200"
          height="100"
          rx="22"
          fill={isDropTarget ? (isLight ? '#FEF3C7' : '#2A1804') : palette.armorOuter}
          stroke={isDropTarget ? '#F4EE8E' : (isSelected ? palette.goldGlow : palette.armorBorder)}
          strokeWidth={isDropTarget ? '3.5' : (isSelected ? '3' : '1.5')}
          filter="drop-shadow(0px 6px 16px rgba(0,0,0,0.4))"
        />
        <rect
          x="-92"
          y="-42"
          width="184"
          height="84"
          rx="16"
          fill={palette.innerBody}
        />
      </g>

      {/* 2. <g id="armor"/> Armor Plates & Reinforcement Bevels */}
      <g id="armor">
        {/* Top & Bottom Heavy Reinforcement Ribs */}
        <line x1="-70" y1="-46" x2="70" y2="-46" stroke={palette.armorAccent} strokeWidth="2" />
        <line x1="-70" y1="46" x2="70" y2="46" stroke={palette.armorAccent} strokeWidth="2" />

        {/* Side Plate Facets */}
        <path d="M -90 -30 L -80 -30 L -80 30 L -90 30 Z" fill={palette.armorBorder} opacity="0.6" />
        <path d="M 90 -30 L 80 -30 L 80 30 L 90 30 Z" fill={palette.armorBorder} opacity="0.6" />
      </g>

      {/* 3. <g id="interior"/> Central Window Interior */}
      <g id="interior">
        <rect
          x="-76"
          y="-32"
          width="152"
          height="64"
          rx="12"
          fill={isLight ? '#F1F5F9' : '#080603'}
        />

        {/* Workstation Consoles */}
        <rect x="-60" y="-18" width="28" height="12" rx="3" fill={isLight ? '#E2E8F0' : '#2A2114'} stroke={palette.goldGlow} strokeWidth="1" />
        <circle cx="50" cy="0" r="10" fill="rgba(231, 199, 104, 0.18)" stroke="#E7C768" strokeWidth="1" />
      </g>

      {/* 4. <g id="glass"/> Panoramic Glass Reflection */}
      <g id="glass" pointerEvents="none">
        <rect
          x="-76"
          y="-32"
          width="152"
          height="64"
          rx="12"
          fill={palette.glassBg}
          stroke={palette.goldGlow}
          strokeWidth="1"
          opacity="0.85"
        />
        <path
          d="M -70 -26 L -20 -26 L -50 24 L -70 24 Z"
          fill="#FFFFFF"
          opacity={isLight ? '0.3' : '0.1'}
        />
      </g>

      {/* 5. FOREGROUND LAYER: Real Astronaut and Title Tag */}
      <g id="foreground">
        {/* Interactive Title Tag above Hull */}
        <g
          id="subdept-title-tag"
          transform={`translate(0, -58) scale(${1 / zoom})`}
          pointerEvents="auto"
          className="cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onEditDepartment?.(module);
          }}
        >
          <rect
            x="-65"
            y="-11"
            width="130"
            height="22"
            rx="11"
            fill={isLight ? 'rgba(255,255,255,0.96)' : 'rgba(18,14,9,0.96)'}
            stroke={palette.goldGlow}
            strokeWidth="1.2"
            filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.3))"
          />
          <text
            x={0}
            y={3}
            textAnchor="middle"
            fill={palette.textMain}
            fontSize="10"
            fontWeight="900"
            fontFamily="sans-serif"
            className="group-hover:fill-amber-300 transition-colors"
          >
            {module.name}
          </text>
        </g>

        {/* Separate Circular Edit Button Badge */}
        <g
          transform={`translate(80, -58) scale(${1 / zoom})`}
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
            r="11"
            fill={isLight ? 'rgba(255,255,255,0.98)' : 'rgba(18,14,9,0.98)'}
            stroke={palette.goldGlow}
            strokeWidth="1.4"
            filter="drop-shadow(0px 2px 5px rgba(0,0,0,0.3))"
          />
          <g transform="translate(0, 0)" stroke={palette.goldGlow} fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-amber-300">
            <path d="M -3 2 L 2 -3 L 4 -1 L -1 4 Z" />
            <path d="M -3 2 L -5 4 L -2 3 Z" fill={palette.goldGlow} />
          </g>
          <title>Редактировать подотдел</title>
        </g>

        {/* Animated Gold Astronaut - Only rendered if real employees exist in module.employees */}
        {employeesList.length > 0 && employeesList.map((emp, idx) => {
          const isLeft = idx % 2 === 0;
          const initialX = isLeft ? -20 : 20;
          return (
            <AstronautSVG
              key={emp.id || idx}
              id={`${module.id}-astro-sub-${emp.id || idx}`}
              isLight={isLight}
              bounds={{ minX: -40, maxX: 40, minY: -10, maxY: 10 }}
              initialX={initialX}
              initialY={0}
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
        <circle cx="-85" cy="-35" r="2" fill="#10B981" className="animate-pulse" />
        <circle cx="85" cy="-35" r="2" fill="#10B981" className="animate-pulse" />
      </g>

      {/* 7. Dock Connectors */}
      {docks.map(dock => (
        <ShipDockConnectorSVG
          key={dock.id}
          dock={dock}
          isLight={isLight}
          onClick={() => onDockClick && onDockClick(dock)}
        />
      ))}
    </g>
  );
};
