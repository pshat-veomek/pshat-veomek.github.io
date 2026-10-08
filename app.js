// always open a page at its top unless a #anchor was requested
(function () {
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  if (!location.hash) {
    window.scrollTo(0, 0);
    window.addEventListener('load', function () { if (!location.hash) window.scrollTo(0, 0); });
  }
})();
(function () {
  // ---- reader text size ----
  var root = document.documentElement;
  var KEY = 'reader-size';
  function getSize() { try { var v = parseInt(localStorage.getItem(KEY), 10); return v >= 15 && v <= 32 ? v : 20; } catch (e) { return 20; } }
  function setSize(v) { v = Math.max(15, Math.min(32, v)); root.style.setProperty('--reader-size', v + 'px'); try { localStorage.setItem(KEY, String(v)); } catch (e) {} }
  var reader = document.querySelector('.reader');
  if (reader) {
    setSize(getSize());
    document.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.getAttribute('data-size');
        setSize(d === '0' ? 20 : getSizeNow() + parseInt(d, 10));
      });
    });
  }
  function getSizeNow() { return parseInt(getComputedStyle(root).getPropertyValue('--reader-size'), 10) || 20; }

  // ---- active verse chip while scrolling ----
  var chips = Array.prototype.slice.call(document.querySelectorAll('.toolbar .chip'));
  if (chips.length && 'IntersectionObserver' in window) {
    var byId = {};
    chips.forEach(function (c) { var k = c.getAttribute('href').slice(1); if (!byId[k]) byId[k] = c; });
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var c = byId[en.target.id];
          if (c && c !== current) {
            if (current) current.classList.remove('on');
            c.classList.add('on'); current = c;
            var bar = c.parentNode;
            var target = c.offsetLeft - bar.clientWidth / 2 + c.clientWidth / 2;
            bar.scrollTo({ left: target, behavior: 'smooth' });
          }
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('.vsec').forEach(function (s) { io.observe(s); });
  }

  // ---- footnote popover ----
  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('sup.fr a');
    if (a) {
      var id = a.getAttribute('href').slice(1);
      var note = document.getElementById(id);
      if (!note) return;
      e.preventDefault();
      closePop();
      pop = document.createElement('div');
      pop.className = 'pop';
      pop.setAttribute('role', 'note');
      var body = note.querySelector('.nb');
      pop.innerHTML = '<button class="pop-close" type="button" aria-label="סגירת ההערה">×</button><span class="pop-n">הערה ' + a.textContent + '</span> ' + (body ? body.innerHTML : '') + '<p><a href="#' + id + '">מעבר להערה ברשימה</a></p>';
      document.body.appendChild(pop);
      var r = a.getBoundingClientRect();
      var w = pop.offsetWidth;
      var left = Math.min(Math.max(16, r.left + window.scrollX - w / 2), document.documentElement.clientWidth - w - 16);
      pop.style.left = left + 'px';
      pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
      pop.querySelector('.pop-close').addEventListener('click', closePop);
      pop.querySelector('a').addEventListener('click', closePop);
      return;
    }
    if (pop && !pop.contains(e.target)) closePop();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

  // ---- order form: sent by email to the author ----
  var ORDER_TO = 'shlomo6963@gmail.com';
  var form = document.getElementById('order-form');
  function qtyOf(cb) { var q = cb.closest('.opt').querySelector('.qty'); var n = parseInt(q && q.value, 10); return n > 0 ? n : 1; }
  // promotion on the 55 ₪ books: every 2 for 100 ₪, and every 4 earn a free riddle booklet
  var gifts = [];                       // chosen free booklets
  function promo() {
    var n = 0;
    form.querySelectorAll('input[name="book"][data-promo]:checked').forEach(function (cb) { n += qtyOf(cb); });
    return { n: n, discount: Math.floor(n / 2) * 10, giftsDue: Math.floor(n / 4) };
  }
  function orderLines() {
    var total = 0, lines = [];
    form.querySelectorAll('input[name="book"]:checked').forEach(function (cb) {
      var q = qtyOf(cb), p = parseInt(cb.getAttribute('data-price'), 10) || 0;
      total += q * p;
      lines.push(cb.value + (q > 1 ? ' × ' + q : '') + ' – ' + (q * p) + ' ₪');
    });
    var pr = promo();
    if (pr.discount) lines.push('הנחת מבצע (2 ספרים ב־100 ₪): ' + pr.discount + ' ₪');
    gifts.slice(0, pr.giftsDue).forEach(function (g) { lines.push(g + ' – מתנה (מבצע 4 ספרים)'); });
    return { lines: lines, total: total - pr.discount, before: total, discount: pr.discount };
  }
  if (form) {
    var sumEl = document.getElementById('order-sum'), breakEl = document.getElementById('order-break');
    var gd = document.getElementById('gift-dialog'), asked = 0, giftSlot = 0;
    function openGift() { if (gd && gd.showModal && !gd.open) gd.showModal(); }
    function updSum() {
      var pr = promo();
      if (gifts.length > pr.giftsDue) gifts.length = pr.giftsDue;
      if (asked > pr.giftsDue) asked = pr.giftsDue;
      if (pr.giftsDue > asked) { asked = pr.giftsDue; if (gifts.length < pr.giftsDue) { giftSlot = gifts.length; openGift(); } }
      var o = orderLines(), html = '';
      if (o.discount) html += '<p>מחיר לפני הנחה: ' + o.before + ' ₪ · <b class="promo-off">הנחת מבצע: ' + o.discount + ' ₪</b></p>';
      for (var i = 0; i < pr.giftsDue; i++) {
        html += gifts[i] ? '<p class="gift-line">🎁 מתנה: <b>' + gifts[i] + '</b> <button type="button" class="gift-change" data-i="' + i + '">החלפה</button></p>'
                         : '<p class="gift-line">🎁 מגיעה לך חוברת חידות במתנה! <button type="button" class="gift-change" data-i="' + i + '">בחירת חוברת</button></p>';
      }
      if (pr.n % 4 === 3) html += '<p class="promo-hint">עוד ספר אחד (55 ₪) – וחוברת חידות במתנה!</p>';
      else if (pr.n % 2 === 1) html += '<p class="promo-hint">עוד ספר אחד (55 ₪) – והזוג ב־100 ₪.</p>';
      if (breakEl) breakEl.innerHTML = html;
      if (sumEl) sumEl.textContent = o.total + ' ₪';
    }
    if (gd) {
      gd.querySelectorAll('.gift-opt').forEach(function (b) {
        b.addEventListener('click', function () { gifts[giftSlot < gifts.length ? giftSlot : gifts.length] = b.getAttribute('data-gift'); giftSlot = gifts.length; gd.close(); updSum(); });
      });
      gd.querySelector('.gift-later').addEventListener('click', function () { gd.close(); });
      gd.addEventListener('click', function (e) { if (e.target === gd) gd.close(); });
    }
    if (breakEl) breakEl.addEventListener('click', function (e) {
      var b = e.target.closest('.gift-change'); if (!b) return;
      giftSlot = parseInt(b.getAttribute('data-i'), 10); openGift();
    });
    form.querySelectorAll('input[name="book"]').forEach(function (cb) {
      cb.addEventListener('change', function () { var q = cb.closest('.opt').querySelector('.qty'); if (q) { q.disabled = !cb.checked; if (!cb.checked) q.value = 1; } updSum(); });
    });
    form.querySelectorAll('.qty').forEach(function (q) { q.addEventListener('input', updSum); });
    form.addEventListener('reset', function () { gifts = []; asked = 0; setTimeout(function () { form.querySelectorAll('.qty').forEach(function (q) { q.disabled = true; }); updSum(); }, 0); });
    function orderText(picked) {
      var v = function (n) { return (form.elements[n] && form.elements[n].value || '').trim(); };
      return 'הזמנת ספרים מהאתר "פשט ועומק במקרא"\n\n' +
        'שם: ' + v('name') + '\nטלפון: ' + v('phone') + '\nדואר אלקטרוני: ' + v('email') + '\nכתובת למשלוח: ' + v('address') +
        '\n\nהספרים המבוקשים:\n' + picked.map(function (b) { return '• ' + b; }).join('\n') +
        '\n\nסה"כ לתשלום: ' + orderLines().total + ' ₪ (לא כולל משלוח – מחיר המשלוח יתואם עם הלקוח)';
    }
    function mailtoHref(picked) {
      return 'mailto:' + ORDER_TO + '?subject=' + encodeURIComponent('הזמנת ספרים מהאתר') + '&body=' + encodeURIComponent(orderText(picked));
    }
    function showDone(picked, how) {
      form.hidden = true;
      var done = document.getElementById('order-done');
      document.getElementById('done-list').textContent = picked.join(' · ') + ' · סה"כ ' + orderLines().total + ' ₪';
      var note = document.getElementById('done-how');
      if (how === 'sent') {
        note.innerHTML = 'ההזמנה נשלחה בדואר אלקטרוני למחבר. ניצור אתכם קשר בהקדם לאישור ולתיאום המשלוח.';
      } else {
        note.innerHTML = 'נפתחה הודעת דואר אלקטרוני מוכנה – יש ללחוץ בה על "שליחה". אם ההודעה לא נפתחה, ' +
          '<a href="' + mailtoHref(picked) + '">לחצו כאן</a> או שלחו את פרטי ההזמנה לכתובת <a href="mailto:' + ORDER_TO + '">' + ORDER_TO + '</a>.';
      }
      done.hidden = false;
      done.scrollIntoView({ block: 'start' });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('form-msg');
      var picked = orderLines().lines;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (!picked.length) { msg.textContent = 'יש לסמן לפחות ספר אחד.'; return; }
      msg.textContent = 'שולח…';
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      var fallback = function () { btn.disabled = false; msg.textContent = ''; window.location.href = mailtoHref(picked); showDone(picked, 'mailto'); };
      var data = {
        _subject: 'הזמנת ספרים מהאתר – ' + form.elements.name.value.trim(),
        _template: 'box', _captcha: 'false',
        'שם': form.elements.name.value.trim(), 'טלפון': form.elements.phone.value.trim(),
        'דואר אלקטרוני': form.elements.email.value.trim(), 'כתובת למשלוח': form.elements.address.value.trim(),
        'ספרים': picked.join(' | '), 'סה"כ': orderLines().total + ' ₪ (לא כולל משלוח)', _replyto: form.elements.email.value.trim()
      };
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
      try {
        fetch('https://formsubmit.co/ajax/' + ORDER_TO, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined
        }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
          .then(function (j) { clearTimeout(timer); btn.disabled = false; msg.textContent = '';
            if (j && (j.success === true || j.success === 'true')) showDone(picked, 'sent'); else fallback(); })
          .catch(function () { clearTimeout(timer); fallback(); });
      } catch (err) { clearTimeout(timer); fallback(); }
    });
    var again = document.getElementById('order-again');
    if (again) again.addEventListener('click', function () { form.reset(); form.hidden = false; document.getElementById('order-done').hidden = true; });
  }
})();

