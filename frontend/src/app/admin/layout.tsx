'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiUsers, FiList, FiSettings, FiLogOut, FiShield, FiPackage, FiDollarSign, FiShoppingBag } from 'react-icons/fi';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (!token || !userData) { router.push('/login'); return; }
        const parsed = JSON.parse(userData);
        if (parsed.role !== 'admin') { router.push('/dashboard'); return; }
        setUser(parsed);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const navItems = [
        { href: '/admin', icon: <FiHome size={18} />, label: 'Dashboard' },
        { href: '/admin/sellers', icon: <FiUsers size={18} />, label: 'Vendedores' },
        { href: '/admin/transactions', icon: <FiList size={18} />, label: 'Transações' },
        { href: '/admin/settings', icon: <FiSettings size={18} />, label: 'Configurações' },
        // Abas do vendedor acessíveis pelo admin
        { href: '/admin/products', icon: <FiPackage size={18} />, label: 'Produtos' },
        { href: '/admin/store', icon: <FiShoppingBag size={18} />, label: 'Minha Loja' },
        { href: '/admin/withdrawals', icon: <FiDollarSign size={18} />, label: 'Saques' },
    ];

    if (!user) return null;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <aside style={{
                width: 260, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50
            }}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <FiShield size={18} color="white" />
                    </div>
                    <div>
                        <span style={{ fontSize: 16, fontWeight: 700, display: 'block' }}>Admin Panel</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>GouPay</span>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}>
                            {item.icon} {item.label}
                        </Link>
                    ))}
                </nav>

                <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)' }}>
                    <Link href="/dashboard" className="sidebar-link" style={{ marginBottom: 4, textDecoration: 'none' }}>
                        <FiHome size={18} /> Painel do Vendedor
                    </Link>
                    <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                        <FiLogOut size={18} /> Sair
                    </button>
                </div>
            </aside>

            <main style={{ flex: 1, paddingLeft: 260, minHeight: '100vh', overflowX: 'hidden' }}>
                <header style={{
                    padding: '16px 32px', borderBottom: '1px solid var(--border-color)',
                    background: 'var(--header-bg)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, zIndex: 30
                }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600 }}>
                        {navItems.find(n => n.href === pathname)?.label || 'Admin'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ThemeToggle />
                        <span className="badge badge-danger" style={{ fontSize: 11 }}>ADMIN</span>
                    </div>
                </header>
                <div style={{ padding: 32 }}>{children}</div>
            </main>

            <style jsx global>{`
        @media (max-width: 768px) {
          aside { display: none !important; }
          main { padding-left: 0 !important; }
        }
      `}</style>
        </div>
    );
}
