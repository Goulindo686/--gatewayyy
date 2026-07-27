import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Documentação da API PIX | GouPay Developers',
    description: 'Referência completa para integrar cobranças PIX, consultar pagamentos e receber webhooks com a API GouPay.',
    alternates: {
        canonical: 'https://www.goupay.com.br/docs',
    },
    openGraph: {
        title: 'API PIX GouPay — Documentação',
        description: 'Integre cobranças PIX, QR Code, consulta de status e webhooks.',
        url: 'https://www.goupay.com.br/docs',
        siteName: 'GouPay Developers',
        type: 'website',
        locale: 'pt_BR',
    },
};

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return children;
}
