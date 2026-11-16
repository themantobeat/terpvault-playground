/* TerpVault PLAYGROUND: the scroll animation home page as a Web Component, rendered in the host page (no iframe).
   It loads the playground copy of home/index.html, scopes its CSS to this element, places its markup here
   and runs its scripts in the host page, so the page scroll drives the animation directly.
   Use as a Wix Custom Element (Server URL = this file, tag name tv-home-scroll) or in any page. */
(function () {
  var BASE = new URL('.', (document.currentScript && document.currentScript.src) || location.href).href;
  var HOME = BASE + 'home/';
  var VERSION = '0.2.0';
  var HOST = '.tvhs';
  var started = false;

  function track(el, action, extra) {
    var detail = Object.assign({ action: action, viewer: 'home_scroll', playground: true, v: VERSION }, extra || {});
    el.dispatchEvent(new CustomEvent('tv-viewer', { detail: detail, bubbles: true, composed: true }));
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: 'tv_scroll_' + action }, detail));
    if (el.getAttribute('ga') === 'on' && typeof window.gtag === 'function') window.gtag('event', 'tv_scroll_' + action, detail);
  }

  /* ---- CSS scoping: every rule of the copied page is limited to this element ---- */
  function splitSelectors(s) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--;
      if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function scopeSelector(sel) {
    var m = sel.match(/^(html|body|:root)(?![\w-])/);
    if (m) {
      var rest = sel.slice(m[0].length);
      var m2 = rest.match(/^(\s*>?\s*)body(?![\w-])/);            /* "html body" */
      if (m2) rest = rest.slice(m2[0].length);
      return HOST + rest;
    }
    return HOST + ' ' + sel;
  }
  function scopeRules(rules) {
    var css = '';
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.type === 1) css += splitSelectors(r.selectorText).map(scopeSelector).join(',') + '{' + r.style.cssText + '}\n';
      else if (r.type === 4) css += (/max-width/.test(r.conditionText) ? '@container tvhs ' : '@media ') + r.conditionText + '{' + scopeRules(r.cssRules) + '}\n';
      else if (r.type === 12) css += '@supports ' + r.conditionText + '{' + scopeRules(r.cssRules) + '}\n';
      else css += r.cssText + '\n';
    }
    return css;
  }

  function addScript(src, text) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      if (src) { s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Could not load ' + src)); }; }
      else s.textContent = text;
      document.body.appendChild(s);
      if (!src) resolve();
    });
  }

  class TvHomeScroll extends HTMLElement {
    connectedCallback() {
      if (started) return;
      started = true;
      var el = this;
      /* Inside a frame (the Wix editor and its preview show custom elements in one) the page's vh-based
         heights make the frame grow without end, so show a light placeholder there instead. */
      var framed = false; try { framed = window.top !== window; } catch (e) { framed = true; }
      if (framed && el.getAttribute('force') !== 'on') {
        el.style.cssText = 'display:flex;align-items:center;justify-content:center;height:320px;background:#0b0b0b;color:#7cdcd2;font:16px system-ui,sans-serif;text-align:center;padding:16px;box-sizing:border-box';
        el.textContent = 'TerpVault scroll animation (playground). It runs on the test site, not inside the editor.';
        return;
      }
      el.classList.add('tvhs');
      if (el.getAttribute('nav') !== 'on') el.classList.add('wix');   /* hide the copy's own menu when a host page has one */
      el.style.display = 'block';
      el.style.position = 'relative';
      /* Phones: Wix wraps the element in containers that stay about 87% of the screen wide. Widen each of them to the screen. */
      function widenWrappers() {
        if (window.innerWidth > 800) return;
        var n = el;
        for (var i = 0; i < 12 && n && n !== document.body; i++) {
          var w = n.getBoundingClientRect().width;
          if (w > 0 && w < window.innerWidth - 2) {
            n.style.setProperty('width', '100vw', 'important');
            n.style.setProperty('max-width', '100vw', 'important');
            n.style.setProperty('overflow', 'visible', 'important');
          }
          n = n.parentElement;
        }
      }
      widenWrappers();
      window.addEventListener('resize', widenWrappers);
      fetch(HOME + 'index.html?v=' + VERSION).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');

        /* fonts and styles */
        doc.querySelectorAll('link[rel=stylesheet]').forEach(function (l) {
          var k = document.createElement('link'); k.rel = 'stylesheet'; k.href = l.href; document.head.appendChild(k);
        });
        var css = '';
        doc.querySelectorAll('style').forEach(function (st) {
          var sheet = new CSSStyleSheet(); sheet.replaceSync(st.textContent); css += scopeRules(sheet.cssRules);
          st.remove();
        });
        css += HOST + '{display:block;position:relative;width:100%;overflow:visible;container-type:inline-size;container-name:tvhs}';
        /* Phones: the host column starts at the left edge but is about 87% of the screen wide. Widen it to the full screen, without moving it. */
        css += '@media (max-width:800px){' + HOST + '{width:100vw;max-width:100vw}}';
        var style = document.createElement('style'); style.setAttribute('data-tv-playground', VERSION); style.textContent = css;
        document.head.appendChild(style);

        /* scripts: collected in order, then removed from the markup */
        var scripts = [];
        doc.body.querySelectorAll('script').forEach(function (s) {
          scripts.push(s.getAttribute('src') ? { src: new URL(s.getAttribute('src'), HOME).href } : { text: s.textContent });
          s.remove();
        });
        /* relative asset paths point at the playground copy */
        doc.body.querySelectorAll('[src]').forEach(function (n) {
          var v = n.getAttribute('src'); if (v && !/^(data:|https?:|\/\/)/.test(v)) n.setAttribute('src', new URL(v, HOME).href);
        });
        while (doc.body.firstChild) el.appendChild(document.adoptNode(doc.body.firstChild));

        /* The copy's scripts expect to run while the page is still loading and to find their files next to the page. */
        window.__tvReady = function (fn) { Promise.resolve().then(fn); };
        window.__tvBase = HOME;
        return scripts.reduce(function (p, s) {
          return p.then(function () {
            if (s.src) return addScript(s.src);
            var t = s.text
              .replace(/document\.addEventListener\(\s*["']DOMContentLoaded["']\s*,/g, 'window.__tvReady(')
              .replace(/\},\s*\{\s*once\s*:\s*true\s*\}\s*\);(\s*async function loadBudVault)/, '});$1')
              .replace(/script\.src\s*=\s*src\s*;/g, 'script.src = new URL(src, window.__tvBase).href;')
              .replace(/fetchModels\("(m\d\.tvz\?v=\d+)"\)/g, 'fetchModels(window.__tvBase + "$1")');
            return addScript(null, t);
          });
        }, Promise.resolve());
      }).then(function () {
        track(el, 'ready', { load_ms: Math.round(performance.now()) });
        /* one event each time a new animation step comes on screen */
        var last = '';
        new MutationObserver(function () {
          var on = el.querySelector('#track .step.on, #bud-track .step.on');
          var name = on ? ((on.querySelector('h1,h2') || on).textContent || '').trim().slice(0, 60) : '';
          if (name && name !== last) { last = name; track(el, 'step', { step: name, section: on.closest('#bud-track') ? 'bud' : 'pre_roll' }); }
        }).observe(el, { subtree: true, attributes: true, attributeFilter: ['class'] });
        el.addEventListener('click', function (e) {
          var a = e.target.closest && e.target.closest('a,button');
          if (a) track(el, 'click', { label: (a.textContent || '').trim().slice(0, 40), href: a.getAttribute('href') || '' });
        });
      }).catch(function (e) {
        el.textContent = 'Playground home page failed to start: ' + e.message;
        track(el, 'error', { message: e.message });
      });
    }
  }
  if (!customElements.get('tv-home-scroll')) customElements.define('tv-home-scroll', TvHomeScroll);
  if (!customElements.get('wix-default-custom-element')) customElements.define('wix-default-custom-element', class extends TvHomeScroll {});
})();
