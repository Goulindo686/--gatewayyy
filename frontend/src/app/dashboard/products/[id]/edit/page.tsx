'use client';

import { useParams, useRouter } from 'next/navigation';
import ProductEditor from '@/components/ProductEditor';

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const productId = String(params.id || '');

    return (
        <section className="glass-card productEditPage">
            <header>
                <h2>Editar produto</h2>
                <p>Atualize os dados, planos, imagem e integrações deste produto.</p>
            </header>
            <ProductEditor
                productId={productId}
                onSaved={() => router.refresh()}
            />
            <style>{`
                .productEditPage { margin:0 auto; max-width:820px; padding:28px; }
                .productEditPage > header { margin-bottom:25px; }
                .productEditPage > header h2 { font-size:20px; margin:0 0 5px; }
                .productEditPage > header p {
                    color:var(--text-secondary);
                    font-size:13px;
                    margin:0;
                }
                @media (max-width:600px) {
                    .productEditPage { padding:20px 15px; }
                }
            `}</style>
        </section>
    );
}