// contact form: sent by email to the author (FormSubmit), mailto as fallback
(function () {
  var TO = 'shlomo6963@gmail.com';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var msg = document.getElementById('contact-msg'), done = document.getElementById('contact-done');
  var btn = form.querySelector('button[type="submit"]');
  function v(n) { return (form.elements[n].value || '').trim(); }
  function mailto() {
    return 'mailto:' + TO + '?subject=' + encodeURIComponent('פנייה מהאתר – ' + v('name')) +
      '&body=' + encodeURIComponent(v('message') + '\n\n' + v('name') + '\n' + v('email'));
  }
  function showDone(how) {
    form.hidden = true;
    document.getElementById('contact-how').innerHTML = how === 'sent'
      ? 'ההודעה התקבלה ותגיע אל הרב שלמה מונדשיין. התשובה תישלח לכתובת שמסרתם.'
      : 'נפתחה הודעת דואר אלקטרוני מוכנה – יש ללחוץ בה על "שליחה". אם היא לא נפתחה, <a href="' + mailto() +
        '">לחצו כאן</a> או כתבו ישירות לכתובת <a href="mailto:' + TO + '">' + TO + '</a>.';
    done.hidden = false;
    done.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    msg.textContent = 'שולח…';
    btn.disabled = true;
    var fallback = function () { btn.disabled = false; msg.textContent = ''; window.location.href = mailto(); showDone('mailto'); };
    var data = {
      _subject: 'פנייה מהאתר – ' + v('name'), _template: 'box', _captcha: 'false', _replyto: v('email'),
      'שם': v('name'), 'דואר אלקטרוני': v('email'), 'הודעה': v('message')
    };
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    try {
      fetch('https://formsubmit.co/ajax/' + TO, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) { clearTimeout(timer); btn.disabled = false; msg.textContent = '';
          if (j && (j.success === true || j.success === 'true')) showDone('sent'); else fallback(); })
        .catch(function () { clearTimeout(timer); fallback(); });
    } catch (err) { clearTimeout(timer); fallback(); }
  });
  document.getElementById('contact-again').addEventListener('click', function () {
    form.reset(); form.hidden = false; done.hidden = true; form.elements.name.focus();
  });
})();

