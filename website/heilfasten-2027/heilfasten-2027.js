/* Heilfasten 2027 – Landingpage-Logik (ohne Abhängigkeiten) */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     KONFIGURATION
     Der Kauf läuft über Digistore24 (Produkt 763425).
     Bis EARLY_END führen alle Kauf-Knöpfe (data-hf27-buy) zum Early-Bird-Preis,
     danach automatisch zum normalen Preis.
     ------------------------------------------------------------------ */
  var BUY_URL = 'https://www.checkout-ds24.com/product/763425';
  var BUY_URL_EARLY = BUY_URL + '?voucher=FRUEHBUCHER2027';
  var EARLY_END = new Date('2027-01-09T00:00:00+01:00'); // Early-Bird gilt bis 08.01.2027, 23:59 Uhr
  var FORM_ENDPOINT = ''; // nur für ein optionales Formular (#hf27-form), derzeit nicht auf der Seite

  // label: lange Zeile (Anmeldung) · title/when: kurze Fassung (Infokasten im Hero)
  var EVENTS = [
    { date: new Date('2027-01-08T19:00:00+01:00'), label: 'bis zum Infoabend am 8. Januar 2027', title: 'Infoabend live per Zoom', when: 'Fr. 08.01.2027 · 19:00 Uhr' },
    { date: new Date('2027-01-29T19:00:00+01:00'), label: 'bis zum Auftakt am 29. Januar 2027', title: 'Auftakt der Vorbereitung', when: 'Fr. 29.01.2027 · 19:00 Uhr' },
    { date: new Date('2027-02-27T00:00:00+01:00'), label: 'bis zum gemeinsamen Fastenstart am 27. Februar 2027', title: 'Gemeinsamer Fastenstart', when: 'Sa. 27.02.2027' }
  ];

  var root = document.querySelector('.hf27');
  if (!root) return;
  root.classList.add('hf27-js');

  // Testmodus: ?hf27now=2027-01-10 simuliert ein anderes Datum (Countdown, Early Bird, Preise)
  var SIM_OFFSET = 0;
  try { var sim = new URLSearchParams(location.search).get('hf27now'); if (sim) SIM_OFFSET = new Date(sim).getTime() - Date.now(); } catch (e) {}
  var nowMs = function () { return Date.now() + SIM_OFFSET; };

  /* ---------- Countdowns (Hero, Infoabend, Anmeldung) ----------
     Ohne data-hf27-target zählt ein Countdown zum nächsten Termin aus EVENTS,
     mit data-hf27-target fest zu diesem Zeitpunkt. Danach wird der Block ausgeblendet. */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  root.querySelectorAll('[data-hf27-countdown]').forEach(function (cd) {
    var box = cd.closest('[data-hf27-countdown-wrap]') || cd.parentElement;
    var label = box.querySelector('[data-hf27-countdown-label]');
    var title = box.querySelector('[data-hf27-countdown-title]');
    var when = box.querySelector('[data-hf27-countdown-when]');
    var target = cd.getAttribute('data-hf27-target');
    var parts = { d: cd.querySelector('[data-d]'), h: cd.querySelector('[data-h]'), m: cd.querySelector('[data-m]'), s: cd.querySelector('[data-s]') };
    var timer;
    var tick = function () {
      var now = nowMs(), next = null;
      if (target) { next = { date: new Date(target) }; if (next.date.getTime() <= now) next = null; }
      else for (var i = 0; i < EVENTS.length; i++) { if (EVENTS[i].date.getTime() > now) { next = EVENTS[i]; break; } }
      if (!next) { box.style.display = 'none'; clearInterval(timer); return; }
      var diff = Math.floor((next.date.getTime() - now) / 1000);
      parts.d.textContent = Math.floor(diff / 86400);
      parts.h.textContent = pad(Math.floor(diff % 86400 / 3600));
      parts.m.textContent = pad(Math.floor(diff % 3600 / 60));
      parts.s.textContent = pad(diff % 60);
      if (!target) {
        if (label) label.textContent = 'Noch ' + (label.getAttribute('data-prefix') || '') + next.label;
        if (title) title.textContent = next.title;
        if (when) when.textContent = next.when;
      }
    };
    tick(); timer = setInterval(tick, 1000);
  });

  /* ---------- Video (VSL) im Hero ----------
     Startet stumm automatisch (Untertitel sind eingebrannt). „Ton einschalten“ startet
     das Video mit Ton von vorne. Beim Weiterscrollen läuft es unten rechts als Mini-Player weiter. */
  root.querySelectorAll('[data-hf27-vsl]').forEach(function (box) {
    var v = box.querySelector('video');
    var dock = box.parentElement;
    var dismissed = false;
    v.muted = true; v.playsInline = true;
    var first = v.play();
    if (first && first.catch) first.catch(function () { box.classList.add('is-blocked'); });
    var withSound = function () {
      v.muted = false; v.currentTime = 0; v.controls = true;
      box.classList.add('is-sound'); box.classList.remove('is-blocked');
      var q = v.play(); if (q && q.catch) q.catch(function () {});
      if (window.fbq) { try { window.fbq('trackCustom', 'VideoTonAn'); } catch (e) {} }
    };
    box.querySelector('.hf27-vsl__unmute').addEventListener('click', withSound);
    box.querySelector('.hf27-vsl__play').addEventListener('click', withSound);
    box.querySelector('.hf27-vsl__close').addEventListener('click', function (e) {
      e.stopPropagation(); dismissed = true; box.classList.remove('is-mini'); v.pause();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var out = !en[en.length - 1].isIntersecting;
        box.classList.toggle('is-mini', out && !dismissed && !v.paused);
      }, { threshold: 0.25 }).observe(dock);
      // Mini-Player ausblenden, solange der Referenzen-Slider im Bild ist (er würde sonst den Pfeil verdecken)
      var refs = root.querySelector('.hf27-refs__slider');
      if (refs) new IntersectionObserver(function (en) {
        box.classList.toggle('is-tucked', en[en.length - 1].isIntersecting);
      }).observe(refs);
    }
  });

  /* ---------- Early-Bird-Hinweise nach Ablauf ausblenden ----------
     Elemente mit data-hf27-until verschwinden ab diesem Zeitpunkt; mit data-hf27-expired
     wird stattdessen dieser Text angezeigt. (Test: ?hf27now=2027-01-10 an die Adresse hängen) */
  var now = nowMs();
  root.querySelectorAll('[data-hf27-until]').forEach(function (el) {
    if (now < new Date(el.getAttribute('data-hf27-until')).getTime()) return;
    var alt = el.getAttribute('data-hf27-expired');
    if (alt) el.textContent = alt; else el.parentNode.removeChild(el);
  });

  /* ---------- Kauf-Knöpfe (Digistore24) und Preisanzeige ---------- */
  var early = now < EARLY_END.getTime();
  root.querySelectorAll('[data-hf27-buy]').forEach(function (a) { a.href = early ? BUY_URL_EARLY : BUY_URL; });
  root.querySelectorAll('[data-hf27-early]').forEach(function (el) { el.hidden = !early; });
  root.querySelectorAll('[data-hf27-regular]').forEach(function (el) { el.hidden = early; });

  /* ---------- Unterseite Infoabend: Kalenderauswahl und Tag des Infoabends ----------
     [data-ia-kal] öffnet beim Klick die Auswahl (Apple, Google, Outlook, Datei).
     Am 08.01.2027 bis 21 Uhr wird „Direkt zum Infoabend“ zum Hauptbutton (Klasse ia-heute),
     Texte und Links mit data-ia-heute-text / data-ia-heute-href werden umgestellt. */
  var kals = root.querySelectorAll('[data-ia-kal]');
  var closeKal = function () {
    kals.forEach(function (k) { k.classList.remove('is-open'); var b = k.querySelector('[aria-expanded]'); if (b) b.setAttribute('aria-expanded', 'false'); });
    document.body.classList.remove('ia-kal-offen');
  };
  // passenden Kalender zum Gerät markieren
  var ua = navigator.userAgent || '';
  var typ = /iPhone|iPad|iPod|Macintosh/.test(ua) ? 'apple' : (/Android/.test(ua) ? 'google' : '');
  if (typ) root.querySelectorAll('[data-ia-kal-typ="' + typ + '"]').forEach(function (a) { a.classList.add('is-tipp'); });
  // Apple am Mac: webcal-Link öffnet das Kalender-Programm direkt statt eine Datei herunterzuladen.
  // iPhone und iPad (auch iPad mit Mac-Kennung, erkennbar am Touchscreen) behalten den https-Link,
  // dort zeigt Safari sofort „Zum Kalender hinzufügen“.
  var istMac = /Macintosh/.test(ua) && !(navigator.maxTouchPoints > 1);
  if (istMac) root.querySelectorAll('[data-ia-kal-typ="apple"]').forEach(function (a) {
    a.href = a.href.replace(/^https?:/, 'webcal:');
    a.removeAttribute('target');
  });
  root.querySelectorAll('[data-ia-kal-zu]').forEach(function (z) { z.addEventListener('click', function (e) { e.preventDefault(); closeKal(); }); });
  root.querySelectorAll('.ia-kalwahl__item').forEach(function (a) { a.addEventListener('click', function () { setTimeout(closeKal, 300); }); });
  kals.forEach(function (k) {
    var b = k.querySelector('.ia-kalwahl__btn');
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var open = !k.classList.contains('is-open');
      closeKal();
      if (open) { k.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); if (window.matchMedia('(max-width: 768px)').matches) document.body.classList.add('ia-kal-offen'); }
    });
  });
  if (kals.length) {
    document.addEventListener('click', function (e) { if (!e.target.closest('[data-ia-kal]')) closeKal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeKal(); });
  }
  if (now >= new Date('2027-01-08T00:00:00+01:00').getTime() && now < new Date('2027-01-08T21:00:00+01:00').getTime()) {
    root.classList.add('ia-heute');
    root.querySelectorAll('[data-ia-heute-text]').forEach(function (el) { el.textContent = el.getAttribute('data-ia-heute-text'); });
    root.querySelectorAll('[data-ia-heute-href]').forEach(function (el) { el.href = el.getAttribute('data-ia-heute-href'); el.target = '_blank'; el.rel = 'noopener'; });
  }

  /* ---------- Partner-Zuordnung (Digistore24-Promocode) ----------
     Aus GitHub-Commit 503f106 übernommen.
     Kommt ein Besucher über den Link eines Partners (…/heilfasten-2027/?aff=PARTNER),
     hängt das Digistore-Skript den Partner an alle Kauf-Knöpfe an. So bekommt der
     Partner seine Provision auch dann, wenn der Browser Cookies blockiert.
     WICHTIG: muss NACH dem Setzen der Kauf-Links oben laufen, sonst wird der
     Partner wieder überschrieben. Code aus Digistore: Einstellungen > Affiliate
     Tracking > Promocode für Verkaufsseite (Produkt 763425). */
  var ds = document.createElement('script');
  ds.src = 'https://www.digistore24-scripts.com/service/digistore.js';
  ds.async = true;
  ds.onload = function () {
    if (typeof window.digistorePromocode === 'function') {
      window.digistorePromocode({ product_id: 763425, adjust_domain: true });
    }
  };
  document.head.appendChild(ds);

  /* ---------- UTM-/Kampagnen-Parameter ins Formular übernehmen ---------- */
  var form = root.querySelector('#hf27-form');
  try {
    var qs = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) {
      var v = qs.get(k);
      if (v) { try { sessionStorage.setItem('hf27_' + k, v); } catch (e) {} }
      else { try { v = sessionStorage.getItem('hf27_' + k); } catch (e) {} }
      var input = form && form.querySelector('input[name="' + k + '"]');
      if (input && v) input.value = v;
    });
  } catch (e) {}

  /* ---------- Formular ---------- */
  if (form) {
    var msg = form.querySelector('.hf27-form__msg');
    var success = root.querySelector('.hf27-success');
    var showMsg = function (type, text) { msg.className = 'hf27-form__msg is-' + type; msg.textContent = text; };
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ok = true, first = null;
      form.querySelectorAll('[required]').forEach(function (inp) {
        var wrap = inp.closest('.hf27-field, .hf27-consent');
        var valid = inp.type === 'checkbox' ? inp.checked : inp.value.trim() !== '' && inp.checkValidity();
        if (wrap) wrap.classList.toggle('is-invalid', !valid);
        if (!valid) { ok = false; if (!first) first = inp; }
      });
      if (!ok) { showMsg('error', 'Bitte füllen Sie alle Pflichtfelder (*) korrekt aus und bestätigen Sie die Datenschutzhinweise.'); if (first) first.focus(); return; }
      if (form.querySelector('.hf27-hp input').value) return; // Spam-Schutz
      if (!FORM_ENDPOINT) {
        showMsg('info', 'Vorschau: Das Formular ist noch nicht mit einem Versanddienst verbunden. Es wurden keine Daten gesendet.');
        return;
      }
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.textContent = 'Wird gesendet …';
      fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); })
        .then(function () {
          form.style.display = 'none'; success.classList.add('is-visible');
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (window.fbq) { try { window.fbq('track', 'Lead'); } catch (e) {} }
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Jetzt anmelden';
          showMsg('error', 'Leider ist etwas schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie an info@akademie-besseres-leben.eu.');
        });
    });
    form.querySelectorAll('input, textarea').forEach(function (inp) {
      inp.addEventListener('input', function () { var w = inp.closest('.hf27-field, .hf27-consent'); if (w) w.classList.remove('is-invalid'); });
      inp.addEventListener('change', function () { var w = inp.closest('.hf27-field, .hf27-consent'); if (w) w.classList.remove('is-invalid'); });
    });
  }

  /* ---------- Sticky-CTA (mobil) ---------- */
  var sticky = document.querySelector('.hf27-sticky');
  var hero = root.querySelector('.hf27-hero');
  var signup = root.querySelector('#anmeldung');
  if (sticky && hero && 'IntersectionObserver' in window) {
    document.body.classList.add('hf27-has-sticky');
    var heroVisible = true, signupVisible = false;
    var update = function () { sticky.classList.toggle('is-visible', !heroVisible && !signupVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[e.length - 1].isIntersecting; update(); }, { rootMargin: '-120px 0px 0px 0px' }).observe(hero);
    if (signup) new IntersectionObserver(function (e) { signupVisible = e[e.length - 1].isIntersecting; update(); }).observe(signup);
    // im Footer-Bereich ausblenden, damit nichts verdeckt wird
    var footer = document.getElementById('tbp_footer');
    var footerVisible = false;
    if (footer) new IntersectionObserver(function (e) { footerVisible = e[e.length - 1].isIntersecting; update(); }).observe(footer);
    update = function () { sticky.classList.toggle('is-visible', !heroVisible && !signupVisible && !footerVisible); };
  }

  /* ---------- Gastreferenten: „Mehr erfahren“ ---------- */
  var speakers = Array.prototype.slice.call(root.querySelectorAll('.hf27-speaker'));
  speakers.forEach(function (card) {
    var btn = card.querySelector('.hf27-speaker__toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.firstChild.nodeValue = open ? 'Weniger anzeigen' : 'Mehr erfahren';
    });
  });
  // Kopfbereich (Bild, Name, Fachgebiete) je Reihe gleich hoch, damit „Mehr erfahren“ auf einer Linie steht
  var heads = speakers.map(function (c) { return c.querySelector('.hf27-speaker__head'); }).filter(Boolean);
  var alignHeads = function () {
    heads.forEach(function (h) { h.style.minHeight = ''; });
    var rows = {}, groups = Array.prototype.slice.call(root.querySelectorAll('.hf27-speakers'));
    heads.forEach(function (h) {
      var card = h.parentNode;
      var key = groups.indexOf(card.parentNode) + ':' + Math.round(card.offsetTop);
      (rows[key] = rows[key] || []).push(h);
    });
    Object.keys(rows).forEach(function (k) {
      var list = rows[k];
      if (list.length < 2) return;
      var max = Math.max.apply(null, list.map(function (h) { return h.offsetHeight; }));
      list.forEach(function (h) { h.style.minHeight = max + 'px'; });
    });
  };
  if (heads.length) {
    var alignTick = false;
    var onAlign = function () { if (!alignTick) { alignTick = true; requestAnimationFrame(function () { alignTick = false; alignHeads(); }); } };
    window.addEventListener('resize', onAlign);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onAlign);
    window.addEventListener('load', onAlign);
    alignHeads();
  }

  /* ---------- Referenzen-Slider ---------- */
  Array.prototype.forEach.call(root.querySelectorAll('[data-hf27-slider]'), function (slider) {
    var track = slider.querySelector('.hf27-refs__track');
    var viewport = slider.querySelector('.hf27-refs__viewport');
    var next = slider.querySelector('.hf27-refs__next');
    var slides = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(slider.querySelectorAll('.hf27-refs__dot'));
    var index = 0;
    var go = function (i) {
      index = (i + slides.length) % slides.length;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.style.transform = 'translateX(calc(' + (-index * 100) + '% - ' + (index * gap) + 'px))';
      slides.forEach(function (s, k) {
        var on = k === index;
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '');
        var v = s.querySelector('video');
        if (!on && v && !v.paused) v.pause();
      });
      dots.forEach(function (d, k) { if (k === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    };
    if (slides.length < 2) { if (next) next.style.display = 'none'; dots.forEach(function (d) { d.style.display = 'none'; }); }
    if (next) next.addEventListener('click', function () { go(index + 1); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    slider.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'VIDEO') return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    });
    // Wischen auf dem Handy
    var x0 = null, y0 = 0;
    viewport.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) go(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
    window.addEventListener('resize', function () { go(index); });
    // Interview-Videos: sobald ein <video> im Platzhalter steckt, startet der Play-Button es
    slides.forEach(function (s) {
      var btn = s.querySelector('.hf27-ref__play'), v = s.querySelector('.hf27-ref__media video');
      if (!btn || !v) return;
      btn.disabled = false;
      btn.addEventListener('click', function () {
        var hero = root.querySelector('[data-hf27-vsl] video');
        if (hero && !hero.paused) hero.pause();
        v.controls = true;
        s.classList.add('is-playing');
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
    go(0);
  });

  /* ---------- Sanftes Einblenden ---------- */
  // Alles, was im oder oberhalb des sichtbaren Bereichs liegt, wird angezeigt –
  // auch nach schnellem Scrollen oder einem Sprung per Anker-Link.
  var pending = Array.prototype.slice.call(root.querySelectorAll('.hf27-reveal'));
  var ticking = false;
  var reveal = function () {
    ticking = false;
    var limit = window.innerHeight * 0.94;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) { el.classList.add('is-in'); return false; }
      return true;
    });
    if (!pending.length) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }
  };
  var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(reveal); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('hashchange', function () { setTimeout(reveal, 50); });
  reveal();
  setTimeout(reveal, 400);
})();
