import nodemailer from 'nodemailer';

function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export async function sendAccountBlockedEmail({
    toEmail,
    userName,
}: {
    toEmail: string;
    userName?: string;
}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[EMAIL] SMTP nao configurado para aviso de bloqueio de conta`);
        return;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const transporter = createTransporter();
    const safeUserName = escapeHtml(userName || 'usuario');
    const supportEmail = 'support@goupay.com.br';
    const supportPhone = '32998284648';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goupay.com.br';
    const termsUseUrl = `${appUrl}/terms/use`;
    const termsSalesUrl = `${appUrl}/terms/sales`;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Conta em analise</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d2433;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:36px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(17,24,39,0.08);">
        <tr>
          <td style="padding:34px 36px;background:linear-gradient(135deg,#30219f 0%,#6c5ce7 62%,#00b894 145%);text-align:center;">
            <div style="font-size:13px;font-weight:800;color:#ddd8ff;letter-spacing:1.5px;text-transform:uppercase;">GouPay</div>
            <h1 style="margin:14px 0 8px;color:#ffffff;font-size:26px;line-height:1.25;">Sua conta esta em analise</h1>
            <p style="margin:0;color:#e8e5ff;font-size:15px;line-height:1.6;">Realizamos uma pausa preventiva para verificacao de seguranca e conformidade.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Ola, <strong>${safeUserName}</strong>.</p>
            <p style="margin:0 0 18px;color:#596273;font-size:15px;line-height:1.7;">
              Informamos que sua conta GouPay foi temporariamente bloqueada para uma analise mais aprofundada das atividades, produtos, vendas e informacoes relacionadas ao que esta sendo comercializado na plataforma.
            </p>
            <p style="margin:0 0 24px;color:#596273;font-size:15px;line-height:1.7;">
              Essa medida e preventiva e tem como objetivo proteger a plataforma, vendedores, compradores e garantir o cumprimento dos nossos termos, politicas de seguranca, prevencao a fraudes e exigencias operacionais.
            </p>
            <div style="padding:16px 18px;background:#fff9e8;border-left:4px solid #f2b632;border-radius:10px;color:#725817;font-size:14px;line-height:1.65;margin-bottom:24px;">
              Durante a analise, algumas funcionalidades da conta, checkouts, transacoes ou repasses podem ficar indisponiveis temporariamente.
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border:1px solid #edf0f5;border-radius:14px;margin-bottom:24px;">
              <tr>
                <td style="padding:18px 20px;border-bottom:1px solid #edf0f5;">
                  <div style="font-size:11px;color:#8992a3;text-transform:uppercase;letter-spacing:0.8px;">Motivo</div>
                  <div style="margin-top:5px;font-size:15px;font-weight:800;color:#1d2433;">Analise preventiva de seguranca, risco e conformidade</div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 20px;">
                  <div style="font-size:11px;color:#8992a3;text-transform:uppercase;letter-spacing:0.8px;">Contatos de suporte</div>
                  <div style="margin-top:7px;font-size:15px;color:#596273;line-height:1.8;">
                    Email: <a href="mailto:${supportEmail}" style="color:#5a48d6;text-decoration:none;font-weight:800;">${supportEmail}</a><br/>
                    WhatsApp/Telefone: <strong style="color:#1d2433;">${supportPhone}</strong>
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 18px;color:#596273;font-size:14px;line-height:1.7;">
              Caso deseje apresentar esclarecimentos, documentos, comprovantes ou informacoes sobre os produtos e vendas realizadas, entre em contato pelos canais acima.
            </p>
            <p style="margin:0;color:#8992a3;font-size:12px;line-height:1.6;">
              Termos de Uso: <a href="${termsUseUrl}" style="color:#5a48d6;text-decoration:none;">${termsUseUrl}</a><br/>
              Termos de Venda: <a href="${termsSalesUrl}" style="color:#5a48d6;text-decoration:none;">${termsSalesUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;background:#f8f9fc;border-top:1px solid #edf0f5;text-align:center;color:#9aa2b1;font-size:12px;">
            Email automatico enviado pela GouPay. Nao responda diretamente esta mensagem.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"GouPay" <${from}>`,
        to: toEmail,
        subject: 'Conta GouPay temporariamente bloqueada para analise',
        html,
        text: `Ola ${userName || 'usuario'}.\n\nSua conta GouPay foi temporariamente bloqueada para uma analise mais aprofundada das atividades, produtos, vendas e informacoes relacionadas ao que esta sendo comercializado na plataforma.\n\nEssa medida e preventiva e tem como objetivo proteger a plataforma, vendedores, compradores e garantir o cumprimento dos nossos termos, politicas de seguranca, prevencao a fraudes e exigencias operacionais.\n\nDurante a analise, algumas funcionalidades da conta, checkouts, transacoes ou repasses podem ficar indisponiveis temporariamente.\n\nCaso deseje apresentar esclarecimentos, documentos, comprovantes ou informacoes sobre os produtos e vendas realizadas, entre em contato:\nEmail: ${supportEmail}\nWhatsApp/Telefone: ${supportPhone}\n\nTermos de Uso: ${termsUseUrl}\nTermos de Venda: ${termsSalesUrl}\n\nEquipe GouPay`,
    });

    console.log(`[EMAIL] Aviso de bloqueio de conta enviado para ${toEmail}`);
}

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
}