// approbation letters: open in a dialog
(function () {
  var dlg = document.getElementById('hask-dialog');
  if (!dlg) return;
  var body = dlg.querySelector('.hk-body');
  document.querySelectorAll('.hask-tile').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById('hask-' + b.getAttribute('data-hask'));
      if (!t) return;
      body.innerHTML = '';
      body.appendChild(t.content.cloneNode(true));
      var items = body.querySelectorAll('.fm-item');
      function pick(btn) {
        items.forEach(function (x) { x.setAttribute('aria-current', x === btn ? 'true' : 'false'); });
        body.querySelectorAll('.fm-pane').forEach(function (p) { p.hidden = p.id !== 'pane-' + btn.getAttribute('data-letter'); });
      }
      items.forEach(function (x) { x.addEventListener('click', function () { pick(x); }); });
      if (items.length) pick(items[0]);
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      body.scrollTop = 0;
    });
  });
  dlg.querySelector('.hk-close').addEventListener('click', function () { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
})();

// riddles: slider with arrows (RTL: "next" moves left)
(function () {
  var t = document.querySelector('.rd-track');
  if (!t) return;
  var cards = t.querySelectorAll('.riddle');
  var prev = document.querySelector('.rd-prev'), next = document.querySelector('.rd-next'), num = document.querySelector('.rd-i');
  function idx() {
    var r = t.getBoundingClientRect(), best = 0, bd = 1e9;
    cards.forEach(function (c, i) { var d = Math.abs(c.getBoundingClientRect().right - r.right); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function upd() {
    var i = idx();
    if (num) num.textContent = i + 1;
    prev.disabled = i === 0;
    var last = Math.abs(t.scrollLeft) + t.clientWidth >= t.scrollWidth - 4;
    next.disabled = i === cards.length - 1 || last;
  }
  function go(d) { var i = Math.max(0, Math.min(cards.length - 1, idx() + d)); cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); }
  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  t.addEventListener('scroll', function () { clearTimeout(t._u); t._u = setTimeout(upd, 80); });
  t.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { e.preventDefault(); go(1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(-1); } });
  upd();
})();

// ---- shared: Hebrew text normalisation (no nikkud, no quote marks, unified final letters) ----
function heNorm(s, wantMap) {
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }, out = '', map = [];
  for (var i = 0; i < s.length; i++) {
    var c = s[i], code = s.charCodeAt(i);
    if ((code >= 0x0591 && code <= 0x05BD) || code === 0x05BF || code === 0x05C1 || code === 0x05C2 || (code >= 0x05C4 && code <= 0x05C7)) continue;
    if (c === '"' || c === "'" || c === '״' || c === '׳' || c === '`') continue;
    if (c === '־' || c === '–' || c === '-') c = ' ';
    out += FIN[c] || c.toLowerCase(); map.push(i);
  }
  map.push(s.length);
  return wantMap ? { s: out, map: map } : out;
}

