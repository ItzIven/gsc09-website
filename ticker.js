/* Laufleiste: baut sich automatisch aus den Berichten im Abschnitt #spielberichte (neueste zuerst). */
(function () {
  var MAX = 8;
  function openReport(id, smooth) {
    var el = document.getElementById(id);
    if (!el || !el.classList.contains('match-report')) return false;
    for (var a = el; a; a = a.parentElement) { if (a.tagName === 'DETAILS') a.open = true; }
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    return true;
  }
  function build() {
    var ticker = document.querySelector('.news-ticker');
    if (!ticker) return;
    var reports = Array.prototype.slice.call(document.querySelectorAll('#spielberichte details.match-report[id]'), 0, MAX);
    if (!reports.length) return;
    var list = ticker.querySelector('.news-ticker__list');
    reports.forEach(function (r) {
      var title = r.querySelector('summary strong'), tag = r.querySelector('summary small');
      if (!title) return;
      var li = document.createElement('li'); li.className = 'news-ticker__item';
      var a = document.createElement('a'); a.href = '#' + r.id;
      if (tag) { var t = document.createElement('span'); t.className = 'news-ticker__tag'; t.textContent = tag.textContent.trim(); a.appendChild(t); }
      if (r.dataset.score) { var s = document.createElement('span'); s.className = 'news-ticker__score'; s.textContent = r.dataset.score; a.appendChild(s); }
      var st = document.createElement('strong'); st.textContent = title.textContent.trim(); a.appendChild(st);
      li.appendChild(a); list.appendChild(li);
    });
    // Zweite Kopie für eine nahtlose Schleife (für Screenreader und Tastatur ausgeblendet)
    var copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    list.parentNode.appendChild(copy);
    ticker.style.setProperty('--ticker-duration', Math.max(30, reports.length * 9) + 's');
    ticker.hidden = false;

    var toggle = ticker.querySelector('.news-ticker__toggle');
    toggle.addEventListener('click', function () {
      var paused = ticker.classList.toggle('is-paused');
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? '▶' : '❚❚';
      toggle.setAttribute('aria-label', paused ? 'Laufleiste fortsetzen' : 'Laufleiste anhalten');
    });
  }
  // Links auf Berichte (Laufleiste, Karten) öffnen den Bericht direkt
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#spielbericht-"], a[href^="#turnierbericht-"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (openReport(id, true)) { e.preventDefault(); history.replaceState(null, '', '#' + id); }
  });
  function fromHash() { var id = decodeURIComponent(location.hash.slice(1)); if (id) openReport(id, false); }
  window.addEventListener('hashchange', fromHash);
  document.addEventListener('DOMContentLoaded', function () { build(); fromHash(); });
})();
