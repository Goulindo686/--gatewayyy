'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiZap, FiShield, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';

const LEFT_ITEMS = [
  { icon: <FiZap size={20} />, title: 'Pix instantâneo', desc: 'Receba em segundos, 24h por dia.' },
  { icon: <FiShield size={20} />, title: 'Segurança total', desc: 'Antifraude e SSL em cada transação.' },
];

const RIGHT_ITEMS = [
  { icon: <FiTrendingUp size={20} />, title: 'Taxa mais justa', desc: 'R$1,50 + 1,09% por venda.' },
  { icon: <FiBarChart2 size={20} />, title: 'Dashboard completo', desc: 'Métricas em tempo real.' },
];

// 3 placas de premiação
const PLAQUES = [
  {
    id: 'p100k',
    milestone: '100K',
    label: 'Vendas realizadas',
    sub: 'Primeira conquista',
    bg: 'linear-gradient(135deg, #b8860b 0%, #daa520 40%, #ffd700 70%, #b8860b 100%)',
    border: 'rgba(255,215,0,0.6)',
    glow: 'rgba(218,165,32,0.5)',
    textColor: '#3d2800',
    starColor: '#b8860b',
    shine: 'rgba(255,255,255,0.35)',
  },
  {
    id: 'p500k',
    milestone: '500K',
    label: 'Vendas realizadas',
    sub: 'Elite GouPay',
    bg: 'linear-gradient(135deg, #9e9e9e 0%, #c0c0c0 40%, #e8e8e8 70%, #9e9e9e 100%)',
    border: 'rgba(220,220,220,0.7)',
    glow: 'rgba(192,192,192,0.5)',
    textColor: '#1a1a1a',
    starColor: '#888',
    shine: 'rgba(255,255,255,0.45)',
  },
  {
    id: 'p1m',
    milestone: '1M',
    label: 'Vendas realizadas',
    sub: 'Lenda GouPay',
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 40%, #2a2a2a 70%, #0a0a0a 100%)',
    border: 'rgba(255,255,255,0.15)',
    glow: 'rgba(108,92,231,0.6)',
    textColor: 'rgba(255,255,255,0.92)',
    starColor: 'rgba(255,255,255,0.7)',
    shine: 'rgba(255,255,255,0.08)',
  },
];

