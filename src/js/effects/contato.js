import '../../css/html/contato.css';
import { renderTurnstile } from '../utils/turnstile.js';

// ═══════════════════════════════════════════════════════════════
// CONTATO,  wizard de 1 pergunta por tela da página
// /pages/contato.html
//
// Mesmo padrão de effects/afiliar-se.js: fica de prontidão e só
// "liga" quando os elementos .cont-wiz aparecem no DOM (o fragmento
// é injetado via innerHTML pelo page-router, <script> ali dentro
// nunca executaria). Reinicializa em cada 'pagechange' e limpa os
// listeners da instância anterior antes de montar de novo.
//
// Visual: painel cheio de cor (.cont-wiz-panel--band) e painel de
// conteúdo (.cont-wiz-panel--info) trocam de lado a cada passo
// (classes band-right/band-left no container .cont-wiz), o passo
// ativo entra com fade/translate via .is-in — mesmo comportamento
// do afiliar-se, só que os campos são os de contato.
//
// Etapas (6): intro (pitch, mesmo layout de faixa lateral dos demais passos),
// nome, whatsapp, email, tipoProjeto, mensagem, revisão+aceite+envio.
// Envio vai pra /api/contato (Cloudflare Pages Function, grava no
// Firestore igual afiliação/loja),  e só depois do POST confirmado
// o usuário é levado pro WhatsApp com a mensagem já preenchida.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const WHATSAPP_PHONE = '5571999226785';

  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  const STEP_LABELS = { nome: 'Nome', whatsapp: 'WhatsApp', email: 'E-mail',
    tipoProjeto: 'O que precisa', mensagem: 'Mensagem' };

  const TIPO_LABELS = { landing: 'Landing Page', institucional: 'Site institucional',
    sistema: 'Sistema sob medida', manutencao: 'Manutenção / suporte', outro: 'Outro' };

  const TIPO_WHATSAPP_LABELS = { landing: 'uma Landing Page', institucional: 'um Site institucional',
    sistema: 'um Sistema sob medida', manutencao: 'Manutenção / suporte', outro: 'um projeto' };

  // categoria da imagem de fundo da faixa por passo (índice 0 é a intro,
  // faixa ainda está fora da tela então não tem imagem pra mostrar)
  const STEP_BAND_CATEGORY = [null, 'contato', 'contato', 'contato', 'projeto', 'projeto', 'revisao'];

  // pool de fotos por categoria (Pexels, uso livre). A cada passo (pra
  // frente ou pra trás) sorteia uma foto do pool da categoria daquele
  // passo e faz crossfade pra ela — nunca repete a MESMA foto que já
  // está no ar (ver pickImage), mesmo trocando de categoria. Cada foto
  // aparece em UM só lugar do wizard (sem IDs repetidos entre pools).
  // Tema focado em desenvolvimento web/automação (o que a IGGO entrega
  // de verdade em projeto sob medida), com só uma ou duas de
  // fotógrafo/videomaker, que também fazem parte do estúdio.
  const IMAGE_POOLS = {
    contato: [
      'https://images.pexels.com/photos/3862142/pexels-photo-3862142.jpeg?auto=compress&cs=tinysrgb&w=1200', // pessoa programando no laptop
      'https://images.pexels.com/photos/1181359/pexels-photo-1181359.jpeg?auto=compress&cs=tinysrgb&w=1200', // desenvolvedora programando no notebook
      'https://images.pexels.com/photos/7988086/pexels-photo-7988086.jpeg?auto=compress&cs=tinysrgb&w=1200', // pessoa programando com laptop e monitor externo
      'https://images.pexels.com/photos/38058998/pexels-photo-38058998.jpeg?auto=compress&cs=tinysrgb&w=1200', // cinegrafista ajustando câmera em estúdio
    ],
    projeto: [
      'https://images.pexels.com/photos/16129728/pexels-photo-16129728.jpeg?auto=compress&cs=tinysrgb&w=1200', // desenvolvedor programando com múltiplos monitores
      'https://images.pexels.com/photos/3888151/pexels-photo-3888151.jpeg?auto=compress&cs=tinysrgb&w=1200', // laptop com código na tela
      'https://images.pexels.com/photos/12899156/pexels-photo-12899156.jpeg?auto=compress&cs=tinysrgb&w=1200', // programador focado no laptop em escritório
      'https://images.pexels.com/photos/36697244/pexels-photo-36697244.jpeg?auto=compress&cs=tinysrgb&w=1200', // fotógrafo fazendo retrato em estúdio
    ],
    revisao: [
      'https://images.pexels.com/photos/6804595/pexels-photo-6804595.jpeg?auto=compress&cs=tinysrgb&w=1200', // programador com dois monitores revisando código
      'https://images.pexels.com/photos/7651804/pexels-photo-7651804.jpeg?auto=compress&cs=tinysrgb&w=1200', // equipe em reunião no escritório
    ],
  };

  const CROSSFADE_MS = 620;
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12">' +
    '</polyline></svg>';

  function buildWhatsAppUrl({ nome, tipoProjeto, mensagem }) {
    const tipo = TIPO_WHATSAPP_LABELS[tipoProjeto] || 'um projeto';
    const text = `Olá! Meu nome é ${nome}. Quero falar sobre ${tipo}.\n\n${mensagem}`;
    const params = new URLSearchParams({
      phone: WHATSAPP_PHONE,
      text,
      type: 'phone_number',
      app_absent: '0',
    });
    return `https://api.whatsapp.com/send/?${params.toString()}`;
  }

  function init() {
    runCleanup();

    const wiz = document.querySelector('.cont-wiz');
    if (!wiz) return; // não estamos na página contato

    const band = wiz.querySelector('.cont-wiz-panel--band');
    const info = wiz.querySelector('.cont-wiz-panel--info');
    const progressFill = wiz.querySelector('.cont-wiz-progress-fill');
    const form = wiz.querySelector('.cont-form');
    const loadingEl = wiz.querySelector('.cont-wiz-loading');
    const successEl = wiz.querySelector('.cont-wiz-success-screen');
    const successLink = wiz.querySelector('.cont-wiz-success-link');
    const msgEl = form.querySelector('.cont-wiz-msg');
    const nextBtn = form.querySelector('.cont-wiz-btn--next');
    const backBtn = form.querySelector('.cont-wiz-btn--back');
    const reviewList = form.querySelector('.cont-wiz-review');
    const turnstileEl = form.querySelector('.cf-turnstile');

    // esquenta o cache do navegador com o pool inteiro,  troca de
    // imagem a cada passo fica instantânea, sem flash de carregamento
    Object.values(IMAGE_POOLS).flat().forEach((url) => { new Image().src = url; });

    const steps = Array.from(form.querySelectorAll('.cont-step'));
    const lastIndex = steps.length - 1;

    let current = 0;
    let bandRight = true; // espelha a classe band-right/band-left do container
    let bandLayer = 0; // qual <img> da faixa (a/b) está visível agora
    let busy = false;

    function setMsg(text, kind) {
      if (!msgEl) return;
      msgEl.textContent = text || '';
      msgEl.classList.toggle('is-success', kind === 'success');
      msgEl.classList.toggle('is-error', kind === 'error');
    }

    function flipBandSide() {
      bandRight = !bandRight;
      wiz.classList.toggle('band-right', bandRight);
      wiz.classList.toggle('band-left', !bandRight);
    }

    // sorteia uma foto do pool que não seja a que já está no ar (evita
    // o "pisca a mesma imagem de novo" mesmo trocando de categoria,
    // já que nenhum ID aparece em mais de um pool)
    function pickImage(pool, currentSrc) {
      const options = pool.filter((url) => url !== currentSrc);
      const from = options.length ? options : pool;
      return from[Math.floor(Math.random() * from.length)];
    }

    function swapBandImage(category) {
      if (!category) return; // intro, faixa ainda fora da tela
      const pool = IMAGE_POOLS[category];
      if (!pool || !pool.length) return;
      const layers = band.querySelectorAll('.cont-wiz-band-img');
      const incoming = layers[bandLayer === 0 ? 1 : 0];
      const outgoing = layers[bandLayer];
      if (!incoming || !outgoing) return;
      incoming.src = pickImage(pool, outgoing.src);
      outgoing.classList.remove('is-active');
      incoming.classList.add('is-active');
      bandLayer = bandLayer === 0 ? 1 : 0;
    }

    // troca o lado do painel colorido + faz o conteúdo do painel de
    // informação sumir, roda `mutate` no meio da transição (com tudo
    // ainda invisível) e volta a aparecer. `mutate` deve deixar o DOM
    // no estado final (ex: trocar qual fieldset está .is-active).
    function crossfade(mutate, { flip = true } = {}) {
      return new Promise((resolve) => {
        info.classList.remove('is-in');
        if (flip) flipBandSide();
        setTimeout(() => { mutate(); }, CROSSFADE_MS * 0.42);
        setTimeout(() => {
          info.classList.add('is-in');
          resolve();
        }, CROSSFADE_MS * 0.55);
      });
    }

    function updateNav(index) {
      backBtn.hidden = index === 0;
      if (index === 0) {
        nextBtn.textContent = 'Começar';
      } else if (index === lastIndex) {
        nextBtn.textContent = 'Continuar no WhatsApp';
      } else {
        nextBtn.textContent = 'Continuar';
      }
    }

    function updateProgress(index) {
      // passo 0 é a intro (não é uma pergunta respondida ainda), então
      // a barra só começa a andar a partir do primeiro campo real
      if (!progressFill) return;
      const pct = (index / lastIndex) * 100;
      progressFill.style.width = `${pct}%`;
    }

    function activateStep(index) {
      steps.forEach((el, i) => el.classList.toggle('is-active', i === index));
      updateNav(index);
      updateProgress(index);
      swapBandImage(STEP_BAND_CATEGORY[index]);
      if (index === lastIndex) {
        buildReview();
        renderTurnstile(turnstileEl);
      }
      current = index;
    }

    function goToStep(index) {
      setMsg('', null);
      return crossfade(() => activateStep(index));
    }

    function fieldsOfStep(index) {
      return Array.from(steps[index].querySelectorAll('input, select, textarea'))
        .filter((f) => !f.classList.contains('cont-hp'));
    }

    function validateStep(index) {
      for (const field of fieldsOfStep(index)) {
        if (field.required && !field.value.trim()) return { ok: false, field };
        if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          return { ok: false, field };
        }
        if (field.type === 'checkbox' && field.required && !field.checked) {
          return { ok: false, field };
        }
      }
      return { ok: true };
    }

    function buildReview() {
      const data = new FormData(form);
      const rows = [
        ['nome', data.get('nome')],
        ['whatsapp', data.get('whatsapp')],
        ['email', data.get('email') || '—'],
        ['tipoProjeto', TIPO_LABELS[data.get('tipoProjeto')] || data.get('tipoProjeto')],
        ['mensagem', data.get('mensagem')],
      ];

      reviewList.innerHTML = rows.map(([key, value]) => `
        <div>
          <dt>${STEP_LABELS[key]}</dt>
          <dd>${escapeHtml(String(value || '—'))}</dd>
        </div>
      `).join('');
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function onNext() {
      if (busy) return;
      const result = validateStep(current);
      if (!result.ok) {
        setMsg('Preenche o campo antes de continuar.', 'error');
        if (result.field && result.field.focus) result.field.focus();
        return;
      }
      if (current === lastIndex) {
        onSubmit();
        return;
      }
      busy = true;
      goToStep(current + 1).then(() => { busy = false; });
    }

    function onBack() {
      if (busy || current === 0) return;
      busy = true;
      goToStep(current - 1).then(() => { busy = false; });
    }

    function showLoading() {
      return crossfade(() => {
        form.hidden = true;
        loadingEl.hidden = false;
        successEl.hidden = true;
      });
    }

    function showForm() {
      return crossfade(() => {
        form.hidden = false;
        loadingEl.hidden = true;
        successEl.hidden = true;
      });
    }

    function showSuccess(whatsappUrl) {
      band.innerHTML = `<div class="cont-wiz-check">${CHECK_SVG}</div>`;
      band.classList.add('has-check');
      if (successLink) {
        successLink.href = whatsappUrl;
        successLink.hidden = false;
      }
      return crossfade(() => {
        form.hidden = true;
        loadingEl.hidden = true;
        successEl.hidden = false;
      });
    }

    async function onSubmit() {
      const result = validateStep(lastIndex);
      if (!result.ok) {
        setMsg('Marca a concordância antes de enviar.', 'error');
        return;
      }

      const data = new FormData(form);
      const nome = String(data.get('nome') || '').trim();
      const whatsapp = String(data.get('whatsapp') || '').trim();
      const email = String(data.get('email') || '').trim();
      const tipoProjeto = String(data.get('tipoProjeto') || '').trim();
      const mensagem = String(data.get('mensagem') || '').trim();
      const turnstileToken = String(data.get('cf-turnstile-response') || '').trim();

      if (!turnstileToken) {
        setMsg('Aguarda a verificação de segurança terminar e tenta de novo.', 'error');
        return;
      }

      busy = true;
      nextBtn.disabled = true;
      await showLoading();

      try {
        const res = await fetch('/api/contato', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome, whatsapp, email, tipoProjeto, mensagem,
            'cf-turnstile-response': turnstileToken,
            empresa_confirmacao: data.get('empresa_confirmacao'), // honeypot
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error('[contato] /api/contato retornou erro:', res.status, json);
          await showForm();
          setMsg(json.error || 'Não deu pra enviar agora, tenta de novo.', 'error');
          if (window.turnstile) window.turnstile.reset();
          nextBtn.disabled = false;
          busy = false;
          return;
        }

        const whatsappUrl = buildWhatsAppUrl({ nome, tipoProjeto, mensagem });
        await showSuccess(whatsappUrl);
        window.open(whatsappUrl, '_blank', 'noopener');
        form.reset();
        if (window.turnstile) window.turnstile.reset();
      } catch (err) {
        // erro de rede/CORS/etc. NÃO mascara como sucesso: fica claro pro
        // usuário e pra gente debugar (olha o Network tab do devtools)
        console.error('[contato] falha ao chamar /api/contato:', err);
        await showForm();
        setMsg('Falha de conexão, tenta de novo em instantes.', 'error');
        if (window.turnstile) window.turnstile.reset();
        nextBtn.disabled = false;
        busy = false;
      }
    }

    nextBtn.addEventListener('click', onNext);
    backBtn.addEventListener('click', onBack);

    cleanupFns.push(() => {
      nextBtn.removeEventListener('click', onNext);
      backBtn.removeEventListener('click', onBack);
    });

    // estado inicial: passo 0 já é .is-active no HTML, painel de
    // info já começa .is-in — só garante nav/progresso corretos.
    updateNav(0);
    updateProgress(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pagechange', init);
})();