export async function sendPixSalesRecoveryEmail({
    buyerName,
    buyerEmail,
    productName,
    amount,
    orderId,
    pixQrCode,
    pixQrCodeUrl,
    pixExpiresAt,
}: {
    buyerName?: string;
    buyerEmail: string;
    productName: string;
    amount: string;
    orderId: string;
    pixQrCode: string;
    pixQrCodeUrl?: string;
    pixExpiresAt?: string;
}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP nao configurado para recuperacao de vendas');
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const transporter = createTransporter();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goupay.com.br';
    const resumeUrl = `${appUrl}/store/recovery/payment/${orderId}`;
    const safeBuyerName = escapeHtml(buyerName || 'cliente');
    const safeProductName = escapeHtml(productName);
    const safeAmount = escapeHtml(amount.replace('.', ','));
    const safeOrderId = escapeHtml(orderId);
    const safePixQrCode = escapeHtml(pixQrCode);
    const safePixQrCodeUrl = pixQrCodeUrl ? escapeHtml(pixQrCodeUrl) : '';
    const safeResumeUrl = escapeHtml(resumeUrl);
    const expiresLabel = pixExpiresAt
        ? new Date(pixExpiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'consulte a pagina de pagamento';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Finalize seu pagamento Pix</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1d2433;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:36px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(17,24,39,0.08);">
        <tr>
          <td style="padding:34px 36px;background:linear-gradient(135deg,#3221a8 0%,#6c5ce7 58%,#00b894 150%);text-align:center;">
            <div style="font-size:13px;font-weight:800;color:#d9d4ff;letter-spacing:1.5px;text-transform:uppercase;">GouPay</div>
            <h1 style="margin:14px 0 8px;color:#ffffff;font-size:27px;line-height:1.2;">Seu pedido ainda esta reservado</h1>
            <p style="margin:0;color:#e7e4ff;font-size:15px;line-height:1.6;">Finalize o Pix em poucos instantes para concluir sua compra.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Ola, <strong>${safeBuyerName}</strong>!</p>
            <p style="margin:0 0 24px;color:#596273;font-size:15px;line-height:1.7;">Identificamos que o pagamento do seu pedido ainda esta pendente. Seu QR Code Pix continua disponivel abaixo para voce concluir a compra com facilidade.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border:1px solid #edf0f5;border-radius:14px;margin-bottom:24px;">
              <tr><td style="padding:18px 20px;border-bottom:1px solid #edf0f5;">
                <div style="font-size:11px;color:#8992a3;text-transform:uppercase;letter-spacing:0.8px;">Produto</div>
                <div style="margin-top:5px;font-size:16px;font-weight:800;color:#1d2433;">${safeProductName}</div>
              </td></tr>
              <tr><td style="padding:18px 20px;border-bottom:1px solid #edf0f5;">
                <div style="font-size:11px;color:#8992a3;text-transform:uppercase;letter-spacing:0.8px;">Valor do pedido</div>
                <div style="margin-top:5px;font-size:24px;font-weight:900;color:#5a48d6;">R$ ${safeAmount}</div>
              </td></tr>
              <tr><td style="padding:18px 20px;">
                <div style="font-size:11px;color:#8992a3;text-transform:uppercase;letter-spacing:0.8px;">Pedido</div>
                <div style="margin-top:5px;font-family:monospace;font-size:12px;color:#697386;">${safeOrderId}</div>
              </td></tr>
            </table>
            ${safePixQrCodeUrl ? `
            <div style="text-align:center;margin:0 0 20px;">
              <div style="margin-bottom:10px;font-size:12px;font-weight:800;color:#697386;text-transform:uppercase;letter-spacing:0.8px;">Escaneie para pagar</div>
              <img src="${safePixQrCodeUrl}" width="220" height="220" alt="QR Code Pix" style="display:block;width:220px;height:220px;margin:0 auto;border:10px solid #ffffff;border-radius:14px;box-shadow:0 4px 18px rgba(17,24,39,0.12);"/>
            </div>` : ''}
            <div style="margin:0 0 22px;padding:16px;background:#f8f9fc;border:1px solid #edf0f5;border-radius:12px;">
              <div style="margin-bottom:8px;font-size:11px;font-weight:800;color:#697386;text-transform:uppercase;letter-spacing:0.8px;">Pix copia e cola</div>
              <div style="font-family:monospace;font-size:11px;line-height:1.5;color:#596273;word-break:break-all;">${safePixQrCode}</div>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr><td align="center">
                <a href="${safeResumeUrl}" style="display:inline-block;padding:16px 30px;background:linear-gradient(135deg,#5a48d6,#7767e8);color:#ffffff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:800;">Continuar meu pagamento</a>
              </td></tr>
            </table>
            <div style="padding:14px 16px;background:#fff9e8;border-left:4px solid #f2b632;border-radius:8px;color:#7a5b14;font-size:13px;line-height:1.6;">
              Este Pix expira em <strong>${escapeHtml(expiresLabel)}</strong>. Se voce ja realizou o pagamento, desconsidere esta mensagem.
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;background:#f8f9fc;border-top:1px solid #edf0f5;text-align:center;color:#9aa2b1;font-size:12px;">
            Email automatico enviado pela GouPay.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"GouPay" <${from}>`,
        to: buyerEmail,
        subject: `Seu Pix ainda esta pendente - ${productName}`,
        html,
        text: `Ola ${buyerName || 'cliente'},\n\nSeu pagamento Pix ainda esta pendente.\nProduto: ${productName}\nValor: R$ ${amount.replace('.', ',')}\nPedido: ${orderId}\n\nPix copia e cola:\n${pixQrCode}\n\nContinue seu pagamento: ${resumeUrl}\n\nValidade: ${expiresLabel}`,
    });

    console.log(`[EMAIL] Recuperacao de venda enviada para ${buyerEmail}`);
}

export async function sendPurchaseApprovedEmail({
    buyerName,
    buyerEmail,
    productName,
    amount,
    paymentMethod,
    orderId,
}: {
    buyerName: string;
    buyerEmail: string;
    productName: string;
    amount: string;
    paymentMethod: string;
    orderId: string;
}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[EMAIL] SMTP não configurado. SMTP_USER=${process.env.SMTP_USER ? 'ok' : 'MISSING'} SMTP_PASS=${process.env.SMTP_PASS ? 'ok' : 'MISSING'}`);
        return;
    }

    const methodLabel = paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'PIX';
    const memberAreaUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://goupay.com.br'}/area-membros`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const transporter = createTransporter();

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Compra Aprovada</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6c5ce7 0%,#a29bfe 100%);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">✅</div>
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">Pagamento Confirmado!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Seu acesso já está disponível</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;color:#1a1a2e;font-size:16px;line-height:1.6;">
              Olá, <strong>${buyerName || 'cliente'}</strong>! 👋
            </p>
            <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6;">
              Sua compra foi aprovada com sucesso. Confira os detalhes abaixo:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border-radius:12px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e9ecef;">
                  <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Produto</div>
                  <div style="font-size:16px;font-weight:700;color:#1a1a2e;">${productName}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e9ecef;">
                  <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Valor pago</div>
                  <div style="font-size:22px;font-weight:800;color:#6c5ce7;">R$ ${amount}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #e9ecef;">
                  <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Método</div>
                  <div style="font-size:15px;font-weight:600;color:#1a1a2e;">${methodLabel}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Pedido</div>
                  <div style="font-size:13px;font-weight:600;color:#888;font-family:monospace;">${orderId}</div>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${memberAreaUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">
                  Acessar Meu Conteúdo →
                </a>
              </td></tr>
            </table>
            <p style="margin:0;color:#888;font-size:13px;line-height:1.6;text-align:center;">
              Dúvidas? <a href="mailto:support@goupay.com.br" style="color:#6c5ce7;text-decoration:none;">support@goupay.com.br</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f8f9fa;border-top:1px solid #e9ecef;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">© 2026 GouPay · Email automático, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"GouPay" <${from}>`,
        to: buyerEmail,
        subject: `✅ Compra aprovada — ${productName}`,
        html,
        text: `Pagamento Confirmado!\n\nOlá ${buyerName},\n\nSua compra foi aprovada!\nProduto: ${productName}\nValor: R$ ${amount}\nMétodo: ${methodLabel}\nPedido: ${orderId}\n\nAcesse: ${memberAreaUrl}\n\nDúvidas? support@goupay.com.br`,
    });

    console.log(`[EMAIL] Enviado para ${buyerEmail}`);
}

