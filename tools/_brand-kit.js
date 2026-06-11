/* tools/_brand-kit.js
 * Shared brand kit for the /tools asset-generator, shorts-optimizer
 * and stream-setup pages. Config persists in localStorage under a single
 * key so changing the brand on any page updates the others.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'tta_asset_generator_cfg_v1';
  const DEFAULTS = {
    name: 'The Tracker App',
    short: 'Tracker',
    tagline: 'Fitness tracking via text. No app required.',
    site: 'thetrackerapp.io',
    cta: 'Try it free →',
    icon: '🏋',
    bg: '#000000',
    accent: '#38ffd3',
    ink: '#ecf4ff',
    style: 'modern',
    logo: null,
    fontH: '-apple-system, "SF Pro Display", Inter, system-ui, sans-serif',
    fontB: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif',
  };

  let CFG = load();
  let logoImg = null;
  const listeners = new Set();

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return Object.assign({}, DEFAULTS, stored);
    } catch { return { ...DEFAULTS }; }
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(CFG)); } catch {} }
  function notify() { listeners.forEach(fn => { try { fn(CFG); } catch (e) { console.error(e); } }); }
  function update(patch) { Object.assign(CFG, patch); save(); notify(); }
  function reset() { CFG = { ...DEFAULTS }; logoImg = null; save(); notify(); }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function get() { return CFG; }
  function getLogoImg() { return logoImg; }

  /* ------------- helpers ------------- */
  function parseHex(hex) {
    let h = (hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function hexA(hex, a) { const { r, g, b } = parseHex(hex); return `rgba(${r},${g},${b},${a})`; }
  function mix(a, b, t) {
    const A = parseHex(a), B = parseHex(b);
    const r = Math.round(A.r + (B.r - A.r) * t);
    const g = Math.round(A.g + (B.g - A.g) * t);
    const bl = Math.round(A.b + (B.b - A.b) * t);
    return `#${[r, g, bl].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }
  function luminance(hex) {
    const { r, g, b } = parseHex(hex);
    const a = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrastInk() { return luminance(CFG.bg) > 0.5 ? '#0a0e14' : CFG.ink; }
  function ctaInk() { return luminance(CFG.accent) > 0.5 ? '#0a0e14' : '#ffffff'; }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(Math.max(0, r), w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrapText(ctx, text, maxWidth, maxLines = 3) {
    const words = (text || '').split(/\s+/).filter(Boolean);
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxWidth) cur = test;
      else { if (cur) lines.push(cur); cur = w; if (lines.length >= maxLines - 1) break; }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    return lines;
  }
  function slug(s) { return (s || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'asset'; }
  function fileBase() { return slug(CFG.short || CFG.name || 'brand'); }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  /* ------------- drawing ------------- */
  function fillBackground(ctx, w, h) {
    if (CFG.style === 'modern') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, CFG.bg);
      g.addColorStop(1, mix(CFG.bg, CFG.accent, 0.12));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const r = Math.max(w, h) * 0.6;
      const rg = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, r);
      rg.addColorStop(0, hexA(CFG.accent, 0.22));
      rg.addColorStop(1, hexA(CFG.accent, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = CFG.bg;
      ctx.fillRect(0, 0, w, h);
    }
  }
  function drawLogoMark(ctx, cx, cy, size, opts = {}) {
    const { ring = true, bg = true } = opts;
    if (logoImg && logoImg.complete && logoImg.naturalWidth) {
      const iw = logoImg.naturalWidth, ih = logoImg.naturalHeight;
      const scale = Math.min(size / iw, size / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.drawImage(logoImg, cx - dw / 2, cy - dh / 2, dw, dh);
      return;
    }
    if (bg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      const grad = ctx.createLinearGradient(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2);
      grad.addColorStop(0, mix(CFG.bg, CFG.accent, 0.18));
      grad.addColorStop(1, mix(CFG.bg, '#000', 0.2));
      ctx.fillStyle = grad;
      ctx.fill();
      if (ring) {
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.strokeStyle = CFG.accent;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(size * 0.62)}px ${CFG.fontH}`;
    ctx.fillStyle = bg ? '#ffffff' : contrastInk();
    ctx.fillText(CFG.icon || '★', cx, cy + size * 0.02);
    ctx.restore();
  }

  /* ------------- video ------------- */
  function preferredVideoMime() {
    const candidates = [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=h264',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    if (typeof MediaRecorder === 'undefined') return null;
    for (const m of candidates) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {} }
    return null;
  }
  function recordCanvas(canvas, durationSec, mime, fps = 30) {
    return new Promise((resolve, reject) => {
      try {
        const stream = canvas.captureStream(fps);
        const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
        const chunks = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
        rec.onerror = e => reject(e.error || e);
        rec.start();
        setTimeout(() => { try { rec.stop(); } catch {} }, durationSec * 1000 + 100);
      } catch (e) { reject(e); }
    });
  }
  async function renderVideoBlob(asset, onProgress) {
    const mime = preferredVideoMime();
    if (!mime) throw new Error('MediaRecorder not supported in this browser');
    const canvas = document.createElement('canvas');
    canvas.width = asset.w; canvas.height = asset.h;
    const ctx = canvas.getContext('2d');
    asset.renderFrame(ctx, asset.w, asset.h, 0);
    const recPromise = recordCanvas(canvas, asset.duration, mime, asset.fps || 30);
    const start = performance.now();
    function tick() {
      const elapsed = (performance.now() - start) / 1000;
      if (elapsed >= asset.duration) return;
      asset.renderFrame(ctx, asset.w, asset.h, elapsed);
      if (onProgress) onProgress(elapsed / asset.duration);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    const blob = await recPromise;
    return { blob, mime, ext: mime.includes('mp4') ? 'mp4' : 'webm' };
  }

  /* ------------- downloads ------------- */
  function canvasToBlob(canvas, type = 'image/png') {
    return new Promise(res => canvas.toBlob(res, type, 0.95));
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result); r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img); img.onerror = reject;
      img.src = src;
    });
  }
  async function loadLogoImage() {
    if (!CFG.logo) { logoImg = null; return; }
    try { logoImg = await loadImage(CFG.logo); } catch { logoImg = null; }
  }

  /* ------------- brand config UI ------------- */
  function mountConfigPanel(rootEl) {
    rootEl.innerHTML = `
      <div class="bk-config">
        <div class="bk-section-title">Brand</div>
        <div class="bk-field"><label for="bk-name">Brand name</label><input id="bk-name" type="text"></div>
        <div class="bk-field"><label for="bk-short">Short name</label><input id="bk-short" type="text"></div>
        <div class="bk-field"><label for="bk-tagline">Tagline</label><textarea id="bk-tagline" rows="2"></textarea></div>
        <div class="bk-field"><label for="bk-site">Website</label><input id="bk-site" type="text"></div>
        <div class="bk-field"><label for="bk-cta">CTA</label><input id="bk-cta" type="text"></div>
        <div class="bk-section-title">Visuals</div>
        <div class="bk-field"><label for="bk-icon">Icon / emoji (fallback)</label><input id="bk-icon" type="text" maxlength="3"></div>
        <div class="bk-field">
          <label>Custom logo (PNG/SVG)</label>
          <label class="bk-upload" id="bk-logo-wrap">
            <span id="bk-logo-inner">Click to upload logo</span>
            <input id="bk-logo" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp">
          </label>
        </div>
        <div class="bk-field"><label>Background</label><div class="bk-color"><input type="color" id="bk-bg-pick"><input type="text" id="bk-bg"></div></div>
        <div class="bk-field"><label>Accent</label><div class="bk-color"><input type="color" id="bk-accent-pick"><input type="text" id="bk-accent"></div></div>
        <div class="bk-field"><label>Ink / text</label><div class="bk-color"><input type="color" id="bk-ink-pick"><input type="text" id="bk-ink"></div></div>
        <div class="bk-field"><label for="bk-style">Style</label>
          <select id="bk-style">
            <option value="modern">Modern (gradient + glow)</option>
            <option value="flat">Flat</option>
            <option value="mono">Monochrome</option>
          </select>
        </div>
        <button class="bk-btn bk-btn-ghost" id="bk-reset" type="button" style="width:100%">Reset config</button>
        <p class="bk-hint">Brand settings are saved locally and shared across the Assets, Shorts and Stream tools.</p>
      </div>
    `;
    function apply() {
      const q = (s) => rootEl.querySelector(s);
      q('#bk-name').value = CFG.name || '';
      q('#bk-short').value = CFG.short || '';
      q('#bk-tagline').value = CFG.tagline || '';
      q('#bk-site').value = CFG.site || '';
      q('#bk-cta').value = CFG.cta || '';
      q('#bk-icon').value = CFG.icon || '';
      q('#bk-bg').value = CFG.bg; q('#bk-bg-pick').value = CFG.bg;
      q('#bk-accent').value = CFG.accent; q('#bk-accent-pick').value = CFG.accent;
      q('#bk-ink').value = CFG.ink; q('#bk-ink-pick').value = CFG.ink;
      q('#bk-style').value = CFG.style;
      const inner = q('#bk-logo-inner');
      if (CFG.logo) {
        inner.innerHTML = `<img src="${CFG.logo}" alt="" style="width:30px;height:30px;object-fit:contain;vertical-align:middle;border-radius:4px;background:rgba(255,255,255,.1);margin-right:8px"><span style="color:#ecf4ff">Custom logo loaded</span> · <a href="#" id="bk-logo-clear" style="color:#ff7f7f">remove</a>`;
        const clr = q('#bk-logo-clear');
        if (clr) clr.onclick = (e) => { e.preventDefault(); e.stopPropagation(); update({ logo: null }); logoImg = null; apply(); };
      } else {
        inner.textContent = 'Click to upload logo';
      }
    }
    apply();

    const tie = (id, key) => rootEl.querySelector(id).addEventListener('input', e => update({ [key]: e.target.value }));
    tie('#bk-name', 'name'); tie('#bk-short', 'short'); tie('#bk-tagline', 'tagline');
    tie('#bk-site', 'site'); tie('#bk-cta', 'cta'); tie('#bk-icon', 'icon');

    const tieColor = (txt, pick, key) => {
      rootEl.querySelector(txt).addEventListener('input', e => {
        let v = e.target.value.trim(); if (!v.startsWith('#')) v = '#' + v;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
          update({ [key]: v });
          rootEl.querySelector(pick).value = v;
        }
      });
      rootEl.querySelector(pick).addEventListener('input', e => {
        update({ [key]: e.target.value });
        rootEl.querySelector(txt).value = e.target.value;
      });
    };
    tieColor('#bk-bg', '#bk-bg-pick', 'bg');
    tieColor('#bk-accent', '#bk-accent-pick', 'accent');
    tieColor('#bk-ink', '#bk-ink-pick', 'ink');

    rootEl.querySelector('#bk-style').addEventListener('change', e => update({ style: e.target.value }));
    rootEl.querySelector('#bk-logo').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      const dataUrl = await readFileAsDataURL(file);
      update({ logo: dataUrl });
      await loadLogoImage();
      notify();
      apply();
    });
    rootEl.querySelector('#bk-reset').addEventListener('click', () => {
      if (!confirm('Reset all brand settings to defaults?')) return;
      reset();
      apply();
    });
    onChange(apply);
  }

  /* ------------- nav strip across tools ------------- */
  function navStrip(currentPage) {
    const pages = [
      { id: 'asset-generator',  label: 'Assets',          href: 'asset-generator.html' },
      { id: 'shorts-optimizer', label: 'Shorts + AI',     href: 'shorts-optimizer.html' },
      { id: 'stream-setup',     label: 'Stream Setup',    href: 'stream-setup.html' },
      { id: 'social-calendar',  label: 'Social Calendar', href: 'social-calendar.html' },
    ];
    return `<nav class="bk-navstrip">
      <span class="bk-nav-brand">Brand Tools</span>
      ${pages.map(p => `<a href="${p.href}" class="bk-nav-link${p.id === currentPage ? ' active' : ''}">${p.label}</a>`).join('')}
      <span style="flex:1"></span>
      <a class="bk-nav-link" href="/" title="Back to site">← site</a>
    </nav>`;
  }

  /* ------------- inject base CSS ------------- */
  function injectCSS() {
    if (document.getElementById('brand-kit-style')) return;
    const css = `
      .bk-navstrip { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(0,0,0,.55); border-bottom: 1px solid rgba(255,255,255,.08); font-size: 13px; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 60; }
      .bk-nav-brand { font-weight: 800; color: #38ffd3; letter-spacing: .14em; text-transform: uppercase; font-size: 10px; margin-right: 6px; }
      .bk-nav-link { color: rgba(255,255,255,.65); text-decoration: none; padding: 5px 11px; border-radius: 999px; border: 1px solid transparent; transition: color .15s, background .15s, border-color .15s; }
      .bk-nav-link:hover { color: #fff; }
      .bk-nav-link.active { background: rgba(56,255,211,.12); color: #38ffd3; border-color: rgba(56,255,211,.35); }
      .bk-config { padding: 4px 0; }
      .bk-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #8a96a8; margin: 18px 0 8px; }
      .bk-section-title:first-child { margin-top: 4px; }
      .bk-field { margin-bottom: 10px; }
      .bk-field > label { display: block; font-size: 12px; color: #8a96a8; margin-bottom: 4px; }
      .bk-field input[type=text], .bk-field input[type=url], .bk-field textarea, .bk-field select {
        width: 100%; background: #131a25; border: 1px solid rgba(255,255,255,.18);
        border-radius: 8px; padding: 8px 10px; color: #ecf4ff; outline: none; font: inherit;
      }
      .bk-field textarea { resize: vertical; min-height: 56px; }
      .bk-field input:focus, .bk-field textarea:focus, .bk-field select:focus { border-color: #38ffd3; }
      .bk-color { display: flex; align-items: center; gap: 8px; background: #131a25; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; padding: 6px 8px; }
      .bk-color input[type=color] { -webkit-appearance: none; appearance: none; width: 28px; height: 28px; border: 0; padding: 0; background: transparent; cursor: pointer; }
      .bk-color input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
      .bk-color input[type=color]::-webkit-color-swatch { border: 1px solid rgba(255,255,255,.18); border-radius: 6px; }
      .bk-color input[type=text] { flex: 1; background: transparent; border: 0; outline: none; color: #ecf4ff; font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
      .bk-upload { display: block; border: 1px dashed rgba(255,255,255,.2); border-radius: 8px; padding: 10px; text-align: center; color: #8a96a8; cursor: pointer; background: #131a25; font-size: 12px; }
      .bk-upload:hover { border-color: #38ffd3; color: #ecf4ff; }
      .bk-upload input { display: none; }
      .bk-btn { background: #131a25; border: 1px solid rgba(255,255,255,.18); color: #ecf4ff; padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; font: inherit; }
      .bk-btn:hover { border-color: #38ffd3; }
      .bk-btn-ghost { background: transparent; }
      .bk-btn-primary { background: #38ffd3; color: #021416; border-color: #38ffd3; font-weight: 700; }
      .bk-btn-primary:hover { filter: brightness(1.05); }
      .bk-hint { color: #8a96a8; font-size: 11px; line-height: 1.5; margin-top: 8px; }
    `;
    const s = document.createElement('style');
    s.id = 'brand-kit-style'; s.textContent = css;
    document.head.appendChild(s);
  }

  /* expose */
  global.BrandKit = {
    get, update, reset, onChange, save,
    parseHex, hexA, mix, luminance, contrastInk, ctaInk, roundRect, wrapText, slug, fileBase,
    ease, clamp01, fillBackground, drawLogoMark,
    preferredVideoMime, recordCanvas, renderVideoBlob,
    canvasToBlob, downloadBlob, readFileAsDataURL, loadImage, loadLogoImage, getLogoImg,
    mountConfigPanel, navStrip, injectCSS,
    DEFAULTS, STORAGE_KEY,
  };

  injectCSS();
  loadLogoImage();
})(window);
