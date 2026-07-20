(() => {
  'use strict';

  const settings = window.MEU_GRAVE_CONFIG || {};
  const BACKEND_URL = String(settings.backendUrl || '').replace(/\/+$/, '');
  const qs = selector => document.querySelector(selector);

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

  function tokenFromUrl() {
    const params = new URLSearchParams(location.search);
    return params.get('t') || params.get('token') || '';
  }

  function loadDelivery() {
    const status = qs('#deliveryStatus');
    const token = tokenFromUrl();
    if (!token) {
      setStatus(status, 'Página não encontrada.', 'error');
      return;
    }
    if (!BACKEND_URL) {
      setStatus(status, 'Servidor não configurado.', 'error');
      return;
    }

    const script = document.createElement('script');
    script.src = `${BACKEND_URL}?action=githubDelivery&callback=MEU_GRAVE_DELIVERY&t=${encodeURIComponent(token)}&_=${Date.now()}`;
    script.async = true;
    script.onerror = () => setStatus(status, 'Não foi possível abrir esta página agora.', 'error');
    document.head.appendChild(script);
  }

  window.MEU_GRAVE_DELIVERY = response => {
    const status = qs('#deliveryStatus');
    if (!response || !response.ok || !response.data) {
      setStatus(status, response && response.error ? response.error : 'Página não encontrada.', 'error');
      return;
    }
    renderDelivery(response.data);
  };

  function renderDelivery(d) {
    const status = qs('#deliveryStatus');
    status.classList.add('hidden');
    const title = d.exclusivePageTitle || d.subjectName || 'Meu Grave';
    qs('#deliveryTitle').innerHTML = /grave/i.test(title)
      ? escapeHtml(title)
      : `${escapeHtml(title)} <span class="pink">no grave</span>`;
    document.title = `${title} — MEU GRAVE`;
    qs('#deliveryContent').classList.remove('hidden');

    if (d.coverUrl) {
      const cover = qs('#cover');
      cover.onload = () => cover.classList.remove('hidden');
      cover.onerror = () => cover.classList.add('hidden');
      cover.src = d.coverUrl;
    }

    if (d.exclusivePageDescription) {
      qs('#exclusiveIntro').textContent = d.exclusivePageDescription;
      qs('#exclusiveIntro').classList.remove('hidden');
    }

    if (d.specialDate && d.specialDateLabel) renderSpecialDate(d.specialDate, d.specialDateLabel);

    if (d.audioPreviewUrl) {
      qs('#audioSection').classList.remove('hidden');
      qs('#audioFrame').src = d.audioPreviewUrl;
      qs('#audioDownload').href = d.audioDownloadUrl;
    }

    if (d.youtubeEmbedUrl || d.videoPreviewUrl) {
      qs('#videoSection').classList.remove('hidden');
      qs('#videoFrame').src = d.youtubeEmbedUrl || d.videoPreviewUrl;
      const buttons = [];
      if (d.videoDownloadUrl) buttons.push(`<a class="btn pink" href="${escapeHtml(d.videoDownloadUrl)}" target="_blank" rel="noopener">Baixar vídeo</a>`);
      if (d.youtubeUrl) buttons.push(`<a class="btn light" href="${escapeHtml(d.youtubeUrl)}" target="_blank" rel="noopener">${d.youtubeVisibility === 'UNLISTED' ? 'Assistir ao vídeo' : 'Abrir no YouTube'}</a>`);
      qs('#videoButtons').innerHTML = buttons.join(' ');
    }

    if (d.lyricText) {
      qs('#lyricSection').classList.remove('hidden');
      qs('#deliveryLyrics').textContent = d.lyricText;
    }

    if (Array.isArray(d.photos) && d.photos.length) {
      qs('#gallerySection').classList.remove('hidden');
      qs('#gallery').innerHTML = d.photos.map(photo => `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name)}" loading="lazy" onerror="this.remove()">`).join('');
    }

    const links = [];
    const seen = new Set();
    const addLink = (label, url, accent = false) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      links.push(`<a class="btn ${accent ? 'pink' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`);
    };
    if (d.youtubeUrl) addLink('Vídeo no YouTube', d.youtubeUrl);
    const publicLinks = d.publicLinks || {};
    addLink('Instagram', publicLinks.instagram);
    addLink('YouTube', publicLinks.youtube);
    addLink('TikTok', publicLinks.tiktok);
    addLink('Facebook', publicLinks.facebook);
    addLink('X', publicLinks.x);
    addLink('Site', publicLinks.website, true);
    addLink('WhatsApp', publicLinks.whatsapp, true);
    if (links.length) {
      qs('#linksSection').classList.remove('hidden');
      qs('#publicationLinks').innerHTML = links.join('');
    }
  }

  function parseDateOnly(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function elapsedCalendar(start, end) {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    }
    if (months < 0) { years -= 1; months += 12; }
    return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
  }

  function plural(value, singular, pluralForm) {
    return `${value} ${value === 1 ? singular : pluralForm}`;
  }

  function renderSpecialDate(value, label) {
    const start = parseDateOnly(value);
    if (!start) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = elapsedCalendar(start, today);
    const parts = [];
    if (elapsed.years) {
      parts.push(plural(elapsed.years, 'ano', 'anos'));
      if (elapsed.months) parts.push(plural(elapsed.months, 'mês', 'meses'));
    } else if (elapsed.months) {
      parts.push(plural(elapsed.months, 'mês', 'meses'));
      if (elapsed.days) parts.push(plural(elapsed.days, 'dia', 'dias'));
    } else {
      parts.push(plural(elapsed.days, 'dia', 'dias'));
    }
    qs('#specialDateLabel').textContent = label;
    qs('#specialDateValue').textContent = start.toLocaleDateString('pt-BR');
    qs('#specialDateElapsed').textContent = parts.join(' e ');
    qs('#specialDateSection').classList.remove('hidden');
  }

  window.addEventListener('DOMContentLoaded', loadDelivery);
})();
