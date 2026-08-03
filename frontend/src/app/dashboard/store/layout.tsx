'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiCheckCircle, FiGlobe, FiGrid, FiLayout, FiPackage, FiShoppingBag } from 'react-icons/fi';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const tabs = [
        {
            href: '/dashboard/store/settings',
            step: '01',
            label: 'Personalização',
            description: 'Aparência e organização',
            icon: <FiLayout />
        },
        {
            href: '/dashboard/store/products',
            step: '02',
            label: 'Produtos',
            description: 'Escolha o que será exibido',
            icon: <FiPackage />
        },
        {
            href: '/dashboard/store/categories',
            step: '03',
            label: 'Categorias',
            description: 'Organize seu catálogo',
            icon: <FiGrid />
        },
        {
            href: '/dashboard/store/domain',
            step: '04',
            label: 'Domínio',
            description: 'Conecte seu endereço',
            icon: <FiGlobe />
        }
    ];

    return (
        <div className="animate-fade-in store-area">
            <header className="store-area-header">
                <div className="store-area-heading">
                    <div className="store-area-title-icon"><FiShoppingBag /></div>
                    <div>
                        <span>CENTRAL DA SUA VITRINE</span>
                        <h1>Minha Loja</h1>
                        <p>Configure sua marca, organize o catálogo e publique sua loja em um só lugar.</p>
                    </div>
                </div>
                <div className="store-area-guide">
                    <FiCheckCircle />
                    <div><strong>Fluxo organizado</strong><small>Personalize, organize e conecte</small></div>
                </div>
            </header>

            <div className="store-navigation-shell">
                <div className="store-navigation-heading">
                    <span>ÁREAS DA LOJA</span>
                    <small>Siga a ordem ou acesse diretamente o que precisa.</small>
                </div>
                <nav className="store-tabs" aria-label="Configurações da loja">
                    {tabs.map(tab => {
                        const active = pathname === tab.href;
                        return (
                            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={`store-tab-link ${active ? 'active' : ''}`}>
                                <span className="store-tab-step">{tab.step}</span>
                                <span className="store-tab-icon">{tab.icon}</span>
                                <span className="store-tab-copy">
                                    <strong>{tab.label}</strong>
                                    <small>{tab.description}</small>
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <main className="store-area-content">{children}</main>

            <style jsx global>{`
                .store-area {
                    width: 100%;
                    max-width: 1280px;
                    margin: 0 auto;
                }
                .store-area-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 22px 24px;
                    margin-bottom: 14px;
                    background:
                        radial-gradient(circle at 88% 16%, rgba(108,92,231,.14), transparent 28%),
                        var(--bg-card);
                    overflow: hidden;
                }
                .store-area-heading {
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .store-area-title-icon {
                    width: 52px;
                    height: 52px;
                    border-radius: 17px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.12);
                    font-size: 22px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
                }
                .store-area-header span {
                    display: block;
                    color: var(--accent-primary);
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: .12em;
                    margin-bottom: 3px;
                }
                .store-area-header h1 {
                    font-size: 27px;
                    font-weight: 850;
                    line-height: 1.1;
                    margin-bottom: 5px;
                }
                .store-area-header p {
                    color: var(--text-secondary);
                    font-size: 12px;
                    line-height: 1.5;
                }
                .store-area-guide {
                    flex: 0 0 auto;
                    border: 1px solid rgba(108,92,231,.24);
                    border-radius: 14px;
                    padding: 11px 13px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.075);
                }
                .store-area-guide > svg {
                    font-size: 18px;
                }
                .store-area-guide strong,
                .store-area-guide small {
                    display: block;
                }
                .store-area-guide strong {
                    color: var(--text-primary);
                    font-size: 11px;
                    margin-bottom: 2px;
                }
                .store-area-guide small {
                    color: var(--text-muted);
                    font-size: 9px;
                }
                .store-navigation-shell {
                    border: 1px solid var(--border-color);
                    border-radius: 18px;
                    padding: 13px;
                    margin-bottom: 20px;
                    background: var(--bg-card);
                }
                .store-navigation-heading {
                    display: flex;
                    align-items: baseline;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 1px 3px 11px;
                }
                .store-navigation-heading span {
                    color: var(--text-secondary);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: .13em;
                }
                .store-navigation-heading small {
                    color: var(--text-muted);
                    font-size: 9px;
                }
                .store-tabs {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 8px;
                }
                .store-tab-link {
                    position: relative;
                    min-width: 0;
                    min-height: 70px;
                    border: 1px solid var(--border-color);
                    border-radius: 14px;
                    padding: 11px 12px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    color: var(--text-muted);
                    background: var(--bg-secondary);
                    text-decoration: none;
                    transition: border-color .2s, background .2s, transform .2s;
                }
                .store-tab-link:hover {
                    border-color: rgba(108,92,231,.35);
                    transform: translateY(-1px);
                }
                .store-tab-link.active {
                    border-color: rgba(108,92,231,.42);
                    color: var(--accent-primary);
                    background: linear-gradient(145deg, rgba(108,92,231,.13), rgba(108,92,231,.055));
                    box-shadow: inset 0 0 0 1px rgba(108,92,231,.05), 0 8px 22px rgba(15,23,42,.06);
                }
                .store-tab-step {
                    position: absolute;
                    top: 8px;
                    right: 9px;
                    color: var(--text-muted);
                    font-size: 8px;
                    font-weight: 900;
                    letter-spacing: .08em;
                }
                .store-tab-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 11px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: inherit;
                    background: var(--bg-card);
                    font-size: 16px;
                }
                .store-tab-link.active .store-tab-icon {
                    background: rgba(108,92,231,.13);
                }
                .store-tab-link strong,
                .store-tab-link small {
                    display: block;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-tab-link strong {
                    color: var(--text-primary);
                    font-size: 13px;
                    margin-bottom: 3px;
                }
                .store-tab-link.active strong {
                    color: var(--accent-primary);
                }
                .store-tab-link small {
                    color: var(--text-muted);
                    font-size: 10px;
                }
                .store-area-content {
                    min-width: 0;
                }
                @media (max-width: 760px) {
                    .store-area-header {
                        align-items: flex-start;
                        padding: 18px;
                    }
                    .store-area-header h1 {
                        font-size: 24px;
                    }
                    .store-area-guide {
                        display: none;
                    }
                    .store-navigation-heading {
                        display: block;
                    }
                    .store-navigation-heading small {
                        display: block;
                        margin-top: 4px;
                    }
                    .store-tabs {
                        display: flex;
                        overflow-x: auto;
                        scrollbar-width: none;
                        padding-bottom: 3px;
                    }
                    .store-tabs::-webkit-scrollbar {
                        display: none;
                    }
                    .store-tab-link {
                        min-width: 190px;
                    }
                }
                @media (max-width: 480px) {
                    .store-area-heading {
                        align-items: flex-start;
                    }
                    .store-area-title-icon {
                        width: 44px;
                        height: 44px;
                    }
                    .store-area-header h1 {
                        font-size: 22px;
                    }
                }
            `}</style>
        </div>
    );
}
