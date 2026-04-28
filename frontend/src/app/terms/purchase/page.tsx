import Link from 'next/link';

export default function TermsPurchasePage() {
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
            <Link href="/terms/purchase" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Termos de Compra</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/sales" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Termos de Venda</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/content-policy" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Política de Conteúdo</Link>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>
            Termos de Compra — <span className="gradient-text">GouPay</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Este documento descreve as condições aplicáveis a compras realizadas por meio do checkout da GouPay e esclarece responsabilidades entre Comprador, Vendedor e Plataforma.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 0 }}>
            Última atualização: 28/04/2026
          </p>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>1. Formas de pagamento</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Os métodos de pagamento disponíveis no checkout dependem do Produto e das configurações do Vendedor.</div>
            <div>Os prazos de confirmação são estimativas e podem variar conforme bancos, adquirentes, processadores e horário de funcionamento do sistema financeiro.</div>
            <div>Em algumas compras, a GouPay pode aplicar verificações adicionais de segurança antes de confirmar a transação.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>2. Processamento e status</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>O status de uma compra pode variar entre: pendente, aprovado/pago, recusado/falhou, cancelado ou reembolsado.</div>
            <div>Mesmo após autorizações iniciais, transações podem ser revisadas por segurança, prevenção a fraudes e validações do meio de pagamento.</div>
            <div>Se o pagamento ficar pendente por tempo incomum, recomenda-se contato com a instituição financeira associada ao método utilizado.</div>
            <div>Em caso de recusa, o motivo pode envolver limite, saldo, inconsistências, bloqueios de segurança, falhas de integração ou outras regras do emissor.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>3. Beneficiário e identificação do pagamento</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Como intermediadora do checkout e do processamento, a instituição financeira pode identificar a GouPay (ou entidade operacional associada) como beneficiária do pagamento.</div>
            <div>Antes de confirmar um pagamento, verifique valor e destinatário exibidos no aplicativo/banco.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>4. Entrega, suporte e responsabilidade</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>O Vendedor é responsável pela entrega do Produto e por prestar suporte ao Comprador, conforme a oferta apresentada no checkout.</div>
            <div>Em caso de compra aprovada sem entrega, o Comprador deve contatar o Vendedor pelos canais informados no checkout e/ou na confirmação da compra.</div>
            <div>A GouPay oferece a infraestrutura de checkout e ferramentas de acompanhamento, mas não cria, edita ou controla o conteúdo do Produto.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>5. Assinaturas e recorrência (quando aplicável)</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Alguns Produtos podem ser vendidos por assinatura/recorrência. Nesse caso, a renovação pode ocorrer automaticamente conforme periodicidade indicada na oferta.</div>
            <div>Cancelamentos impedem novas cobranças futuras, mas não geram automaticamente reembolso de períodos já utilizados, salvo se a oferta indicar o contrário ou houver previsão legal.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>6. Reembolso, estorno e contestação</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Pedidos de reembolso devem seguir as condições da oferta, as políticas do Vendedor e a legislação aplicável.</div>
            <div>Contestações e chargebacks podem ocorrer conforme regras do meio de pagamento e do emissor do comprador.</div>
            <div>Em determinados casos, a GouPay pode solicitar informações adicionais para análise e prevenção a fraudes.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>7. Como falar com a GouPay</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            Para assuntos do Produto (entrega, acesso e conteúdo), fale primeiro com o Vendedor. Para problemas técnicos do checkout, use o atendimento da GouPay pelo canal informado no rodapé do site.
          </div>
        </div>
      </div>
    </div>
  );
}
