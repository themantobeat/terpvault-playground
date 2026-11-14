/* TerpVault PLAYGROUND viewer (experimental copy, not connected to production).
   A Web Component that renders the 3D viewer directly in the host page: no iframe.
   Use as a Wix Custom Element (Server URL = this file, tag name tv-viewer) or in any page. */
(function () {
  var BASE = new URL('.', (document.currentScript && document.currentScript.src) || location.href).href;
  var VERSION = '0.1.0';
  var mvReady = null;
  function loadModelViewer() {
    if (!mvReady) {
      mvReady = customElements.get('model-viewer')
        ? Promise.resolve()
        : import(BASE + 'assets/model-viewer.min.js').then(function () { return customElements.whenDefined('model-viewer'); });
    }
    return mvReady;
  }

  /* Interaction events go three places, all in the real page so recorders and tag managers can see them:
     1. a DOM CustomEvent "tv-viewer" on the element (bubbles),
     2. window.dataLayer (GTM / gtag style),
     3. gtag('event', ...) only when the page already has gtag AND the element has a ga="on" attribute.
     Nothing is sent to any analytics property by default. */
  function track(el, action, extra) {
    var detail = Object.assign({ action: action, viewer: el.getAttribute('name') || 'display', playground: true, v: VERSION }, extra || {});
    el.dispatchEvent(new CustomEvent('tv-viewer', { detail: detail, bubbles: true, composed: true }));
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'tv_viewer_' + action }, detail));
    if (el.getAttribute('ga') === 'on' && typeof window.gtag === 'function') window.gtag('event', 'tv_viewer_' + action, detail);
    el.setAttribute('data-last-action', action);
  }

  var CSS = [
    ':host{display:block;position:relative;width:100%;height:72vh;min-height:420px;background:#0b0b0b;color:#f3eee3;font-family:system-ui,sans-serif;overflow:hidden}',
    '@media (max-width:700px){:host{height:62dvh;min-height:360px}}',
    'model-viewer{width:100%;height:100%;background:radial-gradient(circle at 50% 40%,#222 0,#0b0b0b 70%);--poster-color:transparent}',
    '.bar{position:absolute;left:0;right:0;bottom:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;pointer-events:none}',
    '.bar button{pointer-events:auto;font:500 14px system-ui,sans-serif;border:1px solid #7cdcd2;background:rgba(11,11,11,.72);color:#7cdcd2;border-radius:999px;padding:9px 16px;cursor:pointer}',
    '.bar button[aria-pressed=true]{background:#7cdcd2;color:#0b0b0b}',
    '.tag{position:absolute;top:10px;left:12px;font-size:11px;letter-spacing:.08em;color:#a9a59c;text-transform:uppercase}',
    '.err{position:absolute;inset:auto 0 50% 0;text-align:center;color:#f08080;font-size:14px}'
  ].join('');

  class TvViewer extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      var el = this;
      var root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>' + CSS + '</style><span class="tag">Playground ' + VERSION + '</span><p class="err" hidden></p>';
      loadModelViewer().then(function () {
        var mv = document.createElement('model-viewer');
        var attrs = {
          src: el.getAttribute('src') || BASE + 'assets/terp_vault_display.glb',
          alt: 'TerpVault Pre-Roll and Bud Vault display',
          'camera-controls': '', 'touch-action': 'pan-y', 'auto-rotate': '', 'auto-rotate-delay': '2500',
          'rotation-per-second': '14deg', 'camera-orbit': '0deg 78deg auto', 'shadow-intensity': '0.9',
          exposure: '0.85', 'tone-mapping': 'aces', 'environment-image': 'neutral', 'shadow-softness': '0.6',
          'interaction-prompt': 'auto'
        };
        Object.keys(attrs).forEach(function (k) { mv.setAttribute(k, attrs[k]); });
        root.appendChild(mv);
        el.viewer = mv;

        var bar = document.createElement('div');
        bar.className = 'bar';
        bar.innerHTML = '<button data-a="spin" aria-pressed="true">Auto spin</button><button data-a="top">Top view</button><button data-a="reset">Reset view</button>';
        root.appendChild(bar);
        bar.addEventListener('click', function (e) {
          var a = e.target && e.target.getAttribute('data-a');
          if (!a) return;
          if (a === 'spin') {
            var on = !mv.hasAttribute('auto-rotate');
            mv.toggleAttribute('auto-rotate', on);
            e.target.setAttribute('aria-pressed', String(on));
            track(el, 'control', { control: 'auto_spin', value: on ? 'on' : 'off' });
          } else if (a === 'top') {
            mv.cameraOrbit = '0deg 8deg auto';
            track(el, 'control', { control: 'top_view' });
          } else {
            mv.cameraOrbit = '0deg 78deg auto'; mv.fieldOfView = 'auto';
            track(el, 'control', { control: 'reset_view' });
          }
        });

        mv.addEventListener('load', function () { track(el, 'load', { load_ms: Math.round(performance.now()) }); });
        mv.addEventListener('error', function () {
          var p = root.querySelector('.err'); p.hidden = false; p.textContent = 'Could not load the model.';
          track(el, 'error');
        });

        /* Rotation and zoom: one event per gesture (not per frame), with how far it moved. */
        var g = null, timer = null;
        mv.addEventListener('camera-change', function (ev) {
          if (!ev.detail || ev.detail.source !== 'user-interaction') return;
          var o = mv.getCameraOrbit(), deg = o.theta * 180 / Math.PI;
          if (!g) g = { theta: deg, radius: o.radius, phi: o.phi };
          g.endTheta = deg; g.endRadius = o.radius; g.endPhi = o.phi;
          clearTimeout(timer);
          timer = setTimeout(function () {
            var dRot = Math.abs(g.endTheta - g.theta) + Math.abs(g.endPhi - g.phi) * 180 / Math.PI;
            var dZoom = g.radius ? (g.endRadius - g.radius) / g.radius : 0;
            if (dRot > 3) track(el, 'rotate', { degrees: Math.round(dRot) });
            if (Math.abs(dZoom) > 0.03) track(el, 'zoom', { direction: dZoom < 0 ? 'in' : 'out', percent: Math.round(Math.abs(dZoom) * 100) });
            g = null;
          }, 400);
        });
      }).catch(function (e) {
        var p = root.querySelector('.err'); p.hidden = false; p.textContent = 'Viewer failed to start: ' + e.message;
      });
    }
  }
  if (!customElements.get('tv-viewer')) customElements.define('tv-viewer', TvViewer);
  /* Wix sometimes keeps its default tag name, so register that too (as a separate class). */
  if (!customElements.get('wix-default-custom-element')) customElements.define('wix-default-custom-element', class extends TvViewer {});
})();