// ---- arriving from a search result: mark the searched words in the text ----
(function () {
  var q = new URLSearchParams(location.search).get('q');
  var art = document.querySelector('article.reader');
  if (!q || !art) return;
  var words = heNorm(q).split(/\s+/).filter(function (w) { return w.length > 1; });
  if (!words.length) return;
  var root = (location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))) || art;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
  while ((n = walker.nextNode())) if (n.nodeValue.trim() && !n.parentNode.closest('.vlabel, .nn, sup, .sec-link')) nodes.push(n);
  var first = null;
  nodes.forEach(function (node) {
    var text = node.nodeValue, nm = heNorm(text, true), spans = [];
    words.forEach(function (w) {
      var i = 0;
      while ((i = nm.s.indexOf(w, i)) !== -1) { spans.push([nm.map[i], nm.map[i + w.length - 1] + 1]); i += w.length; }
    });
    if (!spans.length) return;
    spans.sort(function (a, b) { return a[0] - b[0]; });
    var frag = document.createDocumentFragment(), pos = 0;
    spans.forEach(function (s) {
      if (s[0] < pos) return;
      frag.appendChild(document.createTextNode(text.slice(pos, s[0])));
      var m = document.createElement('mark'); m.className = 'hit'; m.textContent = text.slice(s[0], s[1]);
      frag.appendChild(m); if (!first) first = m; pos = s[1];
    });
    frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  });
  // jump to where the whole phrase appears, if it does; otherwise to the first marked word
  if (words.length > 1) {
    var ms = Array.prototype.slice.call(root.querySelectorAll('mark.hit')), ph = words.join(' ');
    for (var i = 0; i + words.length <= ms.length; i++) {
      var seq = ms.slice(i, i + words.length).map(function (m) { return heNorm(m.textContent); }).join(' ');
      if (seq === ph) { first = ms[i]; break; }
    }
  }
  if (first) setTimeout(function () { first.scrollIntoView({ block: 'center' }); }, 120);
  if (first) {
    var bar = document.createElement('div'); bar.className = 'hit-bar';
    bar.innerHTML = 'מסומן: <b></b> <a href="search.html">חזרה לחיפוש</a> <button type="button" aria-label="ביטול הסימון">×</button>';
    bar.querySelector('b').textContent = q;
    bar.querySelector('a').href = 'search.html?q=' + encodeURIComponent(q);
    bar.querySelector('button').addEventListener('click', function () {
      document.querySelectorAll('mark.hit').forEach(function (m) { m.replaceWith(document.createTextNode(m.textContent)); });
      bar.remove();
    });
    document.body.appendChild(bar);
  }
})();

