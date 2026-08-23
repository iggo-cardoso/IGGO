import '../../css/html/afiliar-se.css';
import { renderTurnstile } from '../utils/turnstile.js';

// ═══════════════════════════════════════════════════════════════
// AFILIAR-SE,  form em etapas da página /pages/afiliar-se.html
//
// Mesmo padrão de effects/loja.js: fica de prontidão e só "liga"
// quando os elementos .afil-* aparecem no DOM (o fragmento é
// injetado via innerHTML pelo page-router, <script> ali dentro
// nunca executaria). Reinicializa em cada 'pagechange' e limpa os
// listeners da instância anterior antes de montar de novo.
//
// Etapas: 1) empresa  2) contato  3) serviço  4) revisão + envio.
// Envio vai pra /api/afiliacao (Cloudflare Pages Function),  o
// front nunca fala com o Firestore direto.
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

  function init() {
    runCleanup();

    const form = document.querySelector('.afil-form');
    if (!form) return; // não estamos na página afiliar-se

    const steps = Array.from(form.querySelectorAll('.afil-step'));
    const progressSteps = Array.from(document.querySelectorAll('.afil-progress-step'));
    const progressFill = document.querySelector('.afil-progress-fill');
    const backBtn = form.querySelector('.afil-btn-back');
    const nextBtn = form.querySelector('.afil-btn-next');
    const submitBtn = form.querySelector('.afil-btn-submit');
    const reviewList = form.querySelector('.afil-review');
    const msgEl = form.querySelector('.afil-msg');
    const turnstileEl = form.querySelector('.cf-turnstile');
    const wizard = document.querySelector('[data-afiliacao-wizard]');
    const wizardBand = wizard && wizard.querySelector('.afil-wizard-band');
    const wizardContent = wizard && wizard.querySelector('.afil-wizard-content');

    let current = 0;
    let busy = false;
    let side = 'left';

    function setMsg(text, kind) {
      if (!msgEl) return;
      msgEl.textContent = text || '';
      msgEl.classList.toggle('is-success', kind === 'success');
      msgEl.classList.toggle('is-error', kind === 'error');
    }

    function showStep(index, immediate = false) {
      if (busy && !immediate) return;
      const apply = () => {
        steps.forEach((el, i) => el.classList.toggle('is-active', i === index));
        progressSteps.forEach((el, i) => {
          el.classList.toggle('is-active', i === index);
          el.classList.toggle('is-done', i < index);
        });
        if (progressFill) progressFill.style.width = `${((index + 1) / steps.length) * 100}%`;
        backBtn.hidden = index === 0;
        nextBtn.hidden = index === steps.length - 1;
        submitBtn.hidden = index !== steps.length - 1;
        if (index === steps.length - 1) {
          buildReview();
          renderTurnstile(turnstileEl);
        }
        current = index;
      };

      if (immediate || !wizardContent) {
        apply();
        requestAnimationFrame(() => form.classList.add('is-ready'));
        return;
      }

      busy = true;
      form.classList.remove('is-ready');
      wizardContent.classList.add('is-changing');
      const nextSide = side === 'left' ? 'right' : 'left';
      if (wizardBand) wizardBand.classList.toggle('is-left', nextSide === 'right');
      wizardContent.classList.toggle('is-right', nextSide === 'right');

      setTimeout(() => {
        apply();
        side = nextSide;
        requestAnimationFrame(() => {
          wizardContent.classList.remove('is-changing');
          form.classList.add('is-ready');
          busy = false;
        });
      }, 270);
    }

    function validateStep(index) {
      const fields = steps[index].querySelectorAll('input, select, textarea');
      for (const field of fields) {
        if (field.classList.contains('afil-hp')) continue; // honeypot não valida

        if (field.type === 'radio') {
          const group = steps[index].querySelectorAll(`input[name="${field.name}"]`);
          const checked = Array.from(group).some((r) => r.checked);
          if (!checked && field.required) return { ok: false, field };
          continue;
        }

        if (field.required && !field.value.trim()) {
          return { ok: false, field };
        }
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
      const result = validateStep(current);
      if (!result.ok) {
        setMsg('Preenche os campos obrigatórios antes de avançar.', 'error');
        if (result.field && result.field.focus) result.field.focus();
        return;
      }
      setMsg('', null);
      if (current < steps.length - 1) showStep(current + 1);
    }

    function onBack() {
      setMsg('', null);
      if (current > 0) showStep(current - 1);
    }

    async function onSubmit(e) {
      e.preventDefault();

      const result = validateStep(current);
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

      submitBtn.disabled = true;
      setMsg('Enviando...', null);

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
          setMsg(json.error || 'Não deu pra enviar agora, tenta de novo.', 'error');
          if (window.turnstile) window.turnstile.reset();
          submitBtn.disabled = false;
          return;
        }

        setMsg('Inscrição enviada! A gente entra em contato pelo WhatsApp ou e-mail.', 'success');
        form.reset();
        if (window.turnstile) window.turnstile.reset();
        showStep(0);
      } catch (err) {
        setMsg('Falha de conexão, tenta de novo em instantes.', 'error');
        if (window.turnstile) window.turnstile.reset();
        submitBtn.disabled = false;
      }
    }

    nextBtn.addEventListener('click', onNext);
    backBtn.addEventListener('click', onBack);
    form.addEventListener('submit', onSubmit);

    cleanupFns.push(() => {
      nextBtn.removeEventListener('click', onNext);
      backBtn.removeEventListener('click', onBack);
      form.removeEventListener('submit', onSubmit);
    });

    showStep(0, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pagechange', init);
})();
