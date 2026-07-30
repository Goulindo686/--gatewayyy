'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiArrowRight, FiPackage, FiPlus, FiX } from 'react-icons/fi';
import ProductEditor from '@/components/ProductEditor';
import { productsAPI } from '@/lib/api';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const loadProducts = async () => {
        try {
            const { data } = await productsAPI.list();
            setProducts(data.products || []);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Não foi possível carregar os produtos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProducts();
    }, []);

    if (loading) {
        return (
            <div className="productsLoading" aria-label="Carregando produtos">
                <span />
                <style>{`
                    .productsLoading { display:grid; height:300px; place-items:center; }
                    .productsLoading span {
                        animation: productsSpin .8s linear infinite;
                        border:3px solid var(--border-color);
                        border-radius:50%;
                        border-top-color:var(--accent-primary);
                        height:36px;
                        width:36px;
                    }
                    @keyframes productsSpin { to { transform:rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="animate-fade-in productsPage">
            <header className="productsHeader">
                <div>
                    <h1>Produtos</h1>
                    <p>{products.length} produtos cadastrados</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                    <FiPlus size={16} /> Novo produto
                </button>
            </header>

            {products.length ? (
                <div className="productsGrid">
                    {products.map((product) => (
                        <Link
                            href={`/dashboard/products/${product.id}`}
                            className="glass-card productCard"
                            key={product.id}
                            aria-label={`Gerenciar ${product.name}`}
                        >
                            <div className="productCardImage">
                                {product.image_url ? (
                                    <img src={product.image_url} alt="" />
                                ) : (
                                    <FiPackage size={42} />
                                )}
                                <span className={`badge ${
                                    product.status === 'active'
                                        ? 'badge-success'
                                        : 'badge-neutral'
                                }`}>
                                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                            <div className="productCardBody">
                                <div className="productCardTitle">
                                    <h2>{product.name}</h2>
                                    <span className={`badge ${
                                        product.type === 'digital'
                                            ? 'badge-info'
                                            : 'badge-warning'
                                    }`}>
                                        {product.type === 'digital' ? 'Digital' : 'Físico'}
                                    </span>
                                </div>
                                {product.description && <p>{product.description}</p>}
                                <div className="productCardStats">
                                    <strong>
                                        R$ {product.price_display
                                            || (product.price / 100).toFixed(2)}
                                    </strong>
                                    <span>{product.sales_count || 0} vendas</span>
                                </div>
                                <div className="productCardManage">
                                    Gerenciar produto <FiArrowRight size={16} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <section className="glass-card productsEmpty">
                    <FiPackage size={48} />
                    <h2>Nenhum produto cadastrado</h2>
                    <p>Crie seu primeiro produto para começar a vender.</p>
                    <button className="btn-primary" onClick={() => setShowCreate(true)}>
                        <FiPlus size={16} /> Criar produto
                    </button>
                </section>
            )}

            {showCreate && createPortal(
                <div className="productCreateBackdrop" role="dialog" aria-modal="true">
                    <section className="glass-card productCreateModal">
                        <header>
                            <div>
                                <h2>Novo produto</h2>
                                <p>Cadastre os dados principais. As demais funções ficam no gerenciador.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                aria-label="Fechar"
                            >
                                <FiX size={21} />
                            </button>
                        </header>
                        <ProductEditor
                            onCancel={() => setShowCreate(false)}
                            onSaved={(product) => {
                                setShowCreate(false);
                                loadProducts();
                                if (product?.id) {
                                    window.location.href = `/dashboard/products/${product.id}`;
                                }
                            }}
                        />
                    </section>
                </div>,
                document.body,
            )}

            <style>{`
                .productsPage { width:100%; }
                .productsHeader {
                    align-items:center;
                    display:flex;
                    gap:20px;
                    justify-content:space-between;
                    margin-bottom:28px;
                }
                .productsHeader h1 { font-size:28px; font-weight:750; margin:0 0 4px; }
                .productsHeader p { color:var(--text-secondary); font-size:14px; margin:0; }
                .productsHeader .btn-primary {
                    align-items:center;
                    display:flex;
                    gap:8px;
                    white-space:nowrap;
                }
                .productsGrid {
                    display:grid;
                    gap:20px;
                    grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));
                }
                .productCard {
                    color:inherit;
                    overflow:hidden;
                    padding:0;
                    text-decoration:none;
                    transition:border-color .2s,transform .2s,box-shadow .2s;
                }
                .productCard:hover {
                    border-color:rgba(108,92,231,.5);
                    box-shadow:0 18px 46px rgba(25,19,60,.14);
                    transform:translateY(-3px);
                }
                .productCard:focus-visible {
                    outline:3px solid rgba(108,92,231,.35);
                    outline-offset:3px;
                }
                .productCardImage {
                    align-items:center;
                    background:linear-gradient(135deg,rgba(108,92,231,.16),rgba(162,155,254,.07));
                    color:var(--accent-secondary);
                    display:flex;
                    height:160px;
                    justify-content:center;
                    position:relative;
                }
                .productCardImage img { height:100%; object-fit:cover; width:100%; }
                .productCardImage .badge { position:absolute; right:12px; top:12px; }
                .productCardBody { padding:20px; }
                .productCardTitle {
                    align-items:flex-start;
                    display:flex;
                    gap:12px;
                    justify-content:space-between;
                    margin-bottom:9px;
                }
                .productCardTitle h2 {
                    font-size:17px;
                    font-weight:680;
                    line-height:1.35;
                    margin:0;
                }
                .productCardTitle .badge { flex:0 0 auto; font-size:10px; }
                .productCardBody > p {
                    color:var(--text-secondary);
                    display:-webkit-box;
                    font-size:13px;
                    line-height:1.55;
                    margin:0 0 16px;
                    overflow:hidden;
                    -webkit-box-orient:vertical;
                    -webkit-line-clamp:2;
                }
                .productCardStats {
                    align-items:center;
                    display:flex;
                    gap:12px;
                    justify-content:space-between;
                }
                .productCardStats strong {
                    background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));
                    background-clip:text;
                    color:transparent;
                    font-size:22px;
                }
                .productCardStats span { color:var(--text-muted); font-size:12px; }
                .productCardManage {
                    align-items:center;
                    border-top:1px solid var(--border-color);
                    color:var(--accent-primary);
                    display:flex;
                    font-size:13px;
                    font-weight:700;
                    gap:7px;
                    justify-content:flex-end;
                    margin-top:16px;
                    padding-top:14px;
                }
                .productsEmpty { padding:60px 24px; text-align:center; }
                .productsEmpty > svg { opacity:.28; }
                .productsEmpty h2 { font-size:18px; margin:15px 0 7px; }
                .productsEmpty p { color:var(--text-secondary); margin:0 0 22px; }
                .productsEmpty .btn-primary {
                    align-items:center;
                    display:inline-flex;
                    gap:8px;
                }
                .productCreateBackdrop {
                    align-items:center;
                    background:rgba(0,0,0,.82);
                    display:flex;
                    inset:0;
                    justify-content:center;
                    padding:20px;
                    position:fixed;
                    z-index:9999;
                }
                .productCreateModal {
                    max-height:92vh;
                    max-width:720px;
                    overflow:auto;
                    padding:32px;
                    width:100%;
                }
                .productCreateModal > header {
                    align-items:flex-start;
                    display:flex;
                    gap:20px;
                    justify-content:space-between;
                    margin-bottom:25px;
                }
                .productCreateModal > header h2 { font-size:20px; margin:0 0 5px; }
                .productCreateModal > header p {
                    color:var(--text-secondary);
                    font-size:13px;
                    margin:0;
                }
                .productCreateModal > header button {
                    background:none;
                    border:0;
                    color:var(--text-muted);
                    cursor:pointer;
                    padding:4px;
                }
                @media (max-width:600px) {
                    .productsHeader { align-items:stretch; flex-direction:column; }
                    .productsHeader .btn-primary { justify-content:center; width:100%; }
                    .productCreateBackdrop { padding:8px; }
                    .productCreateModal { max-height:calc(100vh - 16px); padding:22px 16px; }
                }
            `}</style>
        </div>
    );
}