// ---- link to a specific verse / section: share (phones) or copy the link ----
(function () {
  var secs = document.querySelectorAll('article.reader section.vsec[id], article.reader section.piyut-box[id]');
  if (!secs.length) return;
  var toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { toast.classList.remove('on'); }, 2200); }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, bad) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? ok() : bad(); } catch (e) { bad(e); }
      ta.remove();
    });
  }
  var mobile = window.matchMedia('(pointer: coarse)').matches && navigator.share;
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1"/></svg>';
  secs.forEach(function (s) {
    var lab = s.querySelector(':scope > .vlabel'), h = s.querySelector(':scope > h3, :scope > h2');
    var name = (lab || h || {}).textContent || '';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sec-link';
    b.setAttribute('aria-label', 'קישור ישיר' + (name ? ' – ' + name.trim() : ' לקטע זה'));
    b.title = mobile ? 'שיתוף קישור לקטע זה' : 'העתקת קישור לקטע זה';
    b.innerHTML = ICON;
    b.addEventListener('click', function () {
      var url = location.href.split('#')[0].split('?')[0] + '#' + s.id;
      var title = document.title.split(' – ')[0] + (name ? ' · ' + name.trim() : '');
      if (mobile) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      copy(url).then(function () { say('הקישור לקטע הועתק'); }, function () { say('לא הצלחנו להעתיק – אפשר להעתיק מסרגל הכתובת'); history.replaceState(null, '', '#' + s.id); });
    });
    if (lab) lab.appendChild(b); else s.insertBefore(b, s.firstChild);
  });
})();

