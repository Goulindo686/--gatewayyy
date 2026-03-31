'use client';

import { useEffect, useRef } from 'react';

export default function HeroBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0;

    // ── Partículas ──────────────────────────────────────────
    const PARTICLE_COUNT = 72;
    type Particle = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string };
    const particles: Particle[] = [];
    const COLORS = ['#6c5ce7', '#a29bfe', '#00cec9', '#ffffff'];

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.6 + 0.2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
    };

    // ── Resize ───────────────────────────────────────────────
    const resize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      initParticles();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ── Draw ─────────────────────────────────────────────────
    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // Fundo gradiente escuro
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#07071a');
      bg.addColorStop(0.5, '#0d0b2a');
      bg.addColorStop(1, '#060614');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Grade 3D perspectiva ──────────────────────────────
      const GRID_LINES = 14;
      const horizon = H * 0.52;
      const vanishX = W * 0.5;

      ctx.save();
      // Linhas horizontais (paralelas ao horizonte)
      for (let i = 0; i <= GRID_LINES; i++) {
        const progress = i / GRID_LINES;
        // perspectiva: linhas mais próximas ficam mais espaçadas
        const y = horizon + (H - horizon) * Math.pow(progress, 1.8);
        const alpha = 0.04 + progress * 0.18;
        const spread = W * 0.5 + W * 0.6 * progress;
        const x0 = vanishX - spread;
        const x1 = vanishX + spread;

        const grad = ctx.createLinearGradient(x0, y, x1, y);
        grad.addColorStop(0, `rgba(108,92,231,0)`);
        grad.addColorStop(0.3, `rgba(108,92,231,${alpha})`);
        grad.addColorStop(0.5, `rgba(162,155,254,${alpha * 1.4})`);
        grad.addColorStop(0.7, `rgba(108,92,231,${alpha})`);
        grad.addColorStop(1, `rgba(108,92,231,0)`);

        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = progress < 0.3 ? 0.5 : 1;
        ctx.stroke();
      }

      // Linhas verticais convergindo para o ponto de fuga
      const V_LINES = 18;
      for (let i = 0; i <= V_LINES; i++) {
        const progress = i / V_LINES;
        const xBottom = W * progress;
        const alpha = 0.06 + Math.sin(progress * Math.PI) * 0.12;

        const grad = ctx.createLinearGradient(vanishX, horizon, xBottom, H);
        grad.addColorStop(0, `rgba(108,92,231,0)`);
        grad.addColorStop(0.4, `rgba(108,92,231,${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(162,155,254,${alpha})`);

        ctx.beginPath();
        ctx.moveTo(vanishX, horizon);
        ctx.lineTo(xBottom, H);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();

      // ── Glow no horizonte ─────────────────────────────────
      const glowGrad = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, W * 0.55);
      glowGrad.addColorStop(0, `rgba(108,92,231,${0.18 + Math.sin(t) * 0.04})`);
      glowGrad.addColorStop(0.4, `rgba(108,92,231,0.06)`);
      glowGrad.addColorStop(1, 'rgba(108,92,231,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);

      // Glow ciano secundário
      const cyanGlow = ctx.createRadialGradient(W * 0.75, H * 0.3, 0, W * 0.75, H * 0.3, W * 0.35);
      cyanGlow.addColorStop(0, `rgba(0,206,201,${0.08 + Math.sin(t * 0.7) * 0.03})`);
      cyanGlow.addColorStop(1, 'rgba(0,206,201,0)');
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, W, H);

      // ── Partículas ────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // ── Conexões entre partículas próximas ───────────────
      const MAX_DIST = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(162,155,254,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // ── Linha de scan animada ─────────────────────────────
      const scanY = horizon + (H - horizon) * ((t * 0.3) % 1);
      const scanGrad = ctx.createLinearGradient(0, scanY, W, scanY);
      scanGrad.addColorStop(0, 'rgba(162,155,254,0)');
      scanGrad.addColorStop(0.4, 'rgba(162,155,254,0.12)');
      scanGrad.addColorStop(0.6, 'rgba(0,206,201,0.18)');
      scanGrad.addColorStop(1, 'rgba(162,155,254,0)');
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(W, scanY);
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vinheta nas bordas
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
}
