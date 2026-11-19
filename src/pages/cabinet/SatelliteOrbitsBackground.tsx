import React, { useEffect, useRef } from 'react';

interface SatelliteOrbitsBackgroundProps {
  theme?: 'dark' | 'light';
}

export default function SatelliteOrbitsBackground({ theme = 'dark' }: SatelliteOrbitsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Systems representing galaxies/star systems floating in the background
    const systems = [
      {
        centerX: width * 0.25,
        centerY: height * 0.3,
        coreRadius: 12,
        satellites: [
          { radius: 45, speed: 0.007, angle: Math.random() * Math.PI * 2, size: 2 },
          { radius: 80, speed: 0.004, angle: Math.random() * Math.PI * 2, size: 3.5 },
          { radius: 130, speed: 0.002, angle: Math.random() * Math.PI * 2, size: 4.5 },
        ],
        pulse: 0,
        color: theme === 'dark' ? 'rgba(231, 199, 104, 0.4)' : 'rgba(180, 140, 60, 0.35)',
      },
      {
        centerX: width * 0.75,
        centerY: height * 0.25,
        coreRadius: 18,
        satellites: [
          { radius: 55, speed: -0.006, angle: Math.random() * Math.PI * 2, size: 2.5 },
          { radius: 100, speed: 0.003, angle: Math.random() * Math.PI * 2, size: 4 },
          { radius: 160, speed: -0.0015, angle: Math.random() * Math.PI * 2, size: 5 },
        ],
        pulse: Math.PI / 3,
        color: theme === 'dark' ? 'rgba(244, 238, 142, 0.3)' : 'rgba(217, 158, 65, 0.3)',
      },
      {
        centerX: width * 0.5,
        centerY: height * 0.75,
        coreRadius: 15,
        satellites: [
          { radius: 60, speed: 0.005, angle: Math.random() * Math.PI * 2, size: 3 },
          { radius: 110, speed: -0.0035, angle: Math.random() * Math.PI * 2, size: 4 },
          { radius: 180, speed: 0.0018, angle: Math.random() * Math.PI * 2, size: 5.5 },
        ],
        pulse: (Math.PI * 2) / 3,
        color: theme === 'dark' ? 'rgba(231, 199, 104, 0.35)' : 'rgba(160, 120, 50, 0.25)',
      }
    ];

    // Background stardust particles
    const particles: Array<{
      x: number;
      y: number;
      speedY: number;
      speedX: number;
      size: number;
      alpha: number;
      pulseSpeed: number;
      pulsePhase: number;
    }> = [];

    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: -(0.1 + Math.random() * 0.3),
        speedX: (Math.random() - 0.5) * 0.1,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.05 + Math.random() * 0.4,
        pulseSpeed: 0.005 + Math.random() * 0.015,
        pulsePhase: Math.random() * Math.PI,
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      // Reposition system centers proportionally
      systems[0].centerX = width * 0.25;
      systems[0].centerY = height * 0.3;
      systems[1].centerX = width * 0.75;
      systems[1].centerY = height * 0.25;
      systems[2].centerX = width * 0.5;
      systems[2].centerY = height * 0.75;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.targetX = e.touches[0].clientX;
        mouseRef.current.targetY = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = -1000;
      mouseRef.current.targetY = -1000;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    const draw = () => {
      // Background base fill depending on theme
      if (theme === 'dark') {
        ctx.fillStyle = 'rgba(7, 7, 7, 1)';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = 'rgba(245, 245, 245, 1)';
        ctx.fillRect(0, 0, width, height);
      }

      // Lerp mouse
      const mouse = mouseRef.current;
      if (mouse.targetX !== -1000) {
        if (mouse.x === -1000) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        } else {
          mouse.x += (mouse.targetX - mouse.x) * 0.05;
          mouse.y += (mouse.targetY - mouse.y) * 0.05;
        }
      } else {
        mouse.x = -1000;
        mouse.y = -1000;
      }

      // Draw background space dust
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulsePhase += p.pulseSpeed;

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const currentAlpha = p.alpha * (0.4 + 0.6 * Math.sin(p.pulsePhase));

        // Let mouse push dust slightly
        let drawX = p.x;
        let drawY = p.y;
        if (mouse.x !== -1000) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const force = (180 - dist) / 180;
            drawX += (dx / dist) * force * 15;
            drawY += (dy / dist) * force * 15;
          }
        }

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        if (theme === 'dark') {
          ctx.fillStyle = `rgba(231, 199, 104, ${currentAlpha})`;
        } else {
          ctx.fillStyle = `rgba(130, 100, 30, ${currentAlpha * 0.7})`;
        }
        ctx.fill();
      });

      // Draw Orbiting Systems
      systems.forEach((system) => {
        system.pulse += 0.01;
        const currentPulseRadius = system.coreRadius + Math.sin(system.pulse) * 1.5;

        // Attract system centers slightly to mouse
        let sysCenterX = system.centerX;
        let sysCenterY = system.centerY;
        if (mouse.x !== -1000) {
          const dx = mouse.x - system.centerX;
          const dy = mouse.y - system.centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 350) {
            const pull = (350 - dist) / 350 * 8;
            sysCenterX += (dx / dist) * pull;
            sysCenterY += (dy / dist) * pull;
          }
        }

        // Draw glowing gradient core
        const glowGradient = ctx.createRadialGradient(
          sysCenterX, sysCenterY, 1,
          sysCenterX, sysCenterY, currentPulseRadius * 2.5
        );

        if (theme === 'dark') {
          glowGradient.addColorStop(0, 'rgba(244, 238, 142, 0.7)');
          glowGradient.addColorStop(0.3, 'rgba(231, 199, 104, 0.3)');
          glowGradient.addColorStop(1, 'rgba(231, 199, 104, 0)');
        } else {
          glowGradient.addColorStop(0, 'rgba(160, 110, 30, 0.45)');
          glowGradient.addColorStop(0.4, 'rgba(217, 158, 65, 0.15)');
          glowGradient.addColorStop(1, 'rgba(217, 158, 65, 0)');
        }

        ctx.beginPath();
        ctx.arc(sysCenterX, sysCenterY, currentPulseRadius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Draw orbits and satellites
        system.satellites.forEach((sat) => {
          sat.angle += sat.speed;

          // Orbit path line
          ctx.beginPath();
          ctx.arc(sysCenterX, sysCenterY, sat.radius, 0, Math.PI * 2);
          if (theme === 'dark') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
            ctx.lineWidth = 0.8;
          } else {
            ctx.strokeStyle = 'rgba(160, 110, 30, 0.06)';
            ctx.lineWidth = 0.8;
          }
          ctx.stroke();

          // Satellite position
          const satX = sysCenterX + Math.cos(sat.angle) * sat.radius;
          const satY = sysCenterY + Math.sin(sat.angle) * sat.radius;

          // Satellite core
          ctx.beginPath();
          ctx.arc(satX, satY, sat.size, 0, Math.PI * 2);
          if (theme === 'dark') {
            ctx.fillStyle = 'rgba(244, 238, 142, 0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#E7C768';
          } else {
            ctx.fillStyle = 'rgba(160, 110, 30, 0.85)';
            ctx.shadowBlur = 3;
            ctx.shadowColor = 'rgba(160, 110, 30, 0.4)';
          }
          ctx.fill();
          
          // Reset shadow
          ctx.shadowBlur = 0;

          // Tiny secondary orbits or tails for satellites
          if (sat.size > 3) {
            ctx.beginPath();
            ctx.arc(satX, satY, sat.size * 2, 0, Math.PI * 2);
            if (theme === 'dark') {
              ctx.strokeStyle = 'rgba(231, 199, 104, 0.15)';
            } else {
              ctx.strokeStyle = 'rgba(160, 110, 30, 0.12)';
            }
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0"
      id="satellite-orbits-canvas-bg"
    />
  );
}
