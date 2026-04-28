import Link from 'next/link';

export default function TermsContentPolicyPage() {
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
            <Link href="/terms/sales" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Termos de Venda</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/content-policy" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Política de Conteúdo</Link>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>
            Política de Conteúdo — <span className="gradient-text">GouPay</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Esta Política define o que pode ou não ser vendido/anunciado na GouPay. Ela se aplica a páginas de venda, descrições, imagens, arquivos, promessas e qualquer material vinculado a um checkout.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 0 }}>
            Última atualização: 28/04/2026
          </p>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>1. Conteúdo permitido</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Produtos e serviços lícitos, com descrição clara e entrega compatível com o que foi ofertado.</div>
            <div>Conteúdos digitais, comunidades, cursos e consultorias, desde que respeitem direitos autorais e regras de consumo.</div>
            <div>Materiais educativos e informativos, desde que não envolvam promessas enganosas ou orientações ilegais.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, color: 'var(--danger)' }}>⛔ 2. CONTEÚDO ESTRITAMENTE PROIBIDO</h2>
          <div style={{ display: 'grid', gap: 14, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            
            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>🎲 RIFAS, SORTEIOS, LOTERIAS E JOGOS DE AZAR</strong>
              <div style={{ marginBottom: 8 }}>É ESTRITAMENTE PROIBIDO vender, promover ou facilitar:</div>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Rifas, sorteios, loterias, bingos ou qualquer modalidade de jogo de azar, com ou sem autorização</li>
                <li>Venda de "números da sorte", "cotas", "bilhetes", "chances" ou qualquer nomenclatura similar</li>
                <li>Sorteios condicionados a compra, doação ou qualquer forma de pagamento</li>
                <li>Apostas esportivas, cassinos online, jogos de azar virtuais ou presenciais</li>
                <li>Plataformas, sistemas, scripts ou ferramentas para criação/gestão de rifas e sorteios</li>
                <li>Produtos onde o resultado depende de sorte, aleatoriedade ou eventos futuros incertos</li>
              </ul>
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 13 }}>
                <strong>Base Legal:</strong> Lei de Contravenções Penais (Art. 58), Código Penal (Art. 50), Decreto-Lei 6.259/44 e legislação aplicável. Rifas e sorteios só podem ser realizados por entidades filantrópicas com autorização expressa do Ministério da Economia.
              </div>
            </div>

            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>🚫 ATIVIDADES ILEGAIS E CRIMINOSAS</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Facilitação de crimes, fraude, lavagem de dinheiro, evasão fiscal ou financiamento de atividades ilícitas</li>
                <li>Esquemas de pirâmide, marketing multinível ilegal, correntes, golpes e promessas de enriquecimento rápido</li>
                <li>Venda de drogas ilícitas, armas, munições, explosivos ou materiais controlados sem autorização legal</li>
                <li>Documentos falsos, identidades falsas, diplomas fraudulentos ou certificações não autênticas</li>
                <li>Serviços de hacking, invasão de sistemas, roubo de dados, phishing ou qualquer atividade cibercriminosa</li>
                <li>Produtos ou serviços que violem sanções internacionais, embargos ou restrições comerciais</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>©️ VIOLAÇÃO DE PROPRIEDADE INTELECTUAL</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Pirataria: venda ou distribuição de software, filmes, músicas, livros, cursos ou conteúdos pirateados</li>
                <li>Produtos falsificados, réplicas, cópias não autorizadas ou que violem marcas registradas</li>
                <li>Cópia integral ou substancial de sites, designs, layouts, códigos ou materiais de terceiros (ex: cópia de sites como Viva Sorte, Mercado Livre, etc.)</li>
                <li>Uso não autorizado de marcas, logos, nomes comerciais, imagens ou identidade visual de terceiros</li>
                <li>Revenda de conteúdos com direitos autorais sem licença ou autorização expressa do titular</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>⚠️ CONTEÚDO NOCIVO E ABUSIVO</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Conteúdo que promova ódio, discriminação, racismo, xenofobia, homofobia ou intolerância religiosa</li>
                <li>Violência, tortura, crueldade, terrorismo, apologia ao crime ou incitação à violência</li>
                <li>Exploração sexual, pornografia infantil, pedofilia, tráfico de pessoas ou exploração humana</li>
                <li>Assédio, stalking, doxxing, ameaças, intimidação ou perseguição a indivíduos ou grupos</li>
                <li>Automutilação, suicídio, distúrbios alimentares ou conteúdo que glorifique comportamentos autodestrutivos</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>💊 PRODUTOS REGULADOS SEM AUTORIZAÇÃO</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Medicamentos, suplementos, anabolizantes ou substâncias controladas sem registro na ANVISA</li>
                <li>Serviços médicos, diagnósticos, tratamentos ou prescrições sem habilitação profissional</li>
                <li>Produtos que prometam cura de doenças, emagrecimento milagroso ou resultados médicos sem comprovação científica</li>
                <li>Tabaco, cigarros eletrônicos, bebidas alcoólicas (conforme restrições legais de venda online)</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>🎭 FRAUDE E PRÁTICAS ENGANOSAS</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Promessas falsas, garantias absolutas, resultados inevitáveis ou informações enganosas</li>
                <li>Omissão de informações relevantes, taxas ocultas, cobranças não autorizadas ou práticas abusivas</li>
                <li>Manipulação de depoimentos, antes/depois falsos, reviews comprados ou evidências fabricadas</li>
                <li>Produtos "isca" (bait and switch): anunciar um produto e entregar outro diferente ou inferior</li>
                <li>Esquemas de "dinheiro fácil", "trabalhe em casa", "ganhe sem esforço" ou promessas irrealistas</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(255,59,48,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,59,48,0.3)' }}>
              <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: 8, fontSize: 15 }}>🔐 PRIVACIDADE E DADOS PESSOAIS</strong>
              <ul style={{ marginLeft: 20, marginTop: 8, marginBottom: 0 }}>
                <li>Coleta, venda, compartilhamento ou uso indevido de dados pessoais sem consentimento</li>
                <li>Listas de e-mails, telefones, CPFs ou dados pessoais obtidos de forma ilícita</li>
                <li>Ferramentas de raspagem (scraping), espionagem, monitoramento não autorizado ou invasão de privacidade</li>
                <li>Malware, vírus, spyware, ransomware ou qualquer software malicioso</li>
              </ul>
            </div>

            <div style={{ marginTop: 8, padding: 14, background: 'rgba(255,149,0,0.1)', borderRadius: 8, border: '1px solid rgba(255,149,0,0.3)' }}>
              <strong style={{ color: 'var(--warning)' }}>⚠️ IMPORTANTE:</strong> Esta lista não é exaustiva. A GouPay se reserva o direito de proibir qualquer produto ou serviço que, a seu exclusivo critério, seja considerado ilegal, irregular, arriscado, prejudicial ou incompatível com os valores e objetivos da Plataforma.
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>3. Promessas e transparência</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>O Vendedor deve evitar promessas absolutas e garantir que anúncios sejam verificáveis e coerentes com o Produto.</div>
            <div>É obrigatório informar claramente prazos, regras de acesso, o que está incluso, limitações e políticas de suporte.</div>
            <div>Antes/depois, depoimentos e prints devem ser apresentados de forma honesta e sem manipulação ou omissão de contexto.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>4. Moderação, revisão e medidas</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Podemos revisar ofertas e materiais a qualquer momento, inclusive de forma preventiva, para reduzir risco e manter a segurança.</div>
            <div>Em caso de violação, podemos remover páginas, suspender checkouts, limitar recursos e/ou encerrar contas, conforme a gravidade.</div>
            <div>Também podemos reter temporária ou definitivamente repasses quando necessário para apuração, disputas, chargebacks, investigações ou exigências legais.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Violações graves</strong> (como rifas, jogos de azar, fraude, pirataria ou atividades ilegais) resultarão em: (a) suspensão imediata e permanente da conta; (b) bloqueio total de repasses; (c) reporte às autoridades competentes (Polícia Federal, Ministério Público, Receita Federal, etc.); (d) cooperação integral com investigações criminais; (e) ação de regresso para ressarcimento de danos causados à GouPay.</div>
            <div>O Vendedor será o ÚNICO responsável por responder civil e criminalmente por produtos ilegais ou irregulares, isentando completamente a GouPay de qualquer responsabilidade.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>5. Denúncias</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            Para denunciar um conteúdo, utilize os canais de atendimento informados no rodapé do site e descreva o máximo possível (link do checkout, motivo e evidências).
          </div>
        </div>
      </div>
    </div>
  );
}
