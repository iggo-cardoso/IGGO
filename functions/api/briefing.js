// ═══════════════════════════════════════════════════════════════
// POST /api/briefing
//
// Recebe as respostas do questionário de discovery (ex: MAYZE, mas
// endpoint genérico pra reaproveitar em outros clientes) e grava um
// documento na coleção `briefings` do mesmo Firestore do iggo-dash
// (CRM), com status "novo" pra revisar manualmente. Escreve via
// service account (Admin API, não passa pelas Firestore Security
// Rules,  ver functions/utils/firestore.js). Mesmo padrão de
// /api/contato e /api/afiliacao.
// ═══════════════════════════════════════════════════════════════
import { firestoreCreate } from '../utils/firestore.js';
import { verifyTurnstile } from '../utils/turnstile.js';

const MAX_ANSWERS = 60; // teto de segurança, o form atual tem 33 perguntas
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

  const projeto = String(body.projeto || '').trim();
  const respondentName = String(body.respondentName || '').trim();
  const companyName = String(body.companyName || '').trim();
  const answersRaw = Array.isArray(body.answers) ? body.answers : [];

  if (!projeto || projeto.length > 120) {
    return json({ error: 'Projeto inválido.' }, 400);
  }
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

  try {
    const res = await firestoreCreate(env, 'briefings', {
      projeto: { stringValue: projeto },
      respondentName: { stringValue: respondentName },
      companyName: { stringValue: companyName },
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
