'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    FiArrowRight,
    FiGlobe,
    FiGrid,
    FiLayout,
    FiPackage,
    FiShoppingBag
} from 'react-icons/fi';

const navigationGroups = [
    {
        label: 'Criar',
        description: 'Defina a experiência',
        items: [
            {
                href: '/dashboard/store/settings',
                label: 'Personalização',
                description: 'Marca, visual e estrutura',
                icon: FiLayout
            }
        ]
    },
    {
        label: 'Organizar',
        description: 'Monte seu catálogo',
        items: [
            {
                href: '/dashboard/store/products',
                label: 'Produtos',
                description: 'Itens exibidos na loja',
                icon: FiPackage
            },
            {
                href: '/dashboard/store/categories',
                label: 'Categorias',
                description: 'Coleções e filtros',
                icon: FiGrid
            }
        ]
    },
    {
        label: 'Publicar',
        description: 'Coloque sua marca no ar',
        items: [
            {
                href: '/dashboard/store/domain',
                label: 'Domínio',
                description: 'Seu endereço próprio',
                icon: FiGlobe
            }
        ]
    }
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="store-workspace animate-fade-in">
            <header className="store-workspace-header">
                <div className="store-workspace-title">
                    <span className="store-workspace-icon"><FiShoppingBag /></span>
                    <div>
                        <span className="store-workspace-kicker">CENTRAL DA LOJA</span>
                        <h1>Minha Loja</h1>
                        <p>Cuide da identidade, do catálogo e da publicação da sua vitrine em um só lugar.</p>
                    </div>
                </div>
                <div className="store-workspace-guide">
                    <span>Fluxo recomendado</span>
                    <strong>Personalize, organize e publique</strong>
                    <FiArrowRight />
                </div>
            </header>

            <nav className="store-workspace-nav" aria-label="Áreas da Minha Loja">
                {navigationGroups.map((group, groupIndex) => (
                    <div className="store-nav-group" key={group.label}>
                        <div className="store-nav-group-label">
                            <span>0{groupIndex + 1}</span>
                            <div>
                                <strong>{group.label}</strong>
                                <small>{group.description}</small>
                            </div>
                        </div>
                        <div className="store-nav-group-items">
                            {group.items.map(item => {
                                const active = pathname === item.href;
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`store-nav-item ${active ? 'active' : ''}`}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <span className="store-nav-item-icon"><Icon /></span>
                                        <span className="store-nav-item-copy">
                                            <strong>{item.label}</strong>
                                            <small>{item.description}</small>
                                        </span>
                                        <FiArrowRight className="store-nav-item-arrow" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <main className="store-workspace-content">{children}</main>

            <style jsx global>{`
                .store-workspace {
                    width: 100%;
                    max-width: 1280px;
                    margin: 0 auto;
                }
                .store-workspace-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 24px;
                    margin-bottom: 22px;
                }
                .store-workspace-title {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .store-workspace-icon {
                    width: 52px;
                    height: 52px;
                    border: 1px solid rgba(108,92,231,.18);
                    border-radius: 17px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: var(--accent-primary);
                    background: linear-gradient(145deg, rgba(108,92,231,.15), rgba(108,92,231,.04));
                    font-size: 21px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
                }
                .store-workspace-kicker {
                    display: block;
                    margin-bottom: 4px;
                    color: var(--accent-primary);
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: .14em;
                }
                .store-workspace-title h1 {
                    margin: 0 0 5px;
                    color: var(--text-primary);
                    font-size: 29px;
                    font-weight: 850;
                    line-height: 1;
                    letter-spacing: -.025em;
                }
                .store-workspace-title p {
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 13px;
                }
                .store-workspace-guide {
                    min-width: 285px;
                    border-left: 1px solid var(--border-color);
                    padding: 2px 0 2px 18px;
                    display: grid;
                    grid-template-columns: 1fr auto;
                    align-items: center;
                    color: var(--text-muted);
                }
                .store-workspace-guide span,
                .store-workspace-guide strong {
                    grid-column: 1;
                    display: block;
                }
                .store-workspace-guide span {
                    margin-bottom: 3px;
                    font-size: 10px;
                }
                .store-workspace-guide strong {
                    color: var(--text-primary);
                    font-size: 12px;
                }
                .store-workspace-guide svg {
                    grid-column: 2;
                    grid-row: 1 / 3;
                    color: var(--accent-primary);
                }
                .store-workspace-nav {
                    display: grid;
                    grid-template-columns: .78fr 1.35fr .78fr;
                    gap: 10px;
                    margin-bottom: 24px;
                }
                .store-nav-group {
                    min-width: 0;
                    border: 1px solid var(--border-color);
                    border-radius: 18px;
                    padding: 9px;
                    background: color-mix(in srgb, var(--bg-card) 92%, transparent);
                    box-shadow: 0 8px 28px rgba(15,23,42,.035);
                }
                .store-nav-group-label {
                    min-height: 35px;
                    padding: 1px 5px 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-muted);
                }
                .store-nav-group-label > span {
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: .08em;
                }
                .store-nav-group-label strong,
                .store-nav-group-label small {
                    display: block;
                }
                .store-nav-group-label strong {
                    color: var(--text-primary);
                    font-size: 10px;
                    line-height: 1.1;
                }
                .store-nav-group-label small {
                    margin-top: 2px;
                    font-size: 8px;
                }
                .store-nav-group-items {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
                    gap: 7px;
                }
                .store-nav-item {
                    position: relative;
                    min-width: 0;
                    min-height: 62px;
                    border: 1px solid transparent;
                    border-radius: 13px;
                    padding: 10px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    color: var(--text-secondary);
                    background: var(--bg-secondary);
                    text-decoration: none;
                    transition: border-color .2s, background .2s, transform .2s;
                }
                .store-nav-item:hover {
                    border-color: rgba(108,92,231,.26);
                    transform: translateY(-1px);
                }
                .store-nav-item.active {
                    border-color: rgba(108,92,231,.38);
                    color: var(--accent-primary);
                    background: rgba(108,92,231,.09);
                    box-shadow: inset 3px 0 0 var(--accent-primary);
                }
                .store-nav-item-icon {
                    width: 33px;
                    height: 33px;
                    border-radius: 10px;
                    display: grid;
                    place-items: center;
                    flex: 0 0 auto;
                    color: inherit;
                    background: var(--bg-card);
                    font-size: 15px;
                }
                .store-nav-item.active .store-nav-item-icon {
                    background: rgba(108,92,231,.13);
                }
                .store-nav-item-copy {
                    min-width: 0;
                }
                .store-nav-item-copy strong,
                .store-nav-item-copy small {
                    display: block;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .store-nav-item-copy strong {
                    color: var(--text-primary);
                    font-size: 12px;
                    margin-bottom: 3px;
                }
                .store-nav-item.active .store-nav-item-copy strong {
                    color: var(--accent-primary);
                }
                .store-nav-item-copy small {
                    color: var(--text-muted);
                    font-size: 9px;
                }
                .store-nav-item-arrow {
                    margin-left: auto;
                    flex: 0 0 auto;
                    opacity: 0;
                    font-size: 13px;
                    transform: translateX(-4px);
                    transition: opacity .2s, transform .2s;
                }
                .store-nav-item:hover .store-nav-item-arrow,
                .store-nav-item.active .store-nav-item-arrow {
                    opacity: 1;
                    transform: none;
                }
                .store-workspace-content {
                    min-width: 0;
                }
                @media (max-width: 900px) {
                    .store-workspace-guide {
                        display: none;
                    }
                    .store-workspace-nav {
                        display: flex;
                        overflow-x: auto;
                        padding-bottom: 4px;
                        scrollbar-width: none;
                    }
                    .store-workspace-nav::-webkit-scrollbar {
                        display: none;
                    }
                    .store-nav-group {
                        flex: 0 0 auto;
                        min-width: 230px;
                    }
                    .store-nav-group:nth-child(2) {
                        min-width: 420px;
                    }
                }
                @media (max-width: 620px) {
                    .store-workspace-header {
                        align-items: flex-start;
                    }
                    .store-workspace-title {
                        align-items: flex-start;
                    }
                    .store-workspace-icon {
                        width: 44px;
                        height: 44px;
                        border-radius: 14px;
                    }
                    .store-workspace-title h1 {
                        font-size: 24px;
                    }
                    .store-workspace-title p {
                        font-size: 11px;
                        line-height: 1.45;
                    }
                    .store-nav-group {
                        min-width: 204px;
                    }
                    .store-nav-group:nth-child(2) {
                        min-width: 372px;
                    }
                }
            `}</style>
        </div>
    );
}
