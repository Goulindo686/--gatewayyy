import Link from 'next/link';

export default function TermsUsePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 70px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
          <Link href="/" className="btn-secondary" style={{ padding: '10px 14px', textDecoration: 'none' }}>
            Voltar para o site
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/terms/use" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Termos de Uso</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/purchase" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Termos de Compra</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/sales" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Termos de Venda</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/content-policy" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Política de Conteúdo</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/privacy" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Privacidade</Link>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>
            Termos e Condições de Uso — <span className="gradient-text">GouPay</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Estes Termos regulam o acesso e uso da plataforma GouPay, incluindo painel do vendedor, recursos de loja, checkout, integrações e funcionalidades relacionadas.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 0 }}>
            Última atualização: 28/04/2026
          </p>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>1. Aceitação</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Ao acessar ou utilizar a GouPay, você concorda com estes Termos e com as políticas aplicáveis, incluindo a <Link href="/terms/content-policy" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Política de Conteúdo</Link>.</div>
            <div>Se você não concordar com estes Termos, não utilize a Plataforma.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>2. Definições</h2>
          <div style={{ display: 'grid', gap: 10, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Plataforma</span>: site, sistemas, APIs, checkout e demais recursos operados sob a marca GouPay.</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Usuário</span>: qualquer pessoa que navegue, crie conta, compre, venda ou use recursos da Plataforma.</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Vendedor</span>: Usuário que cadastra ofertas, produtos e utiliza checkout para vender.</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Comprador</span>: Usuário que realiza uma compra por meio de um checkout gerado na Plataforma.</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Produto</span>: bem, serviço, conteúdo digital, assinatura, acesso, evento ou qualquer item ofertado pelo Vendedor.</div>
            <div><span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Pedido</span>: registro de solicitação/compra de um Produto, independentemente de aprovação do pagamento.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>3. Estrutura operacional</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>A GouPay fornece infraestrutura tecnológica para viabilizar checkouts e a gestão de vendas pelos Vendedores.</div>
            <div>Dependendo da localização declarada, moeda e características da transação, o processamento pode envolver diferentes parceiros e/ou entidades operacionais associadas à GouPay.</div>
            <div>Quando aplicável, o beneficiário identificado na instituição financeira pode ser a GouPay (ou entidade do grupo/operadora), por razões operacionais e de processamento.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>4. Elegibilidade, conta e segurança</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Para criar uma conta, você declara ter capacidade legal para aceitar estes Termos e usar a Plataforma.</div>
            <div>Você é responsável por manter suas credenciais sob sigilo e por qualquer atividade realizada na sua conta.</div>
            <div>Podemos solicitar verificações adicionais (ex.: KYC, validação de identidade, dados bancários e comprovações) para segurança, prevenção a fraudes e conformidade.</div>
            <div>Você deve comunicar imediatamente qualquer suspeita de acesso indevido ou uso não autorizado.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>5. Regras de uso e condutas proibidas</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Você deve usar a Plataforma de forma lícita, sem violar direitos de terceiros, e em conformidade com as políticas aplicáveis.</div>
            <div>É proibido tentar burlar medidas de segurança, realizar engenharia reversa, explorar vulnerabilidades, automatizar acessos de forma abusiva ou causar instabilidade.</div>
            <div>É proibido usar a Plataforma para fraude, auto-compra indevida, lavagem de dinheiro, financiamento de ilícitos ou para vender conteúdos proibidos.</div>
            <div>Podemos ajustar, suspender, remover ou limitar funcionalidades quando necessário para proteger Usuários e o ecossistema.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>6. Vendas, compras e entrega</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Ao comprar um Produto, o Comprador concorda com a oferta apresentada no checkout, incluindo regras de entrega, acesso, suporte e políticas do Produto.</div>
            <div>O Vendedor é responsável pelas informações do Produto, entrega do que foi ofertado, suporte ao Comprador e cumprimento de obrigações legais relacionadas ao Produto.</div>
            <div>Regras detalhadas de compra e venda estão nos <Link href="/terms/purchase" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Termos de Compra</Link> e nos <Link href="/terms/sales" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Termos de Venda</Link>.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, color: 'var(--danger)' }}>⚠️ 6.1. RESPONSABILIDADE EXCLUSIVA DO VENDEDOR E ISENÇÃO DA PLATAFORMA</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8 }}>DECLARAÇÃO IMPORTANTE:</strong>
              A GouPay é uma plataforma tecnológica que fornece infraestrutura de checkout e processamento de pagamentos. A GouPay NÃO é vendedora, fabricante, distribuidora ou responsável pelos Produtos anunciados pelos Vendedores.
            </div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Responsabilidade do Vendedor:</strong> O Vendedor é o ÚNICO e EXCLUSIVO responsável por: (a) legalidade, licitude e conformidade do Produto com todas as leis aplicáveis; (b) obtenção de autorizações, licenças, alvarás e permissões necessárias para comercializar o Produto; (c) veracidade das informações, descrições e promessas; (d) qualidade, entrega, suporte e garantias do Produto; (e) cumprimento de obrigações fiscais, tributárias, trabalhistas e regulatórias; (f) violações de direitos autorais, marcas, patentes ou propriedade intelectual de terceiros; (g) danos causados a Compradores ou terceiros decorrentes do Produto.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Isenção da Plataforma:</strong> A GouPay NÃO verifica, valida, certifica, garante ou endossa a legalidade, qualidade, segurança ou adequação dos Produtos. A GouPay NÃO é responsável por: (a) produtos ilegais, irregulares ou não autorizados vendidos por Vendedores; (b) fraudes, golpes, promessas falsas ou práticas enganosas de Vendedores; (c) não entrega, entrega parcial, defeitos ou vícios dos Produtos; (d) violações de direitos de terceiros cometidas por Vendedores; (e) danos diretos, indiretos, lucros cessantes ou danos morais decorrentes de Produtos vendidos na Plataforma.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Limitação de Responsabilidade:</strong> Em nenhuma hipótese a GouPay será responsabilizada solidária, subsidiária ou conjuntamente com o Vendedor por qualquer ilícito, irregularidade, dano ou prejuízo causado pelo Produto ou pela conduta do Vendedor. Qualquer reclamação, ação judicial ou procedimento administrativo relacionado ao Produto deve ser direcionado EXCLUSIVAMENTE ao Vendedor.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Direito de Regresso:</strong> Caso a GouPay seja demandada judicialmente ou administrativamente por atos, produtos ou condutas de responsabilidade exclusiva do Vendedor, a GouPay terá direito de regresso integral contra o Vendedor, incluindo honorários advocatícios, custas processuais e indenizações pagas a terceiros.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>7. Tarifas, repasses e retenções</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>As tarifas aplicáveis são informadas na Plataforma e podem variar conforme método de pagamento, risco transacional, categoria, produto e regras operacionais.</div>
            <div>Podemos reter temporariamente valores para prevenção a fraudes, disputas, chargebacks, auditorias, cumprimento legal e/ou exigências operacionais.</div>
            <div>O Vendedor deve considerar que compras podem ser contestadas e que estornos podem impactar repasses e saldo.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>8. Privacidade e Proteção de Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>A GouPay trata dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) e registros de transações para operar a Plataforma, processar pagamentos, prevenir fraudes, cumprir obrigações legais e melhorar a experiência.</div>
            <div>Ao utilizar o checkout, o Comprador fornece dados necessários para processar o pagamento e viabilizar entrega/acesso ao Produto.</div>
            <div style={{ marginTop: 8, padding: 14, background: 'rgba(108, 92, 231, 0.1)', borderRadius: 8, border: '1px solid rgba(108, 92, 231, 0.3)' }}>
              <strong style={{ color: 'var(--accent-primary)' }}>Para informações detalhadas sobre coleta, uso, compartilhamento, segurança e seus direitos sobre dados pessoais, consulte nossa <Link href="/terms/privacy" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Política de Privacidade</Link>.</strong>
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>9. Monitoramento, moderação e cooperação legal</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>A GouPay se reserva o direito, mas NÃO tem a obrigação, de monitorar, revisar, moderar ou investigar produtos, transações e atividades na Plataforma.</div>
            <div>Podemos utilizar sistemas automatizados, análises de risco, inteligência artificial e revisões manuais para identificar atividades suspeitas, fraudes ou violações destes Termos.</div>
            <div>Ao identificar produtos ilegais, irregulares ou que violem estes Termos, podemos: (a) suspender ou encerrar contas; (b) bloquear checkouts e produtos; (c) reter repasses temporária ou definitivamente; (d) reportar às autoridades competentes; (e) cooperar com investigações policiais, judiciais e administrativas.</div>
            <div>A GouPay cooperará integralmente com autoridades policiais, judiciais, fiscais e regulatórias, fornecendo informações, dados, registros e evidências quando solicitado por ordem judicial, requisição legal ou no exercício de poder de polícia.</div>
            <div>O Vendedor autoriza expressamente a GouPay a compartilhar seus dados cadastrais, transacionais e de produtos com autoridades competentes quando necessário para cumprimento de obrigações legais ou investigações.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>10. Suspensão, encerramento e alterações</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Podemos suspender ou encerrar contas quando houver indícios de fraude, violação destes Termos, riscos a terceiros, exigências legais ou operacionais.</div>
            <div>O Usuário pode solicitar encerramento da conta, observadas obrigações pendentes (por exemplo: transações em andamento, disputas e obrigações legais/contábeis).</div>
            <div>Podemos atualizar estes Termos para refletir mudanças legais, de segurança ou operacionais. A versão vigente estará sempre disponível nesta página.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>11. Foro e Lei Aplicável</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Estes Termos e Condições de Uso são regidos e interpretados de acordo com as leis da República Federativa do Brasil, sem prejuízo de tratados e convenções internacionais dos quais o Brasil seja signatário.</div>
            <div>Fica eleito o foro da comarca da sede da GouPay para dirimir quaisquer dúvidas, controvérsias ou litígios decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</div>
            <div>Esta cláusula de eleição de foro não se aplica a relações de consumo quando o consumidor residir em local diverso, hipótese em que prevalecerá o foro de seu domicílio, conforme Art. 101, I do Código de Defesa do Consumidor.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>12. Contato</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            Para falar com a GouPay, use o canal informado no rodapé do site ou o atendimento dentro da Plataforma.
          </div>
        </div>
      </div>
    </div>
  );
}
