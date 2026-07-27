'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    FiActivity,
    FiAlertCircle,
    FiAlertTriangle,
    FiArrowLeft,
    FiArrowRight,
    FiBookOpen,
    FiCheck,
    FiCheckCircle,
    FiChevronRight,
    FiClock,
    FiCode,
    FiCopy,
    FiCreditCard,
    FiDatabase,
    FiExternalLink,
    FiKey,
    FiLayers,
    FiMenu,
    FiRadio,
    FiSearch,
    FiServer,
    FiShield,
    FiTerminal,
    FiX,
    FiXCircle,
    FiZap,
} from 'react-icons/fi';
import styles from './docs.module.css';

const API_BASE_URL = 'https://www.goupay.com.br';
const PIX_ENDPOINT = `${API_BASE_URL}/api/v1/pix`;
const PIX_STATUS_ENDPOINT = `${PIX_ENDPOINT}/{transaction_id}`;

const NAV_GROUPS = [
    {
        label: 'Primeiros passos',
        items: [
            { id: 'inicio', label: 'Visão geral', keywords: 'começar api pix introdução' },
            { id: 'autenticacao', label: 'Autenticação', keywords: 'api key chave bearer header' },
            { id: 'endpoints', label: 'Endpoints', keywords: 'url post get limite rate limit' },
        ],
    },
    {
        label: 'Cobranças PIX',
        items: [
            { id: 'criar-pix', label: 'Criar cobrança', keywords: 'post amount customer qr code' },
            { id: 'consultar', label: 'Consultar status', keywords: 'get transaction id resposta' },
            { id: 'status-valores', label: 'Status da cobrança', keywords: 'pending paid failed refunded chargeback' },
            { id: 'polling', label: 'Polling', keywords: 'consulta intervalo webhook' },
            { id: 'exibir-qr', label: 'Exibir QR Code', keywords: 'pix copia cola imagem react html' },
        ],
    },
    {
        label: 'Eventos e referência',
        items: [
            { id: 'webhooks', label: 'Webhooks', keywords: 'eventos callback servidor segurança' },
            { id: 'erros', label: 'Erros', keywords: 'http 400 401 403 404 429 500' },
            { id: 'fluxo', label: 'Checklist final', keywords: 'fluxo integração produção' },
        ],
    },
] as const;

const SECTION_IDS = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id));

type Method = 'GET' | 'POST';
type NoticeTone = 'info' | 'warning' | 'success';

function MethodBadge({ method }: { method: Method }) {
    return <span className={`${styles.methodBadge} ${styles[`method${method}`]}`}>{method}</span>;
}

