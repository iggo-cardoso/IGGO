// ═══════════════════════════════════════════════════════════════
// POST /api/inscricao-loja
//
// Recebe { email, tipo, empresa } do form da loja e grava um
// documento na coleção `inscricoesLoja` do mesmo Firestore do
// iggo-dash (CRM), via service account (Admin API, não passa pelas
// Firestore Security Rules,  ver functions/utils/firestore.js).
// ═══════════════════════════════════════════════════════════════
import { firestoreCreate } from '../utils/firestore.js';
import { verifyTurnstile } from '../utils/turnstile.js';

const ALLOWED_TIPOS = new Set(['geral', 'livros', 'templates', 'presets', 'cursos']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const tipo = String(body.tipo || 'geral').trim();
  const honeypot = String(body.empresa || '').trim();

  // campo honeypot preenchido = bot. Finge sucesso pra não dar pista
  if (honeypot) {
    return json({ ok: true });
  }

  const turnstileToken = String(body['cf-turnstile-response'] || '').trim();
  const turnstile = await verifyTurnstile(env, turnstileToken, request.headers.get('cf-connecting-ip'));
  if (!turnstile.ok) {
    console.error('Turnstile falhou em /api/inscricao-loja:', turnstile.reason);
    return json({ error: 'Verificação de segurança falhou, tenta de novo.' }, 403);
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'E-mail inválido.' }, 400);
  }
  if (!ALLOWED_TIPOS.has(tipo)) {
    return json({ error: 'Categoria inválida.' }, 400);
  }

  try {
    const res = await firestoreCreate(env, 'inscricoesLoja', {
      email: { stringValue: email },
      tipo: { stringValue: tipo },
      origem: { stringValue: 'loja' },
      criadoEm: { timestampValue: new Date().toISOString() },
      ip: { stringValue: request.headers.get('cf-connecting-ip') || '' },
    });

    if (!res.ok) {
      console.error('Firestore write failed:', res.status, await res.text());
      return json({ error: 'Não deu pra salvar a inscrição agora.' }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/inscricao-loja:', err);
    return json({ error: 'Erro interno.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
