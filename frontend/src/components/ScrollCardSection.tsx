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

export default function ScrollCardSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Não roda animação pesada em mobile — usa CSS simples
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // Em mobile mostra tudo imediatamente sem GSAP
      [leftRef, rightRef, headingRef, ctaRef].forEach(r => {
        if (r.current) {
          r.current.style.opacity = '1';
          r.current.style.transform = 'none';
        }
      });
      return;
    }

    let ctx: any;

    const init = async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const section = sectionRef.current;
      if (!section) return;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=2000',   // menor = mais rápido de percorrer
            scrub: 1.8,      // mais alto = mais suave, menos CPU
            pin: true,
            anticipatePin: 1,
            fastScrollEnd: true,  // libera pin mais rápido no scroll rápido
          }
        });

        // Bola branca — usa transform apenas (GPU)
        tl.to(orbRef.current, {
          scale: 1,
          duration: 2,
          ease: 'power2.inOut',
        }, 0);

        // Card — só opacity e background, sem box-shadow animado
        tl.to(cardRef.current, {
          background: 'linear-gradient(135deg, #f0eeff 0%, #e8e4ff 40%, #ddd8ff 100%)',
          duration: 1.5,
          ease: 'power2.inOut',
        }, 0.3);

        // Colunas — só opacity + transform (GPU)
        tl.to(leftRef.current, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, 1.2);
        tl.to(rightRef.current, { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out' }, 1.35);
        tl.to(headingRef.current, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.5);
        tl.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.65);

      }, section);
    };

    init();
    return () => ctx?.revert();
  }, []);

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
        // Força compositing layer própria para a seção inteira
        willChange: 'transform',
        contain: 'layout style paint',
      }}
    >
      {/* Orbs de fundo — sem filter:blur (usa box-shadow no lugar, mais leve) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 70%)',
          // Sem filter:blur — usa gradiente radial que é nativo do GPU
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '8%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,206,201,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Bola branca — tamanho reduzido, willChange para GPU */}
      <div
        ref={orbRef}
        style={{
          position: 'absolute',
          zIndex: 1,
          width: '200vmax',   // menor que 300vmax — mesmo efeito, menos memória
          height: '200vmax',
          borderRadius: '50%',
          background: 'white',
          transform: 'scale(0)',
          transformOrigin: 'center center',
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      />

      {/* Layout principal */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        maxWidth: 1000,
        width: '100%',
        padding: '0 24px',
      }} className="scroll-card-layout">

        {/* Coluna esquerda */}
        <div
          ref={leftRef}
          style={{ flex: 1, opacity: 0, transform: 'translateX(-40px)', display: 'flex', flexDirection: 'column', gap: 16, willChange: 'transform, opacity' }}
          className="scroll-card-left"
        >
          {LEFT_ITEMS.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '16px 18px', borderRadius: 16,
              background: 'rgba(108,92,231,0.08)',
              border: '1px solid rgba(108,92,231,0.15)',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c5ce7', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Card central */}
        <div
          ref={cardRef}
          style={{
            flexShrink: 0,
            width: '300px',
            height: '420px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #6c5ce7 0%, #4834d4 40%, #2d1b8e 100%)',
            boxShadow: '0 40px 100px rgba(108,92,231,0.5)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            willChange: 'background',
          }}
          className="scroll-card-center"
        >
          {/* Foto */}
          <img
            src="/manager-male.jpg"
            alt="Vendedor"
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', zIndex: 0 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />

          {/* Overlay — sem mixBlendMode (pesado), usa rgba simples */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(40,20,160,0.5)' }} />

          {/* Orbs do card — sem filter:blur, usa gradiente radial */}
          <div style={{ position: 'absolute', zIndex: 2, top: '-15%', left: '50%', transform: 'translateX(-50%)', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,120,255,0.4) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', zIndex: 2, bottom: '0%', right: '-15%', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,60,220,0.35) 0%, transparent 65%)', pointerEvents: 'none' }} />

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 10, padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <img src="https://i.imgur.com/qFq7IHR.png" alt="GouPay" style={{ width: 36, height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Gateway</div>
          </div>
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
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(108,92,231,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c5ce7', flexShrink: 0 }}>
                  {item.icon}
                </div>
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
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(108,92,231,0.35)',
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
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        @media (max-width: 768px) {
          .scroll-card-layout { flex-direction: column !important; gap: 20px !important; padding: 0 16px !important; }
          .scroll-card-left { display: none !important; }
          .scroll-card-center { width: 240px !important; height: 340px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-card-layout * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </section>
  );
}
