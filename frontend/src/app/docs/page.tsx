'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiCopy, FiCheck, FiCode, FiArrowLeft, FiZap, FiShield, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

// ─── helpers ────────────────────────────────────────────────────────────────
function CodeBlock({ code, id, lang }: { code: string; id: string; lang?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="relative group">
            <div className="flex items-center justify-between bg-gray-700 px-4 py-1.5 rounded-t-lg">
                <span className="text-xs text-gray-400 font-mono">{lang ?? 'json'}</span>
                <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition">
                    {copied ? <><FiCheck size={12} /> Copiado</> : <><FiCopy size={12} /> Copiar</>}
                </button>
            </div>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-sm leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

function Badge({ method }: { method: 'POST' | 'GET' }) {
    const cls = method === 'POST'
        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    return <span className={`px-2.5 py-1 rounded font-bold text-xs ${cls}`}>{method}</span>;
}

function StatusBadge({ status, label, color }: { status: string; label: string; color: string }) {
    const colors: Record<string, string> = {
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        green:  'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
        red:    'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
        gray:   'bg-gray-100   text-gray-800   dark:bg-gray-700      dark:text-gray-300',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
            <code>{status}</code> — {label}
        </span>
    );
}

// ─── main page ──────────────────────────────────────────────────────────────
export default function DocsPage() {
    const [baseUrl, setBaseUrl] = useState('https://seu-dominio.com');
    const [activeTab, setActiveTab] = useState<Record<string, string>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') setBaseUrl(window.location.origin);
    }, []);

    const setTab = (section: string, tab: string) =>
        setActiveTab(prev => ({ ...prev, [section]: tab }));
    const getTab = (section: string, def: string) => activeTab[section] ?? def;

    const ep  = `${baseUrl}/api/v1/pix`;
    const epS = `${baseUrl}/api/v1/pix/{transaction_id}`;

    // ── code snippets ────────────────────────────────────────────────────────
    const snippets: Record<string, Record<string, string>> = {
        create: {
            'Node.js': `const axios = require('axios');

const response = await axios.post('${ep}', {
  amount: 2990,           // R$ 29,90 em centavos
  description: 'Pedido #42',
  customer: {
    name: 'Maria Souza',
    email: 'maria@email.com',
    cpf: '12345678900',
    phone: '11999999999'  // opcional
  }
}, {
  headers: {
    'x-api-key': 'SUA_CHAVE_AQUI',
    'Content-Type': 'application/json'
  }
});

const { transaction_id, pix } = response.data;
console.log('QR Code texto:', pix.qr_code);
console.log('QR Code imagem:', pix.qr_code_url);
console.log('Expira em:', pix.expires_at);`,

            'PHP': `<?php
$ch = curl_init('${ep}');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode([
        'amount'      => 2990,
        'description' => 'Pedido #42',
        'customer'    => [
            'name'  => 'Maria Souza',
            'email' => 'maria@email.com',
            'cpf'   => '12345678900',
            'phone' => '11999999999',
        ],
    ]),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: SUA_CHAVE_AQUI',
    ],
]);

$body   = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($body, true);
echo $data['pix']['qr_code'];`,

            'Python': `import requests

resp = requests.post(
    '${ep}',
    json={
        'amount': 2990,
        'description': 'Pedido #42',
        'customer': {
            'name':  'Maria Souza',
            'email': 'maria@email.com',
            'cpf':   '12345678900',
            'phone': '11999999999',
        },
    },
    headers={'x-api-key': 'SUA_CHAVE_AQUI'},
)

data = resp.json()
print(data['pix']['qr_code'])
print(data['pix']['qr_code_url'])`,

            'cURL': `curl -X POST ${ep} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_CHAVE_AQUI" \\
  -d '{
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
            'Node.js': `const axios = require('axios');

const { data } = await axios.get(
  \`${baseUrl}/api/v1/pix/\${transactionId}\`,
  { headers: { 'x-api-key': 'SUA_CHAVE_AQUI' } }
);

if (data.status === 'paid') {
  console.log('Pagamento confirmado!');
}`,

            'PHP': `<?php
$ch = curl_init("${baseUrl}/api/v1/pix/{$transactionId}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['x-api-key: SUA_CHAVE_AQUI'],
]);
$data = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($data['status'] === 'paid') {
    echo 'Pago!';
}`,

            'Python': `import requests

resp = requests.get(
    f'${baseUrl}/api/v1/pix/{transaction_id}',
    headers={'x-api-key': 'SUA_CHAVE_AQUI'},
)
data = resp.json()
print(data['status'])  # pending | paid | failed | expired`,

            'cURL': `curl ${baseUrl}/api/v1/pix/{transaction_id} \\
  -H "x-api-key: SUA_CHAVE_AQUI"`,
        },

        polling: {
            'Node.js': `async function aguardarPagamento(transactionId, timeoutMs = 600_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const { data } = await axios.get(
      \`${baseUrl}/api/v1/pix/\${transactionId}\`,
      { headers: { 'x-api-key': 'SUA_CHAVE_AQUI' } }
    );

    if (data.status === 'paid')    return { pago: true };
    if (data.status === 'failed')  return { pago: false, motivo: 'falhou' };
    if (data.status === 'expired') return { pago: false, motivo: 'expirado' };

    await new Promise(r => setTimeout(r, 5000)); // aguarda 5s
  }
  return { pago: false, motivo: 'timeout' };
}`,

            'Python': `import time, requests

def aguardar_pagamento(transaction_id, timeout=600):
    inicio = time.time()
    while time.time() - inicio < timeout:
        r = requests.get(
            f'${baseUrl}/api/v1/pix/{transaction_id}',
            headers={'x-api-key': 'SUA_CHAVE_AQUI'},
        ).json()

        if r['status'] == 'paid':    return True
        if r['status'] in ('failed', 'expired'): return False

        time.sleep(5)
    return False`,
        },

        qrHtml: {
            'HTML': `<!-- Exibir QR Code como imagem -->
<img src="{qr_code_url}" alt="QR Code Pix" width="250" height="250" />

<!-- Copiar código Pix (copia e cola) -->
<input id="pix-code" type="text" value="{qr_code}" readonly />
<button onclick="navigator.clipboard.writeText(document.getElementById('pix-code').value)">
  Copiar código
</button>`,

            'React': `import QRCode from 'react-qr-code'; // npm i react-qr-code

function PagamentoPix({ pix }) {
  return (
    <div>
      {/* Renderiza o QR localmente a partir do texto */}
      <QRCode value={pix.qr_code} size={220} />

      {/* Ou usa a URL de imagem retornada pela API */}
      <img src={pix.qr_code_url} alt="QR Code Pix" width={220} />

      <button onClick={() => navigator.clipboard.writeText(pix.qr_code)}>
        Copiar código Pix
      </button>

      <p>Expira em: {new Date(pix.expires_at).toLocaleString('pt-BR')}</p>
    </div>
  );
}`,
        },

        webhook: {
            'Node.js (Express)': `const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook/pix', (req, res) => {
  const { event, data } = req.body;

  if (event === 'order.paid') {
    console.log('Pago! ID:', data.id, 'Valor:', data.amount_display);
    // liberar acesso, enviar e-mail, atualizar banco...
  }

  if (event === 'order.failed') {
    console.log('Falhou:', data.id);
  }

  res.sendStatus(200); // sempre responda 200
});`,

            'PHP': `<?php
$payload = json_decode(file_get_contents('php://input'), true);
$event   = $payload['event'] ?? '';
$data    = $payload['data']  ?? [];

if ($event === 'order.paid') {
    // liberar acesso, atualizar banco...
    error_log('Pago: ' . $data['id']);
}

http_response_code(200);
echo 'ok';`,

            'Python (Flask)': `from flask import Flask, request

app = Flask(__name__)

@app.post('/webhook/pix')
def webhook():
    body  = request.get_json()
    event = body.get('event')
    data  = body.get('data', {})

    if event == 'order.paid':
        print('Pago:', data['id'], data['amount_display'])
        # liberar acesso, enviar e-mail...

    return 'ok', 200`,
        },
    };

    // ── response examples ────────────────────────────────────────────────────
    const resCreate = `{
  "success": true,
  "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
  "status": "pending",
  "amount": 2990,
  "pix": {
    "qr_code": "00020126580014BR.GOV.BCB.PIX...",
    "qr_code_url": "https://api.pagar.me/.../qrcode",
    "expires_at": "2026-04-01T13:00:00.000Z"
  }
}`;

    const resStatus = `{
  "success": true,
  "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
  "status": "paid",
  "amount": 2990,
  "payment_method": "pix",
  "customer": { "name": "Maria Souza", "email": "maria@email.com" },
  "pix": {
    "qr_code": "00020126580014BR.GOV.BCB.PIX...",
    "qr_code_url": "https://api.pagar.me/.../qrcode",
    "expires_at": "2026-04-01T13:00:00.000Z"
  },
  "created_at": "2026-04-01T12:00:00.000Z"
}`;

    const resWebhook = `{
  "event": "order.paid",
  "data": {
    "id": "8a40135d-e021-456d-a94f-3122c525d5d9",
    "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
    "status": "paid",
    "amount": 2990,
    "amount_display": "29.90",
    "payment_method": "pix",
    "customer": {
      "name": "Maria Souza",
      "email": "maria@email.com",
      "cpf": "12345678900",
      "phone": "11999999999"
    },
    "created_at": "2026-04-01T12:00:00.000Z",
    "updated_at": "2026-04-01T12:04:33.000Z"
  }
}`;

    // ── tabs helper ──────────────────────────────────────────────────────────
    function Tabs({ section, langs }: { section: string; langs: string[] }) {
        const active = getTab(section, langs[0]);
        return (
            <div>
                <div className="flex gap-1 mb-0 flex-wrap">
                    {langs.map(l => (
                        <button
                            key={l}
                            onClick={() => setTab(section, l)}
                            className={`px-3 py-1.5 text-xs rounded-t-md font-medium transition ${
                                active === l
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
                <CodeBlock code={snippets[section][active]} id={`${section}-${active}`} lang={active} />
            </div>
        );
    }

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            {/* sidebar nav */}
            <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 gap-1 text-sm overflow-y-auto z-10">
                <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-500 mb-6 transition">
                    <FiArrowLeft /> Voltar
                </Link>
                {[
                    ['#inicio',        'Início'],
                    ['#autenticacao',  '1. Autenticação'],
                    ['#endpoints',     '2. Endpoints'],
                    ['#criar-pix',     '3. Criar PIX'],
                    ['#consultar',     '4. Consultar Status'],
                    ['#status-valores','5. Valores de Status'],
                    ['#polling',       '6. Polling'],
                    ['#exibir-qr',     '7. Exibir QR Code'],
                    ['#webhooks',      '8. Webhooks'],
                    ['#erros',         '9. Erros'],
                    ['#fluxo',         '10. Fluxo Completo'],
                ].map(([href, label]) => (
                    <a key={href} href={href} className="text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 py-1 transition">
                        {label}
                    </a>
                ))}
            </nav>

            <main className="lg:ml-56 max-w-4xl mx-auto px-6 py-12 space-y-16">

                {/* header */}
                <header id="inicio">
                    <div className="flex items-center gap-3 mb-2 lg:hidden">
                        <Link href="/" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            <FiArrowLeft />
                        </Link>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <FiCode size={28} className="text-blue-500" />
                        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Documentação da API PIX</h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                        Integre cobranças PIX diretamente no seu site, app ou sistema em minutos.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { icon: <FiZap className="text-yellow-500" />, title: 'Simples', desc: 'Uma chamada POST para gerar o QR Code' },
                            { icon: <FiShield className="text-green-500" />, title: 'Seguro', desc: 'Autenticação por API Key + HTTPS' },
                            { icon: <FiCheckCircle className="text-blue-500" />, title: 'Confiável', desc: 'Webhooks automáticos na confirmação' },
                        ].map(c => (
                            <div key={c.title} className="flex items-start gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="mt-0.5 text-xl">{c.icon}</div>
                                <div>
                                    <p className="font-semibold">{c.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </header>

                {/* 1. autenticação */}
                <section id="autenticacao">
                    <h2 className="text-2xl font-bold mb-4">1. Autenticação</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Todas as requisições precisam de uma <strong>Chave de API</strong> no header.
                        Para gerar a sua, acesse o painel em <strong>Integrações → API Pix</strong> e clique em <em>Gerar nova chave</em>.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-4 rounded-r-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Guarde sua chave em segurança. Ela dá acesso à sua conta e não deve ser exposta no frontend/browser.
                            Use sempre no backend (servidor).
                        </p>
                    </div>
                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Você pode enviar a chave de duas formas:</p>
                    <CodeBlock code={`# Opção 1 — header dedicado (recomendado)
x-api-key: SUA_CHAVE_AQUI

# Opção 2 — Authorization Bearer
Authorization: Bearer SUA_CHAVE_AQUI`} id="auth" lang="http" />
                </section>

                {/* 2. endpoints */}
                <section id="endpoints">
                    <h2 className="text-2xl font-bold mb-4">2. Endpoints</h2>
                    <div className="space-y-3">
                        {[
                            { method: 'POST' as const, path: ep,  desc: 'Criar cobrança PIX' },
                            { method: 'GET'  as const, path: epS, desc: 'Consultar status de uma cobrança' },
                        ].map(e => (
                            <div key={e.path} className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <Badge method={e.method} />
                                <code className="flex-1 font-mono text-sm break-all">{e.path}</code>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{e.desc}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Limite: <strong>20 requisições por minuto</strong> por chave de API.
                    </p>
                </section>

                {/* 3. criar pix */}
                <section id="criar-pix">
                    <h2 className="text-2xl font-bold mb-4">3. Criar Cobrança PIX</h2>
                    <div className="flex items-center gap-3 mb-4">
                        <Badge method="POST" />
                        <code className="font-mono text-sm">{ep}</code>
                    </div>

                    <h3 className="font-semibold mb-2">Parâmetros (Body JSON)</h3>
                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <th className="text-left p-3 rounded-tl-lg">Campo</th>
                                    <th className="text-left p-3">Tipo</th>
                                    <th className="text-left p-3">Obrigatório</th>
                                    <th className="text-left p-3 rounded-tr-lg">Descrição</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[
                                    ['amount',           'integer', 'Sim', 'Valor em centavos. Ex: 1000 = R$ 10,00. Mínimo: 100'],
                                    ['description',      'string',  'Não', 'Descrição da cobrança (aparece no extrato)'],
                                    ['customer.name',    'string',  'Sim', 'Nome completo do pagador'],
                                    ['customer.email',   'string',  'Sim', 'E-mail do pagador'],
                                    ['customer.cpf',     'string',  'Sim', 'CPF do pagador (somente números)'],
                                    ['customer.phone',   'string',  'Não', 'Telefone com DDD (somente números)'],
                                ].map(([f, t, r, d]) => (
                                    <tr key={f} className="bg-white dark:bg-gray-800">
                                        <td className="p-3 font-mono text-xs text-blue-600 dark:text-blue-400">{f}</td>
                                        <td className="p-3 text-gray-500">{t}</td>
                                        <td className="p-3">{r === 'Sim' ? <span className="text-red-500 font-semibold">Sim</span> : <span className="text-gray-400">Não</span>}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{d}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h3 className="font-semibold mb-2">Exemplos de código</h3>
                    <Tabs section="create" langs={['Node.js', 'PHP', 'Python', 'cURL']} />

                    <h3 className="font-semibold mt-6 mb-2">Resposta de sucesso <span className="text-green-500 font-mono text-sm">200</span></h3>
                    <CodeBlock code={resCreate} id="res-create" />
                </section>

                {/* 4. consultar */}
                <section id="consultar">
                    <h2 className="text-2xl font-bold mb-4">4. Consultar Status</h2>
                    <div className="flex items-center gap-3 mb-4">
                        <Badge method="GET" />
                        <code className="font-mono text-sm">{epS}</code>
                    </div>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Use o <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">transaction_id</code> retornado na criação para consultar o status atual da cobrança.
                    </p>
                    <Tabs section="status" langs={['Node.js', 'PHP', 'Python', 'cURL']} />
                    <h3 className="font-semibold mt-6 mb-2">Resposta</h3>
                    <CodeBlock code={resStatus} id="res-status" />
                </section>

                {/* 5. status values */}
                <section id="status-valores">
                    <h2 className="text-2xl font-bold mb-4">5. Valores de Status</h2>
                    <div className="space-y-3">
                        {[
                            { s: 'pending', label: 'Aguardando pagamento', color: 'yellow', icon: <FiClock />, desc: 'QR Code gerado, aguardando o pagador escanear e pagar.' },
                            { s: 'paid',    label: 'Pago',                 color: 'green',  icon: <FiCheckCircle />, desc: 'Pagamento confirmado. Você pode liberar o produto/serviço.' },
                            { s: 'failed',  label: 'Falhou',               color: 'red',    icon: <FiXCircle />, desc: 'Pagamento recusado ou erro no processamento.' },
                            { s: 'expired', label: 'Expirado',             color: 'gray',   icon: <FiAlertCircle />, desc: 'O QR Code venceu sem pagamento (geralmente 30 minutos).' },
                        ].map(({ s, label, color, icon, desc }) => (
                            <div key={s} className="flex items-start gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="mt-0.5 text-lg">{icon}</div>
                                <div>
                                    <StatusBadge status={s} label={label} color={color} />
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 6. polling */}
                <section id="polling">
                    <h2 className="text-2xl font-bold mb-2">6. Polling de Status</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Se você não usa webhooks, pode verificar o status periodicamente. Recomendamos intervalos de <strong>5 segundos</strong> e timeout de <strong>10 minutos</strong>.
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg text-sm text-yellow-800 dark:text-yellow-200">
                        Prefira webhooks quando possível — são mais eficientes e instantâneos.
                    </div>
                    <Tabs section="polling" langs={['Node.js', 'Python']} />
                </section>

                {/* 7. exibir qr */}
                <section id="exibir-qr">
                    <h2 className="text-2xl font-bold mb-2">7. Exibir QR Code</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        A API retorna dois campos para exibir o QR Code:
                    </p>
                    <ul className="list-disc list-inside mb-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">pix.qr_code</code> — texto do código PIX (copia e cola)</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">pix.qr_code_url</code> — URL de imagem PNG do QR Code</li>
                        <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">pix.expires_at</code> — data/hora de expiração (ISO 8601)</li>
                    </ul>
                    <Tabs section="qrHtml" langs={['HTML', 'React']} />
                </section>

                {/* 8. webhooks */}
                <section id="webhooks">
                    <h2 className="text-2xl font-bold mb-4">8. Webhooks</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Configure uma URL no painel em <strong>Integrações → API Pix → Webhook da API Pix</strong>.
                        Quando o status de uma cobrança mudar, faremos um <code>POST</code> automático para essa URL com o payload abaixo.
                    </p>

                    <h3 className="font-semibold mb-2">Eventos disponíveis</h3>
                    <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <th className="text-left p-3 rounded-tl-lg">Evento</th>
                                    <th className="text-left p-3 rounded-tr-lg">Quando ocorre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[
                                    ['order.paid',      'Pagamento confirmado'],
                                    ['order.failed',    'Pagamento recusado ou falhou'],
                                    ['order.refunded',  'Pagamento estornado'],
                                    ['order.chargeback','Chargeback registrado'],
                                ].map(([e, d]) => (
                                    <tr key={e} className="bg-white dark:bg-gray-800">
                                        <td className="p-3 font-mono text-xs text-purple-600 dark:text-purple-400">{e}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{d}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h3 className="font-semibold mb-2">Payload recebido</h3>
                    <CodeBlock code={resWebhook} id="webhook-payload" />

                    <h3 className="font-semibold mt-6 mb-2">Como receber no seu servidor</h3>
                    <Tabs section="webhook" langs={['Node.js (Express)', 'PHP', 'Python (Flask)']} />

                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mt-4 rounded-r-lg text-sm text-blue-800 dark:text-blue-200">
                        Seu endpoint de webhook deve sempre responder <strong>HTTP 200</strong>, mesmo em caso de erro interno.
                        Caso contrário, o sistema tentará reenviar o evento.
                    </div>
                </section>

                {/* 9. erros */}
                <section id="erros">
                    <h2 className="text-2xl font-bold mb-4">9. Códigos de Erro</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <th className="text-left p-3 rounded-tl-lg">HTTP</th>
                                    <th className="text-left p-3">Código</th>
                                    <th className="text-left p-3 rounded-tr-lg">Descrição</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[
                                    ['400', 'BAD_REQUEST',   'Parâmetros inválidos (amount < 100, customer incompleto, etc.)'],
                                    ['401', 'UNAUTHORIZED',  'Chave de API ausente ou inválida'],
                                    ['403', 'FORBIDDEN',     'Chave de API inativa'],
                                    ['404', 'NOT_FOUND',     'Transação não encontrada'],
                                    ['429', 'RATE_LIMITED',  'Limite de 20 req/min excedido. Aguarde 1 minuto.'],
                                    ['500', 'INTERNAL',      'Erro interno. Verifique os logs e configuração do recebedor.'],
                                ].map(([code, name, desc]) => (
                                    <tr key={code} className="bg-white dark:bg-gray-800">
                                        <td className="p-3 font-mono font-bold text-red-500">{code}</td>
                                        <td className="p-3 font-mono text-xs text-gray-500">{name}</td>
                                        <td className="p-3 text-gray-600 dark:text-gray-400">{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <h3 className="font-semibold mt-6 mb-2">Formato da resposta de erro</h3>
                    <CodeBlock code={`{
  "error": "Descrição do erro",
  "status": "error"
}`} id="error-format" />
                </section>

                {/* 10. fluxo completo */}
                <section id="fluxo" className="pb-16">
                    <h2 className="text-2xl font-bold mb-4">10. Fluxo Completo de Integração</h2>
                    <div className="space-y-4">
                        {[
                            { n: '1', title: 'Gerar API Key', desc: 'No painel, vá em Integrações → API Pix e gere sua chave.' },
                            { n: '2', title: 'Criar cobrança', desc: 'Faça um POST para /api/v1/pix com o valor e dados do cliente. Guarde o transaction_id retornado.' },
                            { n: '3', title: 'Exibir QR Code', desc: 'Mostre o qr_code_url como imagem e o qr_code como texto copiável para o usuário.' },
                            { n: '4', title: 'Aguardar pagamento', desc: 'Use polling (GET /api/v1/pix/{id} a cada 5s) ou configure um webhook para ser notificado automaticamente.' },
                            { n: '5', title: 'Confirmar e liberar', desc: 'Quando status === "paid", libere o produto, acesso ou serviço para o cliente.' },
                        ].map(({ n, title, desc }) => (
                            <div key={n} className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">{n}</div>
                                <div>
                                    <p className="font-semibold">{title}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}
