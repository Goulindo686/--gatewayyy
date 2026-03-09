'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { HiOutlineShieldCheck, HiOutlineCreditCard, HiOutlineCurrencyDollar, HiOutlineChartBar, HiOutlineLightningBolt, HiOutlineGlobeAlt } from 'react-icons/hi';
import { FiArrowRight, FiZap, FiLock, FiTrendingUp, FiInstagram, FiYoutube, FiMessageCircle } from 'react-icons/fi';

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null!);
  const rafRef = useRef<number | null>(null);

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
              border: '1px solid rgba(108,92,231,0.14)',
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 14px 44px rgba(17, 24, 39, 0.10)'
            }} className="landingHeaderBar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} className="landingLogo">
                <img src="/logo.png" alt="GouPay Logo" style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
                <span style={{ fontSize: 18, fontWeight: 800 }} className="landingLogoText">Gou<span className="gradient-text">Pay</span></span>
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="landingHeaderCenter">
                <nav style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(108,92,231,0.14)',
                  background: 'rgba(255,255,255,0.70)'
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
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.65)',
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

      {/* Hero */}
      <section ref={heroRef} style={{ position: 'relative', height: 'clamp(520px, 78vh, 820px)', overflow: 'hidden', background: '#0a0a0f' }} className="landingHero">
        <picture style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <source media="(max-width: 768px)" srcSet="https://i.imgur.com/lmM1Hdm.png" />
          <img
            src="https://i.imgur.com/lmM1Hdm.png"
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (img.dataset.fallback === '1') return;
              img.dataset.fallback = '1';
              img.src = 'https://i.imgur.com/lmM1Hdm.jpg';
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block'
            }}
            className="landingHeroImg"
          />
        </picture>
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', height: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} className="landingHeroInner">
            <div style={{ width: 'min(520px, 100%)', pointerEvents: 'auto', transform: 'translateX(180px)' }} className="landingHeroCopy">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(0,206,201,0.12)', border: '1px solid rgba(0,206,201,0.18)', color: '#00cec9', fontSize: 12, fontWeight: 800, letterSpacing: 0.4, marginBottom: 14 }}>
                <FiTrendingUp size={16} />
                Aumente sua conversão hoje
              </div>

              <div style={{ borderRadius: 22, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(10,10,15,0.55)', backdropFilter: 'blur(14px)', boxShadow: '0 26px 88px rgba(0,0,0,0.45)', padding: 22 }} className="landingHeroCard">
                <h1 style={{ fontSize: 42, lineHeight: 1.05, letterSpacing: -1.2, fontWeight: 900, marginBottom: 12, color: 'white' }} className="landingHeroTitle">
                  Tudo em um só lugar.
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.75, marginBottom: 16 }} className="landingHeroSubtitle">
                  Seu site, <span className="gradient-text">checkout</span> de alta conversão e as melhores taxas para escalar sua operação com máxima eficiência.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} className="landingHeroActions">
                  <Link href="/register" className="btn-primary" style={{ padding: '14px 20px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999 }}>
                    Criar conta grátis <FiArrowRight size={16} />
                  </Link>
                  <Link href="#features" className="btn-secondary" style={{ padding: '14px 20px', fontSize: 14, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', color: 'white' }}>
                    Ver recursos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>Tudo que você precisa para <span className="gradient-text">vender online</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
            Ferramentas profissionais para gerenciar seu negócio digital
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {[
            { icon: <FiLock size={24} />, title: 'Checkout Seguro', desc: 'Página de pagamento profissional com Pix e cartão de crédito. SSL e antifraude integrados.' },
            { icon: <HiOutlineLightningBolt size={24} />, title: 'Entrega Automática', desc: 'Pagamento aprovado? Liberação e entrega do conteúdo acontecem automaticamente.' },
            { icon: <FiZap size={24} />, title: 'Pix Instantâneo', desc: 'Receba via Pix em segundos. QR Code gerado automaticamente para cada pagamento.' },
            { icon: <HiOutlineChartBar size={24} />, title: 'Dashboard Completo', desc: 'Acompanhe vendas, saldo, saques e métricas em tempo real com gráficos interativos.' },
            { icon: <HiOutlineCurrencyDollar size={24} />, title: 'Saques via Pix', desc: 'Solicite saques a qualquer momento. O valor é transferido diretamente para sua conta.' },
            { icon: <HiOutlineShieldCheck size={24} />, title: 'Segurança Total', desc: 'Controle de chargeback, logs de transações e proteção contra fraude integrados.' },
          ].map((feature, i) => (
            <div key={i} className="glass-card animate-fade-in" style={{ padding: 32, animationDelay: `${i * 0.1}s` }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(108,92,231,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-secondary)', marginBottom: 20
              }}>{feature.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Pix */}
      <section id="api" style={{ padding: '20px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
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
              <div style={{ borderRadius: 22, border: '1px solid var(--border-color)', background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(243,244,246,0.92) 100%)', overflow: 'hidden' }}>
                <div style={{ padding: 18, borderBottom: '1px solid var(--border-color)', background: 'rgba(245,246,248,0.76)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ff5f56' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ffbd2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: '#27c93f' }} />
                  <div style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>curl -X POST /api/v1/pix</div>
                </div>
                <pre style={{ padding: 16, margin: 0, fontSize: 12, overflow: 'auto', background: 'rgba(249,250,251,0.88)' }}>
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
      </section>

      {/* Storefront */}
      <section id="loja" style={{ padding: '20px 24px 80px', maxWidth: 1200, margin: '0 auto' }} className="landingStorefrontSection">
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
                    background: 'rgba(255,255,255,0.75)'
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
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
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
            Crie sua conta em menos de 2 minutos. Sem taxa de adesão.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '16px 40px', fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Criar Conta Grátis <FiArrowRight size={18} />
          </Link>
        </div>
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
                  <span>Google Play</span>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>Em breve</span>
                </div>
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
          .landingHero {
            isolation: isolate;
            --mx: 50%;
            --my: 50%;
            --tx: 0px;
            --ty: 0px;
          }
          .landingHero::before {
            content: '';
            position: absolute;
            inset: -2px;
            z-index: 2;
            pointer-events: none;
            opacity: 0.92;
            background:
              radial-gradient(680px circle at var(--mx) var(--my), rgba(108,92,231,0.40) 0%, rgba(108,92,231,0.00) 58%),
              radial-gradient(520px circle at calc(var(--mx) + 140px) calc(var(--my) + 110px), rgba(0,206,201,0.24) 0%, rgba(0,206,201,0.00) 62%),
              radial-gradient(860px circle at 20% 10%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.00) 55%);
            mix-blend-mode: screen;
            filter: saturate(1.1);
          }
          .landingHero::after {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 3;
            pointer-events: none;
            background:
              radial-gradient(2px 2px at 12% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.00) 65%),
              radial-gradient(1.6px 1.6px at 78% 30%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.00) 70%),
              radial-gradient(1.8px 1.8px at 34% 70%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.00) 70%),
              radial-gradient(1.5px 1.5px at 62% 78%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.00) 72%);
            opacity: 0.55;
            animation: heroTwinkle 6.5s ease-in-out infinite;
          }
          .landingHeroImg {
            transform: translate3d(var(--tx), var(--ty), 0) scale(1.035);
            will-change: transform;
            transition: transform 120ms ease;
          }
          @keyframes heroTwinkle {
            0%, 100% { opacity: 0.42; transform: translate3d(0, 0, 0); }
            50% { opacity: 0.65; transform: translate3d(0, -4px, 0); }
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
          }
          @media (max-width: 640px) {
            #api .glass-card {
              padding: 24px !important;
            }
            #api .apiCopy h2 {
              font-size: 28px !important;
            }
            #api .apiCopy p {
              font-size: 14px !important;
            }
            #api .apiActions a {
              padding: 12px 16px !important;
              font-size: 13px !important;
            }
          }
        `}</style>
      </footer>
    </div>
  );
}
