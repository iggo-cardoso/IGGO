# Página de Discovery (genérica) — o que foi adicionado

## Arquivos deste pacote (mesclar na raiz do projeto)

- `src/html/briefing.html` — form de discovery estilo Typeform, **genérico**
  (nome de empresa e respondente são campos preenchidos por quem responde;
  as perguntas usam `{name}`/`{company}` como placeholders substituídos em
  tempo real pelo JS — dá pra reusar pra qualquer cliente, não só um). Ligado
  de verdade no Firestore agora, com honeypot + Turnstile (antes só dava
  `console.log`). Tratada como página **standalone** (mesmo padrão de
  `src/html/book-iggostudios.html` e `livro-visualizador-3d.html`), não como
  fragmento do SPA (`page-router`/`#page-root`) — ela já vem com seu próprio
  scroll/overflow controlado, então plugar no scroll-lerp/scrollbar
  customizados do site ia só gerar conflito sem nenhum ganho.
- `functions/api/briefing.js` — nova Pages Function, endpoint `POST /api/briefing`.
  Segue **exatamente** o padrão de `contato.js`/`afiliacao.js`: honeypot →
  Turnstile server-side → validação → grava no Firestore via
  `functions/utils/firestore.js` (service account, ignora as Security Rules).
  O campo `projeto` vem do nome de empresa preenchido no form — não tem nada
  fixo aqui, o mesmo endpoint serve qualquer briefing.
- `firestore.rules` — adicionada a coleção `briefings` com o mesmo padrão de
  `contatos`/`afiliacoes`/`inscricoesLoja` (`create: if false`, só o
  service account grava; leitura/edição só pra você via `isAuthorized()`).
- `vite.config.js` — nova entrada `briefing` no `rollupOptions.input`,
  senão o Vite não inclui a página no build (mesma pegadinha do CSS de
  fragmento, mas pra páginas HTML inteiras).

## Nenhum secret novo pra configurar

O endpoint reaproveita `functions/utils/firestore.js` e
`functions/utils/turnstile.js` que você já tem — ou seja, usa os mesmos
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` e
`TURNSTILE_SECRET_KEY` que `/api/contato` e `/api/afiliacao` já usam. Nada
pra rodar no `wrangler secret put` além do que já existe.

O site key do Turnstile no HTML é o mesmo público que já está nas outras
páginas (`0x4AAAAAAEUtg40M8l6WWqxK`) — site key não é segredo, é
por-domínio.

## Como fica o documento no Firestore (coleção `briefings`)

```
{
  projeto: "<nome da empresa que a pessoa digitou>",
  respondentName: "...",
  companyName: "...",
  answers: [ { section, question, answer }, ... ],
  status: "novo",
  criadoEm: <timestamp>,
  ip: "..."
}
```

`status: "novo"` pra você poder filtrar/mudar depois no CRM, igual já faz
com `contatos` e `afiliacoes`.

## Como acessar

Depois do deploy, a URL fica em:

```
https://iggostudios.com.br/src/html/briefing.html
```

(mesmo padrão de `book-iggostudios.html`). Se quiser um link mais limpo
tipo `iggostudios.com.br/briefing`, dá pra fazer um redirect no Cloudflare
Pages com um `_redirects` na raiz — me avisa se quiser que eu já adicione.

Não mexi em nada do `functions/api/afiliacao.js`, `contato.js`,
`inscricao-loja.js` nem nos `utils/*` — só criei o `briefing.js` novo do
lado deles.