// ---- home page: this week's parsha + seasonal books (Israel calendar) ----
(function () {
  var box = document.getElementById('weekly');
  if (!box) return;
  // Hebrew calendar arithmetic (Dershowitz & Reingold); days are R.D. numbers.
  function elapsed(y) {
    var m = Math.floor((235 * y - 234) / 19), parts = 12084 + 13753 * m, d = 29 * m + Math.floor(parts / 25920);
    return ((3 * (d + 1)) % 7 < 3) ? d + 1 : d;
  }
  function newYear(y) {
    var ny0 = elapsed(y - 1), ny1 = elapsed(y), ny2 = elapsed(y + 1);
    var corr = (ny2 - ny1 === 356) ? 2 : (ny1 - ny0 === 382) ? 1 : 0;
    return -1373427 + ny1 + corr;
  }
  var RD_UNIX = 719163;
  function rdToday() {
    var o = new URLSearchParams(location.search).get('today'), d = o ? new Date(o + 'T12:00:00') : new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) + RD_UNIX;
  }
  function dow(rd) { return ((rd % 7) + 7) % 7; }            // 0 = Sunday … 6 = Saturday
  var today = rdToday();
  var hy = 3761 + new Date((today - RD_UNIX) * 86400000).getUTCFullYear();
  if (newYear(hy) > today) hy--;                              // hy = Hebrew year now running
  var shows = [];
  [hy - 1, hy, hy + 1].forEach(function (y) {
    var rh = newYear(y), len = newYear(y + 1) - rh;
    var kislev1 = rh + 30 + (len % 10 === 5 ? 30 : 29);
    var chanukah = kislev1 + 24, pesach = newYear(y + 1) - 163;
    var st = rh + 21, sh = st + 1; while (dow(sh) !== 6) sh++;   // first Shabbat after Simchat Torah (Israel)
    var P = [['bereshit', 'בראשית', 'אור עולם', 'bereshit-1'], ['noach', 'נח', 'ברית עולם'], ['lech', 'לך לך', 'אהבת איתן'],
             ['vayera', 'וירא', 'אהבת הקדמונים', 'vayera-1'], ['chayei', 'חיי שרה', 'אם בישראל'], ['toldot', 'תולדות', 'כטל לישראל'],
             ['vayetze', 'ויצא', 'אבן ישראל', 'vayetze-1'], ['vayishlach', 'וישלח', 'פני אדם'], ['vayeshev', 'וישב', 'יסוד עולם']];
    P.forEach(function (p, k) {
      var shab = sh + 7 * k, from = k === 0 ? st + 1 : shab - 6;
      shows.push({ from: from, to: shab, slug: p[0], cover: (p[3] || p[0]) + '-cover.webp', kicker: 'פרשת השבוע',
        head: 'לשבת פרשת ' + p[1], book: p[2], sub: 'פשט ועומק בפרשת ' + p[1] });
    });
    shows.push({ from: rh - 29, to: rh + 1, slug: 'moriah', cover: 'moriah-cover.webp', kicker: 'לקראת ראש השנה', head: 'עיון בפרשת העקידה', book: 'אל ארץ המוריה', sub: 'התבוננות בפרשת העקידה' });
    shows.push({ from: rh + 10, to: rh + 20, slug: 'hoshanot', cover: 'hoshanot-1-cover.webp', kicker: 'לחג הסוכות', head: 'פיוטי ההושענות', book: 'תענה אמונים', sub: 'מבט לעומקם של פיוטי ההושענות' });
    shows.push({ from: chanukah - 10, to: chanukah + 7, slug: 'menorat-zahav', cover: 'menorat-zahav-cover.webp', kicker: 'לקראת חנוכה', head: 'שורשי החנוכה בנבואה', book: 'מנורת זהב', sub: 'שורשי החנוכה בעין הנבואה' });
    shows.push({ from: pesach - 30, to: pesach + 6, slug: 'haggada', cover: 'haggada-cover.webp', kicker: 'לקראת פסח', head: 'הגדה של פסח עם פירוש', book: 'חירות עולם', sub: 'ביאורי הפשט על כל נוסח ההגדה' });
  });
  var now = shows.filter(function (s) { return today >= s.from && today <= s.to; });
  if (!now.length) return;
  var html = '';
  now.forEach(function (s) {
    html += '<a class="weekly-card" href="' + s.slug + '.html"><img src="img/' + s.cover + '" alt="" width="626" height="1121">'
      + '<span class="wk-txt"><span class="wk-kicker">' + s.kicker + '</span><span class="wk-head">' + s.head + '</span>'
      + '<span class="wk-book">' + s.book + ' · ' + s.sub + '</span><span class="wk-go">לעיון בספר ←</span></span></a>';
  });
  box.querySelector('.weekly').innerHTML = html;
  box.hidden = false;
})();

// height of the site header, for backgrounds that should start below it
(function () {
  var h = document.querySelector('.site-header');
  if (!h) return;
  // follows the header as it scrolls away, so no empty strip is left at the top
  var tick = false;
  function set() { tick = false; document.documentElement.style.setProperty('--hdr', Math.max(0, h.getBoundingClientRect().bottom) + 'px'); }
  function ask() { if (!tick) { tick = true; requestAnimationFrame(set); } }
  set(); window.addEventListener('resize', ask); window.addEventListener('scroll', ask, { passive: true });
})();
