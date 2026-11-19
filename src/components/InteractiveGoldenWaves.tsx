import React, { useEffect, useRef } from 'react';

export default function InteractiveGoldenWaves() {
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

    // Highly premium wider and more curved wave trajectories
    const waves = [
      {
        baseRatioX: 0.76,
        amplitude: 140,
        frequency: 0.0022,
        speed: 0.0025,
        phase: 0,
        lineWidth: 1.2,
        lineCount: 14,
        lineSpacing: 11,
        opacityFactor: 1.0,
      },
      {
        baseRatioX: 0.48,
        amplitude: 115,
        frequency: 0.0028,
        speed: -0.0018,
        phase: Math.PI / 3,
        lineWidth: 1.0,
        lineCount: 12,
        lineSpacing: 13,
        opacityFactor: 0.8,
      },
      {
        baseRatioX: 0.22,
        amplitude: 95,
        frequency: 0.0018,
        speed: 0.0012,
        phase: (Math.PI * 2) / 3,
        lineWidth: 0.8,
        lineCount: 10,
        lineSpacing: 15,
        opacityFactor: 0.6,
      },
    ];

    // Star dust particles
    const particles: Array<{
      x: number;
      y: number;
      speedY: number;
      speedX: number;
      size: number;
      alpha: number;
      pulseSpeed: number;
      pulsePhase: number;
      waveIndex: number;
    }> = [];

    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: -(0.25 + Math.random() * 0.65),
        speedX: (Math.random() - 0.5) * 0.15,
        size: 0.8 + Math.random() * 1.6,
        alpha: 0.1 + Math.random() * 0.5,
        pulseSpeed: 0.01 + Math.random() * 0.025,
        pulsePhase: Math.random() * Math.PI,
        waveIndex: Math.floor(Math.random() * waves.length),
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
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
      // Fluid overlay loop
      ctx.fillStyle = 'rgba(7, 7, 7, 1)';
      ctx.fillRect(0, 0, width, height);

      // Lerp mouse coordinates
      const mouse = mouseRef.current;
      if (mouse.targetX !== -1000) {
        if (mouse.x === -1000) {
          mouse.x = mouse.targetX;
          mouse.y = mouse.targetY;
        } else {
          mouse.x += (mouse.targetX - mouse.x) * 0.08;
          mouse.y += (mouse.targetY - mouse.y) * 0.08;
        }
      } else {
        mouse.x = -1000;
        mouse.y = -1000;
      }

      // Draw Wave Ribbons
      waves.forEach((wave) => {
        wave.phase += wave.speed;
        const baseAbsoluteX = width * wave.baseRatioX;
        const mid = (wave.lineCount - 1) / 2;

        // Draw multiple woven line tracks to form the wide gradient ribbon
        for (let l = 0; l < wave.lineCount; l++) {
          const distFromCenter = Math.abs(l - mid) / mid; // 0 at center, 1 at edges

          // Organic spacing expander that fluctuates along the Y axis
          const spacingFactor = 1.0 + 0.4 * Math.sin(wave.phase * 0.6);
          const offset = (l - mid) * wave.lineSpacing * spacingFactor;

          // Unique phase displacement per line to make them non-parallel and interwoven
          const linePhaseShift = (l - mid) * 0.032;

          ctx.beginPath();
          ctx.lineWidth = wave.lineWidth * (1.3 - distFromCenter * 0.4);

          // Calculate premium adjacent gradient colors
          // Center is warm bright gold/white-yellow; Edges are rich amber/copper
          const hue = 38 + (1 - distFromCenter) * 14; // ranges 38 to 52
          const lightness = 42 + (1 - distFromCenter) * 28; // ranges 42% to 70%
          const alpha = (0.04 + (1 - distFromCenter) * 0.28) * wave.opacityFactor;

          ctx.strokeStyle = `hsla(${hue}, 92%, ${lightness}%, ${alpha})`;

          // Shadow glow effect for center ribbons
          if (l === Math.floor(mid) || l === Math.floor(mid) + 1) {
            ctx.shadowColor = `hsla(${hue}, 92%, 60%, 0.45)`;
            ctx.shadowBlur = 12;
          } else {
            ctx.shadowBlur = 0;
          }

          for (let y = 0; y <= height; y += 10) {
            const angle = y * wave.frequency + wave.phase + linePhaseShift;
            const secondaryAngle = y * (wave.frequency * 2.3) + (wave.phase * 1.4) + (l * 0.01);
            
            // Mouse interactive reaction
            let reactionX = 0;
            if (mouse.x !== -1000) {
              const dx = baseAbsoluteX - mouse.x;
              const dy = y - mouse.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 260) {
                const factor = (1 - dist / 260) * 55;
                reactionX = Math.sin(dy * 0.012) * factor;
              }
            }

            // Woven, multi-harmonic curved calculation
            const waveOffset = Math.sin(angle) * wave.amplitude + Math.sin(secondaryAngle) * (wave.amplitude * 0.38);
            const x = baseAbsoluteX + waveOffset + offset + reactionX;

            if (y === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      });

      // Clear shadows for sparkles
      ctx.shadowBlur = 0;

      // Draw gold dust particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulsePhase += p.pulseSpeed;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const opacity = p.alpha * (0.35 + 0.65 * Math.sin(p.pulsePhase));
        
        // Attract particles slightly towards wave ribbons for coherence
        const wave = waves[p.waveIndex];
        const baseW = width * wave.baseRatioX;
        const targetWaveX = baseW + Math.sin(p.y * wave.frequency + wave.phase) * wave.amplitude;
        p.x += (targetWaveX - p.x) * 0.006;

        if (mouse.x !== -1000) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const force = (130 - dist) * 0.025;
            const dirAngle = Math.atan2(dy, dx);
            p.x += Math.cos(dirAngle) * force;
            p.y += Math.sin(dirAngle) * force;
          }
        }

        ctx.beginPath();
        const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        radGrad.addColorStop(0, `rgba(255, 248, 185, ${opacity})`);
        radGrad.addColorStop(0.3, `rgba(212, 175, 55, ${opacity * 0.55})`);
        radGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
        
        ctx.fillStyle = radGrad;
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
      id="golden-waves-canvas"
    />
  );
}
