// ═══════════════════════════════════════════════════════════════
// Verificação do Cloudflare Turnstile (challenge anti-bot) no
// backend. Usado por /api/contato, /api/afiliacao e
// /api/inscricao-loja,  o token que chega em cada POST (campo
// `cf-turnstile-response`, injetado automaticamente pelo widget no
// form) precisa ser validado aqui ANTES de qualquer escrita no
// Firestore. Validar só no frontend não vale nada: um atacante que
// bate direto no endpoint nunca passa pelo widget, então a
// verificação real tem que acontecer no servidor.
//
// Requer a env var TURNSTILE_SECRET_KEY (Cloudflare Pages secret,
// nunca VITE_*,  ver skill security-architecture). O site key
// (público, vai no HTML) é diferente da secret key (só aqui).
// ═══════════════════════════════════════════════════════════════

export async function verifyTurnstile(env, token, ip) {
  if (!token) {
    return { ok: false, reason: 'missing-token' };
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    // secret não configurada no ambiente,  falha fechada (nunca
    // deixa passar sem verificação por engano de configuração)
    console.error('TURNSTILE_SECRET_KEY não configurada no ambiente.');
    return { ok: false, reason: 'server-misconfigured' };
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();

    if (!data.success) {
      return { ok: false, reason: (data['error-codes'] || []).join(',') || 'verification-failed' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Erro ao verificar Turnstile:', err);
    return { ok: false, reason: 'network-error' };
  }
}
