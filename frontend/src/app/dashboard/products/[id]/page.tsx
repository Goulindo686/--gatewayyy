'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    FiCopy,
    FiExternalLink,
    FiLink,
    FiSend,
    FiShield,
    FiTrash2,
    FiUserPlus,
} from 'react-icons/fi';
import { productManagementAPI } from '@/lib/api';

export default function ProductOverviewPage() {
    const params = useParams();
    const router = useRouter();
    const productId = String(params.id || '');
    const [product, setProduct] = useState<any>(null);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [enrollEmail, setEnrollEmail] = useState('');
    const [enrolling, setEnrolling] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await productManagementAPI.getById(productId);
                setProduct(data.product);

                let path = `/checkout/${productId}`;
                try {
                    const token = localStorage.getItem('token');
                    const subscriptions = await axios.get(
                        `/api/subscriptions/plans?product_id=${productId}`,
                        { headers: { Authorization: `Bearer ${token}` } },
                    );
                    if (subscriptions.data?.plans?.[0]?.id) {
                        path = `/subscribe/${subscriptions.data.plans[0].id}`;
                    }
                } catch {}
                setCheckoutUrl(`${window.location.origin}${path}`);
            } catch {
                toast.error('Não foi possível carregar o produto.');
            }
        };
        load();
    }, [productId]);

    const copyLink = async () => {
        await navigator.clipboard.writeText(checkoutUrl);
        toast.success('Link copiado!');
    };

    const enroll = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!enrollEmail.trim()) return;
        setEnrolling(true);
        try {
            const { data } = await productManagementAPI.enroll(productId, enrollEmail.trim());
            toast.success(data.message || 'Acesso liberado!');
            setEnrollEmail('');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao liberar acesso.');
        } finally {
            setEnrolling(false);
        }
    };

    const deleteProduct = async () => {
        if (!confirm(
            'Excluir este produto também remove seus conteúdos e configurações. Deseja continuar?',
        )) return;
        setDeleting(true);
        try {
            await productManagementAPI.delete(productId);
            toast.success('Produto excluído.');
            router.push('/dashboard/products');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao excluir produto.');
            setDeleting(false);
        }
    };

    return (
        <div className="productOverview">
            <section className="glass-card productOverviewHero">
                <span className="productOverviewIcon"><FiLink size={24} /></span>
                <div>
                    <p>Link de venda</p>
                    <h2>Compartilhe o checkout deste produto</h2>
                    <span>O link continua funcionando como antes e pode ser usado em campanhas, páginas e mensagens.</span>
                </div>
            </section>

            <section className="glass-card productLinkCard">
                <label htmlFor="product-checkout-link">Link do produto</label>
                <div>
                    <input id="product-checkout-link" readOnly value={checkoutUrl} />
                    <button className="btn-primary" onClick={copyLink} disabled={!checkoutUrl}>
                        <FiCopy size={15} /> Copiar
                    </button>
                    <a
                        className="btn-secondary"
                        href={checkoutUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!checkoutUrl}
                    >
                        <FiExternalLink size={15} /> Abrir
                    </a>
                </div>
            </section>

            <div className="productOverviewGrid">
                <section className="glass-card productOverviewAction">
                    <span><FiUserPlus size={21} /></span>
                    <div>
                        <h3>Entregar produto manualmente</h3>
                        <p>
                            Libera a Área de Membros existente para um usuário já cadastrado.
                            Esta função permanece independente das Entregas Únicas.
                        </p>
                    </div>
                    <form onSubmit={enroll}>
                        <input
                            className="input-field"
                            type="email"
                            required
                            placeholder="email@cliente.com"
                            value={enrollEmail}
                            onChange={(event) => setEnrollEmail(event.target.value)}
                        />
                        <button className="btn-primary" disabled={enrolling}>
                            <FiSend size={14} />
                            {enrolling ? 'Liberando...' : 'Liberar acesso'}
                        </button>
                    </form>
                </section>

                <section className="glass-card productOverviewAction">
                    <span><FiShield size={21} /></span>
                    <div>
                        <h3>Gestão centralizada</h3>
                        <p>
                            Use as abas acima para conteúdo compartilhado, order bumps,
                            edição, checkout e o novo estoque de acessos exclusivos.
                        </p>
                    </div>
                    <dl>
                        <div><dt>Tipo</dt><dd>{product?.type === 'physical' ? 'Físico' : 'Digital'}</dd></div>
                        <div><dt>Preço base</dt><dd>R$ {product?.price_display || '—'}</dd></div>
                        <div><dt>Status</dt><dd>{product?.status === 'active' ? 'Ativo' : 'Inativo'}</dd></div>
                    </dl>
                </section>
            </div>

            <section className="glass-card productDangerZone">
                <div>
                    <h3>Excluir produto</h3>
                    <p>Esta ação é permanente e só deve ser usada quando o produto não será mais vendido.</p>
                </div>
                <button className="btn-danger" onClick={deleteProduct} disabled={deleting}>
                    <FiTrash2 size={15} /> {deleting ? 'Excluindo...' : 'Excluir produto'}
                </button>
            </section>

            <style>{`
                .productOverview { display:grid; gap:18px; }
                .productOverviewHero {
                    align-items:center;
                    background:
                        radial-gradient(circle at 92% 0,rgba(108,92,231,.19),transparent 44%),
                        var(--card-bg);
                    display:flex;
                    gap:17px;
                    padding:25px;
                }
                .productOverviewIcon,
                .productOverviewAction > span {
                    align-items:center;
                    background:rgba(108,92,231,.13);
                    border:1px solid rgba(108,92,231,.2);
                    border-radius:14px;
                    color:var(--accent-primary);
                    display:flex;
                    flex:0 0 auto;
                    height:50px;
                    justify-content:center;
                    width:50px;
                }
                .productOverviewHero p {
                    color:var(--accent-primary);
                    font-size:11px;
                    font-weight:800;
                    letter-spacing:.08em;
                    margin:0 0 4px;
                    text-transform:uppercase;
                }
                .productOverviewHero h2 { font-size:21px; margin:0 0 5px; }
                .productOverviewHero div > span {
                    color:var(--text-secondary);
                    font-size:13px;
                    line-height:1.5;
                }
                .productLinkCard { padding:22px; }
                .productLinkCard label {
                    color:var(--text-secondary);
                    display:block;
                    font-size:12px;
                    font-weight:700;
                    margin-bottom:8px;
                }
                .productLinkCard > div { display:flex; gap:9px; }
                .productLinkCard input {
                    background:var(--bg-secondary);
                    border:1px solid var(--border-color);
                    border-radius:10px;
                    color:var(--text-primary);
                    flex:1;
                    font-size:13px;
                    min-width:0;
                    padding:12px 14px;
                }
                .productLinkCard button,
                .productLinkCard a {
                    align-items:center;
                    display:flex;
                    gap:7px;
                    justify-content:center;
                    text-decoration:none;
                    white-space:nowrap;
                }
                .productOverviewGrid {
                    display:grid;
                    gap:18px;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                }
                .productOverviewAction {
                    display:grid;
                    gap:14px;
                    grid-template-columns:auto 1fr;
                    padding:22px;
                }
                .productOverviewAction h3 { font-size:16px; margin:1px 0 5px; }
                .productOverviewAction p {
                    color:var(--text-secondary);
                    font-size:12px;
                    line-height:1.55;
                    margin:0;
                }
                .productOverviewAction form,
                .productOverviewAction dl { grid-column:1/-1; }
                .productOverviewAction form { display:flex; gap:9px; }
                .productOverviewAction form .input-field { flex:1; }
                .productOverviewAction form button {
                    align-items:center;
                    display:flex;
                    gap:7px;
                    white-space:nowrap;
                }
                .productOverviewAction dl {
                    background:var(--bg-secondary);
                    border-radius:12px;
                    display:grid;
                    gap:9px;
                    margin:0;
                    padding:14px;
                }
                .productOverviewAction dl div { display:flex; justify-content:space-between; }
                .productOverviewAction dt { color:var(--text-muted); font-size:12px; }
                .productOverviewAction dd { font-size:12px; font-weight:700; margin:0; }
                .productDangerZone {
                    align-items:center;
                    border-color:rgba(225,112,85,.23);
                    display:flex;
                    gap:20px;
                    justify-content:space-between;
                    padding:20px 22px;
                }
                .productDangerZone h3 { font-size:14px; margin:0 0 4px; }
                .productDangerZone p {
                    color:var(--text-muted);
                    font-size:12px;
                    margin:0;
                }
                .productDangerZone button {
                    align-items:center;
                    display:flex;
                    flex:0 0 auto;
                    gap:7px;
                }
                @media (max-width:760px) {
                    .productOverviewGrid { grid-template-columns:1fr; }
                    .productLinkCard > div,
                    .productOverviewAction form,
                    .productDangerZone { align-items:stretch; flex-direction:column; }
                    .productLinkCard a,
                    .productLinkCard button,
                    .productDangerZone button { width:100%; }
                }
            `}</style>
        </div>
    );
}

