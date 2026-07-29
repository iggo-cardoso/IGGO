// ═══════════════════════════════════════════════════════════════
// POST /api/inscricao-loja
//
// Recebe { email, tipo, empresa } do form da loja e grava um
// documento na coleção `inscricoesLoja` do MESMO Firestore do
// iggo-dash (CRM). Autentica como uma service account dedicada
// (não o app inteiro do CRM) e fala direto com a API REST do
// Firestore,  Admin API, então isso NÃO passa pelas Firestore
// Security Rules (essas continuam 100% fechadas pro público,
// só o Igor/isAuthorized() lê/edita/apaga via console ou CRM).
//
// Cloudflare Workers roda em V8 isolado sem Node/gRPC, então não
// dá pra usar o pacote `firebase-admin`. Em vez disso: assina um
// JWT com a chave privada da service account (RS256 via Web
// Crypto, nativo do runtime), troca por um access_token OAuth2 do
// Google, e usa esse token nas chamadas REST do Firestore. O token
// expira em 1h e não é persistido em lugar nenhum,  gerado do zero
// a cada request.
//
// Variáveis de ambiente esperadas (Cloudflare Dashboard → Pages →
// Settings → Environment variables, NUNCA prefixo VITE_*):
//   FIREBASE_PROJECT_ID    ex: iggo-dash-abc12
//   FIREBASE_CLIENT_EMAIL  ex: inscricoes-loja@iggo-dash-abc12.iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY   a chave privada inteira do JSON da service
//                           account, com \n literais (cole exatamente
//                           como vem no campo "private_key" do JSON)
// ═══════════════════════════════════════════════════════════════

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
  // de que existe verificação (não retorna erro nem 4xx aqui).
  if (honeypot) {
    return json({ ok: true });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: 'E-mail inválido.' }, 400);
  }
  if (!ALLOWED_TIPOS.has(tipo)) {
    return json({ error: 'Categoria inválida.' }, 400);
  }

  try {
    const accessToken = await getGoogleAccessToken(env);
    const projectId = env.FIREBASE_PROJECT_ID;

    const firestoreRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/inscricoesLoja`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            email: { stringValue: email },
            tipo: { stringValue: tipo },
            origem: { stringValue: 'loja' },
            criadoEm: { timestampValue: new Date().toISOString() },
            ip: { stringValue: request.headers.get('cf-connecting-ip') || '' },
          },
        }),
      }
    );

    if (!firestoreRes.ok) {
      const errText = await firestoreRes.text();
      console.error('Firestore write failed:', firestoreRes.status, errText);
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

// ── Auth via service account: JWT assertion → OAuth2 access token ──
async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64urlFromString = (str) =>
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base64urlFromBuffer = (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsigned = `${base64urlFromString(JSON.stringify(header))}.${base64urlFromString(JSON.stringify(claims))}`;

  const privateKey = await importPrivateKey(env.FIREBASE_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${base64urlFromBuffer(signature)}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Falha ao obter access token do Google: ${await tokenRes.text()}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

async function importPrivateKey(pem) {
  const normalized = String(pem).replace(/\\n/g, '\n');
  const contents = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = Uint8Array.from(atob(contents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binary.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}
