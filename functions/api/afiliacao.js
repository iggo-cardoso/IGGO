// ═══════════════════════════════════════════════════════════════
// POST /api/afiliacao
//
// Recebe o form de /pages/afiliar-se.html e grava um documento na
// coleção `afiliacoes` do mesmo Firestore do iggo-dash (CRM), com
// status "pendente" pra você revisar manualmente,  não é aprovação
// automática. Escreve via service account (Admin API, não passa
// pelas Firestore Security Rules,  ver functions/utils/firestore.js).
// ═══════════════════════════════════════════════════════════════
import { firestoreCreate } from '../utils/firestore.js';
import { verifyTurnstile } from '../utils/turnstile.js';

const NICHOS = new Set(['grafica', 'video', 'foto', 'design', 'marketing', 'outro']);
const TEMPOS = new Set(['', 'menos-1', '1-3', '3-5', 'mais-5']);
const TEM_SITE = new Set(['sim', 'redes', 'nao']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido.' }, 400);
  }

  const honeypot = String(body.empresa_confirmacao || '').trim();
  if (honeypot) {
    // bot preencheu o campo escondido, finge sucesso sem gravar nada
    return json({ ok: true });
  }

  const turnstileToken = String(body['cf-turnstile-response'] || '').trim();
  const turnstile = await verifyTurnstile(env, turnstileToken, request.headers.get('cf-connecting-ip'));
  if (!turnstile.ok) {
    console.error('Turnstile falhou em /api/afiliacao:', turnstile.reason);
    return json({ error: 'Verificação de segurança falhou, tenta de novo.' }, 403);
  }

  const empresa = String(body.empresa || '').trim();
  const nicho = String(body.nicho || '').trim();
  const cidade = String(body.cidade || '').trim();
  const temSite = String(body.temSite || '').trim();
  const responsavel = String(body.responsavel || '').trim();
  const whatsapp = String(body.whatsapp || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const instagram = String(body.instagram || '').trim();
  const descricao = String(body.descricao || '').trim();
  const tempoMercado = String(body.tempoMercado || '').trim();
  const portfolio = String(body.portfolio || '').trim();

  if (!empresa || empresa.length > 120) {
    return json({ error: 'Nome da empresa inválido.' }, 400);
  }
  if (!NICHOS.has(nicho)) {
    return json({ error: 'Nicho inválido.' }, 400);
  }
  if (!cidade || cidade.length > 120) {
    return json({ error: 'Cidade inválida.' }, 400);
  }
  if (temSite && !TEM_SITE.has(temSite)) {
    return json({ error: 'Valor inválido pra "tem site".' }, 400);
  }
  if (!responsavel || responsavel.length > 120) {
    return json({ error: 'Nome do responsável inválido.' }, 400);
  }
  if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
    return json({ error: 'WhatsApp inválido.' }, 400);
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'E-mail inválido.' }, 400);
  }
  if (!descricao || descricao.length > 800) {
    return json({ error: 'Descrição inválida.' }, 400);
  }
  if (!TEMPOS.has(tempoMercado)) {
    return json({ error: 'Tempo de mercado inválido.' }, 400);
  }
  if (instagram.length > 200 || portfolio.length > 300) {
    return json({ error: 'Campo excede o tamanho permitido.' }, 400);
  }

  try {
    const res = await firestoreCreate(env, 'afiliacoes', {
      empresa: { stringValue: empresa },
      nicho: { stringValue: nicho },
      cidade: { stringValue: cidade },
      temSite: { stringValue: temSite || 'nao' },
      responsavel: { stringValue: responsavel },
      whatsapp: { stringValue: whatsapp },
      email: { stringValue: email },
      instagram: { stringValue: instagram },
      descricao: { stringValue: descricao },
      tempoMercado: { stringValue: tempoMercado },
      portfolio: { stringValue: portfolio },
      status: { stringValue: 'pendente' },
      criadoEm: { timestampValue: new Date().toISOString() },
      ip: { stringValue: request.headers.get('cf-connecting-ip') || '' },
    });

    if (!res.ok) {
      console.error('Firestore write failed:', res.status, await res.text());
      return json({ error: 'Não deu pra enviar a inscrição agora.' }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/afiliacao:', err);
    return json({ error: 'Erro interno.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