export default function ScrollCardSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const plaque0Ref = useRef<HTMLDivElement>(null);
  const plaque1Ref = useRef<HTMLDivElement>(null);
  const plaque2Ref = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    let ctx: any;

    const init = async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const section = sectionRef.current;
      if (!section) return;

      if (isMobile) {
        // Mobile: mostra tudo imediatamente, sem animação
        if (orbRef.current) orbRef.current.style.transform = 'scale(1)';
        [plaque0Ref, plaque1Ref, plaque2Ref, rightRef, headingRef, ctaRef].forEach(r => {
          if (r.current) { r.current.style.opacity = '1'; r.current.style.transform = 'none'; }
        });
        return;
      }

      // Desktop: animação scrub com pin
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=3000',
            scrub: 1.5,
            pin: true,
            anticipatePin: 1,
            fastScrollEnd: true,
          }
        });

        tl.to(orbRef.current, { scale: 1, duration: 3, ease: 'power2.inOut' }, 0);

        tl.fromTo(plaque0Ref.current,
          { opacity: 0, scale: 0.7, rotateY: -30 },
          { opacity: 1, scale: 1, rotateY: 0, duration: 0.8, ease: 'back.out(1.4)' }, 0.5
        );
        tl.to(plaque0Ref.current,
          { opacity: 0, scale: 0.8, x: -80, rotateY: 20, duration: 0.5, ease: 'power2.in' }, 1.4
        );
        tl.fromTo(plaque1Ref.current,
          { opacity: 0, scale: 0.7, rotateY: 30 },
          { opacity: 1, scale: 1, rotateY: 0, duration: 0.8, ease: 'back.out(1.4)' }, 1.6
        );
        tl.to(plaque1Ref.current,
          { opacity: 0, scale: 0.8, x: -80, rotateY: 20, duration: 0.5, ease: 'power2.in' }, 2.4
        );
        tl.fromTo(plaque2Ref.current,
          { opacity: 0, scale: 0.7, rotateY: 30 },
          { opacity: 1, scale: 1.05, rotateY: 0, duration: 0.9, ease: 'back.out(1.2)' }, 2.6
        );
        tl.to(leftRef.current, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, 2.7);
        tl.to(rightRef.current, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, 2.85);
        tl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 2.9);
        tl.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 3.0);
      }, section);
    };

    init();
    return () => ctx?.revert();
  }, []);

  const renderPlaque = (p: typeof PLAQUES[0], ref: React.RefObject<HTMLDivElement | null>, initialVisible = false) => (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        width: '280px',
        height: '380px',
        borderRadius: '24px',
        background: p.bg,
        border: `1.5px solid ${p.border}`,
        boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 60px ${p.glow}, inset 0 1px 0 ${p.shine}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        opacity: initialVisible ? 1 : 0,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        willChange: 'transform, opacity',
        overflow: 'hidden',
      }}
    >
      {/* Reflexo de vidro */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: `linear-gradient(160deg, ${p.shine} 0%, transparent 100%)`, borderRadius: '24px 24px 0 0', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '25%', background: `linear-gradient(90deg, ${p.shine} 0%, transparent 100%)`, pointerEvents: 'none' }} />

      {/* Moldura interna */}
      <div style={{ position: 'absolute', inset: 10, borderRadius: 16, border: `1px solid ${p.border}`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{
        width: 80, height: 80, borderRadius: 20,
        background: `rgba(0,0,0,0.15)`,
        border: `1px solid ${p.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 ${p.shine}`,
        position: 'relative', zIndex: 2,
      }}>
        <img
          src="https://i.imgur.com/qFq7IHR.png"
          alt="GouPay"
          style={{ width: 48, height: 48, objectFit: 'contain', filter: p.id === 'p1m' ? 'brightness(0) invert(1)' : 'brightness(0)' }}
        />
      </div>

      {/* Milestone */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: p.textColor, letterSpacing: -2, lineHeight: 1, textShadow: p.id === 'p1m' ? '0 0 30px rgba(108,92,231,0.5)' : 'none' }}>
          {p.milestone}
        </div>
        <div style={{ fontSize: 11, color: p.textColor, opacity: 0.7, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
          {p.label}
        </div>
      </div>

      {/* Divisor */}
      <div style={{ width: 60, height: 1, background: `linear-gradient(90deg, transparent, ${p.border}, transparent)`, position: 'relative', zIndex: 2 }} />

      {/* Sub */}
      <div style={{ fontSize: 13, color: p.textColor, opacity: 0.8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', position: 'relative', zIndex: 2 }}>
        {p.sub}
      </div>

      {/* Estrelas */}
      <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 2 }}>
        {[0,1,2,3,4].map(i => (
          <span key={i} style={{ fontSize: 14, color: p.starColor, opacity: i < 5 ? 1 : 0.2 }}>★</span>
        ))}
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        height: '100vh',
        background: '#06060c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        contain: 'layout style paint',
      }}
      className="scroll-card-section"
    >
      {/* Orbs de fundo */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,206,201,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Bola branca */}
      <div
        ref={orbRef}
        style={{
          position: 'absolute', zIndex: 1,
          width: '200vmax', height: '200vmax',
          borderRadius: '50%', background: 'white',
          transform: 'scale(0)', transformOrigin: 'center center',
          willChange: 'transform', pointerEvents: 'none',
        }}
      />

      {/* Layout */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 40,
        maxWidth: 1000, width: '100%', padding: '0 24px',
      }} className="scroll-card-layout">

        {/* Coluna esquerda */}
        <div
          ref={leftRef}
          style={{ flex: 1, opacity: 0, transform: 'translateX(-40px)', display: 'flex', flexDirection: 'column', gap: 16, willChange: 'transform, opacity' }}
          className="scroll-card-left"
        >
          {LEFT_ITEMS.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', borderRadius: 16, background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.15)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c5ce7', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Centro — placas empilhadas */}
        <div style={{ flexShrink: 0, width: '280px', height: '380px', position: 'relative', perspective: '1000px' }} className="scroll-card-plaques-mobile">
          {renderPlaque(PLAQUES[0], plaque0Ref)}
          {renderPlaque(PLAQUES[1], plaque1Ref)}
          {renderPlaque(PLAQUES[2], plaque2Ref)}
        </div>

        {/* Coluna direita */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div ref={headingRef} style={{ opacity: 0, transform: 'translateY(16px)', marginBottom: 4, willChange: 'transform, opacity' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6c5ce7', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Plataforma completa</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3, letterSpacing: -0.5, marginBottom: 8 }}>
              Simples de usar,<br />completo para você.
            </h2>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              Gerencie vendas, receba via Pix e entregue conteúdo automaticamente.
            </p>
          </div>

          <div ref={rightRef} style={{ opacity: 0, transform: 'translateX(40px)', display: 'flex', flexDirection: 'column', gap: 12, willChange: 'transform, opacity' }}>
            {RIGHT_ITEMS.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.12)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c5ce7', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div ref={ctaRef} style={{ opacity: 0, transform: 'translateY(10px)', willChange: 'transform, opacity' }}>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', borderRadius: 999,
              background: 'linear-gradient(135deg, #6c5ce7, #4834d4)',
              color: 'white', fontWeight: 700, fontSize: 13,
              textDecoration: 'none', boxShadow: '0 8px 24px rgba(108,92,231,0.35)',
            }}>
              Criar conta grátis <FiArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Indicador de scroll */}
      <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500, zIndex: 20, letterSpacing: 1, textTransform: 'uppercase' }}>
        <span>Role para ver</span>
        <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', animation: 'scrollPulse 1.8s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes scrollPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          /* Seção: sem pin, altura auto */
          .scroll-card-section {
            height: auto !important;
            min-height: 100vh !important;
            background: #06060c !important;
            padding: 80px 0 48px !important;
            display: flex !important;
            align-items: flex-start !important;
          }

          /* Layout: coluna única centralizada */
          .scroll-card-layout {
            flex-direction: column !important;
            align-items: center !important;
            gap: 32px !important;
            padding: 0 16px !important;
          }

          /* Esconde colunas laterais */
          .scroll-card-left { display: none !important; }

          /* Leque de placas — container */
          .scroll-card-plaques-mobile {
            position: relative !important;
            width: 260px !important;
            height: 320px !important;
            margin: 0 auto !important;
          }

          /* Placa esquerda (100K) — inclinada para esquerda */
          .scroll-card-plaques-mobile > div:nth-child(1) {
            opacity: 1 !important;
            transform: translateX(-70px) rotate(-12deg) scale(0.82) !important;
            z-index: 1 !important;
          }

          /* Placa direita (500K) — inclinada para direita */
          .scroll-card-plaques-mobile > div:nth-child(2) {
            opacity: 1 !important;
            transform: translateX(70px) rotate(12deg) scale(0.82) !important;
            z-index: 1 !important;
          }

          /* Placa central (1M) — em destaque */
          .scroll-card-plaques-mobile > div:nth-child(3) {
            opacity: 1 !important;
            transform: none !important;
            z-index: 3 !important;
          }

          /* Coluna direita centralizada */
          .scroll-card-layout > div:last-child {
            width: 100% !important;
            align-items: center !important;
            text-align: center !important;
          }
          .scroll-card-layout > div:last-child h2,
          .scroll-card-layout > div:last-child p,
          .scroll-card-layout > div:last-child > div:first-child div {
            text-align: center !important;
          }
          .scroll-card-layout > div:last-child > div:last-child {
            display: flex !important;
            justify-content: center !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scroll-card-layout * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </section>
  );
}
