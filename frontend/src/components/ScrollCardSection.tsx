'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiZap, FiShield, FiTrendingUp } from 'react-icons/fi';

const FEATURES = [
  { icon: <FiZap size={20} />, title: 'Pix instantâneo', desc: 'Receba em segundos, 24h por dia.' },
  { icon: <FiShield size={20} />, title: 'Segurança total', desc: 'Antifraude e SSL em cada transação.' },
  { icon: <FiTrendingUp size={20} />, title: 'Taxa justa', desc: 'Apenas R$1,50 + 1,09% por venda.' },
];

export default function ScrollCardSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let gsap: any, ScrollTrigger: any;

    const init = async () => {
      const gsapMod = await import('gsap');
      const stMod = await import('gsap/ScrollTrigger');
      gsap = gsapMod.gsap;
      ScrollTrigger = stMod.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const section = sectionRef.current;
      const card = cardRef.current;
      const bg = bgRef.current;
      const orb1 = orb1Ref.current;
      const orb2 = orb2Ref.current;
      const orb3 = orb3Ref.current;
      if (!section || !card || !bg) return;

      // Card: leve rotação 3D e escala ao entrar
      gsap.fromTo(card,
        { opacity: 0, y: 80, rotateX: 12, scale: 0.92 },
        {
          opacity: 1, y: 0, rotateX: 0, scale: 1,
          duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 75%', once: true }
        }
      );

      // Fundo: parallax — move mais devagar que o scroll
      gsap.to(bg, {
        yPercent: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        }
      });

      // Orbs: parallax em velocidades diferentes (profundidade)
      if (orb1) gsap.to(orb1, { y: -80, x: 40, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 2 } });
      if (orb2) gsap.to(orb2, { y: -120, x: -60, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 3 } });
      if (orb3) gsap.to(orb3, { y: -50, x: 80, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 } });
    };

    init();
    return () => {
      if (ScrollTrigger) ScrollTrigger.getAll().forEach((t: any) => t.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        padding: '100px 24px',
        overflow: 'hidden',
        background: '#08080f',
        minHeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Fundo parallax com gradientes */}
      <div ref={bgRef} style={{ position: 'absolute', inset: '-20%', zIndex: 0, willChange: 'transform' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(108,92,231,0.35) 0%, transparent 65%), radial-gradient(ellipse 60% 50% at 20% 70%, rgba(0,206,201,0.20) 0%, transparent 60%)',
        }} />
        {/* Grid de pontos */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
      </div>

      {/* Orbs flutuantes — camadas de profundidade */}
      <div ref={orb1Ref} style={{ position: 'absolute', top: '15%', left: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.28) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 1, willChange: 'transform' }} />
      <div ref={orb2Ref} style={{ position: 'absolute', bottom: '10%', right: '6%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,206,201,0.22) 0%, transparent 70%)', filter: 'blur(50px)', zIndex: 1, willChange: 'transform' }} />
      <div ref={orb3Ref} style={{ position: 'absolute', top: '55%', left: '55%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,107,0.15) 0%, transparent 70%)', filter: 'blur(30px)', zIndex: 1, willChange: 'transform' }} />

      {/* Card central glassmorphism */}
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 40,
          maxWidth: 860,
          width: '100%',
          padding: '44px 48px',
          borderRadius: 28,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          transformStyle: 'preserve-3d',
          perspective: 1000,
        }}
        className="scroll-card-inner"
      >
        {/* Logo + lado esquerdo */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'rgba(108,92,231,0.15)',
            border: '1px solid rgba(108,92,231,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(108,92,231,0.3)',
          }}>
            <img src="https://i.imgur.com/qFq7IHR.png" alt="GouPay" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.5 }}>GouPay</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Gateway de Pagamentos</div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* Lado direito — conteúdo */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#00cec9', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Plataforma completa
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 20, letterSpacing: -0.8 }}>
            Tudo que você precisa<br />para vender online
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(108,92,231,0.18)', border: '1px solid rgba(108,92,231,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#a29bfe',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 999,
            background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
            color: 'white', fontWeight: 700, fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(108,92,231,0.4)',
          }}>
            Criar conta grátis <FiArrowRight size={16} />
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .scroll-card-inner {
            flex-direction: column !important;
            padding: 28px 20px !important;
            gap: 24px !important;
          }
          .scroll-card-inner > div:nth-child(2) {
            width: 100% !important;
            height: 1px !important;
            align-self: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