function CopyButton({
    value,
    label = 'Copiar',
    compact = false,
}: {
    value: string;
    label?: string;
    compact?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            type="button"
            className={`${styles.copyButton} ${compact ? styles.copyButtonCompact : ''}`}
            onClick={copy}
            aria-label={copied ? 'Conteúdo copiado' : `${label} para a área de transferência`}
        >
            {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
            <span>{copied ? 'Copiado' : label}</span>
        </button>
    );
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
    return (
        <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
                <div className={styles.codeLanguage}>
                    <span className={styles.windowDots} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span>{language}</span>
                </div>
                <CopyButton value={code} compact />
            </div>
            <pre>
                <code>{code}</code>
            </pre>
        </div>
    );
}

function Notice({
    tone,
    title,
    children,
}: {
    tone: NoticeTone;
    title: string;
    children: React.ReactNode;
}) {
    const Icon = tone === 'warning' ? FiAlertTriangle : tone === 'success' ? FiCheckCircle : FiAlertCircle;
    return (
        <div className={`${styles.notice} ${styles[`notice${tone}`]}`}>
            <Icon aria-hidden="true" />
            <div>
                <strong>{title}</strong>
                <div>{children}</div>
            </div>
        </div>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <div className={styles.sectionHeading}>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
        </div>
    );
}

function EndpointBar({ method, endpoint }: { method: Method; endpoint: string }) {
    return (
        <div className={styles.endpointBar}>
            <MethodBadge method={method} />
            <code>{endpoint}</code>
            <CopyButton value={endpoint} compact />
        </div>
    );
}

function SnippetTabs({
    section,
    languages,
    snippets,
    activeTabs,
    onTabChange,
}: {
    section: string;
    languages: string[];
    snippets: Record<string, Record<string, string>>;
    activeTabs: Record<string, string>;
    onTabChange: (section: string, language: string) => void;
}) {
    const active = activeTabs[section] ?? languages[0];
    return (
        <div className={styles.snippet}>
            <div className={styles.tabs} role="tablist" aria-label="Linguagem do exemplo">
                {languages.map((language) => (
                    <button
                        type="button"
                        role="tab"
                        aria-selected={active === language}
                        key={language}
                        onClick={() => onTabChange(section, language)}
                        className={active === language ? styles.tabActive : ''}
                    >
                        {language}
                    </button>
                ))}
            </div>
            <CodeBlock code={snippets[section][active]} language={active} />
        </div>
    );
}

function SidebarContent({
    inputId,
    search,
    searchResults,
    activeSection,
    onSearchChange,
    onNavigate,
}: {
    inputId: string;
    search: string;
    searchResults: Array<{ id: string; label: string; keywords: string; group: string }>;
    activeSection: string;
    onSearchChange: (value: string) => void;
    onNavigate: (id: string) => void;
}) {
    return (
        <>
            <div className={styles.searchWrap}>
                <FiSearch aria-hidden="true" />
                <input
                    id={inputId}
                    type="search"
                    placeholder="Buscar na documentação"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    aria-label="Buscar na documentação"
                />
                <kbd>/</kbd>
            </div>

            {search.trim() ? (
                <div className={styles.searchResults}>
                    <span className={styles.navGroupLabel}>
                        {searchResults.length ? `${searchResults.length} resultado${searchResults.length > 1 ? 's' : ''}` : 'Nenhum resultado'}
                    </span>
                    {searchResults.map((item) => (
                        <a key={item.id} href={`#${item.id}`} onClick={() => onNavigate(item.id)}>
                            <small>{item.group}</small>
                            <span>{item.label}</span>
                            <FiChevronRight aria-hidden="true" />
                        </a>
                    ))}
                </div>
            ) : (
                <nav className={styles.sideNav} aria-label="Seções da documentação">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className={styles.navGroup}>
                            <span className={styles.navGroupLabel}>{group.label}</span>
                            {group.items.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    onClick={() => onNavigate(item.id)}
                                    aria-current={activeSection === item.id ? 'location' : undefined}
                                    className={activeSection === item.id ? styles.navActive : ''}
                                >
                                    <span className={styles.navDot} />
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    ))}
                </nav>
            )}

            <div className={styles.sidebarFooter}>
                <FiShield aria-hidden="true" />
                <div>
                    <strong>Chave sempre no backend</strong>
                    <span>Nunca exponha a API Key no navegador ou aplicativo.</span>
                </div>
            </div>
        </>
    );
}

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('inicio');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

    useEffect(() => {
        const elements = SECTION_IDS
            .map((id) => document.getElementById(id))
            .filter((element): element is HTMLElement => Boolean(element));

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
            },
            { rootMargin: '-18% 0px -68% 0px', threshold: 0 },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
            if (event.key === '/' && !isTyping) {
                event.preventDefault();
                const mobile = window.matchMedia('(max-width: 960px)').matches;
                if (mobile) setMobileMenuOpen(true);
                window.setTimeout(
                    () => document.getElementById(mobile ? 'docs-search-mobile' : 'docs-search-desktop')?.focus(),
                    0,
                );
            }
            if (event.key === 'Escape') setMobileMenuOpen(false);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const snippets: Record<string, Record<string, string>> = useMemo(
        () => ({
            create: {
                'Node.js': `const response = await fetch('${PIX_ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.GOUPAY_API_KEY
  },
  body: JSON.stringify({
    amount: 2990,
    description: 'Pedido #42',
    customer: {
      name: 'Maria Souza',
      email: 'maria@email.com',
      cpf: '12345678900',
      phone: '11999999999'
    }
  })
});

const data = await response.json();
if (!response.ok) throw new Error(data.error);

console.log(data.transaction_id);
console.log(data.pix.qr_code);`,
                PHP: `<?php
$ch = curl_init('${PIX_ENDPOINT}');

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . getenv('GOUPAY_API_KEY'),
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'amount' => 2990,
        'description' => 'Pedido #42',
        'customer' => [
            'name' => 'Maria Souza',
            'email' => 'maria@email.com',
            'cpf' => '12345678900',
            'phone' => '11999999999',
        ],
    ]),
]);

$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status >= 400) {
    throw new Exception($body);
}

$data = json_decode($body, true);`,
                Python: `import os
import requests

response = requests.post(
    '${PIX_ENDPOINT}',
    headers={'x-api-key': os.environ['GOUPAY_API_KEY']},
    json={
        'amount': 2990,
        'description': 'Pedido #42',
        'customer': {
            'name': 'Maria Souza',
            'email': 'maria@email.com',
            'cpf': '12345678900',
            'phone': '11999999999',
        },
    },
    timeout=15,
)

response.raise_for_status()
data = response.json()
print(data['transaction_id'])
print(data['pix']['qr_code'])`,
                cURL: `curl --request POST '${PIX_ENDPOINT}' \\
  --header 'Content-Type: application/json' \\
  --header 'x-api-key: SUA_CHAVE_AQUI' \\
  --data '{
    "amount": 2990,
    "description": "Pedido #42",
    "customer": {
      "name": "Maria Souza",
      "email": "maria@email.com",
      "cpf": "12345678900"
    }
  }'`,
            },
            status: {
                'Node.js': `const response = await fetch(
  \`${PIX_ENDPOINT}/\${transactionId}\`,
  {
    headers: {
      'x-api-key': process.env.GOUPAY_API_KEY
    }
  }
);

const payment = await response.json();
if (!response.ok) throw new Error(payment.error);

if (payment.status === 'paid') {
  await liberarPedidoUmaVez(payment.transaction_id);
}`,
                PHP: `<?php
$transactionId = 'ID_DA_TRANSACAO';
$ch = curl_init('${PIX_ENDPOINT}/' . $transactionId);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'x-api-key: ' . getenv('GOUPAY_API_KEY'),
    ],
]);

$data = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($data['status'] === 'paid') {
    liberarPedidoUmaVez($data['transaction_id']);
}`,
                Python: `import os
import requests

response = requests.get(
    f'${PIX_ENDPOINT}/{transaction_id}',
    headers={'x-api-key': os.environ['GOUPAY_API_KEY']},
    timeout=15,
)

response.raise_for_status()
payment = response.json()

if payment['status'] == 'paid':
    liberar_pedido_uma_vez(payment['transaction_id'])`,
                cURL: `curl '${PIX_STATUS_ENDPOINT}' \\
  --header 'x-api-key: SUA_CHAVE_AQUI'`,
            },
            polling: {
                'Node.js': `async function aguardarPagamento(transactionId, timeoutMs = 600_000) {
  const inicio = Date.now();

  while (Date.now() - inicio < timeoutMs) {
    const response = await fetch(
      \`${PIX_ENDPOINT}/\${transactionId}\`,
      { headers: { 'x-api-key': process.env.GOUPAY_API_KEY } }
    );

    if (response.status === 429) {
      const espera = Number(response.headers.get('Retry-After') || 60);
      await new Promise(resolve => setTimeout(resolve, espera * 1000));
      continue;
    }

    const payment = await response.json();
    if (payment.status === 'paid') return payment;
    if (['failed', 'refunded', 'chargeback'].includes(payment.status)) {
      throw new Error(\`Cobrança finalizada como \${payment.status}\`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Tempo limite de consulta atingido');
}`,
                Python: `import os
import time
import requests

def aguardar_pagamento(transaction_id, timeout=600):
    inicio = time.time()

    while time.time() - inicio < timeout:
        response = requests.get(
            f'${PIX_ENDPOINT}/{transaction_id}',
            headers={'x-api-key': os.environ['GOUPAY_API_KEY']},
            timeout=15,
        )

        if response.status_code == 429:
            time.sleep(int(response.headers.get('Retry-After', 60)))
            continue

        response.raise_for_status()
        payment = response.json()

        if payment['status'] == 'paid':
            return payment
        if payment['status'] in ('failed', 'refunded', 'chargeback'):
            raise RuntimeError(payment['status'])

        time.sleep(5)

    raise TimeoutError('Tempo limite de consulta atingido')`,
            },
            qr: {
                HTML: `<img
  src="{qr_code_url}"
  alt="QR Code para pagamento via PIX"
  width="240"
  height="240"
/>

<label for="pix-code">PIX copia e cola</label>
<input id="pix-code" value="{qr_code}" readonly />

<button
  type="button"
  onclick="navigator.clipboard.writeText(
    document.getElementById('pix-code').value
  )"
>
  Copiar código
</button>`,
                React: `function PagamentoPix({ pix }) {
  const expiracao = new Date(pix.expires_at);

  return (
    <section aria-labelledby="pix-title">
      <h2 id="pix-title">Pague com PIX</h2>

      <img
        src={pix.qr_code_url}
        alt="QR Code para pagamento via PIX"
        width={240}
        height={240}
      />

      <button onClick={() => navigator.clipboard.writeText(pix.qr_code)}>
        Copiar código PIX
      </button>

      <p>Válido até {expiracao.toLocaleString('pt-BR')}</p>
    </section>
  );
}`,
            },
            webhook: {
                'Node.js (Express)': `import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhooks/goupay', async (req, res) => {
  const { event, data } = req.body;

  try {
    if (event === 'order.paid') {
      // Confirme o status na API antes de liberar o pedido.
      const response = await fetch(
        \`${PIX_ENDPOINT}/\${data.transaction_id}\`,
        {
          headers: {
            'x-api-key': process.env.GOUPAY_API_KEY
          }
        }
      );

      const payment = await response.json();
      if (payment.status === 'paid') {
        await liberarPedidoUmaVez(payment.transaction_id);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error('Falha ao processar webhook', error);
    return res.sendStatus(500);
  }
});`,
                PHP: `<?php
$payload = json_decode(file_get_contents('php://input'), true);
$event = $payload['event'] ?? '';
$data = $payload['data'] ?? [];

if ($event === 'order.paid') {
    // Consulte GET /api/v1/pix/{id} antes de liberar.
    confirmarEProcessarUmaVez($data['transaction_id']);
}

http_response_code(200);
echo 'ok';`,
                'Python (Flask)': `from flask import Flask, request

app = Flask(__name__)

@app.post('/webhooks/goupay')
def webhook():
    payload = request.get_json(silent=True) or {}
    event = payload.get('event')
    data = payload.get('data', {})

    if event == 'order.paid':
        # Consulte GET /api/v1/pix/{id} antes de liberar.
        confirmar_e_processar_uma_vez(data['transaction_id'])

    return 'ok', 200`,
            },
        }),
        [],
    );

    const searchResults = useMemo(() => {
        const normalized = search.trim().toLocaleLowerCase('pt-BR');
        if (!normalized) return [];

        return NAV_GROUPS.flatMap((group) =>
            group.items
                .filter((item) => `${item.label} ${item.keywords}`.toLocaleLowerCase('pt-BR').includes(normalized))
                .map((item) => ({ ...item, group: group.label })),
        );
    }, [search]);

    const setTab = (section: string, language: string) => {
        setActiveTabs((current) => ({ ...current, [section]: language }));
    };

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        setMobileMenuOpen(false);
        setSearch('');
    };

    const createResponse = `{
  "success": true,
  "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
  "status": "pending",
  "amount": 2990,
  "pix": {
    "qr_code": "00020126580014BR.GOV.BCB.PIX...",
    "qr_code_url": "https://api.pagar.me/.../qrcode",
    "expires_at": "2026-08-01T15:30:00.000Z"
  },
  "notifications": {
    "pending_email_sent": true
  }
}`;

    const statusResponse = `{
  "success": true,
  "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
  "status": "paid",
  "raw_status": "paid",
  "amount": 2990,
  "payment_method": "pix",
  "pagarme_id": "or_...",
  "description": "Venda via API",
  "customer": {
    "name": "Maria Souza",
    "email": "maria@email.com"
  },
  "created_at": "2026-08-01T15:00:00.000Z",
  "pix": {
    "qr_code": "00020126580014BR.GOV.BCB.PIX...",
    "qr_code_url": "https://api.pagar.me/.../qrcode",
    "expires_at": "2026-08-01T15:30:00.000Z"
  }
}`;

    const webhookResponse = `{
  "event": "order.paid",
  "data": {
    "id": "8a40135d-e021-456d-a94f-3122c525d5d9",
    "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
    "status": "paid",
    "amount": 2990,
    "amount_display": "29.90",
    "description": null,
    "payment_method": "pix",
    "customer": {
      "name": "Maria Souza",
      "email": "maria@email.com",
      "cpf": "12345678900",
      "phone": "11999999999"
    },
    "created_at": "2026-08-01T15:00:00.000Z",
    "updated_at": "2026-08-01T15:04:33.000Z"
  }
}`;

    const errorResponse = `{
  "error": "Chave de API inválida",
  "status": "error"
}`;

    return (
        <div className={styles.docsPage}>
            <a className={styles.skipLink} href="#conteudo">
                Pular para o conteúdo
            </a>

            <div className={styles.ambientOne} aria-hidden="true" />
            <div className={styles.ambientTwo} aria-hidden="true" />

            <header className={styles.topbar}>
                <div className={styles.topbarInner}>
                    <Link href="/" className={styles.brand} aria-label="GouPay — página inicial">
                        <span className={styles.brandMark}>G</span>
                        <span>GouPay</span>
                        <span className={styles.brandDivider} />
                        <small>Developers</small>
                    </Link>

                    <div className={styles.topbarActions}>
                        <span className={styles.versionBadge}>
                            <span />
                            API v1
                        </span>
                        <Link href="/dashboard/integrations" className={styles.dashboardLink}>
                            Gerar API Key
                            <FiExternalLink aria-hidden="true" />
                        </Link>
                        <button
                            type="button"
                            className={styles.mobileMenuButton}
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Abrir navegação"
                            aria-expanded={mobileMenuOpen}
                        >
                            <FiMenu aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </header>

            <div
                className={`${styles.mobileOverlay} ${mobileMenuOpen ? styles.mobileOverlayOpen : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden={!mobileMenuOpen}
            />
            <aside className={`${styles.mobileDrawer} ${mobileMenuOpen ? styles.mobileDrawerOpen : ''}`}>
                <div className={styles.mobileDrawerHeader}>
                    <span>Documentação</span>
                    <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar navegação">
                        <FiX aria-hidden="true" />
                    </button>
                </div>
                <SidebarContent
                    inputId="docs-search-mobile"
                    search={search}
                    searchResults={searchResults}
                    activeSection={activeSection}
                    onSearchChange={setSearch}
                    onNavigate={scrollToSection}
                />
            </aside>

            <div className={styles.layout}>
                <aside className={styles.sidebar}>
                    <SidebarContent
                        inputId="docs-search-desktop"
                        search={search}
                        searchResults={searchResults}
                        activeSection={activeSection}
                        onSearchChange={setSearch}
                        onNavigate={scrollToSection}
                    />
                </aside>

                <main id="conteudo" className={styles.content}>
                    <section id="inicio" className={styles.hero}>
                        <div className={styles.heroGrid}>
                            <div>
                                <div className={styles.eyebrow}>
                                    <FiBookOpen aria-hidden="true" />
                                    Documentação oficial
                                </div>
                                <h1>
                                    Integre pagamentos PIX
                                    <span> com clareza e segurança.</span>
                                </h1>
                                <p>
                                    Crie cobranças, exiba o QR Code e acompanhe cada pagamento com uma API simples,
                                    previsível e pronta para o seu backend.
                                </p>
                                <div className={styles.heroActions}>
                                    <a href="#autenticacao" className={styles.primaryAction}>
                                        Começar integração
                                        <FiArrowRight aria-hidden="true" />
                                    </a>
                                    <Link href="/" className={styles.secondaryAction}>
                                        <FiArrowLeft aria-hidden="true" />
                                        Voltar ao site
                                    </Link>
                                </div>
                            </div>

                            <div className={styles.heroTerminal} aria-label="Exemplo de criação de cobrança">
                                <div className={styles.terminalTop}>
                                    <span className={styles.windowDots} aria-hidden="true">
                                        <i />
                                        <i />
                                        <i />
                                    </span>
                                    <span>criar-cobranca.sh</span>
                                    <span className={styles.terminalLive}>live</span>
                                </div>
                                <pre>
                                    <code>
                                        <span className={styles.codeMuted}>$ </span>
                                        <span className={styles.codeBlue}>curl</span> -X POST \{'\n'}
                                        {'  '}<span className={styles.codeGreen}>/api/v1/pix</span> \{'\n\n'}
                                        <span className={styles.codeMuted}>→ 200 OK</span>
                                        {'\n'}
                                        {'{'}
                                        {'\n'}
                                        {'  '}<span className={styles.codePurple}>&quot;status&quot;</span>: <span className={styles.codeGreen}>&quot;pending&quot;</span>,{'\n'}
                                        {'  '}<span className={styles.codePurple}>&quot;transaction_id&quot;</span>: <span className={styles.codeGreen}>&quot;8a401...&quot;</span>,{'\n'}
                                        {'  '}<span className={styles.codePurple}>&quot;pix&quot;</span>: {'{'} <span className={styles.codeMuted}>...</span> {'}'}{'\n'}
                                        {'}'}
                                    </code>
                                </pre>
                            </div>
                        </div>

                        <div className={styles.baseUrl}>
                            <div>
                                <FiServer aria-hidden="true" />
                                <span>Base URL</span>
                            </div>
                            <code>{API_BASE_URL}</code>
                            <CopyButton value={API_BASE_URL} compact />
                        </div>

                        <div className={styles.quickStart}>
                            {[
                                { number: '01', icon: <FiKey />, title: 'Gere sua chave', text: 'Crie uma API Key no painel de integrações.' },
                                { number: '02', icon: <FiZap />, title: 'Crie a cobrança', text: 'Envie valor e dados do cliente pelo backend.' },
                                { number: '03', icon: <FiActivity />, title: 'Confirme o pagamento', text: 'Consulte o status ou receba um webhook.' },
                            ].map((step) => (
                                <div key={step.number} className={styles.quickStep}>
                                    <span>{step.number}</span>
                                    <i>{step.icon}</i>
                                    <div>
                                        <strong>{step.title}</strong>
                                        <p>{step.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="autenticacao" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="01 · Primeiros passos"
                            title="Autenticação"
                            description="Toda requisição precisa identificar sua conta por uma chave de API."
                        />

                        <div className={styles.twoColumns}>
                            <div className={styles.infoCard}>
                                <FiKey aria-hidden="true" />
                                <div>
                                    <h3>Obtenha sua chave</h3>
                                    <p>
                                        No painel, acesse <strong>Integrações → API Pix</strong> e selecione
                                        <strong> Gerar nova chave</strong>.
                                    </p>
                                </div>
                            </div>
                            <div className={styles.infoCard}>
                                <FiServer aria-hidden="true" />
                                <div>
                                    <h3>Use pelo servidor</h3>
                                    <p>
                                        Armazene a chave em uma variável de ambiente e faça as chamadas somente pelo backend.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <h3 className={styles.subheading}>Headers aceitos</h3>
                        <CodeBlock
                            language="http"
                            code={`# Recomendado
x-api-key: SUA_CHAVE_AQUI

# Alternativa
Authorization: Bearer SUA_CHAVE_AQUI`}
                        />

                        <Notice tone="warning" title="Sua API Key é um segredo">
                            <p>
                                Não inclua a chave em JavaScript entregue ao navegador, aplicativos distribuídos, repositórios
                                públicos ou logs. Se houver exposição, desative a chave e gere uma nova.
                            </p>
                        </Notice>
                    </section>

                    <section id="endpoints" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="02 · Referência"
                            title="Endpoints"
                            description="A API v1 usa JSON, HTTPS e valores monetários inteiros em centavos."
                        />

                        <div className={styles.endpointCards}>
                            <a href="#criar-pix" className={styles.endpointCard}>
                                <MethodBadge method="POST" />
                                <div>
                                    <code>/api/v1/pix</code>
                                    <span>Criar uma cobrança PIX</span>
                                </div>
                                <FiArrowRight aria-hidden="true" />
                            </a>
                            <a href="#consultar" className={styles.endpointCard}>
                                <MethodBadge method="GET" />
                                <div>
                                    <code>/api/v1/pix/{'{transaction_id}'}</code>
                                    <span>Consultar uma cobrança</span>
                                </div>
                                <FiArrowRight aria-hidden="true" />
                            </a>
                        </div>

                        <div className={styles.rateLimit}>
                            <FiClock aria-hidden="true" />
                            <div>
                                <strong>Limite compartilhado por chave</strong>
                                <p>
                                    São permitidas <strong>20 requisições por minuto</strong> para cada API Key. Em uma resposta
                                    429, respeite o header <code>Retry-After</code>.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section id="criar-pix" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="03 · Cobranças"
                            title="Criar cobrança PIX"
                            description="Envie o valor em centavos e os dados essenciais do pagador."
                        />
                        <EndpointBar method="POST" endpoint={PIX_ENDPOINT} />

                        <h3 className={styles.subheading}>Body JSON</h3>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Campo</th>
                                        <th>Tipo</th>
                                        <th>Obrigatório</th>
                                        <th>Descrição</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><code>amount</code></td>
                                        <td><span className={styles.type}>integer</span></td>
                                        <td><span className={styles.required}>Sim</span></td>
                                        <td>Valor em centavos. Mínimo de 100 (R$ 1,00).</td>
                                    </tr>
                                    <tr>
                                        <td><code>description</code></td>
                                        <td><span className={styles.type}>string</span></td>
                                        <td><span className={styles.optional}>Não</span></td>
                                        <td>Identificação interna da cobrança.</td>
                                    </tr>
                                    <tr>
                                        <td><code>customer.name</code></td>
                                        <td><span className={styles.type}>string</span></td>
                                        <td><span className={styles.required}>Sim</span></td>
                                        <td>Nome completo do pagador.</td>
                                    </tr>
                                    <tr>
                                        <td><code>customer.email</code></td>
                                        <td><span className={styles.type}>string</span></td>
                                        <td><span className={styles.required}>Sim</span></td>
                                        <td>E-mail válido do pagador. Também recebe os dados do PIX pendente.</td>
                                    </tr>
                                    <tr>
                                        <td><code>customer.cpf</code></td>
                                        <td><span className={styles.type}>string</span></td>
                                        <td><span className={styles.required}>Sim</span></td>
                                        <td>CPF com 11 dígitos, somente números.</td>
                                    </tr>
                                    <tr>
                                        <td><code>customer.phone</code></td>
                                        <td><span className={styles.type}>string</span></td>
                                        <td><span className={styles.optional}>Não</span></td>
                                        <td>Telefone com DDD, somente números.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <h3 className={styles.subheading}>Exemplo de requisição</h3>
                        <SnippetTabs
                            section="create"
                            languages={['Node.js', 'PHP', 'Python', 'cURL']}
                            snippets={snippets}
                            activeTabs={activeTabs}
                            onTabChange={setTab}
                        />

                        <h3 className={styles.subheading}>Resposta de sucesso <span className={styles.httpOk}>200</span></h3>
                        <CodeBlock code={createResponse} />

                        <div className={styles.responseNotes}>
                            <div><code>transaction_id</code><span>Guarde para consultar a cobrança.</span></div>
                            <div><code>pix.qr_code</code><span>Código PIX copia e cola.</span></div>
                            <div><code>pix.qr_code_url</code><span>Imagem pronta do QR Code.</span></div>
                            <div><code>pix.expires_at</code><span>Validade em ISO 8601.</span></div>
                            <div><code>notifications.pending_email_sent</code><span>Confirma se o e-mail do PIX foi aceito pelo SMTP.</span></div>
                        </div>
                    </section>

                    <section id="consultar" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="04 · Cobranças"
                            title="Consultar status"
                            description="Use o transaction_id recebido na criação para obter o estado mais recente."
                        />
                        <EndpointBar method="GET" endpoint={PIX_STATUS_ENDPOINT} />

                        <h3 className={styles.subheading}>Exemplo de consulta</h3>
                        <SnippetTabs
                            section="status"
                            languages={['Node.js', 'PHP', 'Python', 'cURL']}
                            snippets={snippets}
                            activeTabs={activeTabs}
                            onTabChange={setTab}
                        />

                        <h3 className={styles.subheading}>Resposta</h3>
                        <CodeBlock code={statusResponse} />

                        <Notice tone="success" title="Liberação idempotente">
                            <p>
                                Ao receber <code>paid</code>, registre o <code>transaction_id</code> como processado. Assim, uma
                                nova consulta ou notificação não libera o mesmo pedido duas vezes.
                            </p>
                        </Notice>
                    </section>

                    <section id="status-valores" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="05 · Cobranças"
                            title="Status da cobrança"
                            description="Use o status para controlar o ciclo de vida do pedido no seu sistema."
                        />

                        <div className={styles.statusGrid}>
                            {[
                                { value: 'pending', title: 'Aguardando', text: 'Cobrança criada e ainda não confirmada.', icon: <FiClock />, tone: 'pending' },
                                { value: 'paid', title: 'Pago', text: 'Pagamento confirmado. Pode liberar o pedido.', icon: <FiCheckCircle />, tone: 'paid' },
                                { value: 'failed', title: 'Falhou', text: 'A cobrança falhou durante o processamento.', icon: <FiXCircle />, tone: 'failed' },
                                { value: 'refunded', title: 'Estornado', text: 'O valor pago foi estornado.', icon: <FiArrowLeft />, tone: 'refunded' },
                                { value: 'chargeback', title: 'Chargeback', text: 'Contestação registrada para o pagamento.', icon: <FiAlertTriangle />, tone: 'chargeback' },
                            ].map((status) => (
                                <article key={status.value} className={`${styles.statusCard} ${styles[`status${status.tone}`]}`}>
                                    <i>{status.icon}</i>
                                    <div>
                                        <code>{status.value}</code>
                                        <strong>{status.title}</strong>
                                        <p>{status.text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <Notice tone="info" title="Expiração do QR Code">
                            <p>
                                A validade vem em <code>pix.expires_at</code>. Use esse campo para bloquear novas tentativas no
                                checkout; <code>expired</code> não faz parte dos status retornados atualmente pelo endpoint.
                            </p>
                        </Notice>
                    </section>

                    <section id="polling" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="06 · Cobranças"
                            title="Polling de status"
                            description="Quando não for possível usar webhooks, consulte a cobrança em intervalos controlados."
                        />

                        <div className={styles.recommendation}>
                            <div>
                                <span>Intervalo recomendado</span>
                                <strong>5 segundos</strong>
                            </div>
                            <div>
                                <span>Tempo máximo sugerido</span>
                                <strong>10 minutos</strong>
                            </div>
                            <div>
                                <span>Preferência</span>
                                <strong>Webhook</strong>
                            </div>
                        </div>

                        <Notice tone="warning" title="Considere o limite global">
                            <p>
                                O limite de 20 requisições/minuto é compartilhado por todas as cobranças da mesma chave.
                                Para várias cobranças simultâneas, prefira webhooks e aplique backoff ao receber 429.
                            </p>
                        </Notice>

                        <SnippetTabs
                            section="polling"
                            languages={['Node.js', 'Python']}
                            snippets={snippets}
                            activeTabs={activeTabs}
                            onTabChange={setTab}
                        />
                    </section>

                    <section id="exibir-qr" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="07 · Checkout"
                            title="Exibir o QR Code"
                            description="Ofereça a imagem e o código copia e cola para o cliente escolher como pagar."
                        />

                        <div className={styles.fieldCards}>
                            <div><FiCode /><code>pix.qr_code</code><span>Texto PIX copia e cola</span></div>
                            <div><FiCreditCard /><code>pix.qr_code_url</code><span>URL da imagem PNG</span></div>
                            <div><FiClock /><code>pix.expires_at</code><span>Expiração em ISO 8601</span></div>
                        </div>

                        <SnippetTabs
                            section="qr"
                            languages={['HTML', 'React']}
                            snippets={snippets}
                            activeTabs={activeTabs}
                            onTabChange={setTab}
                        />
                    </section>

                    <section id="webhooks" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="08 · Eventos"
                            title="Webhooks"
                            description="Receba uma notificação HTTP quando o status de uma cobrança mudar."
                        />

                        <div className={styles.webhookIntro}>
                            <FiRadio aria-hidden="true" />
                            <div>
                                <strong>Configure seu endpoint</strong>
                                <p>
                                    No painel, acesse <strong>Integrações → API Pix → Webhook da API Pix</strong> e cadastre
                                    uma URL HTTPS pública.
                                </p>
                            </div>
                        </div>

                        <Notice tone="warning" title="Confirme a notificação pela API">
                            <p>
                                O payload de webhook ainda não inclui assinatura criptográfica. Antes de liberar um produto,
                                consulte <code>GET /api/v1/pix/{'{transaction_id}'}</code> pelo backend e confirme
                                <code> status === &quot;paid&quot;</code>.
                            </p>
                        </Notice>

                        <h3 className={styles.subheading}>Eventos enviados</h3>
                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Evento</th>
                                        <th>Quando ocorre</th>
                                        <th>Ação sugerida</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td><code>order.paid</code></td><td>Pagamento confirmado</td><td>Consultar e liberar uma vez</td></tr>
                                    <tr><td><code>order.failed</code></td><td>Pagamento falhou</td><td>Informar o cliente</td></tr>
                                    <tr><td><code>order.refunded</code></td><td>Pagamento estornado</td><td>Atualizar o pedido</td></tr>
                                    <tr><td><code>order.chargeback</code></td><td>Chargeback registrado</td><td>Bloquear entrega pendente</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h3 className={styles.subheading}>Payload</h3>
                        <CodeBlock code={webhookResponse} />

                        <h3 className={styles.subheading}>Receber no seu servidor</h3>
                        <SnippetTabs
                            section="webhook"
                            languages={['Node.js (Express)', 'PHP', 'Python (Flask)']}
                            snippets={snippets}
                            activeTabs={activeTabs}
                            onTabChange={setTab}
                        />

                        <div className={styles.webhookRules}>
                            {[
                                { icon: <FiCheckCircle />, title: 'Responda rapidamente', text: 'Retorne HTTP 200 após processar com sucesso.' },
                                { icon: <FiDatabase />, title: 'Seja idempotente', text: 'Use transaction_id como chave única no seu banco.' },
                                { icon: <FiShield />, title: 'Valide pela API', text: 'Confirme o status com sua API Key antes da entrega.' },
                            ].map((rule) => (
                                <div key={rule.title}>
                                    <i>{rule.icon}</i>
                                    <strong>{rule.title}</strong>
                                    <span>{rule.text}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="erros" className={styles.docSection}>
                        <SectionHeading
                            eyebrow="09 · Referência"
                            title="Códigos de erro"
                            description="Trate o código HTTP antes de consumir o corpo da resposta."
                        />

                        <div className={styles.tableWrap}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>HTTP</th>
                                        <th>Situação</th>
                                        <th>Motivo comum</th>
                                        <th>O que fazer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td><span className={styles.http4xx}>400</span></td><td>Requisição inválida</td><td>Valor inválido, cliente incompleto ou conta recebedora ausente</td><td>Revise o body e a configuração</td></tr>
                                    <tr><td><span className={styles.http4xx}>401</span></td><td>Não autenticado</td><td>Chave ausente ou inválida</td><td>Envie uma API Key ativa</td></tr>
                                    <tr><td><span className={styles.http4xx}>403</span></td><td>Acesso bloqueado</td><td>Chave inativa ou conta bloqueada</td><td>Verifique o painel</td></tr>
                                    <tr><td><span className={styles.http4xx}>404</span></td><td>Não encontrado</td><td>Transação ou usuário não encontrado</td><td>Confira o transaction_id</td></tr>
                                    <tr><td><span className={styles.http4xx}>429</span></td><td>Limite excedido</td><td>20 requisições/minuto excedidas</td><td>Respeite Retry-After</td></tr>
                                    <tr><td><span className={styles.http5xx}>500</span></td><td>Erro interno</td><td>Falha interna ou do processador</td><td>Registre o erro e tente mais tarde</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.errorExample}>
                            <div>
                                <h3>Formato padrão</h3>
                                <p>A maioria dos erros segue esta estrutura.</p>
                            </div>
                            <CodeBlock code={errorResponse} />
                        </div>

                        <Notice tone="info" title="Resposta 429">
                            <p>
                                Além do JSON de erro, a resposta inclui <code>Retry-After</code> (segundos) e
                                <code> X-RateLimit-Reset</code> (data ISO).
                            </p>
                        </Notice>
                    </section>

                    <section id="fluxo" className={`${styles.docSection} ${styles.finalSection}`}>
                        <SectionHeading
                            eyebrow="10 · Produção"
                            title="Checklist de integração"
                            description="Um caminho seguro do primeiro teste até a liberação do pedido."
                        />

                        <div className={styles.timeline}>
                            {[
                                { icon: <FiKey />, title: 'Gere e proteja a API Key', text: 'Salve a chave em uma variável de ambiente do backend.' },
                                { icon: <FiTerminal />, title: 'Crie uma cobrança', text: 'Faça o POST, trate erros e guarde o transaction_id.' },
                                { icon: <FiLayers />, title: 'Exiba as opções PIX', text: 'Mostre o QR Code, o copia e cola e a validade.' },
                                { icon: <FiRadio />, title: 'Acompanhe o pagamento', text: 'Use webhook como principal e polling como contingência.' },
                                { icon: <FiCheckCircle />, title: 'Confirme e libere uma vez', text: 'Valide paid pela API e processe de forma idempotente.' },
                            ].map((step, index) => (
                                <div key={step.title} className={styles.timelineItem}>
                                    <span>{String(index + 1).padStart(2, '0')}</span>
                                    <i>{step.icon}</i>
                                    <div>
                                        <strong>{step.title}</strong>
                                        <p>{step.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.finalCta}>
                            <div>
                                <span>Pronto para integrar?</span>
                                <h2>Gere sua chave e faça a primeira cobrança.</h2>
                            </div>
                            <Link href="/dashboard/integrations">
                                Abrir integrações
                                <FiArrowRight aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
                </main>

                <aside className={styles.rightRail}>
                    <div className={styles.rightRailCard}>
                        <span className={styles.rightRailLabel}>API atual</span>
                        <strong><span /> v1</strong>
                        <p>JSON sobre HTTPS</p>
                    </div>

                    <div className={styles.rightRailCard}>
                        <span className={styles.rightRailLabel}>Essencial</span>
                        <a href="#autenticacao"><FiKey /> Autenticação</a>
                        <a href="#criar-pix"><FiZap /> Criar cobrança</a>
                        <a href="#webhooks"><FiRadio /> Webhooks</a>
                        <a href="#erros"><FiAlertCircle /> Erros</a>
                    </div>

                    <div className={styles.rightRailCard}>
                        <span className={styles.rightRailLabel}>Base URL</span>
                        <code>goupay.com.br</code>
                        <CopyButton value={API_BASE_URL} label="Copiar URL" compact />
                    </div>
                </aside>
            </div>

            <footer className={styles.footer}>
                <div>
                    <span className={styles.brandMark}>G</span>
                    <span>GouPay Developers</span>
                </div>
                <p>API PIX v1 · Documentação alinhada ao comportamento atual da aplicação.</p>
            </footer>
        </div>
    );
}
