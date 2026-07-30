'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
    FiArrowLeft,
    FiBookOpen,
    FiEdit2,
    FiKey,
    FiLink,
    FiSettings,
    FiTag,
} from 'react-icons/fi';
import { productManagementAPI } from '@/lib/api';

const tabDefinitions = [
    { suffix: '', label: 'Link do produto', icon: FiLink },
    { suffix: '/content', label: 'Área de Membros', icon: FiBookOpen },
    { suffix: '/order-bumps', label: 'Order Bump', icon: FiTag },
    { suffix: '/edit', label: 'Editar produto', icon: FiEdit2 },
    { suffix: '/checkout', label: 'Personalizar checkout', icon: FiSettings },
    { suffix: '/unique-deliveries', label: 'Entregas Únicas', icon: FiKey },
];

export default function ProductManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const pathname = usePathname();
    const productId = String(params.id || '');
    const basePath = `/dashboard/products/${productId}`;
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        productManagementAPI.getById(productId)
            .then(({ data }) => {
                if (!cancelled) setProduct(data.product);
            })
            .catch(() => {
                if (!cancelled) setError('Produto não encontrado ou sem permissão.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [productId]);

    if (loading) {
        return (
            <div className="productManagementLoading">
                <span />
                <style>{`
                    .productManagementLoading { display:grid; min-height:280px; place-items:center; }
                    .productManagementLoading span {
                        animation:productManagementSpin .8s linear infinite;
                        border:3px solid var(--border-color);
                        border-radius:50%;
                        border-top-color:var(--accent-primary);
                        height:36px;
                        width:36px;
                    }
                    @keyframes productManagementSpin { to { transform:rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (error || !product) {
        return (
            <section className="glass-card" style={{ padding: 36, textAlign: 'center' }}>
                <h1 style={{ fontSize: 20, marginBottom: 8 }}>Produto indisponível</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                    {error}
                </p>
                <Link href="/dashboard/products" className="btn-secondary">
                    Voltar para produtos
                </Link>
            </section>
        );
    }

    return (
        <div className="productManagementShell">
            <header className="productManagementHeader">
                <Link href="/dashboard/products" aria-label="Voltar para produtos">
                    <FiArrowLeft size={19} />
                </Link>
                {product.image_url ? (
                    <img src={product.image_url} alt="" />
                ) : (
                    <span className="productManagementInitial">
                        {String(product.name || 'P').slice(0, 1).toUpperCase()}
                    </span>
                )}
                <div>
                    <p>Gerenciar produto</p>
                    <h1>{product.name}</h1>
                </div>
                <span className={`badge ${
                    product.status === 'active' ? 'badge-success' : 'badge-neutral'
                }`}>
                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
            </header>

            <nav className="productManagementTabs" aria-label="Funções do produto">
                {tabDefinitions.map((tab) => {
                    const href = `${basePath}${tab.suffix}`;
                    const active = tab.suffix
                        ? pathname === href || pathname.startsWith(`${href}/`)
                        : pathname === basePath;
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.suffix || 'overview'}
                            href={href}
                            className={active ? 'active' : ''}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="productManagementContent">{children}</div>

            <style>{`
                .productManagementShell { min-width:0; width:100%; }
                .productManagementHeader {
                    align-items:center;
                    display:flex;
                    gap:13px;
                    margin-bottom:20px;
                    min-width:0;
                }
                .productManagementHeader > a {
                    align-items:center;
                    background:var(--bg-secondary);
                    border:1px solid var(--border-color);
                    border-radius:11px;
                    color:var(--text-secondary);
                    display:flex;
                    flex:0 0 auto;
                    height:40px;
                    justify-content:center;
                    width:40px;
                }
                .productManagementHeader > img,
                .productManagementInitial {
                    align-items:center;
                    background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));
                    border-radius:12px;
                    color:#fff;
                    display:flex;
                    flex:0 0 auto;
                    font-size:18px;
                    font-weight:800;
                    height:46px;
                    justify-content:center;
                    object-fit:cover;
                    width:46px;
                }
                .productManagementHeader > div { min-width:0; }
                .productManagementHeader p {
                    color:var(--text-muted);
                    font-size:11px;
                    font-weight:700;
                    letter-spacing:.08em;
                    margin:0 0 3px;
                    text-transform:uppercase;
                }
                .productManagementHeader h1 {
                    font-size:23px;
                    font-weight:760;
                    margin:0;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                }
                .productManagementHeader > .badge { margin-left:auto; }
                .productManagementTabs {
                    border-bottom:1px solid var(--border-color);
                    display:flex;
                    gap:3px;
                    margin-bottom:25px;
                    overflow-x:auto;
                    scrollbar-width:thin;
                }
                .productManagementTabs a {
                    align-items:center;
                    border-bottom:2px solid transparent;
                    color:var(--text-secondary);
                    display:flex;
                    flex:0 0 auto;
                    font-size:12px;
                    font-weight:650;
                    gap:7px;
                    padding:12px 13px;
                    text-decoration:none;
                    white-space:nowrap;
                }
                .productManagementTabs a:hover { color:var(--text-primary); }
                .productManagementTabs a.active {
                    border-bottom-color:var(--accent-primary);
                    color:var(--accent-primary);
                }
                .productManagementContent { min-width:0; }
                @media (max-width:600px) {
                    .productManagementHeader h1 { font-size:19px; }
                    .productManagementHeader > .badge { display:none; }
                    .productManagementTabs { margin-left:-16px; margin-right:-16px; padding:0 10px; }
                    .productManagementTabs a { padding:11px 10px; }
                }
            `}</style>
        </div>
    );
}
