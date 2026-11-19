import React from 'react';

interface TaskSaturnBackgroundProps {
  parallaxOffset: { x: number; y: number };
}

export const TaskSaturnBackground: React.FC<TaskSaturnBackgroundProps> = ({ parallaxOffset }) => {
  return (
    <div 
      style={{
        transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
        transition: 'transform 0.1s linear'
      }}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-transparent" />

      {/* Giant 3D SVG Saturn Planet in the Background */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] sm:w-[820px] sm:h-[820px] pointer-events-none opacity-85 select-none">
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_0_40px_rgba(217,158,65,0.45)]">
          <defs>
            <radialGradient id="bg-task-saturn-sphere" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FFF8C0" />
              <stop offset="25%" stopColor="#F4EE8E" />
              <stop offset="55%" stopColor="#D99E41" />
              <stop offset="85%" stopColor="#8A5A1B" />
              <stop offset="100%" stopColor="#2A1804" />
            </radialGradient>
            <radialGradient id="bg-task-saturn-glow" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#F4EE8E" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#D99E41" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bg-task-saturn-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF5A0" />
              <stop offset="50%" stopColor="#E7C768" />
              <stop offset="100%" stopColor="#9E7322" />
            </linearGradient>
          </defs>

          {/* 1. BACK PORTION OF SATURN RINGS */}
          <g transform="translate(200, 200) rotate(-22)">
            <path 
              d="M 190,0 A 190 52 0 0 0 -190,0" 
              fill="none" 
              stroke="url(#bg-task-saturn-ring)" 
              strokeWidth="12" 
              strokeLinecap="round"
              opacity="0.85"
            />
            <path 
              d="M 170,0 A 170 44 0 0 0 -170,0" 
              fill="none" 
              stroke="#F4EE8E" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              opacity="0.9"
            />
            <path 
              d="M 150,0 A 150 38 0 0 0 -150,0" 
              fill="none" 
              stroke="#E7C768" 
              strokeWidth="1.5" 
              strokeLinecap="round"
              opacity="0.6"
            />
          </g>

          {/* 2. OUTER ATMOSPHERE GLOW */}
          <circle cx="200" cy="200" r="130" fill="url(#bg-task-saturn-glow)" />

          {/* 3. MAIN PLANET SPHERE */}
          <circle cx="200" cy="200" r="110" fill="url(#bg-task-saturn-sphere)" />

          {/* 4. LATITUDE WIREFRAME RINGS */}
          <g opacity="0.35" stroke="#FFF8C0" strokeWidth="1" fill="none">
            <ellipse cx="200" cy="200" rx="110" ry="15" />
            <ellipse cx="200" cy="200" rx="108" ry="32" />
            <ellipse cx="200" cy="200" rx="102" ry="52" />
            <ellipse cx="200" cy="200" rx="90" ry="72" />
            <ellipse cx="200" cy="200" rx="70" ry="92" />
          </g>

          {/* 5. FRONT PORTION OF SATURN RINGS */}
          <g transform="translate(200, 200) rotate(-22)">
            <path 
              d="M -190,0 A 190 52 0 0 0 190,0" 
              fill="none" 
              stroke="url(#bg-task-saturn-ring)" 
              strokeWidth="12" 
              strokeLinecap="round"
              opacity="0.95"
            />
            <path 
              d="M -170,0 A 170 44 0 0 0 170,0" 
              fill="none" 
              stroke="#F4EE8E" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <path 
              d="M -150,0 A 150 38 0 0 0 150,0" 
              fill="none" 
              stroke="#E7C768" 
              strokeWidth="1.5" 
              strokeLinecap="round"
              strokeOpacity="0.75"
            />
          </g>
        </svg>
      </div>

      {/* Orbiting Satellites and Golden Scanning Arcs */}
      <div className="absolute top-1/4 right-1/3 w-3 h-3 rounded-full bg-amber-300 shadow-[0_0_15px_#E7C768] animate-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_12px_#F4EE8E] animate-ping opacity-75" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[780px] h-[780px] rounded-full border border-amber-400/10 border-t-amber-400/40 animate-spin opacity-40 pointer-events-none" />
    </div>
  );
};
