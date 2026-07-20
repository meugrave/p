(() => {
  'use strict';

  const settings = window.MEU_GRAVE_CONFIG || {};
  const BACKEND_URL = String(settings.backendUrl || '').replace(/\/+$/, '');
  const REQUEST_TIMEOUT = Number(settings.requestTimeoutMs || 120000);
  const MAX_FILE_BYTES = Number(settings.maxFileBytes || 5 * 1024 * 1024);
  const MAX_TOTAL_BYTES = Number(settings.maxTotalBytes || 15 * 1024 * 1024);
  const pending = new Map();
  let bootstrap = null;
  let bootstrapSettled = false;

  const fallbackBootstrap = {
    config: {
      storeName: 'MEU GRAVE',
      brandLine: 'Uma produção do Senta no Grave',
      ownerName: 'Alan',
      supportEmail: 'alanfrancissc@gmail.com',
      supportWhatsApp: '5524992208526',
      whatsappUrl: 'https://wa.me/5524992208526'
    },
    packages: [
      {
        id: 'MUSIC', name: 'Música personalizada', price: 'R$ 10,00',
        tagline: 'Sua história transformada em grave',
        description: 'Música original no estilo do Senta no Grave, entregue por e-mail com download pelo Google Drive.',
        includes: ['Música personalizada', 'Letra aprovada antes da produção, quando houver', 'Arquivo de áudio enviado por e-mail', 'Download pelo Google Drive']
      },
      {
        id: 'MUSIC_VIDEO', name: 'Música + vídeo', price: 'R$ 20,00',
        tagline: 'Som e visual no mesmo impacto',
        description: 'Música personalizada acompanhada de vídeo no estilo visual do canal, com arquivos enviados por e-mail.',
        includes: ['Música personalizada', 'Vídeo personalizado', 'Áudio e vídeo enviados por e-mail', 'Downloads pelo Google Drive']
      },
      {
        id: 'MUSIC_VIDEO_CHANNEL', name: 'Música + vídeo + canal', price: 'R$ 30,00',
        tagline: 'Seu grave publicado no canal',
        description: 'Produção com vídeo e possibilidade de publicação no Senta no Grave, após aprovação do conteúdo.',
        includes: ['Música personalizada', 'Vídeo personalizado', 'Publicação no canal após aprovação', 'Arquivos enviados por e-mail e Google Drive']
      },
      {
        id: 'FULL', name: 'Pacote completo', price: 'R$ 40,00',
        tagline: 'A experiência completa do MEU GRAVE',
        description: 'Música, vídeo, publicação no canal e uma página exclusiva para ouvir, ler a letra, ver fotos, baixar arquivos e divulgar seus links.',
        includes: ['Música personalizada', 'Vídeo personalizado', 'Publicação no canal após aprovação', 'Página exclusiva com player, letra, fotos e vídeo', 'Links de Instagram, YouTube, TikTok, Facebook, X, site e WhatsApp', 'Área Minhas Músicas e downloads']
      }
    ]
  };

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function setStatus(element, message, type = '') {
    element.className = `status ${type}`.trim();
    element.textContent = message;
    element.classList.remove('hidden');
  }
  function setLoading(element, loading) {
    element.classList.toggle('loading', Boolean(loading));
    document.body.classList.toggle('submitting', Boolean(loading));
  }
  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function createNonce() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  window.MEU_GRAVE_BOOTSTRAP = function receiveBootstrap(response) {
    bootstrapSettled = true;
    if (response && response.ok && response.data) {
      bootstrap = response.data;
      renderPackages();
      renderConfig();
      return;
    }
    useFallbackBootstrap('Não foi possível atualizar os preços automaticamente. Os valores exibidos são os padrões de lançamento.');
  };

  function loadBootstrap() {
    if (!BACKEND_URL) {
      useFallbackBootstrap('O endereço do servidor não foi configurado.');
      return;
    }
    const script = document.createElement('script');
    script.src = `${BACKEND_URL}?action=githubBootstrap&callback=MEU_GRAVE_BOOTSTRAP&_=${Date.now()}`;
    script.async = true;
    script.onerror = () => useFallbackBootstrap('Não foi possível consultar os pacotes agora. Tente novamente mais tarde.');
    document.head.appendChild(script);

    window.setTimeout(() => {
      if (!bootstrapSettled) {
        useFallbackBootstrap('A consulta de preços demorou mais que o esperado. Os valores padrões foram exibidos.');
      }
    }, 10000);
  }

  function useFallbackBootstrap(message) {
    if (bootstrapSettled && bootstrap) return;
    bootstrapSettled = true;
    bootstrap = fallbackBootstrap;
    renderPackages();
    renderConfig();
    const cards = qs('#packageCards');
    if (cards && message) {
      cards.insertAdjacentHTML('beforebegin', `<div class="backend-warning">${escapeHtml(message)}</div>`);
    }
  }

  function packagePriceMarkup(pkg) {
    if (!pkg.offerActive) return `<div class="price">${escapeHtml(pkg.price)}</div>`;
    return `<div class="price-block"><div class="old-price">De ${escapeHtml(pkg.originalPrice)}</div><div class="price">${escapeHtml(pkg.price)}</div><span class="savings">Economize ${escapeHtml(pkg.savings)}</span><small class="offer-note">${escapeHtml(pkg.offerEndsLabel)}</small></div>`;
  }

  function renderPackages() {
    const packages = Array.isArray(bootstrap?.packages) ? bootstrap.packages : [];
    qs('#packageCards').innerHTML = packages.map(pkg => `
      <article class="card ${pkg.id === 'FULL' ? 'featured' : ''} ${pkg.offerActive ? 'on-sale' : ''}">
        ${pkg.offerActive ? `<div class="offer-ribbon"><span>${escapeHtml(pkg.offerLabel)}</span><strong>-${escapeHtml(pkg.discountPercent)}%</strong></div>` : ''}
        <span class="tag">${pkg.id === 'FULL' ? 'Página exclusiva incluída' : 'Produção personalizada'}</span>
        <h3>${escapeHtml(pkg.name)}</h3>
        ${packagePriceMarkup(pkg)}
        <p><strong>${escapeHtml(pkg.tagline)}</strong></p>
        <p>${escapeHtml(pkg.description)}</p>
        <ul>${(pkg.includes || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        <button class="btn ${pkg.id === 'FULL' ? 'pink' : ''} small" type="button" data-package-id="${escapeHtml(pkg.id)}">Escolher</button>
      </article>
    `).join('');

    qs('#packageSelect').innerHTML = '<option value="">Selecione...</option>' + packages
      .map(pkg => `<option value="${escapeHtml(pkg.id)}">${escapeHtml(pkg.name)} — ${escapeHtml(pkg.price)}${pkg.offerActive ? ' (oferta -' + escapeHtml(pkg.discountPercent) + '%)' : ''}</option>`)
      .join('');

    qsa('[data-package-id]').forEach(button => {
      button.addEventListener('click', () => choosePackage(button.dataset.packageId));
    });
    toggleExclusiveFields();
  }

  function renderConfig() {
    const config = bootstrap?.config || fallbackBootstrap.config;
    const parts = [];
    if (config.supportEmail) {
      parts.push(`<a href="mailto:${escapeHtml(config.supportEmail)}">${escapeHtml(config.supportEmail)}</a>`);
    }
    if (config.whatsappUrl) {
      parts.push(`<a href="${escapeHtml(config.whatsappUrl)}" target="_blank" rel="noopener">WhatsApp</a>`);
    }
    qs('#footerContact').innerHTML = parts.join(' · ');
  }

  function toggleExclusiveFields() {
    const select = qs('#packageSelect');
    const box = qs('#exclusivePageFields');
    if (!select || !box) return;
    const packageId = select.value;
    const isFull = packageId === 'FULL';
    const includesChannel = ['MUSIC_VIDEO_CHANNEL', 'FULL'].includes(packageId);
    box.classList.toggle('hidden', !isFull);
    qsa('input,textarea,select', box).forEach(field => { field.disabled = !isFull; });
    const consent = box.querySelector('[name="publicPageConsent"]');
    if (consent) consent.required = isFull;
    const channelBox = qs('#channelPublicationFields');
    if (channelBox) {
      channelBox.classList.toggle('hidden', !includesChannel);
      qsa('input,textarea,select', channelBox).forEach(field => { field.disabled = !includesChannel; });
    }
    const publicationConsent = document.querySelector('[name="publicationConsent"]');
    if (publicationConsent) publicationConsent.required = includesChannel;
  }

  qs('#packageSelect').addEventListener('change', () => {
    toggleExclusiveFields();
    const code=qs('#couponCode'); if(code) code.value='';
    const status=qs('#couponStatus'); if(status) status.classList.add('hidden');
  });

  function choosePackage(id) {
    qs('#packageSelect').value = id;
    toggleExclusiveFields();
    scrollToSection('pedido');
  }

  async function applyCoupon(){
    const status=qs('#couponStatus');
    try{
      const packageId=qs('#packageSelect').value;
      const couponCode=qs('#couponCode').value.trim();
      if(!packageId)throw new Error('Selecione primeiro um pacote.');
      if(!couponCode)throw new Error('Digite um cupom.');
      setStatus(status,'Verificando cupom...');
      const result=await submitThroughBridge('githubValidateCoupon',{createdAt:Date.now(),packageId,couponCode});
      qs('#couponCode').value=result.code;
      setStatus(status,`${result.message} Novo valor: ${result.final}`,'ok');
    }catch(err){setStatus(status,err.message||String(err),'error')}
  }
  const couponButton=qs('#applyCouponButton');
  if(couponButton)couponButton.addEventListener('click',applyCoupon);

  function formToObject(form) {
    const data = {};
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) continue;
      data[key] = value;
    }
    [
      'useSubjectNameInLyrics', 'hasOwnLyrics', 'publicationConsent', 'photoConsent',
      'termsAccepted', 'creativeDirectionAccepted', 'revisionPolicyAccepted', 'publicPageConsent'
    ].forEach(name => {
      data[name] = Boolean(form.elements[name] && form.elements[name].checked);
    });
    return data;
  }

  function inferMime(file) {
    if (file.type) return file.type;
    const ext = String(file.name || '').toLowerCase().split('.').pop();
    const map = {
      txt: 'text/plain', pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif'
    };
    return map[ext] || 'application/octet-stream';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(new Error(`Não foi possível ler o arquivo ${file.name}.`));
      reader.readAsDataURL(file);
    });
  }

  async function collectAttachments(form) {
    const fields = ['lyricsFile', 'photo1', 'photo2', 'photo3'];
    const attachments = [];
    let total = 0;
    for (const field of fields) {
      const input = form.elements[field];
      const file = input && input.files ? input.files[0] : null;
      if (!file || !file.size) continue;
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`${file.name} ultrapassa o limite de 5 MB desta página.`);
      }
      total += file.size;
      if (total > MAX_TOTAL_BYTES) {
        throw new Error('O total dos anexos ultrapassa 15 MB nesta página.');
      }
      attachments.push({
        field,
        name: file.name,
        type: inferMime(file),
        size: file.size,
        base64: await fileToBase64(file)
      });
    }
    return attachments;
  }

  function submitThroughBridge(action, payload) {
    return new Promise((resolve, reject) => {
      if (!BACKEND_URL) {
        reject(new Error('Servidor não configurado.'));
        return;
      }
      const nonce = createNonce();
      const timeout = window.setTimeout(() => {
        pending.delete(nonce);
        reject(new Error('O envio demorou demais. Confira sua conexão e tente novamente.'));
      }, REQUEST_TIMEOUT);
      pending.set(nonce, { resolve, reject, timeout });

      const bridgeForm = document.createElement('form');
      bridgeForm.method = 'POST';
      bridgeForm.action = BACKEND_URL;
      bridgeForm.target = 'bridgeFrame';
      bridgeForm.acceptCharset = 'UTF-8';
      bridgeForm.style.display = 'none';

      const fields = { action, nonce, payload: JSON.stringify(payload) };
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        bridgeForm.appendChild(input);
      });
      document.body.appendChild(bridgeForm);
      bridgeForm.submit();
      window.setTimeout(() => bridgeForm.remove(), 1000);
    });
  }

  window.addEventListener('message', event => {
    const message = event.data;
    if (!message || message.source !== 'MEU_GRAVE_GITHUB_BRIDGE' || !message.nonce) return;
    const request = pending.get(message.nonce);
    if (!request) return;
    window.clearTimeout(request.timeout);
    pending.delete(message.nonce);
    if (message.ok) request.resolve(message.result);
    else request.reject(new Error(message.error || 'Não foi possível concluir a solicitação.'));
  });

  function resetOrderForm() {
    const form = qs('#orderForm');
    form.reset();
    toggleExclusiveFields();
    qs('#orderSuccess').classList.add('hidden');
    qs('#orderIntroPanel').classList.remove('hidden');
    form.classList.remove('hidden');
    qs('#formStatus').classList.add('hidden');
    scrollToSection('pedido');
  }
  window.resetOrderForm = resetOrderForm;

  qsa('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = String(link.getAttribute('href') || '').replace(/^#/, '');
      if (!id) return;
      event.preventDefault();
      scrollToSection(id);
    });
  });

  qs('#orderForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const status = qs('#formStatus');
    const submitButton = qs('#orderSubmitButton');
    const originalButtonText = submitButton.textContent;
    setLoading(form, true);
    submitButton.textContent = 'Aguarde, enviando pedido...';
    setStatus(status, 'Aguarde. Estamos enviando seu pedido, anexos e confirmação por e-mail...');

    try {
      const payload = {
        createdAt: Date.now(),
        website: form.elements.website ? form.elements.website.value : '',
        data: formToObject(form),
        attachments: await collectAttachments(form)
      };
      const result = await submitThroughBridge('githubSubmitOrder', payload);
      form.classList.add('hidden');
      qs('#orderIntroPanel').classList.add('hidden');
      qs('#orderSuccessMessage').innerHTML = `Pedido <strong>${escapeHtml(result.orderId)}</strong> recebido. Verifique seu e-mail.`;
      qs('#orderSuccess').classList.remove('hidden');
      qs('#orderSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      setStatus(status, err.message || String(err), 'error');
    } finally {
      setLoading(form, false);
      submitButton.textContent = originalButtonText;
    }
  });

  qs('#accessForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = qs('#accessStatus');
    setLoading(form, true);
    try {
      const result = await submitThroughBridge('githubAccessLink', {
        createdAt: Date.now(),
        website: '',
        email: qs('#accessEmail').value
      });
      setStatus(status, result.message, 'ok');
      form.reset();
    } catch (err) {
      setStatus(status, err.message || String(err), 'error');
    } finally {
      setLoading(form, false);
    }
  });

  // Campo invisível contra robôs simples.
  const honeypot = document.createElement('input');
  honeypot.type = 'text';
  honeypot.name = 'website';
  honeypot.autocomplete = 'off';
  honeypot.tabIndex = -1;
  honeypot.setAttribute('aria-hidden', 'true');
  honeypot.style.position = 'absolute';
  honeypot.style.left = '-10000px';
  qs('#orderForm').appendChild(honeypot);

  loadBootstrap();
})();
