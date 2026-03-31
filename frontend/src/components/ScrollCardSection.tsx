'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiZap, FiShield, FiTrendingUp } from 'react-icons/fi';

const STEPS = [
  { icon: <FiZap size={18} />, title: 'Pix instantâneo', desc: 'Receba em segundos, 24h por dia, 7 dias por semana.' },
  { icon: <FiShield size={18} />, title: 'Segurança total', desc: 'Antifraude e SSL em cada transação realizada.' },
  { icon: <FiTrendingUp size={18} />, title: 'Taxa mais justa', desc: 'Apenas R$1,50 + 1,09% por venda. Sem mensalidade.' },
];

export default function ScrollCardSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: any;

    const init = async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const section = sectionRef.current;
      const card = cardRef.current;
      const content = contentRef.current;
      if (!section || !card || !content) return;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=2200',
            scrub: 1.2,
            pin: true,
            anticipatePin: 1,
          }
        });

        // Rotação contínua sincronizada com scroll (0° → 12°)
        gsap.to(card, {
          rotation: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=2200',
            scrub: 1.5,
          }
        });

        // Fase 1: card pequeno → expande em altura
        tl.to(card, { height: '520px', duration: 1, ease: 'power2.inOut' }, 0);

        // Fase 2: conteúdo inferior aparece
        tl.to(content, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.4);

        // Fase 3: steps aparecem em sequência
        tl.to(step1Ref.current, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.6);
        tl.to(step2Ref.current, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 0.8);
        tl.to(step3Ref.current, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 1.0);

        // Fase 4: CTA aparece
        tl.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.2);

        // Fase 5: card expande largura levemente
        tl.to(card, { width: '420px', duration: 0.8, ease: 'power2.inOut' }, 1.4);

      }, section);
    };

    init();

    return () => {
      ctx?.revert();
    };
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
      {/* Fundo com orbs */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,92,231,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,206,201,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Card de crédito */}
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '340px',
          height: '220px', // altura inicial — compacto como cartão de crédito
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6c5ce7 0%, #4834d4 40%, #2d1b8e 100%)',
          boxShadow: '0 40px 100px rgba(108,92,231,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          overflow: 'hidden',
          transition: 'box-shadow 0.3s ease',
          willChange: 'height, width',
        }}
      >
        {/* Brilho interno */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(0,206,201,0.12)', pointerEvents: 'none' }} />

        {/* Topo do card — sempre visível */}
        <div style={{ padding: '22px 24px 0', position: 'relative', zIndex: 2 }}>
          {/* Logo no canto superior esquerdo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <img src="https://i.imgur.com/qFq7IHR.png" alt="GouPay" style={{ width: 38, height: 38, objectFit: 'contain' }} />
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Gateway</div>
          </div>

          {/* Pessoa no centro do card */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: '3px solid rgba(255,255,255,0.2)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <img
                src="https://i.imgur.com/manager-male.jpg"
                alt="Vendedor"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = 'none';
                  const parent = img.parentElement!;
                  parent.innerHTML = `<div style="font-size:48px;line-height:1">👤</div>`;
                }}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo que aparece conforme expande */}
        <div
          ref={contentRef}
          style={{
            padding: '16px 24px 24px',
            opacity: 0,
            transform: 'translateY(20px)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Título */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.5, marginBottom: 4 }}>
              Venda com a GouPay
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              Plataforma completa para seu negócio digital
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {STEPS.map((step, i) => {
              const refs = [step1Ref, step2Ref, step3Ref];
              return (
                <div
                  key={i}
                  ref={refs[i]}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    opacity: 0, transform: 'translateX(-20px)',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '10px 12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a29bfe', flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{step.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA removido */}
        </div>
      </div>

      {/* Texto lateral — instrução de scroll */}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500, zIndex: 20,
      }}>
        <div>Role para descobrir</div>
        <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)', animation: 'scrollPulse 1.8s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50% { opacity: 0.8; transform: scaleY(1.2); }
        }
      `}</style>
    </section>
  );
}
