/* Full-text search over all books. Data: search/index.js lists per-book files (search/<key>.js),
   each calls SEARCH_ADD({p:[[file,title,book],...], e:[[pageIdx, anchor, label, text],...]}). */
(function () {
  'use strict';
  var BOOKS = {
    'bereshit': 'אור עולם – פרשת בראשית', 'noach': 'ברית עולם – פרשת נח', 'lech': 'אהבת איתן – פרשת לך לך',
    'vayera': 'אהבת הקדמונים – פרשת וירא', 'chayei': 'אם בישראל – פרשת חיי שרה', 'toldot': 'כטל לישראל – פרשת תולדות',
    'vayetze': 'אבן ישראל – פרשת ויצא', 'vayishlach': 'פני אדם – פרשת וישלח', 'vayeshev': 'יסוד עולם – פרשת וישב',
    'moriah': 'אל ארץ המוריה', 'hoshanot-a': 'תענה אמונים – חלק א', 'hoshanot-b': 'תענה אמונים – חלק ב',
    'haggada': 'הגדת חירות עולם', 'menorat-zahav': 'מנורת זהב', 'achuda-na': 'אחודה נא – הקדמה'
  };
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  // Normalise: drop nikkud / cantillation and quote marks, unify final letters, maqaf/dashes → space.
  function norm(s, wantMap) {
    var out = '', map = wantMap ? [] : null;
    for (var i = 0; i < s.length; i++) {
      var c = s[i], code = s.charCodeAt(i);
      if ((code >= 0x0591 && code <= 0x05BD) || code === 0x05BF || (code >= 0x05C1 && code <= 0x05C2) || (code >= 0x05C4 && code <= 0x05C7)) continue;
      if (c === '"' || c === "'" || c === '״' || c === '׳' || c === '`') continue;
      if (c === '־' || c === '–' || c === '-') c = ' ';
      c = FIN[c] || c.toLowerCase();
      out += c; if (map) map.push(i);
    }
    if (map) map.push(s.length);
    return wantMap ? { s: out, map: map } : out;
  }
  window.SEARCH_NORM = norm;

  var form = document.querySelector('.search-form');
  if (!form) return;
  var q = document.getElementById('q'), scope = document.getElementById('scope');
  var status = document.getElementById('search-status'), list = document.getElementById('results');
  var files = window.SEARCH_FILES || [], loaded = {}, waiting = [], pending = files.length, ENTRIES = [];

  files.forEach(function (k) {
    var o = document.createElement('option'); o.value = k; o.textContent = BOOKS[k] || k; scope.appendChild(o);
  });

  window.SEARCH_ADD = function (current, d) {
    loaded[current] = 1;
    d.e.forEach(function (e) {
      var p = d.p[e[0]];
      ENTRIES.push({ key: current, file: p[0], title: p[1], book: p[2], a: e[1], label: e[2], t: e[3], n: null });
    });
  };
  function loadAll(done) {
    if (!pending) return done();
    waiting.push(done); if (waiting.length > 1) return;
    status.textContent = 'טוען את תוכן הספרים לחיפוש…';
    var left = files.length;
    files.forEach(function (k) {
      var s = document.createElement('script'); s.src = 'search/' + k + '.js'; s.async = true;
      s.onload = s.onerror = function () {
        left--; status.textContent = 'טוען את תוכן הספרים לחיפוש… (' + (files.length - left) + ' מתוך ' + files.length + ')';
        if (!left) { pending = 0; var w = waiting.splice(0); w[w.length - 1](); }
      };
      document.head.appendChild(s);
    });
  }

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function snippet(text, words, phrase) {
    var nm = norm(text, true), ns = nm.s, map = nm.map;
    var spans = [];
    words.forEach(function (w) {
      var i = 0;
      while ((i = ns.indexOf(w, i)) !== -1) { spans.push([map[i], map[i + w.length - 1] + 1]); i += w.length; }
    });
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var first = spans.length ? spans[0][0] : 0;
    var pp = phrase && words.length > 1 ? ns.indexOf(phrase) : -1;
    if (pp !== -1) first = map[pp];
    var start = Math.max(0, first - 90), end = Math.min(text.length, first + 190);
    if (start > 0) { var sp = text.indexOf(' ', start); if (sp !== -1 && sp < first) start = sp + 1; }
    if (end < text.length) { var sp2 = text.lastIndexOf(' ', end); if (sp2 > first) end = sp2; }
    var out = '', pos = start;
    spans.forEach(function (s) {
      if (s[0] < pos || s[1] > end) return;
      out += esc(text.slice(pos, s[0])) + '<mark>' + esc(text.slice(s[0], s[1])) + '</mark>'; pos = s[1];
    });
    out += esc(text.slice(pos, end));
    return (start > 0 ? '… ' : '') + out + (end < text.length ? ' …' : '');
  }

  function run() {
    var raw = q.value.trim();
    var url = new URL(location.href);
    if (raw) url.searchParams.set('q', raw); else url.searchParams.delete('q');
    if (scope.value) url.searchParams.set('in', scope.value); else url.searchParams.delete('in');
    try { history.replaceState(null, '', url); } catch (e) {}
    list.innerHTML = '';
    var phrase = norm(raw).replace(/\s+/g, ' ').trim();
    var words = phrase.split(' ').filter(function (w) { return w.length > 1 || /\d/.test(w); });
    if (!words.length) { status.textContent = raw ? 'נא להקליד לפחות שתי אותיות.' : ''; return; }
    loadAll(function () {
      var hits = [];
      for (var i = 0; i < ENTRIES.length; i++) {
        var e = ENTRIES[i];
        if (scope.value && e.key !== scope.value) continue;
        if (e.n === null) e.n = norm(e.t).replace(/\s+/g, ' ');
        var ok = true, score = 0;
        for (var j = 0; j < words.length; j++) {
          var at = e.n.indexOf(words[j]);
          if (at === -1) { ok = false; break; }
          score += 1;
        }
        if (!ok) continue;
        var head = norm(e.title + ' ' + e.label);
        var pos = [];
        words.forEach(function (w) {
          var k = 0, c = 0, ps = [];
          while ((k = e.n.indexOf(w, k)) !== -1 && c < 40) { c++; ps.push(k); k += w.length; }
          score += Math.min(c, 12) / 4; pos.push(ps);
          if (head.indexOf(w) !== -1) score += 3;
          if (ps[0] < 300) score += 1;
        });
        if (words.length > 1) {
          var pc = 0, k3 = 0; while ((k3 = e.n.indexOf(phrase, k3)) !== -1 && pc < 20) { pc++; k3 += phrase.length; }
          if (pc) score += 12 + pc;
          else {   // words close to each other count for more
            var best = 1e9;
            pos[0].forEach(function (a) { pos[1].forEach(function (b) { best = Math.min(best, Math.abs(a - b)); }); });
            if (best < 60) score += 5; else if (best < 200) score += 2;
          }
        }
        if (norm(e.label).indexOf(phrase) !== -1) score += 3;
        hits.push([score, i]);
      }
      hits.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
      var MAX = 60, html = '';
      hits.slice(0, MAX).forEach(function (h) {
        var e = ENTRIES[h[1]];
        var href = e.file + '?q=' + encodeURIComponent(raw) + (e.a === 'main' ? '' : '#' + e.a);
        html += '<li><a class="res" href="' + href + '"><span class="res-where">' + esc(e.book ? e.book + ' · ' : '') + esc(e.title) + '</span>'
          + (e.label ? '<span class="res-label">' + esc(e.label) + '</span>' : '')
          + '<span class="res-snip">' + snippet(e.t, words, phrase) + '</span></a></li>';
      });
      list.innerHTML = html;
      status.textContent = hits.length
        ? (hits.length > MAX ? 'נמצאו ' + hits.length + ' קטעים. מוצגים ' + MAX + ' הראשונים – אפשר לצמצם עם מילה נוספת או לבחור ספר.' : (hits.length === 1 ? 'נמצא קטע אחד.' : 'נמצאו ' + hits.length + ' קטעים.'))
        : 'לא נמצאו תוצאות. נסו מילה אחרת או חלק ממנה.';
    });
  }

  form.addEventListener('submit', function (ev) { ev.preventDefault(); run(); });
  scope.addEventListener('change', function () { if (q.value.trim()) run(); });
  var params = new URLSearchParams(location.search);
  if (params.get('in')) scope.value = params.get('in');
  if (params.get('q')) { q.value = params.get('q'); run(); } else { q.focus(); }
})();
