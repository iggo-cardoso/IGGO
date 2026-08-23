import '../../css/html/afiliar-se.css';
import { renderTurnstile } from '../utils/turnstile.js';

// ═══════════════════════════════════════════════════════════════
// AFILIAR-SE,  wizard de 1 pergunta por tela da página
// /pages/afiliar-se.html
//
// Mesmo padrão de effects/loja.js: fica de prontidão e só "liga"
// quando os elementos .afil-wiz aparecem no DOM (o fragmento é
// injetado via innerHTML pelo page-router, <script> ali dentro
// nunca executaria). Reinicializa em cada 'pagechange' e limpa os
// listeners da instância anterior antes de montar de novo.
//
// Visual: painel cheio de cor (.afil-wiz-panel--band) e painel de
// conteúdo (.afil-wiz-panel--info) trocam de lado a cada passo
// (classes band-right/band-left no container .afil-wiz), o passo
// ativo entra com fade/translate via .is-in — mesmo comportamento
// do protótipo aprovado, só que os campos são reais (values
// persistem entre passos, nada é recriado via innerHTML).
//
// Etapas (12): empresa, nicho, cidade, temSite, responsavel,
// whatsapp, email, instagram, descricao, tempoMercado, portfolio,
// revisão+aceite+envio. Envio vai pra /api/afiliacao (Cloudflare
// Pages Function),  o front nunca fala com o Firestore direto.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  const STEP_LABELS = { empresa: 'Empresa', nicho: 'Nicho', cidade: 'Cidade',
    temSite: 'Site próprio', responsavel: 'Responsável', whatsapp: 'WhatsApp',
    email: 'E-mail', instagram: 'Instagram', descricao: 'Serviço',
    tempoMercado: 'Tempo de mercado', portfolio: 'Portfólio' };

  const NICHO_LABELS = { grafica: 'Gráfica', video: 'Produção de vídeo',
    foto: 'Fotografia', design: 'Design', marketing: 'Marketing & Publicidade', outro: 'Outro' };

  const SITE_LABELS = { sim: 'Sim', redes: 'Só redes sociais', nao: 'Não' };

  const CROSSFADE_MS = 620;
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12">' +
    '</polyline></svg>';

  function init() {
    runCleanup();

    const wiz = document.querySelector('.afil-wiz');
    if (!wiz) return; // não estamos na página afiliar-se

    const band = wiz.querySelector('.afil-wiz-panel--band');
    const info = wiz.querySelector('.afil-wiz-panel--info');
    const progressFill = wiz.querySelector('.afil-wiz-progress-fill');
    const form = wiz.querySelector('.afil-form');
    const loadingEl = wiz.querySelector('.afil-wiz-loading');
    const successEl = wiz.querySelector('.afil-wiz-success-screen');
    const msgEl = form.querySelector('.afil-wiz-msg');
    const nextBtn = form.querySelector('.afil-wiz-btn--next');
    const backBtn = form.querySelector('.afil-wiz-btn--back');
    const reviewList = form.querySelector('.afil-wiz-review');
    const turnstileEl = form.querySelector('.cf-turnstile');

    const steps = Array.from(form.querySelectorAll('.afil-step'));
    const lastIndex = steps.length - 1;

    let current = 0;
    let bandRight = true; // espelha a classe band-right/band-left do container
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

    // troca o lado do painel colorido + faz o conteúdo do painel de
    // informação sumir, roda `mutate` no meio da transição (com tudo
    // ainda invisível) e volta a aparecer. `mutate` deve deixar o DOM
    // no estado final (ex: trocar qual fieldset está .is-active).
    function crossfade(mutate) {
      return new Promise((resolve) => {
        info.classList.remove('is-in');
        flipBandSide();
        setTimeout(() => { mutate(); }, CROSSFADE_MS * 0.42);
        setTimeout(() => {
          info.classList.add('is-in');
          resolve();
        }, CROSSFADE_MS * 0.55);
      });
    }

    function updateNav(index) {
      backBtn.hidden = index === 0;
      nextBtn.textContent = index === lastIndex ? 'Enviar inscrição' : 'Continuar';
    }

    function updateProgress(index) {
      if (progressFill) progressFill.style.width = `${((index + 1) / steps.length) * 100}%`;
    }

    function activateStep(index) {
      steps.forEach((el, i) => el.classList.toggle('is-active', i === index));
      updateNav(index);
      updateProgress(index);
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
        .filter((f) => !f.classList.contains('afil-hp'));
    }

    function validateStep(index) {
      for (const field of fieldsOfStep(index)) {
        if (field.type === 'radio') {
          const group = steps[index].querySelectorAll(`input[name="${field.name}"]`);
          const checked = Array.from(group).some((r) => r.checked);
          if (!checked && field.required) return { ok: false, field };
          continue;
        }
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
        ['empresa', data.get('empresa')],
        ['nicho', NICHO_LABELS[data.get('nicho')] || data.get('nicho')],
        ['cidade', data.get('cidade')],
        ['temSite', SITE_LABELS[data.get('temSite')] || '—'],
        ['responsavel', data.get('responsavel')],
        ['whatsapp', data.get('whatsapp')],
        ['email', data.get('email')],
        ['instagram', data.get('instagram') || '—'],
        ['descricao', data.get('descricao')],
        ['tempoMercado', data.get('tempoMercado') || '—'],
        ['portfolio', data.get('portfolio') || '—'],
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

    function showSuccess() {
      band.innerHTML = `<div class="afil-wiz-check">${CHECK_SVG}</div>`;
      band.classList.add('has-check');
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
      const turnstileToken = String(data.get('cf-turnstile-response') || '').trim();
      if (!turnstileToken) {
        setMsg('Aguarda a verificação de segurança terminar e tenta de novo.', 'error');
        return;
      }

      busy = true;
      nextBtn.disabled = true;
      await showLoading();

      try {
        const res = await fetch('/api/afiliacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa: data.get('empresa'),
            nicho: data.get('nicho'),
            cidade: data.get('cidade'),
            temSite: data.get('temSite'),
            responsavel: data.get('responsavel'),
            whatsapp: data.get('whatsapp'),
            email: data.get('email'),
            instagram: data.get('instagram'),
            descricao: data.get('descricao'),
            tempoMercado: data.get('tempoMercado'),
            portfolio: data.get('portfolio'),
            'cf-turnstile-response': turnstileToken,
            empresa_confirmacao: data.get('empresa_confirmacao'), // honeypot
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          await showForm();
          setMsg(json.error || 'Não deu pra enviar agora, tenta de novo.', 'error');
          if (window.turnstile) window.turnstile.reset();
          nextBtn.disabled = false;
          busy = false;
          return;
        }

        await showSuccess();
        form.reset();
        if (window.turnstile) window.turnstile.reset();
      } catch (err) {
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
