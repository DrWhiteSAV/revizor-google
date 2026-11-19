import React, { useState, useEffect } from 'react';
import { ASTRONAUT_PHRASES } from '../../data/astronautPhrases';

interface AstronautSVGProps {
  id: string;
  isLight: boolean;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  initialX?: number;
  initialY?: number;
  employeeName?: string;
  employee?: any;
  zoom?: number;
  onClick?: () => void;
  onDragStart?: (e: React.MouseEvent, employee: any) => void;
}

export const AstronautSVG: React.FC<AstronautSVGProps> = ({
  id,
  isLight,
  bounds,
  initialX = 0,
  initialY = 0,
  employeeName = 'Сотрудник',
  employee,
  zoom = 1,
  onClick,
  onDragStart
}) => {
  // Coordinates inside room
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = right, -1 = left
  const [isWalking, setIsWalking] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);

  // Speech phrase state
  const [currentPhrase, setCurrentPhrase] = useState<string | null>(null);
  const [typedLength, setTypedLength] = useState<number>(0);

  // Movement loop
  useEffect(() => {
    let isMounted = true;
    let walkTimeout: any = null;

    const performMove = () => {
      if (!isMounted) return;
      
      const spanX = bounds.maxX - bounds.minX;
      const spanY = bounds.maxY - bounds.minY;
      
      // Random coordinates inside container bounds with horizontal and vertical dispersion
      const targetX = bounds.minX + Math.random() * spanX;
      const targetY = bounds.minY + Math.random() * spanY;

      setPos(prev => {
        setDirection(targetX >= prev.x ? 1 : -1);
        return { x: Math.round(targetX), y: Math.round(targetY) };
      });
      setIsWalking(true);

      if (walkTimeout) clearTimeout(walkTimeout);
      walkTimeout = setTimeout(() => {
        if (isMounted) setIsWalking(false);
      }, 2600);
    };

    // Initial movement delay
    const initialTimer = setTimeout(performMove, 800 + Math.random() * 1500);
    
    // Continuous random wandering interval (every 3.5 - 6.5 seconds)
    const moveInterval = setInterval(() => {
      performMove();
    }, 3500 + Math.random() * 3000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      if (walkTimeout) clearTimeout(walkTimeout);
      clearInterval(moveInterval);
    };
  }, [bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]);

  // Speech phrases loop
  useEffect(() => {
    const talkInterval = setInterval(() => {
      if (!currentPhrase && Math.random() < 0.5) {
        triggerNewPhrase();
      }
    }, 6000 + Math.random() * 5000);

    return () => clearInterval(talkInterval);
  }, [currentPhrase]);

  // Function to trigger a phrase
  const triggerNewPhrase = (specificPhrase?: string) => {
    const text = specificPhrase || ASTRONAUT_PHRASES[Math.floor(Math.random() * ASTRONAUT_PHRASES.length)];
    setCurrentPhrase(text);
    setTypedLength(0);
  };

  // Typewriter effect interval: 20 chars per sec = 50ms per char
  useEffect(() => {
    if (!currentPhrase) return;

    if (typedLength < currentPhrase.length) {
      const typeTimer = setTimeout(() => {
        setTypedLength(prev => prev + 1);
      }, 50); // 20 chars / sec
      return () => clearTimeout(typeTimer);
    } else {
      // Hold completed message for 4.5 seconds then hide
      const hideTimer = setTimeout(() => {
        setCurrentPhrase(null);
        setTypedLength(0);
      }, 4500);
      return () => clearTimeout(hideTimer);
    }
  }, [currentPhrase, typedLength]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartPos) return;
    const dx = Math.abs(e.clientX - dragStartPos.x);
    const dy = Math.abs(e.clientY - dragStartPos.y);
    if (dx > 4 || dy > 4) {
      // Drag threshold exceeded -> Start Drag & Drop
      setDragStartPos(null);
      if (onDragStart) {
        onDragStart(e, employee || { id, name: employeeName });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragStartPos) {
      setDragStartPos(null);
      triggerNewPhrase();
      if (onClick) onClick();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Format current typed text into wrapped lines (max ~20 chars per line)
  const displayedText = currentPhrase ? currentPhrase.slice(0, typedLength) : '';

  const wrapText = (str: string, maxLen: number = 20) => {
    if (!str) return [];
    const words = str.split(' ');
    const lines: string[] = [];
    let cur = '';

    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= maxLen) {
        cur = (cur + ' ' + w).trim();
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const lines = wrapText(displayedText, 20);
  const lineCount = Math.max(lines.length, 1);
  const maxLineLen = Math.max(...lines.map(l => l.length), 1);
  const boxWidth = Math.max(maxLineLen * 6.4 + 16, 75);
  const boxHeight = lineCount * 13 + 12;

  // Palette: Gold for dark theme, Gold with dark accents for light theme
  const bodyFill = isLight ? 'url(#goldDarkAccent)' : 'url(#goldFullPure)';
  const visorFill = isLight ? '#0284C7' : '#38BDF8';
  const shadowColor = isLight ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.5)';

  return (
    <g
      id={`astronaut-${id}`}
      transform={`translate(${pos.x}, ${pos.y})`}
      style={{ transition: 'transform 2.4s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
      className="select-none cursor-grab active:cursor-grabbing hover:scale-110"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      pointerEvents="all"
    >
      {/* Speech Bubble - Clean overlay, font 10, word wrapped, typing 20 chars/sec */}
      {currentPhrase && (
        <g transform={`translate(0, -36) scale(${1 / zoom})`} pointerEvents="none">
          {/* Bubble Background */}
          <rect
            x={-boxWidth / 2}
            y={-boxHeight}
            width={boxWidth}
            height={boxHeight}
            rx="8"
            fill={isLight ? '#FFFFFF' : '#0F172A'}
            stroke="#D4AF37"
            strokeWidth="1.5"
            filter="drop-shadow(0px 4px 12px rgba(0,0,0,0.45))"
          />
          {/* Bubble Tail */}
          <polygon
            points="-4,0 4,0 0,6"
            fill={isLight ? '#FFFFFF' : '#0F172A'}
          />
          {/* Bubble Text (Font size 10, multi-line) */}
          <text
            x="0"
            y={-boxHeight + 14}
            textAnchor="middle"
            fill={isLight ? '#0F172A' : '#F8FAFC'}
            fontSize="10"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            {lines.map((line, idx) => (
              <tspan key={idx} x="0" dy={idx === 0 ? 0 : 13}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )}

      {/* Astronaut Character Group with Flip Direction */}
      <g transform={`scale(${direction}, 1)`}>
        {/* Drop Shadow */}
        <ellipse cx="0" cy="14" rx="10" ry="4" fill={shadowColor} />

        {/* Waddling Animation Wrapper */}
        <g className={isWalking ? 'animate-pulse' : ''}>
          {/* Backpack (Oxygen Tank) */}
          <rect
            x="-14"
            y="-10"
            width="6"
            height="18"
            rx="3"
            fill={isLight ? '#334155' : '#B8860B'}
            stroke="#D4AF37"
            strokeWidth="1"
          />

          {/* Main Body */}
          <path
            d="M -9 -14 
               C -9 -22, 9 -22, 9 -14 
               L 9 6 
               C 9 12, 5 12, 4 12 
               L 4 15 
               C 4 17, 1 17, 1 15 
               L 1 11 
               L -1 11 
               L -1 15 
               C -1 17, -4 17, -4 15 
               L -4 12 
               C -5 12, -9 12, -9 6 
               Z"
            fill={bodyFill}
            stroke={isLight ? '#1E293B' : '#FFE57F'}
            strokeWidth="1.2"
          />

          {/* Visor */}
          <ellipse
            cx="3"
            cy="-11"
            rx="6.5"
            ry="4.5"
            fill={visorFill}
            stroke="#FFFFFF"
            strokeWidth="0.8"
          />

          {/* Visor Glare */}
          <ellipse
            cx="4.5"
            cy="-12.5"
            rx="2.5"
            ry="1.5"
            fill="#FFFFFF"
            opacity="0.85"
          />

          {/* Gold Suite Chest Emblem */}
          <circle cx="-2" cy="-1" r="1.5" fill="#E7C768" />
        </g>
      </g>

      {/* Real Employee Name Tag under feet */}
      <g transform={`translate(0, 22) scale(${1 / zoom})`}>
        <rect
          x={-employeeName.length * 3.2 - 6}
          y="-9"
          width={employeeName.length * 6.4 + 12}
          height="14"
          rx="7"
          fill={isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,23,42,0.92)'}
          stroke={isLight ? '#CBD5E1' : '#D4AF37'}
          strokeWidth="1"
        />
        <text
          x="0"
          y="1"
          textAnchor="middle"
          fill={isLight ? '#0F172A' : '#F8FAFC'}
          fontSize="9"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          {employeeName}
        </text>
      </g>

      {/* Definitions for Gold Gradients */}
      <defs>
        <linearGradient id="goldFullPure" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE57F" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#996515" />
        </linearGradient>

        <linearGradient id="goldDarkAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E7C768" />
          <stop offset="60%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
    </g>
  );
};
