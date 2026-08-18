import '../../css/html/contato.css';

// ═══════════════════════════════════════════════════════════════
// CONTATO,  form de /pages/contato.html usado por todos os CTAs
// "Falar com a equipe" do site.
//
// Mesmo padrão de effects/afiliar-se.js: fica de prontidão e só
// "liga" quando os elementos .cont-* aparecem no DOM (o fragmento é
// injetado via innerHTML pelo page-router). Reinicializa em cada
// 'pagechange' e limpa os listeners da instância anterior antes de
// montar de novo.
//
// Envio vai pra /api/contato (Cloudflare Pages Function, grava no
// Firestore igual afiliação/loja),  e só depois do POST confirmado
// o usuário é levado pro WhatsApp com a mensagem já preenchida.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const WHATSAPP_PHONE = '5571999226785';

  const TIPO_LABELS = {
    landing: 'uma Landing Page',
    institucional: 'um Site institucional',
    sistema: 'um Sistema sob medida',
    manutencao: 'Manutenção / suporte',
    outro: 'um projeto',
  };

  let cleanupFns = [];

  function runCleanup() {
    cleanupFns.forEach((fn) => { try { fn(); } catch (e) {} });
    cleanupFns = [];
  }

  function buildWhatsAppUrl({ nome, tipoProjeto, mensagem }) {
    const tipo = TIPO_LABELS[tipoProjeto] || 'um projeto';
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

    const form = document.querySelector('.cont-form');
    if (!form) return; // não estamos na página contato

    const submitBtn = form.querySelector('.cont-btn-solid');
    const msgEl = form.querySelector('.cont-msg');

    function setMsg(text, kind) {
      if (!msgEl) return;
      msgEl.textContent = text || '';
      msgEl.classList.toggle('is-success', kind === 'success');
      msgEl.classList.toggle('is-error', kind === 'error');
    }

    async function onSubmit(e) {
      e.preventDefault();

      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const nome = String(data.get('nome') || '').trim();
      const whatsapp = String(data.get('whatsapp') || '').trim();
      const email = String(data.get('email') || '').trim();
      const tipoProjeto = String(data.get('tipoProjeto') || '').trim();
      const mensagem = String(data.get('mensagem') || '').trim();

      submitBtn.disabled = true;
      setMsg('Enviando...', null);

      const whatsappUrl = buildWhatsAppUrl({ nome, tipoProjeto, mensagem });

      try {
        const res = await fetch('/api/contato', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome, whatsapp, email, tipoProjeto, mensagem,
            empresa_confirmacao: data.get('empresa_confirmacao'), // honeypot
          }),
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error('[contato] /api/contato retornou erro:', res.status, json);
          setMsg(json.error || 'Não deu pra enviar agora, tenta de novo.', 'error');
          submitBtn.disabled = false;
          return;
        }
      } catch (err) {
        // erro de rede/CORS/etc. NÃO mascara como sucesso: fica claro pro
        // usuário e pra gente debugar (olha o Network tab do devtools)
        console.error('[contato] falha ao chamar /api/contato:', err);
        setMsg('Falha de conexão, tenta de novo em instantes.', 'error');
        submitBtn.disabled = false;
        return;
      }

      setMsg('Prontinho! Te levando pro WhatsApp...', 'success');
      window.open(whatsappUrl, '_blank', 'noopener');
      form.reset();
      submitBtn.disabled = false;
    }

    form.addEventListener('submit', onSubmit);

    cleanupFns.push(() => {
      form.removeEventListener('submit', onSubmit);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('pagechange', init);
})();
