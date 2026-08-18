// ═══════════════════════════════════════════════════════════════
// POST /api/contato
//
// Recebe o form de /pages/contato.html (CTA "Falar com a equipe"
// espalhado pelo site) e grava um documento na coleção `contatos`
// do mesmo Firestore do iggo-dash (CRM), com status "novo" pra
// revisar manualmente. O redirecionamento pro WhatsApp acontece no
// front (contato.js) independente do resultado desse POST, esse
// endpoint é só o registro do lead. Escreve via service account
// (Admin API, não passa pelas Firestore Security Rules,  ver
// functions/utils/firestore.js).
// ═══════════════════════════════════════════════════════════════
import { firestoreCreate } from '../utils/firestore.js';

const TIPOS = new Set(['landing', 'institucional', 'sistema', 'manutencao', 'outro']);
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

  const nome = String(body.nome || '').trim();
  const whatsapp = String(body.whatsapp || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const tipoProjeto = String(body.tipoProjeto || '').trim();
  const mensagem = String(body.mensagem || '').trim();

  if (!nome || nome.length > 120) {
    return json({ error: 'Nome inválido.' }, 400);
  }
  if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
    return json({ error: 'WhatsApp inválido.' }, 400);
  }
  if (email && (!EMAIL_RE.test(email) || email.length > 254)) {
    return json({ error: 'E-mail inválido.' }, 400);
  }
  if (!TIPOS.has(tipoProjeto)) {
    return json({ error: 'Tipo de projeto inválido.' }, 400);
  }
  if (!mensagem || mensagem.length > 800) {
    return json({ error: 'Mensagem inválida.' }, 400);
  }

  try {
    const res = await firestoreCreate(env, 'contatos', {
      nome: { stringValue: nome },
      whatsapp: { stringValue: whatsapp },
      email: { stringValue: email },
      tipoProjeto: { stringValue: tipoProjeto },
      mensagem: { stringValue: mensagem },
      status: { stringValue: 'novo' },
      criadoEm: { timestampValue: new Date().toISOString() },
      ip: { stringValue: request.headers.get('cf-connecting-ip') || '' },
    });

    if (!res.ok) {
      console.error('Firestore write failed:', res.status, await res.text());
      return json({ error: 'Não deu pra enviar agora.' }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/contato:', err);
    return json({ error: 'Erro interno.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
