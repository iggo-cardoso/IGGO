// ═══════════════════════════════════════════════════════════════
// POST /api/briefing
//
// Recebe as respostas de um questionário de discovery (genérico,
// reaproveitável pra qualquer cliente) e grava um documento na
// coleção `briefings` do mesmo Firestore do iggo-dash (CRM). O ID
// do documento é o nome da empresa (slugificado), não um ID
// aleatório,  reenvio da mesma empresa sobrescreve o documento
// anterior em vez de criar duplicata. Escreve via service account
// (Admin API, não passa pelas Firestore Security Rules,  ver
// functions/utils/firestore.js). Mesmo padrão de anti-bot de
// /api/contato e /api/afiliacao (honeypot + Turnstile).
// ═══════════════════════════════════════════════════════════════
import { firestoreSet } from '../utils/firestore.js';
import { verifyTurnstile } from '../utils/turnstile.js';

const MAX_ANSWERS = 60; // teto de segurança
const MAX_ANSWER_LEN = 4000;
const MAX_QUESTION_LEN = 400;

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
    console.error('Turnstile falhou em /api/briefing:', turnstile.reason);
    return json({ error: 'Verificação de segurança falhou, tenta de novo.' }, 403);
  }

  const respondentName = String(body.respondentName || '').trim();
  const companyName = String(body.companyName || '').trim();
  const answersRaw = Array.isArray(body.answers) ? body.answers : [];

  if (!respondentName || respondentName.length > 120) {
    return json({ error: 'Nome inválido.' }, 400);
  }
  if (!companyName || companyName.length > 160) {
    return json({ error: 'Nome da empresa inválido.' }, 400);
  }
  if (!answersRaw.length || answersRaw.length > MAX_ANSWERS) {
    return json({ error: 'Respostas inválidas.' }, 400);
  }

  const answers = [];
  for (const item of answersRaw) {
    const section = String((item && item.section) || '').trim().slice(0, MAX_QUESTION_LEN);
    const question = String((item && item.question) || '').trim().slice(0, MAX_QUESTION_LEN);
    const answer = String((item && item.answer) || '').trim().slice(0, MAX_ANSWER_LEN);
    if (!question) {
      return json({ error: 'Pergunta inválida entre as respostas.' }, 400);
    }
    answers.push({ section, question, answer });
  }

  const docId = slugify(companyName);
  if (!docId) {
    return json({ error: 'Nome da empresa inválido.' }, 400);
  }

  try {
    const res = await firestoreSet(env, 'briefings', docId, {
      empresa: { stringValue: companyName },
      respondentName: { stringValue: respondentName },
      answers: {
        arrayValue: {
          values: answers.map((a) => ({
            mapValue: {
              fields: {
                section: { stringValue: a.section },
                question: { stringValue: a.question },
                answer: { stringValue: a.answer },
              },
            },
          })),
        },
      },
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
    console.error('Erro em /api/briefing:', err);
    return json({ error: 'Erro interno.' }, 500);
  }
}

// "Empresa Exemplo & Cia." -> "empresa-exemplo-cia"
function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
