// ═══════════════════════════════════════════════════════════════
// Helper compartilhado das Pages Functions que escrevem no Firestore
// via service account (Admin API, não passa pelas Security Rules).
// Usado por /api/inscricao-loja e /api/afiliacao.
//
// Cloudflare Workers roda em V8 isolado sem Node/gRPC, então não dá
// pra usar `firebase-admin`. Em vez disso: assina um JWT com a chave
// privada da service account (RS256 via Web Crypto, nativo do
// runtime), troca por um access_token OAuth2 do Google, e usa esse
// token nas chamadas REST do Firestore. O token expira em 1h e não é
// persistido em lugar nenhum,  gerado do zero a cada request.
//
// Env vars esperadas (Cloudflare Dashboard/wrangler secret):
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// ═══════════════════════════════════════════════════════════════

export async function firestoreCreate(env, collection, fields) {
  const accessToken = await getGoogleAccessToken(env);
  const projectId = env.FIREBASE_PROJECT_ID;

  return fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
}

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
