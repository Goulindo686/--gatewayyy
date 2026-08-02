'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGlobe, FiGrid, FiLayout, FiPackage, FiShoppingBag } from 'react-icons/fi';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const tabs = [
        {
            href: '/dashboard/store/settings',
            label: 'Design e estrutura',
            description: 'Aparência e organização',
            icon: <FiLayout />
        },
        {
            href: '/dashboard/store/categories',
            label: 'Categorias',
            description: 'Agrupe seu catálogo',
            icon: <FiGrid />
        },
        {
            href: '/dashboard/store/products',
            label: 'Produtos da loja',
            description: 'Escolha o que será exibido',
            icon: <FiPackage />
        },
        {
            href: '/dashboard/store/domain',
            label: 'Domínio próprio',
            description: 'Conecte seu endereço',
            icon: <FiGlobe />
        }
    ];

    return (
        <div className="animate-fade-in store-area">
            <div className="store-area-header">
                <div className="store-area-title-icon"><FiShoppingBag /></div>
                <div>
                    <span>VITRINE DIGITAL</span>
                    <h1>Minha Loja</h1>
                    <p>Personalize a aparência e organize os produtos que seus clientes verão.</p>
                </div>
            </div>

            <nav className="store-tabs" aria-label="Configurações da loja">
                {tabs.map(tab => {
                    const active = pathname === tab.href;
                    return (
                        <Link key={tab.href} href={tab.href} className={`store-tab-link ${active ? 'active' : ''}`}>
                            <span className="store-tab-icon">{tab.icon}</span>
                            <span>
                                <strong>{tab.label}</strong>
                                <small>{tab.description}</small>
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div>{children}</div>

            <style jsx global>{`
                .store-area {
                    width: 100%;
                    max-width: 1240px;
                    margin: 0 auto;
                }
                .store-area-header {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 22px;
                }
                .store-area-title-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 15px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.12);
                    font-size: 21px;
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
                    font-size: 28px;
                    font-weight: 850;
                    line-height: 1.1;
                    margin-bottom: 5px;
                }
                .store-area-header p {
                    color: var(--text-secondary);
                    font-size: 13px;
                }
                .store-tabs {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                    margin-bottom: 24px;
                }
                .store-tab-link {
                    min-width: 0;
                    min-height: 68px;
                    border: 1px solid var(--border-color);
                    border-radius: 15px;
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    color: var(--text-secondary);
                    background: var(--bg-card);
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
                    background: rgba(108,92,231,.08);
                    box-shadow: inset 0 0 0 1px rgba(108,92,231,.06);
                }
                .store-tab-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 12px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: inherit;
                    background: var(--bg-secondary);
                    font-size: 17px;
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
                @media (max-width: 760px) {
                    .store-area-header {
                        align-items: flex-start;
                    }
                    .store-area-header h1 {
                        font-size: 24px;
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
                        min-width: 210px;
                    }
                }
            `}</style>
        </div>
    );
}
