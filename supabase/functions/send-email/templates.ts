// Templates HTML para emails transacionais (Tendenci).
// Cada template exporta { subject, html(vars) }.
// Variáveis no formato {{nome}} são substituídas em runtime na edge `send-email`.
//
// IMPORTANTE: estes arquivos são apenas a fonte de autoria/documentação.
// A edge function `supabase/functions/send-email/templates.ts` espelha esses
// mesmos templates para uso em runtime (edges não acessam src/).

export type EmailTemplate = {
  subject: string;
  html: string;
};

const BRAND = {
  name: "Tendenci",
  color: "#0a0a1a",
  accent: "#4f46e5",
  url: "https://www.tendencitech.com.br",
};

const wrap = (inner: string) => `
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ececf1;">
        <tr><td style="padding:24px 32px;background:${BRAND.color};color:#ffffff;font-weight:600;font-size:18px;">${BRAND.name}</td></tr>
        <tr><td style="padding:32px;line-height:1.55;font-size:15px;">${inner}</td></tr>
        <tr><td style="padding:18px 32px;background:#fafafa;color:#6b7280;font-size:12px;border-top:1px solid #ececf1;">
          ${BRAND.name} Tech LTDA · <a href="${BRAND.url}" style="color:${BRAND.accent};text-decoration:none;">${BRAND.url}</a><br/>
          Você está recebendo este email porque possui uma conta no ${BRAND.name}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

export const TEMPLATES: Record<string, EmailTemplate> = {
  welcome_signup: {
    subject: "Bem-vindo ao Tendenci 🚀",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Olá, {{nome}}!</h1>
      <p>Sua conta na <strong>{{empresa}}</strong> foi criada com sucesso. Você tem <strong>14 dias grátis</strong> para explorar tudo.</p>
      <p style="margin:24px 0;"><a href="${BRAND.url}/autenticacao" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Acessar o sistema</a></p>
      <p style="color:#6b7280;font-size:13px;">Precisa de ajuda? Responda este email.</p>
    `),
  },
  password_reset: {
    subject: "Redefinir sua senha",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Redefinir senha</h1>
      <p>Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique abaixo:</p>
      <p style="margin:24px 0;"><a href="{{link}}" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Redefinir senha</a></p>
      <p style="color:#6b7280;font-size:13px;">Se não foi você, ignore esta mensagem.</p>
    `),
  },
  trial_ending_7d: {
    subject: "Faltam 7 dias do seu teste grátis",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Faltam 7 dias</h1>
      <p>Olá {{nome}}, seu período de teste termina em <strong>{{data_fim}}</strong>. Garanta acesso contínuo escolhendo um plano.</p>
      <p style="margin:24px 0;"><a href="${BRAND.url}/configuracoes/plano" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Escolher plano</a></p>
    `),
  },
  trial_ending_3d: {
    subject: "Faltam 3 dias do seu teste",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Faltam 3 dias</h1>
      <p>Olá {{nome}}, seu teste termina em <strong>{{data_fim}}</strong>. Não perca o acesso aos seus dados.</p>
      <p style="margin:24px 0;"><a href="${BRAND.url}/configuracoes/plano" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Escolher plano</a></p>
    `),
  },
  trial_ending_1d: {
    subject: "Seu teste termina amanhã",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Última chamada</h1>
      <p>Olá {{nome}}, seu teste termina <strong>amanhã ({{data_fim}})</strong>. Escolha um plano agora para manter tudo rodando.</p>
      <p style="margin:24px 0;"><a href="${BRAND.url}/configuracoes/plano" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Escolher plano</a></p>
    `),
  },
  subscription_paid: {
    subject: "Pagamento confirmado ✓",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Pagamento recebido</h1>
      <p>Recebemos seu pagamento de <strong>R$ {{valor}}</strong> referente ao plano <strong>{{plano}}</strong>.</p>
      <p>Seu acesso está renovado até <strong>{{proximo_vencimento}}</strong>.</p>
    `),
  },
  subscription_overdue: {
    subject: "Fatura em atraso",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Fatura em atraso</h1>
      <p>Olá {{nome}}, identificamos uma fatura em aberto no valor de <strong>R$ {{valor}}</strong> vencida em <strong>{{data_vencimento}}</strong>.</p>
      <p style="margin:24px 0;"><a href="{{link_fatura}}" style="background:${BRAND.accent};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Pagar agora</a></p>
      <p style="color:#6b7280;font-size:13px;">Após 5 dias de atraso o acesso pode ser suspenso.</p>
    `),
  },
  subscription_canceled: {
    subject: "Assinatura cancelada",
    html: wrap(`
      <h1 style="margin:0 0 16px;font-size:22px;">Cancelamento confirmado</h1>
      <p>Sua assinatura foi cancelada. Seu acesso permanece ativo até <strong>{{data_fim}}</strong>.</p>
      <p>Sentiremos sua falta — você pode reativar a qualquer momento.</p>
    `),
  },
};
