'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiCopy, FiCheck, FiCode, FiArrowLeft } from 'react-icons/fi';

export default function DocsPage() {
    const [copied, setCopied] = useState('');
    const [baseUrl, setBaseUrl] = useState('https://seu-dominio.com');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBaseUrl(window.location.origin);
        }
    }, []);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(''), 2000);
    };

    const endpoint = `${baseUrl}/api/v1/pix`;

    const exampleJson = `{
  "amount": 1000,
  "description": "Venda #12345",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "cpf": "12345678900",
    "phone": "11999999999"
  }
}`;

    const exampleResponse = `{
  "success": true,
  "transaction_id": "8a40135d-e021-456d-a94f-3122c525d5d9",
  "pix": {
    "qr_code": "00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540410.005802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
    "qr_code_url": "https://api.pagar.me/core/v5/transactions/tran_12345/qrcode"
  },
  "amount": 1000,
  "status": "pending"
}`;

    const exampleNode = `const axios = require('axios');

const data = {
  amount: 1000, // em centavos (R$ 10,00)
  description: "Venda #12345",
  customer: {
    name: "João Silva",
    email: "joao@email.com",
    cpf: "12345678900",
    phone: "11999999999"
  }
};

axios.post('${endpoint}', data, {
  headers: {
    'x-api-key': 'sk_live_sua_chave_aqui',
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('QR Code:', response.data.pix.qr_code);
})
.catch(error => {
  console.error('Erro:', error.response ? error.response.data : error.message);
});`;

    const examplePhp = `<?php

$url = '${endpoint}';
$apiKey = 'sk_live_sua_chave_aqui';

$data = [
    'amount' => 1000, // em centavos
    'description' => 'Venda #12345',
    'customer' => [
        'name' => 'João Silva',
        'email' => 'joao@email.com',
        'cpf' => '12345678900',
        'phone' => '11999999999'
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo "QR Code: " . $result['pix']['qr_code'];
} else {
    echo "Erro: " . $response;
}
?>`;

    const exampleWebhook = `{
  "event": "order.paid",
  "data": {
    "id": "8a40135d-e021-456d-a94f-3122c525d5d9",
    "status": "paid",
    "amount": 1000,
    "amount_display": "10.00",
    "description": "Venda #12345",
    "payment_method": "pix",
    "customer": {
      "name": "João Silva",
      "email": "joao@email.com",
      "cpf": "12345678900",
      "phone": "11999999999"
    },
    "created_at": "2023-10-27T10:00:00.000Z",
    "updated_at": "2023-10-27T10:05:00.000Z"
  }
}`;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 border-b border-gray-200 dark:border-gray-700 pb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
                            <FiArrowLeft size={24} />
                        </Link>
                        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <FiCode /> Documentação da API Pix
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Integre o checkout Pix transparente diretamente no seu sistema, site ou aplicativo.
                    </p>
                </header>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">1. Autenticação</h2>
                    <p className="mb-4">
                        Todas as requisições devem incluir o header <code>x-api-key</code> com sua Chave de API.
                        Você pode gerar sua chave no painel em <strong>Configurações &gt; API</strong>.
                    </p>
                    <div className="bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm">
                        x-api-key: sk_live_...
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">2. Endpoint</h2>
                    <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded font-bold text-sm">POST</span>
                        <code className="flex-1 font-mono text-sm">{endpoint}</code>
                        <button 
                            onClick={() => copyToClipboard(endpoint, 'endpoint')}
                            className="text-gray-500 hover:text-blue-500 transition"
                        >
                            {copied === 'endpoint' ? <FiCheck /> : <FiCopy />}
                        </button>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">3. Parâmetros (Body JSON)</h2>
                    <div className="relative">
                        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{exampleJson}</code>
                        </pre>
                        <button 
                            onClick={() => copyToClipboard(exampleJson, 'json')}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                        >
                            {copied === 'json' ? <FiCheck /> : <FiCopy />}
                        </button>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li><strong>amount:</strong> Valor em centavos (Ex: 1000 = R$ 10,00). Mínimo: 100.</li>
                        <li><strong>description:</strong> Descrição do pedido (opcional).</li>
                        <li><strong>customer:</strong> Objeto com dados do cliente (Obrigatório: name, email, cpf).</li>
                    </ul>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-4">4. Exemplo de Resposta (Sucesso)</h2>
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                        <code>{exampleResponse}</code>
                    </pre>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-semibold mb-6">5. Exemplos de Código</h2>
                    
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-medium mb-3 text-green-600 dark:text-green-400">Node.js (Axios)</h3>
                            <div className="relative">
                                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                    <code>{exampleNode}</code>
                                </pre>
                                <button 
                                    onClick={() => copyToClipboard(exampleNode, 'node')}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                                >
                                    {copied === 'node' ? <FiCheck /> : <FiCopy />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-medium mb-3 text-indigo-600 dark:text-indigo-400">PHP (cURL)</h3>
                            <div className="relative">
                                <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                    <code>{examplePhp}</code>
                                </pre>
                                <button 
                                    onClick={() => copyToClipboard(examplePhp, 'php')}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                                >
                                    {copied === 'php' ? <FiCheck /> : <FiCopy />}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-12 border-t border-gray-200 dark:border-gray-700 pt-8">
                    <h2 className="text-2xl font-semibold mb-4 text-purple-600 dark:text-purple-400">6. Webhooks (Notificações)</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Configure uma URL de Webhook no seu painel para receber notificações automáticas sempre que uma venda mudar de status (paga, recusada, estornada).
                    </p>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Como configurar:</strong> Vá em <em>Configurações &gt; API & Integração</em> e cole a URL do seu sistema que receberá o POST.
                        </p>
                    </div>

                    <h3 className="text-lg font-medium mb-3">Payload enviado (POST JSON)</h3>
                    <div className="relative">
                        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{exampleWebhook}</code>
                        </pre>
                        <button 
                            onClick={() => copyToClipboard(exampleWebhook, 'webhook')}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                        >
                            {copied === 'webhook' ? <FiCheck /> : <FiCopy />}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
