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
            end: '+=2400',
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          }
        });

        // Fase 1: bola branca cresce do centro (0 → 300vmax)
        tl.to(orbRef.current, {
          scale: 1,
          duration: 2,
          ease: 'power2.inOut',
        }, 0);

        // Fase 2: card muda de roxo para branco conforme bola cresce
        tl.to(cardRef.current, {
          background: 'linear-gradient(135deg, #f0eeff 0%, #e8e4ff 40%, #ddd8ff 100%)',
          boxShadow: '0 40px 100px rgba(108,92,231,0.2), 0 0 0 1px rgba(108,92,231,0.15)',
          duration: 1.5,
          ease: 'power2.inOut',
        }, 0.3);

        // Fase 3: informações da esquerda aparecem
        tl.to(leftRef.current, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
        }, 1.2);

        // Fase 4: informações da direita aparecem
        tl.to(rightRef.current, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
        }, 1.4);

        // Fase 5: heading e CTA aparecem
        tl.to(headingRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
        }, 1.6);

        tl.to(ctaRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
        }, 1.8);

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
      }}
    >
      {/* Orbs de fundo escuro */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,206,201,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Bola branca que cresce — começa com scale(0) */}
      <div
        ref={orbRef}
        style={{
          position: 'absolute',
          zIndex: 1,
          width: '300vmax',
          height: '300vmax',
          borderRadius: '50%',
          background: 'white',
          transform: 'scale(0)',
          transformOrigin: 'center center',
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      />

      {/* Layout principal — card + colunas laterais */}
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

        {/* Coluna esquerda — informações */}
        <div
          ref={leftRef}
          style={{
            flex: 1,
            opacity: 0,
            transform: 'translateX(-50px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
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

        {/* Card central — roxo, parado */}
        <div
          ref={cardRef}
          style={{
            flexShrink: 0,
            width: '300px',
            height: '420px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #6c5ce7 0%, #4834d4 40%, #2d1b8e 100%)',
            boxShadow: '0 40px 100px rgba(108,92,231,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="scroll-card-center"
        >
          {/* Foto da pessoa como fundo completo do card */}
          <img
            src="/manager-male.jpg"
            alt="Vendedor"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'top center',
              zIndex: 0,
            }}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
            }}
          />

          {/* Overlay azul base — tinge a foto de azul/roxo */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'rgba(40, 20, 160, 0.45)',
            mixBlendMode: 'multiply',
          }} />

          {/* Orb grande — círculo difuso claro no centro-topo */}
          <div style={{
            position: 'absolute', zIndex: 2,
            top: '-10%', left: '50%', transform: 'translateX(-50%)',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,120,255,0.55) 0%, transparent 70%)',
            filter: 'blur(18px)',
            pointerEvents: 'none',
          }} />

          {/* Orb menor — canto inferior direito */}
          <div style={{
            position: 'absolute', zIndex: 2,
            bottom: '5%', right: '-10%',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(80,60,220,0.5) 0%, transparent 70%)',
            filter: 'blur(22px)',
            pointerEvents: 'none',
          }} />

          {/* Orb menor — canto inferior esquerdo */}
          <div style={{
            position: 'absolute', zIndex: 2,
            bottom: '10%', left: '-8%',
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(60,40,200,0.45) 0%, transparent 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }} />

          {/* Topo: logo — acima de tudo */}
          <div style={{
            position: 'relative', zIndex: 10,
            padding: '20px 20px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <img src="https://i.imgur.com/qFq7IHR.png" alt="GouPay" style={{ width: 36, height: 36, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Gateway</div>
          </div>
        </div>

        {/* Coluna direita — informações + heading + CTA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Heading */}
          <div
            ref={headingRef}
            style={{ opacity: 0, transform: 'translateY(20px)', marginBottom: 4 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6c5ce7', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Plataforma completa</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3, letterSpacing: -0.5, marginBottom: 8 }}>
              Simples de usar,<br />completo para você.
            </h2>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              Gerencie vendas, receba via Pix e entregue conteúdo automaticamente. Tudo em um só lugar.
            </p>
          </div>

          {/* Items direita */}
          <div
            ref={rightRef}
            style={{ opacity: 0, transform: 'translateX(50px)', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {RIGHT_ITEMS.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: 'rgba(108,92,231,0.06)',
                border: '1px solid rgba(108,92,231,0.12)',
              }}>
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

          {/* CTA */}
          <div ref={ctaRef} style={{ opacity: 0, transform: 'translateY(12px)' }}>
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
      <div style={{
        position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500, zIndex: 20,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>
        <span>Role para ver</span>
        <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', animation: 'scrollPulse 1.8s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        @media (max-width: 768px) {
          .scroll-card-layout {
            flex-direction: column !important;
            gap: 20px !important;
            padding: 0 16px !important;
          }
          .scroll-card-left { display: none !important; }
          .scroll-card-center {
            width: 240px !important;
            height: 340px !important;
          }
        }
      `}</style>
    </section>
  );
}