export async function sendPasswordResetEmail({
    toEmail,
    userName,
    resetToken,
}: {
    toEmail: string;
    userName: string;
    resetToken: string;
}) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[EMAIL] SMTP não configurado para reset de senha`);
        return;
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://goupay.com.br'}/reset-password?token=${resetToken}`;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const transporter = createTransporter();

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Recuperação de Senha</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6c5ce7 0%,#a29bfe 100%);padding:40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🔐</div>
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">Recuperação de Senha</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Redefina sua senha com segurança</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#1a1a2e;font-size:16px;line-height:1.6;">
              Olá, <strong>${userName || 'usuário'}</strong>! 👋
            </p>
            <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6;">
              Recebemos uma solicitação para redefinir a senha da sua conta GouPay. Clique no botão abaixo para criar uma nova senha:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:16px;">
                  Redefinir Minha Senha →
                </a>
              </td></tr>
            </table>
            <div style="padding:16px 20px;background:#fff8e1;border-left:4px solid #ffc107;border-radius:8px;margin-bottom:20px;">
              <p style="margin:0;color:#856404;font-size:13px;line-height:1.6;">
                ⚠️ <strong>Este link expira em 1 hora.</strong> Se você não solicitou a redefinição, ignore este email — sua senha permanecerá inalterada.
              </p>
            </div>
            <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">
              Ou copie e cole este link no navegador:<br/>
              <span style="color:#6c5ce7;word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f8f9fa;border-top:1px solid #e9ecef;text-align:center;">
            <p style="margin:0;color:#aaa;font-size:12px;">© 2026 GouPay · Email automático, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: `"GouPay" <${from}>`,
        to: toEmail,
        subject: '🔐 Recuperação de Senha — GouPay',
        html,
        text: `Recuperação de Senha\n\nOlá ${userName},\n\nClique no link para redefinir sua senha:\n${resetUrl}\n\nEste link expira em 1 hora.\n\nSe não solicitou, ignore este email.`,
    });

    console.log(`[EMAIL] Email de recuperação enviado para ${toEmail}`);
}
