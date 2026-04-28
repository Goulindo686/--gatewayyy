import Link from 'next/link';

export default function TermsSalesPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
          <Link href="/" className="btn-secondary" style={{ padding: '10px 14px', textDecoration: 'none' }}>
            Voltar para o site
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/terms/use" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Termos de Uso</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/purchase" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Termos de Compra</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/sales" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Termos de Venda</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/content-policy" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Política de Conteúdo</Link>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>
            Termos de Venda — <span className="gradient-text">GouPay</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Este documento descreve condições para Vendedores que utilizam a GouPay para criar checkouts, anunciar produtos e receber por vendas.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 0 }}>
            Última atualização: 28/04/2026
          </p>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>1. Cadastro e conformidade</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>O Vendedor deve fornecer informações corretas e manter dados atualizados, incluindo dados de recebimento quando aplicável.</div>
            <div>O Vendedor é responsável pela guarda de credenciais de acesso e por atividades realizadas em sua conta.</div>
            <div>A GouPay pode realizar verificações de identidade, validações e análises de risco para prevenção a fraudes e cumprimento de obrigações legais.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>2. Produtos, oferta e transparência</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>O Vendedor é o responsável pelo conteúdo, qualidade, preço, promessa e entrega do Produto.</div>
            <div>O anúncio e o checkout devem conter informações claras sobre o que está sendo vendido, prazos, regras de acesso, suporte e reembolsos.</div>
            <div>É obrigatório cumprir a <Link href="/terms/content-policy" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Política de Conteúdo</Link>.</div>
            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 14, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)', marginTop: 8 }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8 }}>⚠️ DECLARAÇÃO DE RESPONSABILIDADE:</strong>
              O Vendedor declara e garante que: (a) possui todos os direitos, licenças, autorizações e permissões legais necessárias para comercializar o Produto; (b) o Produto é lícito, legal e não viola leis brasileiras ou internacionais; (c) o Produto não infringe direitos autorais, marcas, patentes ou propriedade intelectual de terceiros; (d) todas as informações fornecidas são verdadeiras, precisas e completas; (e) cumprirá todas as obrigações fiscais, tributárias e regulatórias aplicáveis.
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>3. Checkout, pagamentos e repasses</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>As taxas e prazos de repasse podem variar conforme método de pagamento, risco transacional e políticas operacionais.</div>
            <div>O Vendedor deve considerar possíveis estornos/contestações e manter boa comunicação com Compradores.</div>
            <div>Transações podem ser bloqueadas temporariamente para validações, investigações de fraude, disputas ou exigências legais/operacionais.</div>
            <div>O Vendedor é responsável por obrigações fiscais e legais aplicáveis às suas vendas, conforme seu domicílio e natureza do Produto.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, color: 'var(--danger)' }}>⛔ 4. CONDUTAS ESTRITAMENTE PROIBIDAS</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 14, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8 }}>É ESTRITAMENTE PROIBIDO:</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Vender rifas, sorteios, loterias, jogos de azar ou qualquer produto baseado em sorte/aleatoriedade</li>
                <li>Vender produtos ilegais, irregulares, sem autorização legal ou que violem direitos de terceiros</li>
                <li>Copiar sites, designs, layouts, marcas ou conteúdos de terceiros (ex: Viva Sorte, Mercado Livre, etc.)</li>
                <li>Fazer promessas falsas, garantias absolutas, omitir informações relevantes ou induzir o Comprador a erro</li>
                <li>Coletar dados pessoais sem base legal, realizar spam, phishing ou práticas abusivas</li>
                <li>Realizar fraude, auto-compra indevida, manipulação de transações ou lavagem de dinheiro</li>
              </ul>
            </div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Consequências:</strong> Violações resultarão em suspensão imediata da conta, bloqueio de repasses, reporte às autoridades competentes e responsabilização civil e criminal do Vendedor.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Isenção da GouPay:</strong> A GouPay NÃO é responsável por produtos ilegais ou irregulares vendidos por Vendedores. O Vendedor responderá sozinho por todas as consequências legais, isentando completamente a GouPay.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>5. Reembolsos e disputas</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>O Vendedor deve seguir as regras de reembolso divulgadas na oferta e cumprir a legislação aplicável.</div>
            <div>Em disputas, o Vendedor pode ser solicitado a fornecer informações e evidências de entrega/acesso.</div>
            <div>Quando houver chargebacks/contestações, valores podem ser debitados do saldo e/ou retidos conforme necessário.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>6. Suporte e comunicação</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            O Vendedor deve manter canal de suporte para Compradores e responder solicitações dentro de prazo razoável. A GouPay pode solicitar informações sobre entregas, reembolsos e disputas quando necessário.
          </div>
        </div>
      </div>
    </div>
  );
}
