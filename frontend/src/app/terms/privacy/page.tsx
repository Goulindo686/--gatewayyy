import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
            <Link href="/terms/content-policy" style={{ color: 'var(--text-secondary)', fontWeight: 700, textDecoration: 'none' }}>Política de Conteúdo</Link>
            <span style={{ opacity: 0.35 }}>•</span>
            <Link href="/terms/privacy" style={{ color: 'var(--accent-primary)', fontWeight: 800, textDecoration: 'none' }}>Privacidade</Link>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 10 }}>
            Política de Privacidade — <span className="gradient-text">GouPay</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Esta Política de Privacidade descreve como a GouPay coleta, usa, armazena, compartilha e protege seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 0 }}>
            Última atualização: 28/04/2026
          </p>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>1. Quem Somos</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>A GouPay é uma plataforma tecnológica de gateway de pagamentos e marketplace que conecta vendedores e compradores, processando transações financeiras de forma segura.</div>
            <div>Para fins da LGPD, a GouPay atua como <strong style={{ color: 'var(--text-primary)' }}>Controladora</strong> dos dados pessoais coletados através da Plataforma.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>2. Quais Dados Coletamos</h2>
          <div style={{ display: 'grid', gap: 14, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>2.1. Dados de Cadastro (Vendedores)</strong>
              <ul style={{ marginLeft: 20, marginTop: 6 }}>
                <li>Nome completo</li>
                <li>E-mail</li>
                <li>CPF ou CNPJ</li>
                <li>Telefone</li>
                <li>Endereço completo</li>
                <li>Dados bancários (banco, agência, conta, tipo de conta)</li>
                <li>Chave Pix e tipo de chave</li>
                <li>Senha (armazenada criptografada)</li>
              </ul>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>2.2. Dados de Compra (Compradores)</strong>
              <ul style={{ marginLeft: 20, marginTop: 6 }}>
                <li>Nome completo</li>
                <li>E-mail</li>
                <li>CPF</li>
                <li>Telefone</li>
                <li>Dados do cartão de crédito (processados pelo Pagar.me - não armazenamos número completo)</li>
                <li>Endereço de cobrança (quando aplicável)</li>
              </ul>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>2.3. Dados de Navegação e Uso</strong>
              <ul style={{ marginLeft: 20, marginTop: 6 }}>
                <li>Endereço IP</li>
                <li>Tipo de navegador e dispositivo</li>
                <li>Sistema operacional</li>
                <li>Páginas visitadas e tempo de permanência</li>
                <li>Origem do acesso (referrer)</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>2.4. Dados de Transações</strong>
              <ul style={{ marginLeft: 20, marginTop: 6 }}>
                <li>Histórico de compras e vendas</li>
                <li>Valores transacionados</li>
                <li>Métodos de pagamento utilizados</li>
                <li>Status de pagamentos</li>
                <li>Histórico de saques</li>
                <li>Taxas aplicadas</li>
              </ul>
            </div>

            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>2.5. Dados de Verificação (KYC)</strong>
              <ul style={{ marginLeft: 20, marginTop: 6 }}>
                <li>Documentos de identidade (RG, CNH, passaporte)</li>
                <li>Selfie com documento</li>
                <li>Comprovante de residência</li>
                <li>Dados processados pelo Pagar.me para verificação de identidade</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>3. Para Que Usamos Seus Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>3.1. Execução de Contrato:</strong> Processar pagamentos, criar checkouts, gerenciar produtos, realizar saques, entregar produtos digitais.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>3.2. Cumprimento de Obrigação Legal:</strong> Cumprir obrigações fiscais, contábeis, regulatórias, responder a ordens judiciais, cooperar com autoridades.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>3.3. Legítimo Interesse:</strong> Prevenir fraudes, garantir segurança da Plataforma, melhorar experiência do usuário, realizar análises estatísticas, enviar comunicações transacionais.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>3.4. Consentimento:</strong> Enviar comunicações de marketing (quando você autorizar), usar cookies não essenciais, compartilhar dados com parceiros (quando você autorizar).</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>4. Com Quem Compartilhamos Seus Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>4.1. Pagar.me (Processador de Pagamentos):</strong> Compartilhamos dados necessários para processar pagamentos, criar recebedores, realizar transferências e verificação de identidade (KYC). O Pagar.me é regulamentado pelo Banco Central do Brasil.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>4.2. Supabase (Banco de Dados):</strong> Armazenamos dados em servidores do Supabase, que podem estar localizados nos Estados Unidos. O Supabase possui certificações de segurança e conformidade com GDPR.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>4.3. Autoridades Competentes:</strong> Compartilhamos dados quando exigido por lei, ordem judicial, requisição de autoridades policiais, fiscais ou regulatórias.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>4.4. Vendedores:</strong> Compradores têm seus dados compartilhados com o vendedor do produto adquirido para viabilizar entrega, suporte e cumprimento de obrigações legais.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>4.5. Prestadores de Serviços:</strong> Podemos compartilhar dados com prestadores de serviços que nos auxiliam (ex: serviços de e-mail, análise de dados, suporte técnico), sempre sob obrigações de confidencialidade.</div>
            <div style={{ marginTop: 8, padding: 14, background: 'rgba(255,149,0,0.1)', borderRadius: 8, border: '1px solid rgba(255,149,0,0.3)' }}>
              <strong style={{ color: 'var(--warning)' }}>⚠️ Importante:</strong> NÃO vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>5. Transferência Internacional de Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Alguns de nossos prestadores de serviços (como Supabase) podem armazenar dados em servidores localizados fora do Brasil, incluindo Estados Unidos e Europa.</div>
            <div>Garantimos que essas transferências são realizadas com base em:</div>
            <ul style={{ marginLeft: 20, marginTop: 6 }}>
              <li>Cláusulas contratuais padrão aprovadas pela ANPD</li>
              <li>Certificações de segurança e conformidade (ISO 27001, SOC 2, GDPR)</li>
              <li>Garantias de proteção adequada aos dados</li>
            </ul>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>6. Como Protegemos Seus Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Implementamos medidas técnicas e organizacionais para proteger seus dados:</div>
            <ul style={{ marginLeft: 20, marginTop: 6 }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Criptografia:</strong> Senhas criptografadas com bcrypt, comunicação via HTTPS/TLS</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Controle de Acesso:</strong> Autenticação JWT, controle de permissões (RBAC), Row Level Security (RLS)</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Monitoramento:</strong> Logs de acesso, detecção de atividades suspeitas, rate limiting</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Backup:</strong> Backup automático diário do banco de dados</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Segurança de Rede:</strong> Firewall, proteção DDoS, headers de segurança (Helmet)</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Treinamento:</strong> Equipe treinada em boas práticas de segurança e privacidade</li>
            </ul>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>7. Por Quanto Tempo Guardamos Seus Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dados de Cadastro:</strong> Enquanto a conta estiver ativa + 5 anos após encerramento (obrigação fiscal e contábil).</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dados de Transações:</strong> 5 anos após a transação (obrigação fiscal - Código Tributário Nacional).</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dados de Navegação:</strong> Até 6 meses (Marco Civil da Internet).</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dados de KYC:</strong> 5 anos após verificação (Lei de Lavagem de Dinheiro).</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Dados para Defesa Legal:</strong> Até o fim de processos judiciais ou administrativos.</div>
            <div>Após os prazos acima, os dados são anonimizados ou excluídos de forma segura.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>8. Seus Direitos (LGPD)</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Você tem os seguintes direitos sobre seus dados pessoais:</div>
            <ul style={{ marginLeft: 20, marginTop: 6 }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Confirmação e Acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Anonimização, Bloqueio ou Eliminação:</strong> Solicitar anonimização, bloqueio ou exclusão de dados desnecessários ou tratados em desconformidade</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Portabilidade:</strong> Solicitar transferência de dados a outro fornecedor</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Informação sobre Compartilhamento:</strong> Saber com quem compartilhamos seus dados</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Revogação de Consentimento:</strong> Revogar consentimento quando aplicável</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Oposição:</strong> Opor-se a tratamento realizado com base em legítimo interesse</li>
            </ul>
            <div style={{ marginTop: 12, padding: 14, background: 'rgba(108, 92, 231, 0.1)', borderRadius: 8, border: '1px solid rgba(108, 92, 231, 0.3)' }}>
              <strong style={{ color: 'var(--accent-primary)' }}>Para exercer seus direitos, entre em contato através do e-mail informado no rodapé do site ou pelo painel da Plataforma.</strong>
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>9. Cookies e Tecnologias Similares</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Utilizamos cookies e tecnologias similares para:</div>
            <ul style={{ marginLeft: 20, marginTop: 6 }}>
              <li><strong style={{ color: 'var(--text-primary)' }}>Cookies Essenciais:</strong> Necessários para funcionamento da Plataforma (autenticação, sessão, segurança)</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Cookies de Desempenho:</strong> Analisar uso da Plataforma e melhorar experiência</li>
              <li><strong style={{ color: 'var(--text-primary)' }}>Cookies de Marketing:</strong> Rastrear conversões e otimizar campanhas (Facebook Pixel - quando autorizado)</li>
            </ul>
            <div>Você pode gerenciar cookies através das configurações do seu navegador, mas isso pode afetar funcionalidades da Plataforma.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>10. Menores de Idade</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            A GouPay não coleta intencionalmente dados de menores de 18 anos. Se você é menor de idade, não utilize a Plataforma sem autorização e supervisão de seus pais ou responsáveis legais. Se identificarmos coleta inadvertida de dados de menores, excluiremos tais dados imediatamente.
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>11. Alterações nesta Política</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas práticas, tecnologias ou requisitos legais. A versão atualizada será publicada nesta página com a data de "Última atualização". Recomendamos que você revise esta Política regularmente.
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>12. Contato e Encarregado de Dados</h2>
          <div style={{ display: 'grid', gap: 12, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            <div>Para dúvidas, solicitações ou exercício de direitos relacionados a dados pessoais, entre em contato:</div>
            <div style={{ padding: 16, background: 'rgba(108, 92, 231, 0.1)', borderRadius: 8, border: '1px solid rgba(108, 92, 231, 0.3)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>Canais de Contato:</strong>
              <div>• E-mail: Informado no rodapé do site</div>
              <div>• Painel da Plataforma: Seção de suporte</div>
              <div>• Atendimento: Disponível dentro da Plataforma</div>
            </div>
            <div>Responderemos sua solicitação em até 15 dias, conforme previsto na LGPD.</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>13. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
            Caso suas solicitações não sejam atendidas de forma satisfatória, você pode contatar a Autoridade Nacional de Proteção de Dados (ANPD) através do site: <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>www.gov.br/anpd</a>
          </div>
        </div>
      </div>
    </div>
  );
}
