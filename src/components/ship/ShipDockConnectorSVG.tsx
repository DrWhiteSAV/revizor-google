import React from 'react';
import { DockConnector, ThemeMode } from '../../types/shipOrg';

interface ShipDockConnectorSVGProps {
  dock: DockConnector;
  isLight: boolean;
  onHover?: () => void;
  onClick?: () => void;
}

export const ShipDockConnectorSVG: React.FC<ShipDockConnectorSVGProps> = ({
  dock,
  isLight,
  onHover,
  onClick
}) => {
  const isOccupied = dock.status === 'occupied';
  const isSnapping = dock.status === 'snapping';

  // Rotation based on dock type
  const rotationMap = {
    top: 0,
    right: 90,
    bottom: 180,
    left: 270
  };
  const rotation = rotationMap[dock.type] || 0;

  // Colors based on state and light/dark theme
  const strokeColor = isSnapping
    ? '#F4EE8E'
    : isOccupied
    ? '#10B981' // Bright Emerald for Connected Lock
    : isLight ? '#D4AF37' : '#E7C768'; // Gold/Amber for Free Available Dock

  const fillColor = isSnapping
    ? 'rgba(244, 238, 142, 0.3)'
    : isOccupied
    ? isLight ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.2)'
    : isLight ? 'rgba(212, 175, 55, 0.12)' : 'rgba(231, 199, 104, 0.1)';

  return (
    <g
      id={`connector-${dock.type}`}
      transform={`translate(${dock.localX}, ${dock.localY}) rotate(${rotation})`}
      className="cursor-pointer transition-all duration-300 group"
      onMouseEnter={onHover}
      onClick={onClick}
      pointerEvents="all"
    >
      {/* 1. Magnetic Energy Aura Pulse (When free or snapping) */}
      {!isOccupied && (
        <circle
          cx={0}
          cy={0}
          r={22}
          fill="none"
          stroke={isLight ? '#D4AF37' : '#E7C768'}
          strokeWidth="1"
          opacity="0.4"
          className="animate-ping"
        />
      )}

      {/* 2. Outer Armor Ring / Port Base */}
      <circle
        cx={0}
        cy={0}
        r={18}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isOccupied ? '2.5' : '1.8'}
        className="transition-colors duration-200"
      />

      {/* 3. Magnetic Locking teeth / Facets */}
      <circle
        cx={0}
        cy={0}
        r={13}
        fill="none"
        stroke={isOccupied ? '#10B981' : isLight ? '#CBD5E1' : '#475569'}
        strokeWidth="1"
        strokeDasharray={isOccupied ? 'none' : '3 2'}
      />

      {/* 4. Sealed Hatch Locks / Docking Portal */}
      {isOccupied ? (
        /* Connected / Locked Seal - Double Lock Bars + Glowing Emerald Core */
        <g>
          <circle cx={0} cy={0} r={8} fill={isLight ? '#DCFCE7' : '#064E3B'} stroke="#10B981" strokeWidth="1" />
          <path
            d="M-4 -4 L4 4 M-4 4 L4 -4"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={0} cy={0} r={3} fill="#10B981" className="animate-pulse" />
        </g>
      ) : (
        /* Free Dock - Gold '+' Add Symbol inviting module attachment */
        <g>
          <line x1="-6" y1="0" x2="6" y2="0" stroke={isLight ? '#B45309' : '#F59E0B'} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke={isLight ? '#B45309' : '#F59E0B'} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {/* 5. Status LED indicators around port */}
      <circle cx={-12} cy={0} r={1.8} fill={isOccupied ? '#10B981' : '#F59E0B'} />
      <circle cx={12} cy={0} r={1.8} fill={isOccupied ? '#10B981' : '#F59E0B'} />

      {/* 6. Alignment Arrow / Dock Status Text on Hover */}
      {!isOccupied && (
        <path
          d="M0 -22 L-4 -28 L4 -28 Z"
          fill={isLight ? '#D4AF37' : '#E7C768'}
          opacity="0.9"
        />
      )}
    </g>
  );
};
