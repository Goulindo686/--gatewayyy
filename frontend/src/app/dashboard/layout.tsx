'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiHome, FiPackage, FiDollarSign, FiSettings, FiLogOut, FiMenu, FiX, FiPercent, FiBookOpen, FiMessageCircle, FiShoppingBag, FiShoppingCart, FiCalendar, FiChevronLeft, FiChevronRight, FiShield, FiRepeat, FiCreditCard, FiMail, FiCode, FiBell, FiCheckCircle, FiClock, FiXCircle, FiUser, FiUsers, FiKey } from 'react-icons/fi';
import { ThemeToggle } from '@/components/theme-toggle';
import OnboardingBar from '@/components/OnboardingBar';
import { dashboardAPI } from '@/lib/api';
import {
    buildDashboardPeriod,
    DEFAULT_DASHBOARD_PERIOD,
    inferDashboardPeriodPreset,
    toDashboardDateInput,
    type DashboardPeriodPreset,
} from '@/lib/dashboard-period';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [dashboardNotifications, setDashboardNotifications] = useState<any[]>([]);
    const [salesTotal, setSalesTotal] = useState<number | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLButtonElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLButtonElement>(null);
    const [rangePreset, setRangePreset] = useState<DashboardPeriodPreset>(DEFAULT_DASHBOARD_PERIOD);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [applying, setApplying] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
    const periodAnchorRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const userData = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            const sc = localStorage.getItem('sidebarCollapsed');
            if (!token || !userData) {
                router.replace('/login');
                return;
            }

            const parsedUser = JSON.parse(userData);
            if (!parsedUser?.id && !parsedUser?.email) {
                throw new Error('Invalid stored user');
            }

            setUser(parsedUser);
            setIsImpersonating(!!localStorage.getItem('admin_token'));
            if (sc) setSidebarCollapsed(sc === '1' || sc === 'true');
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            router.replace('/login');
        } finally {
            setAuthChecked(true);
        }
    }, [router]);

    useEffect(() => {
        const onUserUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<any>;
            try {
                const nextUser = customEvent.detail || JSON.parse(localStorage.getItem('user') || 'null');
                if (nextUser) setUser(nextUser);
            } catch {
                localStorage.removeItem('user');
            }
        };
        window.addEventListener('goupay:user-updated', onUserUpdated);
        return () => window.removeEventListener('goupay:user-updated', onUserUpdated);
    }, []);
    useEffect(() => {
        try { localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0'); } catch {}
    }, [sidebarCollapsed]);

    useEffect(() => {
        const update = () => setIsMobile(window.innerWidth <= 768);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        let cancelled = false;

        const parseMoney = (v: any) => {
            if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
            const raw = String(v ?? '0').trim();
            const cleaned = raw.replace(/[^\d,.\-]/g, '');
            const normalized = cleaned.includes(',') && cleaned.includes('.')
                ? cleaned.replace(/\./g, '').replace(',', '.')
                : cleaned.replace(',', '.');
            const n = parseFloat(normalized);
            return Number.isFinite(n) ? n : 0;
        };

        const load = async () => {
            // Não faz requisição se a aba estiver em segundo plano
            if (document.visibilityState === 'hidden') return;
            try {
                const { data } = await dashboardAPI.getStats();
                if (cancelled) return;
                const totalSold = parseMoney(data?.stats?.total_sold);
                setSalesTotal(totalSold);
                setDashboardNotifications((data?.notifications || data?.recent_orders || []).slice(0, 8));
            } catch {
                if (!cancelled) setSalesTotal(null);
            }
        };

        load();
        // Atualiza em baixa frequencia; o saldo nao precisa atualizar em tempo real no sidebar.
        const id = window.setInterval(load, 300000);

        // Quando o usuário volta para a aba, atualiza imediatamente
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    // Close profile dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                profileRef.current && !profileRef.current.contains(e.target as Node) &&
                avatarRef.current && !avatarRef.current.contains(e.target as Node)
            ) {
                setProfileOpen(false);
            }
            if (
                notificationsRef.current && !notificationsRef.current.contains(e.target as Node) &&
                bellRef.current && !bellRef.current.contains(e.target as Node)
            ) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        router.push('/login');
    };

    const handleExitImpersonation = () => {
        const adminToken = localStorage.getItem('admin_token');
        const adminUser = localStorage.getItem('admin_user');
        if (adminToken) {
            localStorage.setItem('token', adminToken);
            if (adminUser) localStorage.setItem('user', adminUser);
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
        }
        router.push('/admin/sellers');
    };

    const applyDashboardFilters = () => {
        if (pathname !== '/dashboard') return;
        setApplying(true);
        try {
            const period = buildDashboardPeriod(rangePreset, { startDate, endDate });
            const params = { start: period.start, end: period.end };
            const qs = new URLSearchParams(params).toString();
            setStartDate(period.startDate);
            setEndDate(period.endDate);
            router.replace(`/dashboard?${qs}`);
            setShowConfig(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Nao foi possivel aplicar o periodo');
        } finally {
            setApplying(false);
        }
    };

    const getDisplayRange = () => {
        const fmt = (d: Date) => {
            const m = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
            const day = d.toLocaleString('en-US', { day: '2-digit' });
            const y = d.getFullYear();
            return `${m} ${day}, ${y}`;
        };

        try {
            const period = buildDashboardPeriod(rangePreset, { startDate, endDate });
            return `${fmt(new Date(period.start))} - ${fmt(new Date(period.end))}`;
        } catch {
            return startDate ? `${fmt(new Date(`${startDate}T00:00:00`))} - selecione o fim` : 'Selecione um periodo';
        }
    };

    const setPresetRange = (preset: DashboardPeriodPreset) => {
        const now = new Date();
        const period = buildDashboardPeriod(preset, { now });
        setStartDate(period.startDate);
        setEndDate(period.endDate);
        setRangePreset(preset);
        setViewDate(new Date(period.start));
    };

    useEffect(() => {
        if (pathname !== '/dashboard') return;

        const syncPeriodFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const queryStart = params.get('start');
            const queryEnd = params.get('end');
            if (!queryStart || !queryEnd) return;

            const parsedStart = new Date(queryStart);
            const parsedEnd = new Date(queryEnd);
            if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) return;

            const nextStartDate = toDashboardDateInput(parsedStart);
            const nextEndDate = toDashboardDateInput(parsedEnd);
            setStartDate(nextStartDate);
            setEndDate(nextEndDate);
            setRangePreset(inferDashboardPeriodPreset(nextStartDate, nextEndDate));
            setViewDate(parsedStart);
        };

        syncPeriodFromUrl();
        window.addEventListener('popstate', syncPeriodFromUrl);
        return () => window.removeEventListener('popstate', syncPeriodFromUrl);
    }, [pathname]);

    const monthLabelPT = (d: Date) => {
        const month = d.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
        return `${month} ${d.getFullYear()}`;
    };

    useEffect(() => {
        if (!showConfig) return;
        const updatePos = () => {
            const rect = periodAnchorRef.current?.getBoundingClientRect();
            if (rect) {
                setPopoverPos({
                    top: Math.round(rect.bottom + 8),
                    right: Math.round(window.innerWidth - rect.right),
                });
            }
        };
        updatePos();
        const onResize = () => updatePos();
        const onScroll = () => updatePos();
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [showConfig]);

    useEffect(() => {
        if (!showConfig) return;
        const onDown = (e: MouseEvent) => {
            const insidePanel = popoverRef.current && popoverRef.current.contains(e.target as Node);
            const insideAnchor = periodAnchorRef.current && periodAnchorRef.current.contains(e.target as Node);
            if (!insidePanel && !insideAnchor) setShowConfig(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [showConfig]);
    const navItems = [
        { href: '/dashboard', icon: <FiHome size={18} />, label: 'Dashboard' },
        { href: '/dashboard/products', icon: <FiPackage size={18} />, label: 'Produtos' },
        { href: '/minhas-entregas', icon: <FiKey size={18} />, label: 'Minhas Entregas' },
        { href: '/dashboard/sales', icon: <FiShoppingCart size={18} />, label: 'Vendas' },
        { href: '/dashboard/support', icon: <FiMessageCircle size={18} />, label: 'Suporte' },
        { href: '/dashboard/affiliates', icon: <FiUsers size={18} />, label: 'Afiliados' },
        { href: '/dashboard/sales-recovery', icon: <FiMail size={18} />, label: 'Recuperação' },
        { href: '/dashboard/billings', icon: <FiCreditCard size={18} />, label: 'Cobranças' },
        { href: '/dashboard/subscriptions', icon: <FiRepeat size={18} />, label: 'Assinaturas' },
        { href: '/dashboard/withdrawals', icon: <FiDollarSign size={18} />, label: 'Saques' },
        { href: '/dashboard/fees', icon: <FiPercent size={18} />, label: 'Taxas' },
        { href: '/dashboard/integrations', icon: <FiCode size={18} />, label: 'Integrações' },
        { href: '/dashboard/settings', icon: <FiSettings size={18} />, label: 'Configurações' },
        { href: '/dashboard/store/settings', icon: <FiShoppingBag size={18} />, label: 'Minha Loja' },
        { href: '/dashboard/contact', icon: <FiMessageCircle size={18} />, label: 'Falar com a gente' },
    ];

    if (!user) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                padding: 24,
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        border: '3px solid var(--border-color)',
                        borderTopColor: 'var(--accent-primary)',
                        borderRadius: '50%',
                        animation: 'dashboardAuthSpin .8s linear infinite',
                        margin: '0 auto 14px',
                    }} />
                    <strong style={{ display: 'block', fontSize: 14 }}>
                        {authChecked ? 'Redirecionando para o login...' : 'Carregando painel...'}
                    </strong>
                </div>
                <style jsx global>{`
                    @keyframes dashboardAuthSpin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    const current = salesTotal ?? 0;
    const targets = [10_000, 100_000, 500_000, 1_000_000];
    const target = targets.find(t => current < t) ?? 1_000_000;
    const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const progressValueText = `R$ ${formatBRL(current)} / R$ ${formatBRL(target)}`;
    const progressFontSize = progressValueText.length > 30 ? 10 : progressValueText.length > 25 ? 11 : 13;
    const effectiveCollapsed = !isMobile && sidebarCollapsed;
    const asideWidth = effectiveCollapsed ? 76 : 230;
    const unreadNotifications = dashboardNotifications.filter((order) => order.status === 'paid').length;
    const notificationStatus = (order: any) => {
        if (order.notification_kind === 'platform_fee') return { label: 'Taxa da plataforma', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: <FiDollarSign size={15} /> };
        if (order.notification_kind === 'affiliate_commission') return { label: 'Comissão de venda', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: <FiPercent size={15} /> };
        if (order.notification_kind === 'affiliate_sale' && order.status === 'paid') return { label: 'Venda de afiliado', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', icon: <FiUsers size={15} /> };
        if (order.status === 'paid') return { label: 'Venda aprovada', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', icon: <FiCheckCircle size={15} /> };
        if (order.status === 'pending') return { label: 'Pagamento pendente', color: '#d97706', bg: 'rgba(217,119,6,0.12)', icon: <FiClock size={15} /> };
        return { label: 'Pagamento falhou', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <FiXCircle size={15} /> };
    };
    const notificationAmount = (order: any) => {
        const raw = order?.notification_amount != null
            ? Number(order.notification_amount) / 100
            : order?.amount_display ?? (order?.amount != null ? Number(order.amount) / 100 : 0);
        return Number(raw).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40,
                    display: 'none',
                }} className="mobile-overlay" />
            )}

            {/* Sidebar */}
            <aside style={{
                width: isMobile ? 260 : asideWidth, background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
                transition: 'transform 0.3s ease', boxShadow: '12px 0 30px rgba(15,23,42,0.03)', overflow: 'hidden',
            }} className={`dashboard-aside${sidebarOpen ? ' open' : ''}`}>
                {/* Logo */}
                <div style={{
                    padding: effectiveCollapsed ? '20px 5px' : '16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: effectiveCollapsed ? '36px 24px' : '32px 1fr 32px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: effectiveCollapsed ? 4 : 8,
                    flexShrink: 0
                }} className="dashboard-sidebar-header">
                    <div style={{ display: effectiveCollapsed ? 'none' : 'block' }} />
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}>
                        {effectiveCollapsed ? (
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                border: '1px solid rgba(139,92,246,0.18)',
                                background: 'rgba(124,58,237,0.10)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                overflow: 'hidden'
                            }}>
                                <img
                                    src="/favicon.png"
                                    alt="GouPay"
                                    style={{
                                        width: 26,
                                        height: 26,
                                        objectFit: 'contain',
                                        display: 'block'
                                    }}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                    src="/favicon.png"
                                    alt="GouPay Logo"
                                    style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0, display: 'block' }}
                                />
                                <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', letterSpacing: 0, lineHeight: 1 }}>GouPay</span>
                            </div>
                        )}
                    </div>
                    {!isMobile && (
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            aria-label={effectiveCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                            title={effectiveCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                            style={{
                                width: effectiveCollapsed ? 24 : 28, height: effectiveCollapsed ? 24 : 28, borderRadius: 8, border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)', color: 'var(--text-secondary)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            }}>
                            {sidebarCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
                        </button>
                    )}
                    {isMobile && <div />}
                </div>

                {/* Sidebar Progress Card */}
                {!effectiveCollapsed && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }} className="dashboard-sidebar-progress">
                    <div style={{
                        background: 'linear-gradient(155deg, #8b5cf6 0%, #5b21b6 100%)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14,
                        padding: 12,
                        boxShadow: '0 16px 34px rgba(124,58,237,0.24)',
                        display: 'grid',
                        gap: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: 8,
                                    background: 'rgba(255,255,255,0.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ffffff'
                                }}>
                                    <FiDollarSign size={16} />
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff' }}>Faturamento</div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>{pct.toFixed(0)}%</div>
                        </div>
                        <div style={{
                            fontSize: progressFontSize,
                            fontWeight: 800,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.15,
                            letterSpacing: '-0.15px',
                            width: '100%'
                        }}>
                            {progressValueText}
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: '#ffffff',
                                transition: 'width 0.35s ease',
                                borderRadius: 999
                            }} />
                        </div>
                    </div>
                </div>
                )}

                {/* Navigation */}
                <nav style={{
                    flex: 1,
                    minHeight: 0,
                    padding: '14px 12px calc(14px + env(safe-area-inset-bottom))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                }} className="dashboard-sidebar-nav">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                            title={item.label}
                            style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: effectiveCollapsed ? 'center' : 'flex-start',
                                gap: effectiveCollapsed ? 0 : 12,
                                paddingLeft: effectiveCollapsed ? 0 : 12,
                                paddingRight: effectiveCollapsed ? 0 : 12,
                            }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span>
                            <span style={{ display: effectiveCollapsed ? 'none' : 'inline' }}>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                
            </aside>

                {/* Main content */}
            <main style={{ flex: 1, paddingLeft: isMobile ? 0 : asideWidth, minHeight: '100vh', overflowX: 'hidden', background: 'var(--bg-secondary)' }}>
                {/* Impersonation banner */}
                {isImpersonating && (
                    <div style={{
                        background: 'linear-gradient(90deg, #f39c12, #e67e22)',
                        color: 'white', padding: '10px 32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontSize: 13, fontWeight: 600, gap: 12
                    }}>
                        <span>⚠️ Você está visualizando a conta de <strong>{user?.name}</strong> ({user?.email})</span>
                        <button onClick={handleExitImpersonation} style={{
                            background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)',
                            color: 'white', borderRadius: 8, padding: '4px 14px', cursor: 'pointer',
                            fontWeight: 700, fontSize: 12
                        }}>
                            Voltar para Admin
                        </button>
                    </div>
                )}
                {/* Top bar */}
                <header style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--header-bg)', backdropFilter: 'blur(16px)',
                    position: 'sticky', top: 0, zIndex: 30
                }} className="dashboard-topbar">
                    <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }} className="dashboard-topbar-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }} className="dashboard-topbar-left">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                                display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer'
                            }} className="mobile-menu-btn">
                                {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} className="dashboard-topbar-right">
                            <div className="dashboard-theme-toggle">
                                <ThemeToggle />
                            </div>
                            <button ref={bellRef} aria-label="Notificacoes" onClick={async () => {
                                const opening = !notificationsOpen;
                                setNotificationsOpen(opening);
                                if (opening) {
                                    try {
                                        const { data } = await dashboardAPI.getStats();
                                        setDashboardNotifications((data?.notifications || data?.recent_orders || []).slice(0, 8));
                                    } catch {
                                        // Mantem os dados anteriores se a atualizacao pontual falhar.
                                    }
                                }
                            }} style={{
                                width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', cursor: 'pointer', position: 'relative'
                            }}>
                                <FiBell size={16} />
                                {unreadNotifications > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: -3,
                                        right: -3,
                                        minWidth: 17,
                                        height: 17,
                                        padding: '0 4px',
                                        borderRadius: 999,
                                        background: '#8b5cf6',
                                        color: '#fff',
                                        border: '2px solid var(--bg-card)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10,
                                        fontWeight: 900,
                                        lineHeight: 1
                                    }}>
                                        {Math.min(unreadNotifications, 9)}
                                    </span>
                                )}
                            </button>
                            {notificationsOpen && (
                                <div ref={notificationsRef} className="dashboard-notifications-popover" style={{
                                    position: 'absolute',
                                    top: 50,
                                    right: 50,
                                    width: 360,
                                    maxWidth: 'calc(100vw - 28px)',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 16,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
                                    zIndex: 9999,
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>Notificacoes</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Vendas e pagamentos recentes</div>
                                        </div>
                                        <span style={{ minWidth: 24, height: 24, borderRadius: 999, background: 'rgba(139,92,246,0.14)', color: '#8b5cf6', fontSize: 12, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {dashboardNotifications.length}
                                        </span>
                                    </div>
                                    <div style={{ maxHeight: 390, overflowY: 'auto', padding: 8 }}>
                                        {dashboardNotifications.length > 0 ? dashboardNotifications.map((order) => {
                                            const st = notificationStatus(order);
                                            return (
                                                <div key={order.id} className="dashboard-notification-item" style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '34px 1fr',
                                                    gap: 10,
                                                    padding: 10,
                                                    borderRadius: 12,
                                                    cursor: 'default'
                                                }}>
                                                    <div style={{
                                                        width: 34,
                                                        height: 34,
                                                        borderRadius: 10,
                                                        background: st.bg,
                                                        color: st.color,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {st.icon}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{st.label}</strong>
                                                            <span style={{ color: st.color, fontWeight: 900, fontSize: 12, whiteSpace: 'nowrap' }}>R$ {notificationAmount(order)}</span>
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {order.product_name || order.products?.name || 'Produto'} {order.buyer_name ? `- ${order.buyer_name}` : ''}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                                                            {order.created_at ? new Date(order.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Agora'}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div style={{ padding: '30px 18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                <FiBell size={24} style={{ marginBottom: 10, opacity: 0.5 }} />
                                                <div style={{ fontSize: 13, fontWeight: 700 }}>Nenhuma notificacao ainda</div>
                                                <div style={{ fontSize: 12, marginTop: 4 }}>As vendas aprovadas vao aparecer aqui.</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <button ref={avatarRef} onClick={() => setProfileOpen(!profileOpen)} style={{
                                width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, fontWeight: 700, color: 'white', border: '2px solid transparent',
                                cursor: 'pointer', transition: 'background 0.2s',
                                outline: profileOpen ? '2px solid #8b5cf6' : 'none',
                                outlineOffset: 2,
                                overflow: 'hidden'
                            }} className="dashboard-avatar-btn">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={user?.name || 'Perfil'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                                )}
                            </button>
                        </div>
                    </div>

                    
                </header>

                {/* Barra de onboarding — aparece apenas para usuários com cadastro incompleto */}
                <OnboardingBar />

                {/* Dashboard Filters below header (right aligned) */}
                {pathname === '/dashboard' && (
                    <div className="dashboard-period-filters" style={{ padding: '14px 32px 0', display: 'flex', justifyContent: 'flex-end' }}>
                        <div className="dashboard-period-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                ref={periodAnchorRef}
                                onClick={() => setShowConfig(!showConfig)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    height: 38,
                                    padding: '0 14px',
                                    borderRadius: 12,
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(15,23,42,0.03)'
                                }}
                            >
                                <FiCalendar size={15} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ fontSize: 12, fontWeight: 800 }}>{getDisplayRange()}</span>
                            </button>
                            <button
                                className="btn-primary"
                                onClick={applyDashboardFilters}
                                disabled={applying}
                                style={{ height: 38, padding: '0 18px', borderRadius: 12, fontWeight: 800, background: '#8b5cf6' }}
                            >
                                {applying ? 'Filtrando...' : 'Aplicar Filtros'}
                            </button>
                        </div>
                    </div>
                )}

                {showConfig && createPortal(
                    <div
                        ref={popoverRef}
                        className="dashboard-period-popover"
                        style={{
                            position: 'fixed', top: (popoverPos?.top ?? 80), right: (popoverPos?.right ?? 24), zIndex: 99999,
                            width: 560, maxWidth: 'calc(100vw - 28px)', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.45)', padding: 16
                        }}
                    >
                        <div className="dashboard-period-content" style={{ display: 'flex', gap: 16 }}>
                            <div className="dashboard-period-presets" style={{ width: 180, borderRight: '1px solid var(--border-color)', paddingRight: 12 }}>
                                {([
                                    {key:'today', label:'Hoje'},
                                    {key:'yesterday', label:'Ontem'},
                                    {key:'last7', label:'Últimos 7 dias'},
                                    {key:'last30', label:'Últimos 30 dias'},
                                    {key:'thisWeek', label:'Esta semana'},
                                    {key:'lastWeek', label:'Última semana'},
                                    {key:'thisMonth', label:'Este mês'},
                                    {key:'lastMonth', label:'Último mês'},
                                ] as const).map(item => (
                                    <button
                                        key={item.key}
                                        onClick={() => setPresetRange(item.key)}
                                        style={{
                                            width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                                            border: 'none', background: rangePreset === item.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                                            color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <div className="dashboard-period-calendar" style={{ width: 360 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <FiChevronLeft size={18} />
                                    </button>
                                    <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'lowercase' }}>{monthLabelPT(viewDate)}</div>
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <FiChevronRight size={18} />
                                    </button>
                                </div>
                                <div className="dashboard-period-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    {['dom','seg','ter','qua','qui','sex','sab'].map((w) => (
                                        <div key={w} style={{ textAlign: 'center', fontWeight: 700 }}>{w}</div>
                                    ))}
                                </div>
                                {(() => {
                                    const year = viewDate.getFullYear();
                                    const month = viewDate.getMonth();
                                    const first = new Date(year, month, 1);
                                    const lastDay = new Date(year, month + 1, 0).getDate();
                                    const startOffset = first.getDay();
                                    const cells: Array<number | null> = [];
                                    for (let i = 0; i < startOffset; i++) cells.push(null);
                                    for (let d = 1; d <= lastDay; d++) cells.push(d);
                                    const selectedStart = startDate ? new Date(startDate + 'T00:00:00') : null;
                                    const selectedEnd = endDate ? new Date(endDate + 'T23:59:59') : null;
                                    const isSelected = (d: number) => {
                                        const candidate = new Date(year, month, d);
                                        return Boolean(
                                            (selectedStart && toDashboardDateInput(selectedStart) === toDashboardDateInput(candidate)) ||
                                            (selectedEnd && toDashboardDateInput(selectedEnd) === toDashboardDateInput(candidate))
                                        );
                                    };
                                    const isInRange = (d: number) => {
                                        if (!selectedStart || !selectedEnd) return false;
                                        const candidate = new Date(year, month, d);
                                        return candidate >= selectedStart && candidate <= selectedEnd;
                                    };
                                    return (
                                        <div className="dashboard-period-days" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                                            {cells.map((c, idx) => c === null ? (
                                                <div key={idx} />
                                            ) : (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        const picked = new Date(year, month, c);
                                                        const pickedDate = toDashboardDateInput(picked);
                                                        if (rangePreset !== 'custom' || !startDate || endDate) {
                                                            setStartDate(pickedDate);
                                                            setEndDate('');
                                                        } else if (pickedDate < startDate) {
                                                            setStartDate(pickedDate);
                                                            setEndDate(startDate);
                                                        } else {
                                                            setEndDate(pickedDate);
                                                        }
                                                        setRangePreset('custom');
                                                    }}
                                                    style={{
                                                        height: 36, borderRadius: 12, border: '1px solid var(--border-color)',
                                                        background: isSelected(c)
                                                            ? 'var(--accent-gradient)'
                                                            : isInRange(c)
                                                                ? 'rgba(139,92,246,0.14)'
                                                                : 'transparent',
                                                        color: isSelected(c) ? 'white' : 'var(--text-primary)',
                                                        cursor: 'pointer', fontWeight: 700
                                                    }}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 12 }}>
                                    {rangePreset === 'custom'
                                        ? endDate
                                            ? `${startDate} ate ${endDate}`
                                            : 'Agora selecione a data final'
                                        : 'Escolha um atalho ou selecione um intervalo no calendario'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                                    <button onClick={() => setShowConfig(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={applyDashboardFilters}
                                        disabled={applying || (rangePreset === 'custom' && (!startDate || !endDate))}
                                        className="btn-primary"
                                        style={{ height: 38, padding: '0 16px', borderRadius: 12, fontWeight: 700 }}
                                    >
                                        {applying ? 'Aplicando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Profile Dropdown - rendered via portal */}
                {profileOpen && createPortal(
                    <div ref={profileRef} style={{
                        position: 'fixed', top: 60, right: 24, zIndex: 99999,
                        width: 280, background: 'var(--bg-card, #1a1a2e)', borderRadius: 16,
                        border: '1px solid var(--border-color)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                        overflow: 'hidden', animation: 'dropIn 0.2s ease'
                    }}>
                        {/* User Info */}
                        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12, background: 'var(--accent-gradient)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt={user?.name || 'Perfil'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        user?.name?.charAt(0)?.toUpperCase() || 'U'
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div style={{ padding: '8px' }}>
                            <Link href="/dashboard/profile" onClick={() => setProfileOpen(false)} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                                borderRadius: 10, color: 'var(--text-primary)', textDecoration: 'none',
                                fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
                                background: 'transparent'
                            }} className="profile-menu-item">
                                <FiUser size={16} style={{ color: 'var(--accent-secondary)' }} />
                                Meu perfil
                            </Link>
                            {user?.role === 'admin' ? (
                                <>
                                <Link href="/admin" onClick={() => setProfileOpen(false)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                                    borderRadius: 10, color: 'var(--text-primary)', textDecoration: 'none',
                                    fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
                                    background: 'transparent'
                                }} className="profile-menu-item">
                                    <FiShield size={16} style={{ color: 'var(--accent-secondary)' }} />
                                    Painel Admin
                                </Link>
                                <Link href="/dashboard" onClick={() => setProfileOpen(false)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                                    borderRadius: 10, color: 'var(--text-primary)', textDecoration: 'none',
                                    fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
                                    background: 'transparent'
                                }} className="profile-menu-item">
                                    <FiShoppingBag size={16} style={{ color: 'var(--accent-secondary)' }} />
                                    Painel do Vendedor
                                </Link>
                                </>
                            ) : (
                                <Link href="/area-membros" onClick={() => setProfileOpen(false)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                                    borderRadius: 10, color: 'var(--text-primary)', textDecoration: 'none',
                                    fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
                                    background: 'transparent'
                                }} className="profile-menu-item">
                                    <FiBookOpen size={16} style={{ color: 'var(--accent-secondary)' }} />
                                    Painel do Aluno
                                </Link>
                            )}
                            <button onClick={() => { setProfileOpen(false); handleLogout(); }} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                                borderRadius: 10, color: 'var(--danger)', textDecoration: 'none',
                                fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
                                background: 'transparent', border: 'none', width: '100%', cursor: 'pointer'
                            }} className="profile-menu-item">
                                <FiLogOut size={16} />
                                Sair
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Page content */}
                <div style={{ padding: '22px 32px 34px' }}>
                    {children}
                </div>
            </main>

            <style jsx global>{`
      @media (max-width: 768px) {
          .dashboard-aside {
            transform: translateX(-100%) !important;
            height: 100vh !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
          }
          .dashboard-aside.open { transform: translateX(0) !important; }
          .dashboard-sidebar-header,
          .dashboard-sidebar-progress { flex-shrink: 0 !important; }
          .dashboard-sidebar-nav {
            min-height: 0 !important;
            overflow-y: auto !important;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
          }
          main { padding-left: 0 !important; }
          .mobile-overlay { display: block !important; }
          .mobile-menu-btn { display: block !important; }
          .dashboard-topbar-row { padding: 12px 14px !important; }
          .dashboard-topbar-left { gap: 10px; }
          .dashboard-topbar-title { font-size: 16px !important; }
          .dashboard-topbar-right { gap: 10px; }
          .dashboard-theme-toggle { transform: scale(0.92); transform-origin: right center; }
          .dashboard-avatar-btn { width: 34px !important; height: 34px !important; font-size: 14px !important; }
          .dashboard-sales-progress { padding: 0 14px 12px !important; }
          .dashboard-notifications-popover { right: 0 !important; width: min(360px, calc(100vw - 28px)) !important; }
          .dashboard-period-filters { padding: 14px 14px 0 !important; justify-content: center !important; }
          .dashboard-period-actions { width: 100%; justify-content: center !important; }
          .dashboard-period-popover {
            top: 50% !important;
            left: 50% !important;
            right: auto !important;
            width: calc(100vw - 28px) !important;
            max-height: calc(100dvh - 32px) !important;
            overflow-y: auto !important;
            transform: translate(-50%, -50%) !important;
            padding: 14px !important;
          }
          .dashboard-period-content { flex-direction: column !important; gap: 14px !important; }
          .dashboard-period-presets {
            width: 100% !important;
            border-right: 0 !important;
            border-bottom: 1px solid var(--border-color) !important;
            padding-right: 0 !important;
            padding-bottom: 12px !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 4px !important;
          }
          .dashboard-period-calendar { width: 100% !important; }
          .dashboard-period-weekdays,
          .dashboard-period-days { gap: 5px !important; }
        }
        @media (max-width: 420px) {
          .dashboard-online-badge { display: none !important; }
        }
        .profile-menu-item:hover {
          background: rgba(255,255,255,0.06) !important;
        }
        .dashboard-notification-item:hover {
          background: rgba(139,92,246,0.08);
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
