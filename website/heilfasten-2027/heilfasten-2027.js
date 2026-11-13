/* Heilfasten 2027 – Landingpage-Logik (ohne Abhängigkeiten) */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     KONFIGURATION
     Der Kauf läuft über Digistore24 (Produkt 763425).
     Bis EARLY_END führen alle Kauf-Knöpfe zum Frühbucherpreis,
     danach automatisch zum normalen Preis.
     ------------------------------------------------------------------ */
  var BUY_URL = 'https://www.checkout-ds24.com/product/763425';
  var BUY_URL_EARLY = BUY_URL + '?voucher=FRUEHBUCHER2027';
  var EARLY_END = new Date('2027-01-09T00:00:00+01:00'); // Frühbucher gilt bis 08.01.2027, 23:59 Uhr
  var FORM_ENDPOINT = ''; // nur noch für ein optionales Formular (#hf27-form), derzeit nicht auf der Seite

  var EVENTS = [
    { date: new Date('2027-01-08T19:00:00+01:00'), label: 'bis zum Informationsabend am 8. Januar 2027' },
    { date: new Date('2027-01-29T19:00:00+01:00'), label: 'bis zum Kick-off am 29. Januar 2027' },
    { date: new Date('2027-02-27T00:00:00+01:00'), label: 'bis zum gemeinsamen Fastenstart am 27. Februar 2027' }
  ];

  var root = document.querySelector('.hf27');
  if (!root) return;
  root.classList.add('hf27-js');

  /* ---------- Kauf-Knöpfe und Preisanzeige ---------- */
  var early = Date.now() < EARLY_END.getTime();
  document.querySelectorAll('[data-hf27-buy]').forEach(function (a) { a.href = early ? BUY_URL_EARLY : BUY_URL; });
  var priceEarly = root.querySelector('[data-hf27-early]'), priceRegular = root.querySelector('[data-hf27-regular]');
  if (priceEarly && priceRegular) { priceEarly.hidden = !early; priceRegular.hidden = early; }

  /* ---------- Partner-Zuordnung (Digistore24-Promocode) ----------
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

  /* ---------- Countdown ---------- */
  var cd = root.querySelector('[data-hf27-countdown]');
  if (cd) {
    var label = root.querySelector('[data-hf27-countdown-label]');
    var parts = { d: cd.querySelector('[data-d]'), h: cd.querySelector('[data-h]'), m: cd.querySelector('[data-m]'), s: cd.querySelector('[data-s]') };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var tick = function () {
      var now = Date.now(), next = null;
      for (var i = 0; i < EVENTS.length; i++) { if (EVENTS[i].date.getTime() > now) { next = EVENTS[i]; break; } }
      if (!next) { cd.parentElement.style.display = 'none'; return; }
      var diff = Math.floor((next.date.getTime() - now) / 1000);
      parts.d.textContent = Math.floor(diff / 86400);
      parts.h.textContent = pad(Math.floor(diff % 86400 / 3600));
      parts.m.textContent = pad(Math.floor(diff % 3600 / 60));
      parts.s.textContent = pad(diff % 60);
      if (label) label.textContent = 'Noch ' + label.getAttribute('data-prefix') + next.label;
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- Video (VSL) ----------
     Sobald das Video da ist: im HTML beim Element .hf27-video das Attribut
     data-video-src setzen – entweder eine MP4-Datei (z. B. /wp-content/uploads/heilfasten-2027/vsl.mp4)
     oder eine YouTube-/Vimeo-Adresse. */
  var vid = root.querySelector('.hf27-video');
  if (vid) {
    var play = vid.querySelector('.hf27-video__play');
    var start = function () {
      var src = (vid.getAttribute('data-video-src') || '').trim();
      if (!src) {
        var lbl = vid.querySelector('.hf27-video__label');
        if (lbl) { lbl.classList.add('is-pulse'); }
        return;
      }
      var el;
      var yt = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
      var vm = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (yt || vm) {
        el = document.createElement('iframe');
        el.src = yt ? 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&rel=0&modestbranding=1'
                    : 'https://player.vimeo.com/video/' + vm[1] + '?autoplay=1&title=0&byline=0&portrait=0';
        el.allow = 'autoplay; fullscreen; picture-in-picture';
        el.allowFullscreen = true;
        el.title = 'Video von Franz Prost zum Heilfasten 2027';
      } else {
        el = document.createElement('video');
        el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true;
        var poster = vid.querySelector('img'); if (poster) el.poster = poster.currentSrc || poster.src;
      }
      vid.innerHTML = ''; vid.appendChild(el);
      if (el.play) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    };
    if (play) play.addEventListener('click', start);
  }

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
        showMsg('info', 'Vorschau-Modus: Das Formular ist noch nicht mit einem Versanddienst verbunden. Es wurden keine Daten gesendet.');
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
