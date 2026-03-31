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
    const PARTICLE_COUNT = 90;
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; color: string; pulse: number;
    };
    const particles: Particle[] = [];
    const COLORS = ['#6c5ce7', '#a29bfe', '#00cec9', '#ffffff', '#8e44ad'];

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 2.2 + 0.4,
          alpha: Math.random() * 0.5 + 0.15,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          pulse: Math.random() * Math.PI * 2,
        });
      }
    };

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

    // ── Desenha o símbolo GouPay ─────────────────────────────
    // Dois arcos que formam um "G" estilizado / fluxo circular
    const drawSymbol = (cx: number, cy: number, size: number, t: number) => {
      ctx.save();
      ctx.translate(cx, cy);

      const R = size;
      const lineW = size * 0.055;

      // Rotação lenta
      ctx.rotate(t * 0.18);

      // Arco externo — roxo
      const grad1 = ctx.createConicalGradient
        ? null
        : ctx.createLinearGradient(-R, -R, R, R);

      // Arco 1 — grande, roxo/ciano
      ctx.beginPath();
      ctx.arc(0, 0, R, -Math.PI * 0.1, Math.PI * 1.5);
      ctx.strokeStyle = `rgba(108,92,231,${0.7 + Math.sin(t) * 0.15})`;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Ponto brilhante no fim do arco 1
      const a1End = Math.PI * 1.5;
      ctx.beginPath();
      ctx.arc(
        Math.cos(a1End) * R,
        Math.sin(a1End) * R,
        lineW * 1.8, 0, Math.PI * 2
      );
      ctx.fillStyle = '#a29bfe';
      ctx.fill();

      // Arco 2 — menor, ciano, rotacionado
      ctx.rotate(Math.PI * 0.55);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.62, -Math.PI * 0.15, Math.PI * 1.4);
      ctx.strokeStyle = `rgba(0,206,201,${0.65 + Math.sin(t * 1.3) * 0.15})`;
      ctx.lineWidth = lineW * 0.85;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Ponto brilhante no fim do arco 2
      const a2End = Math.PI * 1.4;
      ctx.beginPath();
      ctx.arc(
        Math.cos(a2End) * R * 0.62,
        Math.sin(a2End) * R * 0.62,
        lineW * 1.4, 0, Math.PI * 2
      );
      ctx.fillStyle = '#00cec9';
      ctx.fill();

      // Arco 3 — pequeno, branco, ângulo diferente
      ctx.rotate(-Math.PI * 0.9);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.32, Math.PI * 0.2, Math.PI * 1.7);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + Math.sin(t * 0.8) * 0.1})`;
      ctx.lineWidth = lineW * 0.6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow central
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
      glow.addColorStop(0, `rgba(108,92,231,${0.18 + Math.sin(t * 1.2) * 0.06})`);
      glow.addColorStop(1, 'rgba(108,92,231,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // ── Draw loop ────────────────────────────────────────────
    let t = 0;
    const draw = () => {
      t += 0.012;
      ctx.clearRect(0, 0, W, H);

      // Fundo gradiente escuro premium
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#06061a');
      bg.addColorStop(0.45, '#0c0a28');
      bg.addColorStop(1, '#050512');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Grade 3D perspectiva ──────────────────────────────
      const GRID_H = 16, GRID_V = 22;
      const horizon = H * 0.54;
      const vanishX = W * 0.5;

      // Linhas horizontais
      for (let i = 0; i <= GRID_H; i++) {
        const p = i / GRID_H;
        const y = horizon + (H - horizon) * Math.pow(p, 1.7);
        const alpha = 0.03 + p * 0.16;
        const spread = W * 0.5 + W * 0.65 * p;

        const g = ctx.createLinearGradient(vanishX - spread, y, vanishX + spread, y);
        g.addColorStop(0, 'rgba(108,92,231,0)');
        g.addColorStop(0.25, `rgba(108,92,231,${alpha})`);
        g.addColorStop(0.5, `rgba(162,155,254,${alpha * 1.5})`);
        g.addColorStop(0.75, `rgba(108,92,231,${alpha})`);
        g.addColorStop(1, 'rgba(108,92,231,0)');

        ctx.beginPath();
        ctx.moveTo(vanishX - spread, y);
        ctx.lineTo(vanishX + spread, y);
        ctx.strokeStyle = g;
        ctx.lineWidth = p < 0.2 ? 0.4 : 0.9;
        ctx.stroke();
      }

      // Linhas verticais
      for (let i = 0; i <= GRID_V; i++) {
        const p = i / GRID_V;
        const xB = W * p;
        const alpha = 0.04 + Math.sin(p * Math.PI) * 0.1;

        const g = ctx.createLinearGradient(vanishX, horizon, xB, H);
        g.addColorStop(0, 'rgba(108,92,231,0)');
        g.addColorStop(0.5, `rgba(108,92,231,${alpha * 0.7})`);
        g.addColorStop(1, `rgba(162,155,254,${alpha})`);

        ctx.beginPath();
        ctx.moveTo(vanishX, horizon);
        ctx.lineTo(xB, H);
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // ── Glows de fundo ────────────────────────────────────
      // Glow roxo principal no horizonte
      const g1 = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, W * 0.6);
      g1.addColorStop(0, `rgba(108,92,231,${0.22 + Math.sin(t * 0.7) * 0.05})`);
      g1.addColorStop(0.5, 'rgba(108,92,231,0.05)');
      g1.addColorStop(1, 'rgba(108,92,231,0)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      // Glow ciano direita
      const g2 = ctx.createRadialGradient(W * 0.78, H * 0.25, 0, W * 0.78, H * 0.25, W * 0.38);
      g2.addColorStop(0, `rgba(0,206,201,${0.1 + Math.sin(t * 0.9) * 0.04})`);
      g2.addColorStop(1, 'rgba(0,206,201,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // Glow roxo escuro esquerda
      const g3 = ctx.createRadialGradient(W * 0.15, H * 0.6, 0, W * 0.15, H * 0.6, W * 0.3);
      g3.addColorStop(0, `rgba(142,68,173,${0.12 + Math.sin(t * 1.1) * 0.04})`);
      g3.addColorStop(1, 'rgba(142,68,173,0)');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);

      // ── Símbolo GouPay — centro-direita ───────────────────
      const symX = W * 0.72;
      const symY = H * 0.48;
      const symSize = Math.min(W, H) * 0.18;

      // Halo atrás do símbolo
      const halo = ctx.createRadialGradient(symX, symY, 0, symX, symY, symSize * 1.6);
      halo.addColorStop(0, `rgba(108,92,231,${0.14 + Math.sin(t * 0.8) * 0.04})`);
      halo.addColorStop(1, 'rgba(108,92,231,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      drawSymbol(symX, symY, symSize, t);

      // Símbolo menor espelhado — canto esquerdo, mais sutil
      ctx.globalAlpha = 0.18;
      drawSymbol(W * 0.12, H * 0.3, symSize * 0.45, t * 0.6 + 2);
      ctx.globalAlpha = 1;

      // ── Partículas ────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.03;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        const a = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(a * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Conexões
      const MAX_DIST = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(162,155,254,${(1 - dist / MAX_DIST) * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // ── Linha de scan ─────────────────────────────────────
      const scanY = horizon + (H - horizon) * ((t * 0.25) % 1);
      const sg = ctx.createLinearGradient(0, scanY, W, scanY);
      sg.addColorStop(0, 'rgba(162,155,254,0)');
      sg.addColorStop(0.35, 'rgba(162,155,254,0.14)');
      sg.addColorStop(0.5, 'rgba(0,206,201,0.22)');
      sg.addColorStop(0.65, 'rgba(162,155,254,0.14)');
      sg.addColorStop(1, 'rgba(162,155,254,0)');
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(W, scanY);
      ctx.strokeStyle = sg;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Vinheta ───────────────────────────────────────────
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.62)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
