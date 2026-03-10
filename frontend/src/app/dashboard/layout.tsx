'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiPackage, FiDollarSign, FiSettings, FiLogOut, FiMenu, FiX, FiPercent, FiBookOpen, FiUser, FiMessageCircle, FiShoppingBag, FiShoppingCart, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { ThemeToggle } from '@/components/theme-toggle';
import { dashboardAPI } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [salesTotal, setSalesTotal] = useState<number | null>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLButtonElement>(null);
    const [rangePreset, setRangePreset] = useState('last7');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [applying, setApplying] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null);
    const periodAnchorRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!token || !userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));
    }, [router]);

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
            try {
                const { data } = await dashboardAPI.getStats();
                if (cancelled) return;
                const totalSold = parseMoney(data?.stats?.total_sold);
                setSalesTotal(totalSold);
            } catch {
                if (!cancelled) setSalesTotal(null);
            }
        };

        load();
        const id = window.setInterval(load, 8000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
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
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const applyDashboardFilters = async () => {
        if (pathname !== '/dashboard') return;
        setApplying(true);
        try {
            const now = new Date();
            const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
            const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
            const params: Record<string, string> = {};
            if (rangePreset !== 'custom') {
                if (rangePreset === 'today') {
                    params.start = startOfDay(now).toISOString();
                    params.end = endOfDay(now).toISOString();
                } else if (rangePreset === 'yesterday') {
                    const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    params.start = startOfDay(y).toISOString();
                    params.end = endOfDay(y).toISOString();
                } else if (rangePreset === 'last7') {
                    const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    params.start = startOfDay(s).toISOString();
                    params.end = endOfDay(now).toISOString();
                } else if (rangePreset === 'thisMonth') {
                    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                    const e = endOfDay(now);
                    params.start = s.toISOString();
                    params.end = e.toISOString();
                } else if (rangePreset === 'lastMonth') {
                    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
                    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                    params.start = s.toISOString();
                    params.end = e.toISOString();
                }
            } else {
                if (startDate) params.start = new Date(startDate + 'T00:00:00').toISOString();
                if (endDate) params.end = new Date(endDate + 'T23:59:59').toISOString();
            }
            const qs = new URLSearchParams(params).toString();
            router.replace(qs ? `/dashboard?${qs}` : '/dashboard');
            setShowConfig(false);
            try { router.refresh?.(); } catch {}
        } finally {
            setApplying(false);
        }
    };

    const getDisplayRange = () => {
        const now = new Date();
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        let s = startDate ? new Date(startDate + 'T00:00:00') : startOfDay(now);
        let e = endDate ? new Date(endDate + 'T23:59:59') : endOfDay(now);
        if (rangePreset !== 'custom') {
            if (rangePreset === 'today') {
                s = startOfDay(now);
                e = endOfDay(now);
            } else if (rangePreset === 'yesterday') {
                const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                s = startOfDay(y);
                e = endOfDay(y);
            } else if (rangePreset === 'last7') {
                const seven = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                s = startOfDay(seven);
                e = endOfDay(now);
            } else if (rangePreset === 'thisMonth') {
                s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                e = endOfDay(now);
            } else if (rangePreset === 'lastMonth') {
                s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
                e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            }
        }
        const fmt = (d: Date) => {
            const m = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
            const day = d.toLocaleString('en-US', { day: '2-digit' });
            const y = d.getFullYear();
            return `${m} ${day}, ${y}`;
        };
        return `${fmt(s)} - ${fmt(e)}`;
    };

    const toISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const setPresetRange = (preset: string) => {
        const now = new Date();
        if (preset === 'today') {
            setStartDate(toISODate(now));
            setEndDate(toISODate(now));
        } else if (preset === 'yesterday') {
            const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            setStartDate(toISODate(y));
            setEndDate(toISODate(y));
        } else if (preset === 'last7') {
            const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(toISODate(s));
            setEndDate(toISODate(now));
        } else if (preset === 'last30') {
            const s = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setStartDate(toISODate(s));
            setEndDate(toISODate(now));
        } else if (preset === 'thisWeek') {
            const d = new Date(now);
            const day = d.getDay();
            const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
            const saturday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - day));
            setStartDate(toISODate(sunday));
            setEndDate(toISODate(saturday));
        } else if (preset === 'lastWeek') {
            const d = new Date(now);
            const day = d.getDay();
            const sundayLast = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day - 7);
            const saturdayLast = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day - 1);
            setStartDate(toISODate(sundayLast));
            setEndDate(toISODate(saturdayLast));
        } else if (preset === 'thisMonth') {
            const s = new Date(now.getFullYear(), now.getMonth(), 1);
            const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setStartDate(toISODate(s));
            setEndDate(toISODate(e));
        } else if (preset === 'lastMonth') {
            const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const e = new Date(now.getFullYear(), now.getMonth(), 0);
            setStartDate(toISODate(s));
            setEndDate(toISODate(e));
        }
        setRangePreset(preset);
        setViewDate(now);
    };

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
        { href: '/dashboard/sales', icon: <FiShoppingCart size={18} />, label: 'Vendas' },
        { href: '/dashboard/withdrawals', icon: <FiDollarSign size={18} />, label: 'Saques' },
        { href: '/dashboard/fees', icon: <FiPercent size={18} />, label: 'Taxas' },
        { href: '/dashboard/settings', icon: <FiSettings size={18} />, label: 'Configurações' },
        { href: '/dashboard/store/settings', icon: <FiShoppingBag size={18} />, label: 'Minha Loja' },
        { href: '/dashboard/contact', icon: <FiMessageCircle size={18} />, label: 'Falar com a gente' },
    ];

    if (!user) return null;

    const current = salesTotal ?? 0;
    const targets = [10_000, 100_000, 500_000, 1_000_000];
    const target = targets.find(t => current < t) ?? 1_000_000;
    const pct = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40,
                    display: 'none',
                }} className="mobile-overlay" />
            )}

            {/* Sidebar */}
            <aside style={{
                width: 260, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
                transition: 'transform 0.3s ease',
            }} className={`dashboard-aside${sidebarOpen ? ' open' : ''}`}>
                {/* Logo */}
                <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="/logo.png" alt="GouPay Logo" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
                    <span style={{ fontSize: 18, fontWeight: 700 }}>Gou<span className="gradient-text">Pay</span></span>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}>
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* User info */}
                <div style={{
                    padding: '16px 12px', borderTop: '1px solid var(--border-color)',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                        borderRadius: 10, background: 'rgba(108,92,231,0.06)', marginBottom: 8
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0
                        }}>
                            {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                        <FiLogOut size={18} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, paddingLeft: 260, minHeight: '100vh', overflowX: 'hidden' }}>
                {/* Top bar */}
                <header style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--header-bg)', backdropFilter: 'blur(10px)',
                    position: 'sticky', top: 0, zIndex: 30
                }} className="dashboard-topbar">
                    <div style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }} className="dashboard-topbar-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }} className="dashboard-topbar-left">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                                display: 'none', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer'
                            }} className="mobile-menu-btn">
                                {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                            </button>
                            <h2 style={{ fontSize: 18, fontWeight: 600, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="dashboard-topbar-title">
                                {navItems.find(n => n.href === pathname)?.label || 'Dashboard'}
                            </h2>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }} className="dashboard-topbar-right">
                            <div className="dashboard-theme-toggle">
                                <ThemeToggle />
                            </div>
                            <span className="badge badge-success dashboard-online-badge" style={{ fontSize: 11 }}>Online</span>
                            <button ref={avatarRef} onClick={() => setProfileOpen(!profileOpen)} style={{
                                width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-gradient)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, fontWeight: 700, color: 'white', border: '2px solid transparent',
                                cursor: 'pointer', transition: 'all 0.2s',
                                outline: profileOpen ? '2px solid var(--accent-primary)' : 'none',
                                outlineOffset: 2
                            }} className="dashboard-avatar-btn">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '0 32px 12px' }} className="dashboard-sales-progress">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }} className="dashboard-sales-progress-labels">
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Progresso de Vendas</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                                R$ {formatBRL(current)} / R$ {formatBRL(target)} ({pct.toFixed(0)}%)
                            </div>
                        </div>
                        <div style={{ height: 10, borderRadius: 999, background: 'rgba(108,92,231,0.14)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-gradient)', transition: 'width 0.35s ease' }} />
                        </div>
                    </div>
                </header>

                {/* Dashboard Filters below header (right aligned) */}
                {pathname === '/dashboard' && (
                    <div style={{ padding: '12px 32px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                ref={periodAnchorRef}
                                onClick={() => setShowConfig(!showConfig)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    height: 42,
                                    padding: '0 14px',
                                    borderRadius: 14,
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)'
                                }}
                            >
                                <FiCalendar size={16} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{getDisplayRange()}</span>
                            </button>
                            <button
                                className="btn-primary"
                                onClick={applyDashboardFilters}
                                disabled={applying}
                                style={{ height: 42, padding: '0 18px', borderRadius: 12, fontWeight: 700 }}
                            >
                                {applying ? 'Filtrando...' : 'Aplicar Filtros'}
                            </button>
                        </div>
                    </div>
                )}

                {showConfig && createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            position: 'fixed', top: (popoverPos?.top ?? 80), right: (popoverPos?.right ?? 24), zIndex: 99999,
                            width: 560, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.45)', padding: 16
                        }}
                    >
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ width: 180, borderRight: '1px solid var(--border-color)', paddingRight: 12 }}>
                                {[
                                    {key:'today', label:'Hoje'},
                                    {key:'yesterday', label:'Ontem'},
                                    {key:'last7', label:'Últimos 7 dias'},
                                    {key:'last30', label:'Últimos 30 dias'},
                                    {key:'thisWeek', label:'Esta semana'},
                                    {key:'lastWeek', label:'Última semana'},
                                    {key:'thisMonth', label:'Este mês'},
                                    {key:'lastMonth', label:'Último mês'},
                                ].map(item => (
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
                            <div style={{ width: 360 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <FiChevronLeft size={18} />
                                    </button>
                                    <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'lowercase' }}>{monthLabelPT(viewDate)}</div>
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <FiChevronRight size={18} />
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
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
                                    const selectedDay = startDate ? new Date(startDate + 'T00:00:00') : null;
                                    const isSelected = (d: number) => {
                                        if (!selectedDay) return false;
                                        return selectedDay.getFullYear() === year &&
                                            selectedDay.getMonth() === month &&
                                            selectedDay.getDate() === d;
                                    };
                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                                            {cells.map((c, idx) => c === null ? (
                                                <div key={idx} />
                                            ) : (
                                                <button
                                                    key={idx}
                                                    onClick={() => { 
                                                        const picked = new Date(year, month, c);
                                                        setStartDate(toISODate(picked));
                                                        setEndDate(toISODate(picked));
                                                        setRangePreset('custom');
                                                    }}
                                                    style={{
                                                        height: 36, borderRadius: 12, border: '1px solid var(--border-color)',
                                                        background: isSelected(c) ? 'var(--accent-gradient)' : 'transparent',
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                                    <button onClick={() => setShowConfig(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                                        Cancelar
                                    </button>
                                    <button onClick={() => setShowConfig(false)} className="btn-primary" style={{ height: 38, padding: '0 16px', borderRadius: 12, fontWeight: 700 }}>
                                        Confirmar
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
                                    fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0
                                }}>
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div style={{ padding: '8px' }}>
                            <Link href="/area-membros" onClick={() => setProfileOpen(false)} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px',
                                borderRadius: 10, color: 'var(--text-primary)', textDecoration: 'none',
                                fontSize: 14, fontWeight: 500, transition: 'background 0.15s',
                                background: 'transparent'
                            }} className="profile-menu-item">
                                <FiBookOpen size={16} style={{ color: 'var(--accent-secondary)' }} />
                                Painel do Aluno
                            </Link>
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
                <div style={{ padding: 32 }}>
                    {children}
                </div>
            </main>

            <style jsx global>{`
      @media (max-width: 768px) {
          .dashboard-aside { transform: translateX(-100%) !important; }
          .dashboard-aside.open { transform: translateX(0) !important; }
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
        }
        @media (max-width: 420px) {
          .dashboard-online-badge { display: none !important; }
        }
        .profile-menu-item:hover {
          background: rgba(255,255,255,0.06) !important;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
