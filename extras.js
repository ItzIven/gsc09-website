/* Nächstes Heimspiel (aus data.js), Galerie mit Lightbox, Probetraining-Anfrage, Impressum */
(function () {
  'use strict';

  /* ---------- Galerie: neue Bilder einfach hier ergänzen ---------- */
  var GALLERY = [
    { album: 'Saison 2026/27', src: 'assets/finale-herren-b-2026.webp', w: 1536, h: 832, alt: 'Zwei GSC-Jugendspieler im Finale der Kreismeisterschaften Herren B', caption: 'Kreismeisterschaften 2026 · Finale Herren B mit zwei GSC-Jugendspielern' },
    { album: 'Saison 2026/27', src: 'assets/kreismeister-iven-2026.webp', w: 1536, h: 920, alt: 'Siegerehrung der Herren A mit Kreismeister Iven Kammin', caption: 'Kreismeisterschaften 2026 · Iven Kammin gewinnt die Herren A' },
    { album: 'Saison 2026/27', src: 'assets/jugend-kem-gnoien-2026.webp', w: 1600, h: 1200, alt: 'GSC-Jugendliche und Trainer mit Medaillen und Urkunden bei den Kreismeisterschaften in Gnoien', caption: 'Jugend-Kreismeisterschaften in Gnoien' },
    { album: 'Saison 2026/27', src: 'assets/erste-mannschaft-2026.webp', w: 2000, h: 1243, alt: 'Die erste Mannschaft des Güstrower SC 09', caption: 'Unsere 1. Mannschaft · Landesliga West' },
    { album: 'Saison 2026/27', src: 'assets/jugend-banner-2026.webp', w: 1536, h: 592, alt: 'Die GSC-Jugend präsentiert das neue grün-gelbe Tischtennisbanner', caption: 'Unser neues Banner – vorgestellt von der Jugend' },
    { album: 'Training & Vereinsleben', src: 'assets/vereinsleben-training.webp', w: 1448, h: 734, alt: 'Nachwuchsspieler beim Training an der Platte in der Sporthalle', caption: 'Nachwuchstraining' },
    { album: 'Training & Vereinsleben', src: 'assets/vereinsleben-jugendgruppe.webp', w: 1800, h: 1350, alt: 'Kinder und Jugendliche des GSC in der Sporthalle bei einer Besprechung', caption: 'Unser Nachwuchs in der Halle' },
    { album: 'Training & Vereinsleben', src: 'assets/vereinsleben-mannschaft.webp', w: 1024, h: 1002, alt: 'Vier GSC-Spieler in Vereinstrikots stehen Arm in Arm in der Halle', caption: 'Teamgeist an der Platte' }
  ];

  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* ---------- Nächstes Heimspiel ---------- */
  function nextHomeGame() {
    var box = document.getElementById('heimspiel');
    var data = window.GSC_DATA;
    if (!box || !data || !data.fixtures) return;
    var now = new Date();
    var games = data.fixtures.filter(function (f) {
      if (!f.home || f.score || !f.date || !f.time || /entfällt|zurückgezogen/i.test(f.note || '')) return false;
      var start = new Date(f.date + 'T' + f.time + ':00');
      return start.getTime() + 3 * 3600e3 > now.getTime(); // bis 3 h nach Beginn anzeigen
    }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    if (!games.length) return;

    var g = games[0], start = new Date(g.date + 'T' + g.time + ':00');
    var team = (data.teams || []).filter(function (t) { return g.teams && t.id === g.teams[0]; })[0];
    var isToday = start.toDateString() === now.toDateString();

    box.querySelector('[data-nm="label"]').textContent = (team ? team.title + ' · ' + team.league : 'Heimspiel');
    var today = box.querySelector('.next-match__today'); today.hidden = !isToday;
    var teams = box.querySelector('[data-nm="teams"]');
    teams.textContent = '';
    teams.appendChild(document.createTextNode(g.homeName.replace(/\s+/g, ' ')));
    teams.appendChild(el('span', null, ' vs. '));
    teams.appendChild(document.createTextNode(g.awayName.replace(/\s+/g, ' ')));
    box.querySelector('[data-nm="when"]').textContent =
      DAYS[start.getDay()] + ', ' + start.getDate() + '. ' + MONTHS[start.getMonth()] + ' ' + start.getFullYear() + ' · ' + g.time + ' Uhr';
    box.querySelector('.next-match__live').hidden = !isToday;

    var more = box.querySelector('[data-nm="more"]');
    games.slice(1, 4).forEach(function (f) {
      var d = new Date(f.date + 'T12:00:00');
      var li = el('li');
      li.appendChild(el('span', null, pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '. · ' + f.time));
      li.appendChild(el('span', null, f.homeName.replace(/\s+/g, ' ') + ' – ' + f.awayName.replace(/\s+/g, ' ')));
      more.appendChild(li);
    });
    if (!more.children.length) more.closest('.next-match__more').hidden = true;

    var cd = box.querySelector('.countdown');
    function tick() {
      var diff = Math.max(0, start.getTime() - Date.now());
      var d = Math.floor(diff / 864e5), h = Math.floor(diff % 864e5 / 36e5), m = Math.floor(diff % 36e5 / 6e4);
      cd.querySelector('[data-cd="d"]').textContent = d;
      cd.querySelector('[data-cd="h"]').textContent = pad(h);
      cd.querySelector('[data-cd="m"]').textContent = pad(m);
      cd.setAttribute('aria-label', diff ? 'Noch ' + d + ' Tage, ' + h + ' Stunden, ' + m + ' Minuten bis zum Anpfiff' : 'Das Spiel läuft');
    }
    tick(); setInterval(tick, 30000);
    box.hidden = false;
  }

  /* ---------- Galerie mit Lightbox ---------- */
  function gallery() {
    var root = document.getElementById('galerie');
    if (!root) return;
    var tabs = root.querySelector('.gallery-tabs'), grid = root.querySelector('.gallery-grid');
    var albums = GALLERY.map(function (p) { return p.album; }).filter(function (a, i, arr) { return arr.indexOf(a) === i; });
    var current = [], idx = 0;
    var box = document.getElementById('lightbox'), img = box.querySelector('img'), cap = box.querySelector('figcaption');

    function show(album) {
      current = GALLERY.filter(function (p) { return p.album === album; });
      grid.textContent = '';
      current.forEach(function (p, i) {
        var li = el('li'), b = el('button'), im = el('img');
        b.type = 'button'; b.setAttribute('aria-label', p.alt + ' – Bild groß ansehen');
        im.src = p.src; im.alt = ''; im.width = p.w; im.height = p.h; im.loading = 'lazy'; im.decoding = 'async';
        b.appendChild(im); b.appendChild(el('span', null, p.caption));
        b.addEventListener('click', function () { open(i); });
        li.appendChild(b); grid.appendChild(li);
      });
      Array.prototype.forEach.call(tabs.children, function (t) { t.setAttribute('aria-pressed', String(t.textContent === album)); });
    }
    function render() { var p = current[idx]; img.src = p.src; img.alt = p.alt; cap.textContent = p.caption + ' (' + (idx + 1) + '/' + current.length + ')'; }
    function open(i) { idx = i; render(); box.showModal(); }
    function step(n) { idx = (idx + n + current.length) % current.length; render(); }
    box.querySelector('.lightbox__nav--prev').addEventListener('click', function () { step(-1); });
    box.querySelector('.lightbox__nav--next').addEventListener('click', function () { step(1); });
    box.querySelector('.dialog-close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });

    albums.forEach(function (a) {
      var b = el('button', null, a); b.type = 'button';
      b.addEventListener('click', function () { show(a); });
      tabs.appendChild(b);
    });
    show(albums[0]);
  }

  /* ---------- Probetraining-Anfrage (öffnet E-Mail, keine Daten auf der Website) ---------- */
  function trialForm() {
    var form = document.getElementById('probetraining');
    if (!form) return;
    var err = form.querySelector('.trial-form__error');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      if (!f.name.value.trim() || !f.kontakt.value.trim()) {
        err.textContent = 'Bitte Namen und eine Telefonnummer oder E-Mail-Adresse angeben.'; err.hidden = false; return;
      }
      err.hidden = true;
      var lines = [
        'Hallo Matthias,', '', 'ich möchte gern zum Probetraining beim GSC 09 Tischtennis kommen.', '',
        'Name: ' + f.name.value.trim(),
        'Gruppe: ' + f.gruppe.value,
        f.alter.value ? 'Alter: ' + f.alter.value : null,
        'Erfahrung: ' + f.erfahrung.value,
        'Erreichbar unter: ' + f.kontakt.value.trim(),
        f.nachricht.value.trim() ? '' : null,
        f.nachricht.value.trim() || null,
        '', 'Viele Grüße', f.name.value.trim()
      ].filter(function (l) { return l !== null; });
      location.href = 'mailto:' + form.dataset.to + '?subject=' + encodeURIComponent('Probetraining GSC 09 Tischtennis – ' + f.name.value.trim()) +
        '&body=' + encodeURIComponent(lines.join('\n'));
    });
  }

  /* ---------- Impressum ---------- */
  function impressum() {
    var btn = document.querySelector('[data-impressum]'), dlg = document.getElementById('info-dialog'), tpl = document.getElementById('impressum-template');
    if (!btn || !dlg || !tpl) return;
    btn.addEventListener('click', function () {
      var c = document.getElementById('dialog-content');
      c.textContent = ''; c.appendChild(tpl.content.cloneNode(true));
      dlg.showModal();
    });
    var close = dlg.querySelector('.dialog-close');
    if (close) close.addEventListener('click', function () { if (dlg.open) dlg.close(); });
    if (location.hash === '#impressum') btn.click();
  }

  document.addEventListener('DOMContentLoaded', function () {
    [nextHomeGame, gallery, trialForm, impressum].forEach(function (fn) { try { fn(); } catch (e) { console.warn(fn.name, e); } });
  });
})();
