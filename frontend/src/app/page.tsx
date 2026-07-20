'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { HiOutlineShieldCheck, HiOutlineCreditCard, HiOutlineCurrencyDollar, HiOutlineChartBar, HiOutlineLightningBolt, HiOutlineGlobeAlt } from 'react-icons/hi';
import { FiArrowRight, FiZap, FiLock, FiTrendingUp, FiInstagram, FiYoutube, FiMessageCircle } from 'react-icons/fi';
import ScrollCardSection from '@/components/ScrollCardSection';
import HeroBanner from '@/components/HeroBanner';

// Componente de animação scroll-reveal reutilizável
function Reveal({ children, delay = 0, direction = 'up', className = '', style = {} }: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 50 : 0,
      x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0,
      rotateX: direction === 'up' ? 8 : 0,
      scale: 0.96,
    },
    visible: {
      opacity: 1, y: 0, x: 0, rotateX: 0, scale: 1,
      transition: { duration: 0.7, delay, ease: 'easeOut' as const }
    }
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
      style={{ ...style, transformPerspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null!);
  const rafRef = useRef<number | null>(null);

  // Scroll reveal observer para elementos com classe .sr
  useEffect(() => {
    const els = document.querySelectorAll('.sr');
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sr-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Hero parallax effect only
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const setFromPoint = (clientX: number, clientY: number) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
        const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
        const px = rect.width ? (x / rect.width) * 100 : 50;
        const py = rect.height ? (y / rect.height) * 100 : 50;
        const dx = rect.width ? (x - rect.width / 2) / rect.width : 0;
        const dy = rect.height ? (y - rect.height / 2) / rect.height : 0;
        const tx = dx * 18;
        const ty = dy * 14;

        el.style.setProperty('--mx', `${px}%`);
        el.style.setProperty('--my', `${py}%`);
        el.style.setProperty('--tx', `${tx.toFixed(2)}px`);
        el.style.setProperty('--ty', `${ty.toFixed(2)}px`);
      });
    };

    const handleMouseMove = (e: MouseEvent) => setFromPoint(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 1) return;
      const t = e.touches[0];
      setFromPoint(t.clientX, t.clientY);
    };
    const handleLeave = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `50%`);
        el.style.setProperty('--my', `50%`);
        el.style.setProperty('--tx', `0px`);
        el.style.setProperty('--ty', `0px`);
      });
    };

    el.style.setProperty('--mx', `50%`);
    el.style.setProperty('--my', `50%`);
    el.style.setProperty('--tx', `0px`);
    el.style.setProperty('--ty', `0px`);

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('mouseleave', handleLeave, { passive: true });
    el.addEventListener('touchend', handleLeave, { passive: true });

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('mouseleave', handleLeave);
      el.removeEventListener('touchend', handleLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Tilt 3D no mockup do hero
  useEffect(() => {
    const container = document.getElementById('heroMockup');
    const frame = document.getElementById('mockupFrame');
    const cardSaldo = document.getElementById('cardSaldo');
    const cardTaxa = document.getElementById('cardTaxa');
    if (!container || !frame) return;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);   // -1 a +1
      const dy = (e.clientY - cy) / (rect.height / 2);  // -1 a +1

      const rotY = -4 + dx * 10;   // base -4deg + até ±10deg
      const rotX = 2 - dy * 6;     // base 2deg + até ±6deg

      frame.style.transform = `perspective(1000px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
      frame.style.boxShadow = `${-dx * 20}px ${dy * 10 + 32}px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.1)`;

      // Cards se movem levemente na direção oposta (parallax)
      if (cardSaldo) cardSaldo.style.transform = `translate(${-dx * 8}px, ${-dy * 6}px)`;
      if (cardTaxa) cardTaxa.style.transform = `translate(${dx * 8}px, ${dy * 6}px)`;
    };

    const onLeave = () => {
      frame.style.transform = 'perspective(1000px) rotateY(-4deg) rotateX(2deg)';
      frame.style.boxShadow = '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)';
      if (cardSaldo) cardSaldo.style.transform = 'translate(0,0)';
      if (cardTaxa) cardTaxa.style.transform = 'translate(0,0)';
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div id="inicio" className="force-light" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 'max(14px, env(safe-area-inset-top))',
        left: 0,
        right: 0,
        zIndex: 50
      }}>
        <div className="landingHeaderContainer" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid rgba(124, 58, 237, 0.12)',
              background: 'rgba(255, 255, 255, 0.84)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 18px 46px rgba(88, 28, 135, 0.1)'
            }} className="landingHeaderBar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} className="landingLogo">
                <img
                  src="/favicon.png"
                  alt="GouPay"
                  style={{ height: 32, width: 32, objectFit: 'contain', flexShrink: 0, display: 'block' }}
                />
                <span className="landingLogoText" style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>GouPay</span>
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="landingHeaderCenter">
                <nav style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid transparent',
                  background: 'transparent'
                }} className="landingNav">
                  {[
                    { href: '#inicio', label: 'Início' },
                    { href: '#features', label: 'Recursos' },
                    { href: '#api', label: 'API Pix' },
                    { href: '#loja', label: 'Loja' },
                    { href: '#footer', label: 'Sobre nós' },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 800,
                        padding: '6px 10px',
                        borderRadius: 999
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} className="landingActions">
                <Link
                  href="/login"
                  style={{
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 900,
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(124,58,237,0.12)',
                    background: 'rgba(255,255,255,0.76)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Login
                </Link>
                <Link href="/register" className="btn-primary" style={{ padding: '10px 16px', fontSize: 13, borderRadius: 999 }}>
                  Cadastrar-se
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — fundo imagem + texto esquerda */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          background: '#ffffff',
          overflow: 'hidden',
          paddingTop: 'calc(env(safe-area-inset-top) + 110px)',
          paddingBottom: 60,
          minHeight: 'clamp(600px, 88vh, 900px)',
          display: 'flex',
          alignItems: 'center',
        }}
        className="landingHero"
      >
        {/* Overlay escuro sutil só no lado esquerdo para legibilidade */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(circle at 80% 35%, rgba(124,58,237,0.14) 0%, rgba(124,58,237,0.00) 34%)',
            'radial-gradient(circle at 12% 20%, rgba(167,139,250,0.16) 0%, rgba(167,139,250,0.00) 28%)',
            'linear-gradient(180deg, #ffffff 0%, #fbf9ff 58%, #ffffff 100%)'
          ].join(', '),
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: [
            'radial-gradient(circle, rgba(124,58,237,0.16) 1px, transparent 1px)'
          ].join(', '),
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(110deg, transparent 0%, black 18%, black 82%, transparent 100%)',
          opacity: 0.42,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 180,
          background: 'linear-gradient(0deg, #ffffff 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none'
        }} />
        <div className="heroCurveLines" />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1320, margin: '0 auto', padding: '0 44px', width: '100%', display: 'grid', gridTemplateColumns: '0.82fr 1.18fr', gap: 46, alignItems: 'center' }} className="heroGrid">

          {/* Coluna esquerda — texto */}
          <div className="heroLeft">
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              marginBottom: 18,
              borderRadius: 999,
              border: '1px solid rgba(124,58,237,0.14)',
              background: 'rgba(124,58,237,0.08)',
              color: '#6d28d9',
              fontSize: 12,
              fontWeight: 800
            }}>
              <FiLock size={14} /> Infraestrutura para vendas digitais
            </div>

            <h1 style={{ fontSize: 'clamp(34px, 4.3vw, 60px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: -1.6, color: '#0f172a', marginBottom: 20 }} className="landingHeroTitle">
              O gateway que faz<br />
              <span style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 52%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                seu negócio crescer
              </span>
            </h1>

            <p style={{ color: '#64748b', fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.75, marginBottom: 32, maxWidth: 500 }} className="landingHeroSubtitle">
              Checkout de alta conversão, Pix instantâneo, área de membros e loja integrada. Taxa: <strong style={{ color: '#c4b5fd' }}>R$2,00 + 1,09%</strong> por venda.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }} className="landingHeroActions">
              <Link href="/register" style={{
                padding: '13px 24px', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: 'white', fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 18px 42px rgba(124,58,237,0.28)',
              }}>
                Criar conta grátis <FiArrowRight size={16} />
              </Link>
              <Link href="#features" style={{
                padding: '13px 24px', fontSize: 15, borderRadius: 999,
                background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(124,58,237,0.16)',
                color: '#334155', textDecoration: 'none', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center',
              }}>
                Ver recursos
              </Link>
            </div>

            {/* Stats — simplificados, sem repetir taxa */}
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }} className="landingHeroStats">
              {[
                { value: 'Na hora', label: 'Recebimento Pix' },
                { value: '100%', label: 'Automático' },
                { value: 'Grátis', label: 'Sem mensalidade' },
              ].map((s, i) => (
                <div key={i} style={{ border: '1px solid rgba(124,58,237,0.12)', background: 'rgba(255,255,255,0.72)', borderRadius: 16, padding: '12px 16px', minWidth: 122, boxShadow: '0 16px 36px rgba(88,28,135,0.08)' }}>
                  <div style={{ fontSize: 19, fontWeight: 900, color: '#0f172a', letterSpacing: -0.4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna direita — mockup dashboard profissional */}
          <div style={{ position: 'relative', minHeight: 500 }} className="heroRight" id="heroMockup">
            {/* Glow atrás do mockup */}
            <div style={{
              position: 'absolute',
              inset: '-9% -4% 5% 18%',
              border: '1px solid rgba(124,58,237,0.08)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.12), rgba(124,58,237,0.00) 68%)',
              transform: 'skewY(-3deg)',
              pointerEvents: 'none',
              zIndex: 0
            }} />

            {/* Frame do browser */}
            <div id="mockupFrame" style={{
              position: 'relative', zIndex: 2,
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(124,58,237,0.12)',
              boxShadow: '0 34px 80px rgba(88,28,135,0.18), 0 0 0 1px rgba(255,255,255,0.88)',
              background: 'rgba(255,255,255,0.78)',
              transform: 'perspective(1000px) rotateY(-2deg) rotateX(1deg)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              willChange: 'transform',
            }}>
              {/* Barra do browser */}
              <div style={{ background: 'rgba(255,255,255,0.88)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(124,58,237,0.10)' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <div style={{ flex: 1, background: 'rgba(124,58,237,0.055)', borderRadius: 7, padding: '4px 12px', fontSize: 11, color: '#7c3aed', textAlign: 'center', fontWeight: 700 }}>
                  goupay.com.br/dashboard
                </div>
              </div>
              {/* Screenshot */}
              <img
                src="https://i.imgur.com/M24u2FU.png"
                alt="Visual GouPay em destaque"
                referrerPolicy="no-referrer"
                loading="eager"
                style={{ width: '100%', display: 'block', background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(255,255,255,0.92))' }}
              />
            </div>

            <img
              src="https://i.imgur.com/8gcYDam.jpeg"
              alt="Notificacoes de venda GouPay"
              referrerPolicy="no-referrer"
              loading="eager"
              className="heroAccentImage"
            />

            {/* Card flutuante — saldo */}
            <div style={{
              position: 'absolute', bottom: '12%', left: '-8%', zIndex: 5,
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
              borderRadius: 14, padding: '12px 16px',
              boxShadow: '0 18px 48px rgba(88,28,135,0.14)',
              minWidth: 140,
              border: '1px solid rgba(255,255,255,0.70)',
              transition: 'transform 0.15s ease',
            }} id="cardSaldo">
              <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Saldo disponível</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0f0e1a', letterSpacing: -0.5 }}>R$ 8.543</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>+12% este mês</span>
              </div>
            </div>

            {/* Card flutuante — taxa */}
            <div style={{
              position: 'absolute', top: '8%', right: '-6%', zIndex: 5,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', backdropFilter: 'blur(16px)',
              borderRadius: 14, padding: '12px 16px',
              boxShadow: '0 18px 52px rgba(42,32,122,0.48)',
              minWidth: 120,
              border: '1px solid rgba(255,255,255,0.16)',
              transition: 'transform 0.15s ease',
            }} id="cardTaxa">
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taxa por venda</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>R$2,00</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>+ 1,09% gateway</div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .heroGrid {
              grid-template-columns: 1fr !important;
              gap: 32px !important;
              text-align: center !important;
            }
            .heroLeft {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
            }
            .heroLeft p { text-align: center !important; }
            .landingHeroActions { justify-content: center !important; }
            .landingHeroStats { justify-content: center !important; }
            .landingHeroStats > div { border-left: none !important; padding-left: 0 !important; }
            .heroRight { display: block !important; max-width: 500px !important; margin: 0 auto !important; }
          }
          @media (max-width: 640px) {
            .landingHeroTitle { font-size: 28px !important; }
            .landingHeroSubtitle { font-size: 14px !important; }
            .landingHeroStats {
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 14px !important;
              width: 100% !important;
              max-width: 292px !important;
              margin: 0 auto !important;
              justify-content: center !important;
            }
            .landingHeroStats > div {
              min-width: 0 !important;
              width: 100% !important;
              min-height: 68px !important;
              padding: 12px 10px !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              border-left: none !important;
            }
            .landingHeroStats > div:nth-child(3) {
              grid-column: 1 / -1 !important;
              width: min(148px, 100%) !important;
              justify-self: center !important;
            }
            .landingHeroActions { flex-direction: row !important; flex-wrap: wrap !important; justify-content: center !important; }
            .landingHeroActions a { font-size: 14px !important; padding: 12px 18px !important; }
            .landingHero { padding-top: calc(env(safe-area-inset-top) + 160px) !important; }
            .heroGrid { padding: 0 16px !important; }
            /* Mostra mockup em mobile, menor */
            .heroRight {
              display: block !important;
              width: min(100%, 330px) !important;
              max-width: 330px !important;
              min-height: 388px !important;
              margin: 4px auto 0 !important;
              padding-bottom: 92px !important;
            }
            #mockupFrame {
              transform: none !important;
              border-radius: 18px !important;
              box-shadow: 0 24px 58px rgba(88,28,135,0.16), 0 0 0 1px rgba(255,255,255,0.9) !important;
            }
            /* Esconde cards flutuantes em mobile */
            #cardSaldo, #cardTaxa { display: none !important; }
          }
          .heroAccentImage {
            position: absolute;
            right: -18px;
            bottom: -52px;
            width: min(235px, 34%);
            aspect-ratio: 9 / 16;
            object-fit: cover;
            border-radius: 30px;
            border: 7px solid rgba(255,255,255,0.96);
            box-shadow: 0 28px 70px rgba(88,28,135,0.28);
            animation: heroFloatSoft 5.8s ease-in-out infinite;
            z-index: 6;
          }
          .heroCurveLines {
            position: absolute;
            left: -8%;
            right: -8%;
            bottom: -90px;
            height: 250px;
            pointer-events: none;
            opacity: 0.34;
            background:
              repeating-radial-gradient(ellipse at 48% 0%, transparent 0 22px, rgba(124,58,237,0.24) 23px 24px, transparent 25px 42px);
            mask-image: linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%);
          }
          .heroRight {
            animation: heroRiseIn 0.8s ease-out both;
          }
          .heroLeft {
            animation: heroCopyIn 0.7s ease-out both;
          }
          @keyframes heroFloatSoft {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
            50% { transform: translate3d(0, -12px, 0) rotate(2deg); }
          }
          @keyframes heroRiseIn {
            from { opacity: 0; transform: translate3d(26px, 18px, 0) scale(0.98); }
            to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          }
          @keyframes heroCopyIn {
            from { opacity: 0; transform: translate3d(-18px, 14px, 0); }
            to { opacity: 1; transform: translate3d(0, 0, 0); }
          }
          @media (max-width: 640px) {
            .heroAccentImage {
              right: 14px;
              bottom: 18px;
              width: min(29%, 92px);
              border-width: 5px;
              border-radius: 18px;
              box-shadow: 0 18px 44px rgba(88,28,135,0.24);
            }
          }
          .landingNav a:first-child {
            color: #6d28d9 !important;
            box-shadow: inset 0 -2px 0 #7c3aed;
          }
          .landingHeroActions a:first-child:hover,
          .landingActions a:last-child:hover {
            transform: translateY(-1px);
            box-shadow: 0 22px 48px rgba(124,58,237,0.32) !important;
          }
          .landingHeroActions a,
          .landingActions a {
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }
        `}</style>
      </section>

      {/* Faixa de taxa — ticker animado */}
      <div style={{ background: 'linear-gradient(90deg, rgba(108,92,231,0.08) 0%, rgba(162,155,254,0.06) 50%, rgba(108,92,231,0.08) 100%)', borderTop: '1px solid rgba(108,92,231,0.18)', borderBottom: '1px solid rgba(108,92,231,0.12)', padding: '16px 0', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg, var(--bg-primary) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(270deg, var(--bg-primary) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

        <style>{`
          @keyframes ticker {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .ticker-track {
            display: flex;
            width: max-content;
            animation: ticker 32s linear infinite;
          }
          .ticker-track:hover { animation-play-state: paused; }
        `}</style>

        <div className="ticker-track">
          {[0, 1].map(copy => (
            <div key={copy} style={{ display: 'flex', alignItems: 'center', gap: 0, whiteSpace: 'nowrap' }}>
              {[
                { icon: <FiZap size={16} color="#6c5ce7" />, text: <><strong style={{ color: '#6c5ce7' }}>R$2,00 + 1,09%</strong> por venda</> },
                { icon: <FiLock size={15} color="#a29bfe" />, text: <span style={{ color: '#a29bfe' }}>Sem mensalidade</span> },
                { icon: <FiLock size={15} color="#a29bfe" />, text: <span style={{ color: '#a29bfe' }}>Sem taxa de adesão</span> },
                { icon: <FiTrendingUp size={15} color="#6c5ce7" />, text: <span style={{ color: '#6c5ce7' }}>Pix recebido na hora</span> },
                { icon: <FiZap size={15} color="#a29bfe" />, text: <span style={{ color: '#a29bfe' }}>Entrega automática</span> },
                { icon: <HiOutlineShieldCheck size={16} color="#6c5ce7" />, text: <span style={{ color: '#6c5ce7' }}>Checkout seguro</span> },
                { icon: <HiOutlineChartBar size={15} color="#a29bfe" />, text: <span style={{ color: '#a29bfe' }}>Dashboard em tempo real</span> },
                { icon: <HiOutlineCurrencyDollar size={16} color="#6c5ce7" />, text: <span style={{ color: '#6c5ce7' }}>Saques via Pix</span> },
                { icon: <HiOutlineLightningBolt size={15} color="#a29bfe" />, text: <span style={{ color: '#a29bfe' }}>Área de membros integrada</span> },
                { icon: <HiOutlineGlobeAlt size={15} color="#6c5ce7" />, text: <span style={{ color: '#6c5ce7' }}>Loja virtual completa</span> },
                { icon: <FiZap size={16} color="#6c5ce7" />, text: <><strong style={{ color: '#6c5ce7' }}>R$2,00 + 1,09%</strong> por venda</> },
              ].map((item, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, padding: '0 32px', borderRight: '1px solid rgba(108,92,231,0.15)' }}>
                  {item.icon} {item.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Card Section */}
      <ScrollCardSection />

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal direction="up" style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>Tudo que você precisa para <span className="gradient-text">vender online</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            Ferramentas profissionais para gerenciar seu negócio digital
          </p>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {[
            { icon: <FiMessageCircle size={24} />, title: 'Recuperação de Vendas', desc: 'Recupere Pix pendentes com lembretes enviados por Gmail e WhatsApp, ajudando clientes a concluírem a compra.' },
            { icon: <HiOutlineCurrencyDollar size={24} />, title: 'Taxa Simples', desc: 'Venda com previsibilidade: apenas R$2,00 por venda aprovada, sem mensalidade e sem complicação.' },
            { icon: <HiOutlineShieldCheck size={24} />, title: 'Antifraude e Banco Virtual', desc: 'Conte com camadas de antifraude e uma estrutura de banco virtual liberada pelo Banco Central para operar com mais confiança.' },
            { icon: <FiZap size={24} />, title: 'Saque na Hora', desc: 'Solicite seu saque via Pix e receba o valor rapidamente na sua conta, sem esperar dias para movimentar seu dinheiro.' },
            { icon: <HiOutlineLightningBolt size={24} />, title: 'Entrega Automática', desc: 'Pagamento aprovado? O acesso ao produto digital é liberado automaticamente para o cliente.' },
            { icon: <HiOutlineChartBar size={24} />, title: 'Gestão Completa', desc: 'Acompanhe vendas, clientes, recuperação, saques e desempenho dos produtos em um painel profissional.' },
          ].map((feature, i) => (
            <Reveal key={i} direction="up" delay={i * 0.08}>
              <motion.div
                className="glass-card"
                style={{ padding: 32, height: '100%' }}
                whileHover={{ y: -6, boxShadow: '0 24px 60px rgba(108,92,231,0.18)', transition: { duration: 0.25 } }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-secondary)', marginBottom: 20
                }}>{feature.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{feature.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* API Pix */}
      <section id="api" style={{ padding: '20px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal direction="up">
        <div className="glass-card" style={{ padding: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32, alignItems: 'center' }} className="apiGrid">
            <div className="apiCopy">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(108,92,231,0.10)', border: '1px solid rgba(108,92,231,0.18)', color: 'var(--accent-secondary)', fontSize: 12, fontWeight: 800, letterSpacing: 0.4, marginBottom: 14 }}>
                API para Desenvolvedores
              </div>
              <h2 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.0, marginBottom: 12 }}>
                Integre a <span className="gradient-text">API Pix</span> ao seu sistema
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 640, marginBottom: 20 }}>
                Gere Pix com QR Code via requisição HTTP e consulte o status em tempo real. Simples, seguro e com split automático.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }} className="apiItems">
                {[
                  { icon: <FiZap size={18} />, title: 'POST /api/v1/pix', desc: 'Crie um pedido Pix e receba QR Code e validade.' },
                  { icon: <FiLock size={18} />, title: 'GET /api/v1/pix/{id}', desc: 'Consulte status do pagamento com sua chave API.' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 16, border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.75)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(108,92,231,0.14)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }} className="apiActions">
                <Link href="/docs" className="btn-primary" style={{ padding: '14px 28px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Ver documentação <FiArrowRight size={16} />
                </Link>
                <Link href="/register" className="btn-secondary" style={{ padding: '14px 28px', fontSize: 14 }}>
                  Gerar chave da API
                </Link>
              </div>
            </div>
            <div style={{ position: 'relative' }} className="apiPreview">
              <div style={{ borderRadius: 22, border: '1px solid var(--border-color)', background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(243,244,246,0.92) 100%)', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ padding: 18, borderBottom: '1px solid var(--border-color)', background: 'rgba(245,246,248,0.76)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ff5f56' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ffbd2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: '#27c93f' }} />
                  <div style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>curl -X POST /api/v1/pix</div>
                </div>
                <pre style={{ padding: 16, margin: 0, fontSize: 12, overflowX: 'auto', overflowY: 'hidden', background: 'rgba(249,250,251,0.88)', width: '100%', boxSizing: 'border-box', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`POST ${typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.com'}/api/v1/pix
Headers:
  x-api-key: sk_live_...
Body:
{
  "amount": 1000,
  "customer": { "name": "Cliente", "email": "cliente@email.com", "cpf": "00000000000" }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* Storefront */}
      <section id="loja" style={{ padding: '20px 24px 80px', maxWidth: 1200, margin: '0 auto' }} className="landingStorefrontSection">
        <Reveal direction="up">
        <div className="glass-card landingStorefrontCard" style={{
          padding: 48,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at top left, rgba(108,92,231,0.18) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(0,206,201,0.10) 0%, transparent 55%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, alignItems: 'center', position: 'relative' }} className="landingStorefrontGrid">
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(0,206,201,0.10)',
                border: '1px solid rgba(0,206,201,0.18)',
                color: '#00cec9',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                marginBottom: 18
              }}>
                <HiOutlineGlobeAlt size={16} />
                Loja + Hospedagem integrada
              </div>

              <h2 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.2, marginBottom: 14 }} className="landingStorefrontTitle">
                Crie um <span className="gradient-text">site de vendas</span> completo e entregue tudo no mesmo lugar
              </h2>

              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 620, marginBottom: 26 }} className="landingStorefrontDesc">
                Dentro do nosso gateway, você monta sua loja, organiza seus produtos e hospeda conteúdos e entregáveis.
                Do checkout ao acesso do cliente: tudo automatizado, com uma experiência premium.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }} className="landingStorefrontItems">
                {[
                  { icon: <HiOutlineLightningBolt size={18} />, title: 'Loja pronta em minutos', desc: 'Slug, categorias, banner e vitrine com seu estilo.' },
                  { icon: <HiOutlineCreditCard size={18} />, title: 'Checkout integrado', desc: 'Pix e cartão com split automático e confirmação em tempo real.' },
                  { icon: <HiOutlineShieldCheck size={18} />, title: 'Entrega e acesso', desc: 'Conteúdos e entregáveis organizados para o cliente acessar.' },
                  { icon: <HiOutlineChartBar size={18} />, title: 'Gestão centralizada', desc: 'Produtos, pedidos e métricas no painel do vendedor.' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: 12,
                    padding: 16,
                    borderRadius: 16,
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.75)',
                  }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      background: 'rgba(108,92,231,0.14)',
                      color: 'var(--accent-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }} className="landingStorefrontActions">
                <Link href="/register" className="btn-primary" style={{ padding: '14px 28px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Criar minha loja agora <FiArrowRight size={16} />
                </Link>
                <Link href="#features" className="btn-secondary" style={{ padding: '14px 28px', fontSize: 14 }}>
                  Ver recursos do gateway
                </Link>
              </div>
            </div>

            <div style={{ position: 'relative' }} className="landingStorefrontPreview">
              <div style={{
                borderRadius: 22,
                border: '1px solid var(--border-color)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(243,244,246,0.92) 100%)',
                overflow: 'hidden',
                boxShadow: '0 24px 80px rgba(17, 24, 39, 0.14)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.75)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(255,107,107,0.9)' }} />
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(255,214,102,0.9)' }} />
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: 'rgba(46,213,115,0.9)' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Vitrine da Loja</div>
                </div>

                <div style={{
                  padding: 14,
                  background: 'radial-gradient(ellipse at top, rgba(108,92,231,0.20) 0%, transparent 55%)'
                }}>
                  <img
                    src="https://i.imgur.com/1AMnOpH.png"
                    alt="Prévia da vitrine da loja"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.dataset.fallback === '1') return;
                      img.dataset.fallback = '1';
                      img.src = 'https://i.imgur.com/1AMnOpH.jpg';
                    }}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: 18,
                      border: '1px solid var(--border-color)'
                    }}
                  />

                  <img
                    src="https://i.imgur.com/ChaVv9x.png"
                    alt="Prévia adicional da vitrine"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.dataset.fallback === '1') return;
                      img.dataset.fallback = '1';
                      img.src = 'https://i.imgur.com/ChaVv9x.jpg';
                    }}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      marginTop: 12,
                      borderRadius: 18,
                      border: '1px solid var(--border-color)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <Reveal direction="up">
        <div className="glass-card" style={{
          maxWidth: 700, margin: '0 auto', padding: '60px 40px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -80, right: -80,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,92,231,0.2) 0%, transparent 70%)',
          }} />
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, position: 'relative' }}>
            Pronto para <span className="gradient-text">começar a vender</span>?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>
            Crie sua conta em menos de 2 minutos. Sem mensalidade. Apenas <strong>R$2,00 + 1,09%</strong> por venda realizada.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '16px 40px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Criar Conta Grátis <FiArrowRight size={18} />
          </Link>
        </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer id="footer" style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'radial-gradient(ellipse at top, rgba(108,92,231,0.28) 0%, rgba(10,10,12,1) 55%)',
        padding: '54px 24px 26px',
        color: 'rgba(255,255,255,0.82)'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 28,
            alignItems: 'start',
            marginBottom: 26
          }} className="landingFooterGrid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <img src="/logo.png" alt="GouPay Logo" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>
                  Gou<span className="gradient-text">Pay</span>
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.7, maxWidth: 320 }}>
                Gateway de pagamentos + loja integrada para você vender com experiência premium, com foco em simplicidade e conversão.
              </p>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: 'rgba(255,255,255,0.62)', marginBottom: 12, textTransform: 'uppercase' }}>Institucional</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <Link href="#inicio" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Como a GouPay</Link>
                <Link href="#features" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Central de Ajuda</Link>
                <a href="https://wa.me/5532998284648?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20a%20plataforma%20GouPay." target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>
                  Fale com a gente
                </a>
                <a href="mailto:support@goupay.com.br" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>
                  support@goupay.com.br
                </a>
                <Link href="/terms/privacy" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Privacidade</Link>
                <Link href="/account-deletion" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Exclusao de conta e dados</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: 'rgba(255,255,255,0.62)', marginBottom: 12, textTransform: 'uppercase' }}>Termos e Condições de Uso</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <Link href="/terms/use" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Termos de Uso</Link>
                <Link href="/terms/purchase" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Termos de Compra</Link>
                <Link href="/terms/sales" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Termos de Venda</Link>
                <Link href="/terms/content-policy" style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none' }}>Política de Conteúdo</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: 'rgba(255,255,255,0.62)', marginBottom: 12, textTransform: 'uppercase' }}>Baixe nosso app</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <a
                  href="https://play.google.com/store/apps/details?id=br.com.goupay.app"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Baixar o aplicativo GouPay na Google Play"
                  style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.86)',
                  textDecoration: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}>
                  <span>Google Play</span>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>Baixar agora</span>
                </a>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.86)',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>App Store</span>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>Em breve</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '18px 0 18px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }} className="landingFooterBottom">
            <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: 600 }}>
              © {new Date().getFullYear()} GouPay. Todos os direitos reservados.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <a href="https://wa.me/5532998284648?text=Ol%C3%A1!%20Quero%20falar%20com%20a%20GouPay." target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.82)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                <FiMessageCircle size={16} />
              </a>
              <a href="#" style={{ color: 'rgba(255,255,255,0.82)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                <FiInstagram size={16} />
              </a>
              <a href="#" style={{ color: 'rgba(255,255,255,0.82)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                <FiYoutube size={16} />
              </a>
            </div>
          </div>
        </div>

        <style jsx global>{`
          /* Mockups hero responsive */
          @media (max-width: 900px) {
            .landingHeroMockups { display: none !important; }
            .landingHeroMockupsMobile { display: block !important; }
            .landingHeroCopy {
              width: 100% !important;
              max-width: 100% !important;
              transform: none !important;
            }
            .landingHeroInner {
              justify-content: center !important;
              align-items: center !important;
              padding: 0 16px !important;
            }
          }
          @media (max-width: 640px) {
            .landingHeroTitle { font-size: 32px !important; }
            .landingHeroSubtitle { font-size: 14px !important; }
            .landingHeroCard { padding: 18px !important; }
            .landingHeroActions a {
              width: 100% !important;
              justify-content: center !important;
            }
          }
          /* ── Hover nos cards de feature ── */
          .glass-card.sr-up {
            transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1), box-shadow 0.25s ease;
          }
          .glass-card.sr-up.sr-visible:hover {
            box-shadow: 0 20px 60px rgba(108,92,231,0.18);
            transform: translateY(-4px) !important;
          }
          .landingHero {
            isolation: isolate;
            --mx: 50%;
            --my: 50%;
            --tx: 0px;
            --ty: 0px;
          }
          @media (max-width: 640px) {
            .landingHeaderContainer {
              padding: 0 14px !important;
            }
            .landingHeaderBar {
              flex-direction: column !important;
              border-radius: 22px !important;
              padding: 12px 14px !important;
              gap: 10px !important;
            }
            .landingHeaderCenter {
              display: none !important;
            }
            .landingLogo {
              width: 100% !important;
              justify-content: center !important;
            }
            .landingLogo img {
              height: 44px !important;
              width: 170px !important;
            }
            .landingActions {
              width: 100% !important;
              justify-content: center !important;
            }
          }
          .landingHero::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 2;
            pointer-events: none;
            opacity: 0.42;
            background:
              linear-gradient(115deg, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0.00) 38%),
              linear-gradient(250deg, rgba(167,139,250,0.12) 0%, rgba(167,139,250,0.00) 34%);
          }
          .landingHero::after {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 3;
            pointer-events: none;
            background: linear-gradient(180deg, rgba(124,58,237,0.05) 0%, rgba(255,255,255,0.00) 26%, rgba(124,58,237,0.04) 100%);
            opacity: 0.62;
          }
          .landingHeroImg {
            transform: translate3d(var(--tx), var(--ty), 0) scale(1.035);
            will-change: transform;
            transition: transform 120ms ease;
          }
          @media (prefers-reduced-motion: reduce) {
            .landingHero::before,
            .landingHero::after {
              animation: none !important;
              display: none !important;
            }
            .landingHeroImg {
              transition: none !important;
              transform: none !important;
            }
          }
          .landingHeroInner {
            padding-top: calc(env(safe-area-inset-top) + 120px);
            padding-bottom: 18px;
            box-sizing: border-box;
          }
          @media (max-width: 980px) {
            .landingHeroInner {
              justify-content: center !important;
            }
            .landingHeroTitle {
              font-size: 36px !important;
            }
            .landingHeroCopy {
              transform: none !important;
            }
          }
          @media (max-width: 640px) {
            .landingHero {
              height: auto !important;
              min-height: 100svh;
            }
            .landingHeroInner {
              align-items: center !important;
              padding-top: calc(env(safe-area-inset-top) + 112px);
              padding-bottom: 22px;
            }
            .landingHeroCard {
              padding: 16px !important;
            }
            .landingHeroTitle {
              font-size: 26px !important;
            }
            .landingHeroSubtitle {
              font-size: 14px !important;
              margin-bottom: 12px !important;
            }
            .landingHeroBullets {
              grid-template-columns: 1fr !important;
            }
            .landingHeroBullets > div {
              padding: 8px 10px !important;
              font-size: 12px !important;
            }
            .landingHeroActions a {
              padding: 11px 14px !important;
              font-size: 12.5px !important;
            }
          }
          @media (max-width: 980px) {
            .landingFooterGrid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }
          @media (max-width: 520px) {
            .landingFooterGrid {
              grid-template-columns: 1fr !important;
            }
            .landingFooterBottom {
              justify-content: center !important;
              text-align: center;
            }
          }
          /* API Pix responsive */
          @media (max-width: 980px) {
            #api .apiGrid {
              grid-template-columns: 1fr !important;
              gap: 18px !important;
            }
            #api .apiCopy {
              text-align: center;
            }
            #api .apiItems {
              grid-template-columns: 1fr !important;
            }
            #api .apiActions {
              justify-content: center;
            }
            #api .apiPreview {
              margin-top: 18px;
            }
            /* Garante que sr-left e sr-right aparecem em mobile */
            #api .sr-left,
            #api .sr-right {
              opacity: 1 !important;
              transform: none !important;
            }
          }
          @media (max-width: 640px) {
            #api .glass-card {
              padding: 20px !important;
            }
            #api .apiCopy h2 {
              font-size: 24px !important;
            }
            #api .apiCopy p {
              font-size: 14px !important;
            }
            #api .apiPreview pre {
              font-size: 11px !important;
            }
            #api .apiActions a {
              padding: 12px 16px !important;
              font-size: 13px !important;
            }
          }

          /* Loja / Storefront responsive */
          @media (max-width: 980px) {
            .landingStorefrontGrid {
              grid-template-columns: 1fr !important;
              gap: 24px !important;
            }
            .landingStorefrontTitle {
              font-size: 28px !important;
            }
            /* Mostra o preview em mobile também */
            .landingStorefrontPreview {
              display: block !important;
            }
            .landingStorefrontPreview.sr-right {
              opacity: 1 !important;
              transform: none !important;
            }
            /* Garante que sr classes aparecem */
            .landingStorefrontGrid .sr-up,
            .landingStorefrontGrid .sr-right,
            .landingStorefrontGrid .sr-left {
              opacity: 1 !important;
              transform: none !important;
            }
          }
          @media (max-width: 640px) {
            .landingStorefrontCard {
              padding: 20px !important;
            }
            .landingStorefrontTitle {
              font-size: 22px !important;
            }
            .landingStorefrontDesc {
              font-size: 14px !important;
            }
            .landingStorefrontItems {
              grid-template-columns: 1fr !important;
            }
            .landingStorefrontActions {
              flex-direction: column !important;
            }
            .landingStorefrontActions a {
              width: 100% !important;
              justify-content: center !important;
              text-align: center !important;
            }
          }

          /* Features section mobile */
          @media (max-width: 640px) {
            #features {
              padding: 48px 16px !important;
            }
            #features h2 {
              font-size: 26px !important;
            }
          }

          /* Divider mobile */
          @media (max-width: 640px) {
            .landingDivider {
              display: none !important;
            }
          }
        `}</style>
      </footer>
    </div>
  );
}
