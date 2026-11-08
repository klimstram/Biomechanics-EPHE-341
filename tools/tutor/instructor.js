/* ======================================================================
   Biomechanics Tutor: class results for the instructor (#/instructor).

   Reads the anonymous summary from the course's Supabase store with the
   instructor key (supabase-setup.sql, tutor_summary / tutor_export). The
   page is not linked from the menu; the key is what protects it, and it is
   only kept on this computer if "remember" is ticked.

   #/instructor                  the whole class
   #/instructor/accounts         student accounts: the list, and password
                                 resets (Marc, 30 Oct: "like an admin site")
   #/instructor/<section>/<n>    one question, step by step (Marc, 30 Oct:
                                 clicking a question should stay here, not
                                 open the student page)

   The browser used for this page stops sending its own answers, so trying
   a question as a student does not count as a student.
   ====================================================================== */
(function () {
'use strict';
var KEY_LS = 'biomech-tutor-instructor-key';
var key = null, since = '';
var cache = null;          /* { since, s }: the last summary, reused between pages */
var MUTED = 'biomech-tutor-instructor-muted';

function A() { return window.TutorApp; }
function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
function bar(p, cls) {
  return '<span class="i-bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></span>';
}

window.showInstructor = function (slug, num) {
  var T = A(), el = T.el, esc = T.esc, icon = T.icon, view = T.view;
  T.setActive('');
  document.title = 'Class results · Biomechanics Tutor';
  var D = T.data();
  var admin = slug === 'accounts';
  var one = !admin && slug && D.bySlug[slug] ? { sec: D.bySlug[slug] } : null;
  if (admin) document.title = 'Student accounts · Biomechanics Tutor';
  if (one) {
    one.p = one.sec.problems.filter(function (x) { return x.number === num; })[0] || one.sec.problems[0];
    document.title = one.sec.name + ' ' + one.p.number + ' · Class results';
  }
  if (!key) { try { key = localStorage.getItem(KEY_LS); } catch (e) {} }
  view.innerHTML = '';
  var top = el('div', 'perf-top');
  if (one) {
    top.innerHTML = '<a class="crumb" href="#/instructor">' + icon('arrow-back-up') + 'Class results</a>';
  } else {
    top.appendChild(el('h2', '', admin ? 'Student accounts' : 'Class results'));
    var tabs = el('div', 'seg i-tabs');
    tabs.innerHTML = '<a href="#/instructor"' + (admin ? '' : ' class="on"') + '>Class results</a>' +
      '<a href="#/instructor/accounts"' + (admin ? ' class="on"' : '') + '>Student accounts</a>';
    top.appendChild(tabs);
  }
  view.appendChild(top);
  if (!one && !admin) view.appendChild(el('p', 'menu-note', 'Anonymous: each student is a scrambled code, never a name. ' +
    'Only answers from students who leave sharing on are here.'));
  if (!window.TutorSync) {
    view.appendChild(el('div', 'notice warn', icon('alert-triangle') + '<div class="grow">The online store is not set up in this copy of the Tutor (sync.js).</div>'));
    return;
  }
  if (!key) return askKey();
  load(false);

  function askKey(msg) {
    view.querySelectorAll('.i-body').forEach(function (n) { n.remove(); });
    var c = el('div', 'card i-body');
    c.appendChild(el('h3', '', icon('lock') + ' Instructor key'));
    if (msg) c.appendChild(el('div', 'feedback error', icon('alert-circle') + '<div>' + esc(msg) + '</div>'));
    var row = el('div', 'a-row');
    var inp = el('input'); inp.type = 'password'; inp.placeholder = 'The phrase you set in Supabase'; inp.id = 'i-key';
    inp.autocomplete = 'current-password';
    var go = el('button', 'btn-primary', 'Show results');
    row.appendChild(inp); row.appendChild(go);
    c.appendChild(row);
    var lab = el('label', 'i-remember', '<input type="checkbox" id="i-rem"> Remember on this computer');
    c.appendChild(lab);
    view.appendChild(c);
    inp.focus();
    inp.onkeydown = function (e) { if (e.key === 'Enter') go.click(); };
    go.onclick = function () {
      key = inp.value;
      if ($('#i-rem').checked) { try { localStorage.setItem(KEY_LS, key); } catch (e) {} }
      load(true);
    };
  }
  function $(s) { return view.querySelector(s); }

  async function load(fresh) {
    view.querySelectorAll('.i-body').forEach(function (n) { n.remove(); });
    if (admin) return loadAccounts();
    if (!fresh && cache && cache.since === since) return show(cache.s);
    var wait = el('div', 'loading i-body', 'Loading class results…');
    view.appendChild(wait);
    var s;
    try {
      s = await TutorSync.rpc('tutor_summary', { key: key, since: since ? new Date(since + 'T00:00:00').toISOString() : null });
      cache = { since: since, s: s || {}, at: new Date() };
      mute();
    } catch (e) {
      wait.remove();
      if (/wrong instructor key/.test(e.message)) { key = null; try { localStorage.removeItem(KEY_LS); } catch (x) {} return askKey('That key is not right.'); }
      view.appendChild(el('div', 'notice warn i-body', icon('cloud-off') + '<div class="grow">Could not reach the store: ' +
        esc(e.message) + '. If the Supabase project was paused after a quiet week, restore it in the Supabase dashboard.</div>'));
      return;
    }
    wait.remove();
    show(s || {});
  }
  function show(s) { if (one) renderOne(s); else render(s); }

  /* ------------------------------------------- student accounts (admin) */
  async function loadAccounts() {
    var wait = el('div', 'loading i-body', 'Loading the accounts…');
    view.appendChild(wait);
    var list;
    try { list = await TutorSync.rpc('tutor_admin_accounts', { key: key }) || []; mute(); }
    catch (e) {
      wait.remove();
      if (/wrong instructor key/.test(e.message)) { key = null; try { localStorage.removeItem(KEY_LS); } catch (x) {} return askKey('That key is not right.'); }
      view.appendChild(el('div', 'notice warn i-body', icon('alert-triangle') + '<div class="grow">' +
        (/tutor_admin_accounts|function|404|schema cache/i.test(e.message + ' ' + e.status) ?
          'This page needs the newer accounts script. Run <b>supabase-accounts.sql</b> (in the Tutor’s web folder) once more in the Supabase SQL Editor, then reload.' :
          'Could not reach the store: ' + esc(e.message) + '.') + '</div>'));
      return;
    }
    wait.remove();
    var c = el('div', 'card i-body');
    c.appendChild(el('p', 'menu-note', list.length + ' account' + (list.length === 1 ? '' : 's') + '. Students make their own ' +
      '(a made-up username and a password, no email). If one forgets the password and has no recovery code, reset it ' +
      'here and tell them the temporary password; they can change it under Your account once signed in.'));
    var row = el('div', 'a-row');
    var find = el('input'); find.type = 'search'; find.placeholder = 'Find a username'; find.id = 'acc-find';
    find.autocapitalize = 'none'; find.spellcheck = false;
    row.appendChild(find);
    row.appendChild(refreshBtn());
    c.appendChild(row);
    var tb = el('table', 'i-q i-acc');
    tb.innerHTML = '<thead><tr><th>Username</th><th>Made</th><th>Last signed in</th><th>Status</th><th></th></tr></thead>';
    var body = el('tbody');
    var day = function (d) { return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '–'; };
    list.forEach(function (a) {
      var tr = el('tr');
      tr.setAttribute('data-user', a.username);
      tr.innerHTML = '<td><b class="acct-name">' + esc(a.username) + '</b></td><td>' + day(a.created_at) + '</td><td>' + day(a.last_login) +
        '</td><td>' + (a.locked ? '<span class="badge f">waiting 15 min</span> ' : '') +
        (a.has_recovery ? '' : '<small>no recovery code</small>') + '</td><td></td>';
      var b = el('button', 'btn-plain', icon('lock') + 'Reset password');
      b.onclick = function () { resetRow(tr, a.username); };
      tr.lastChild.appendChild(b);
      body.appendChild(tr);
    });
    tb.appendChild(body);
    if (list.length) c.appendChild(tb);
    else c.appendChild(el('p', '', 'No accounts yet.'));
    view.appendChild(c);
    find.oninput = function () {
      var q = find.value.trim().toLowerCase();
      body.querySelectorAll('tr').forEach(function (tr) {
        if (tr.classList.contains('i-reset')) return;
        tr.hidden = q && tr.getAttribute('data-user').indexOf(q) < 0;
      });
    };
  }
  function tempPassword() {
    var c = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
    var a = new Uint32Array(8); crypto.getRandomValues(a);
    for (var i = 0; i < 8; i++) s += c[a[i] % c.length];
    return 'temp-' + s;
  }
  function resetRow(tr, user) {
    var old = tr.nextElementSibling;
    if (old && old.classList.contains('i-reset')) { old.remove(); return; }
    var r = el('tr', 'i-reset');
    var td = el('td'); td.colSpan = 5;
    td.innerHTML = '<div class="a-row"><label class="i-temp">Temporary password for <b>' + esc(user) + '</b> ' +
      '<input type="text" class="temp-pw" autocomplete="off" spellcheck="false" value="' + tempPassword() + '"></label></div>';
    var go = el('button', 'btn-primary', 'Set it');
    td.querySelector('.a-row').appendChild(go);
    var out = el('div', '');
    td.appendChild(out);
    r.appendChild(td);
    tr.parentNode.insertBefore(r, tr.nextSibling);
    go.onclick = function () {
      var pw = td.querySelector('.temp-pw').value;
      go.disabled = true;
      TutorSync.rpc('tutor_admin_reset', { key: key, uname: user, new_pw: pw }).then(function (res) {
        go.disabled = false;
        if (res && res.error) { out.innerHTML = '<div class="feedback error" style="margin-top:8px">' + icon('alert-circle') + '<div>' + esc(res.error) + '</div></div>'; return; }
        out.innerHTML = '<div class="feedback success" style="margin-top:8px">' + icon('circle-check') + '<div>Done. Tell <b>' + esc(user) +
          '</b> to sign in with <code>' + esc(pw) + '</code>, then choose <b>Change password</b> under Your account.</div></div>';
        var badge = tr.querySelector('.badge'); if (badge) badge.remove();
      }, function (e) {
        go.disabled = false;
        out.innerHTML = '<div class="feedback error" style="margin-top:8px">' + icon('alert-circle') + '<div>' + esc(e.message) + '</div></div>';
      });
    };
  }

  /* the first time this browser opens the results, stop it sending its own
     answers (it can be turned back on under Your account, and stays on) */
  function mute() {
    var done = false;
    try { done = !!localStorage.getItem(MUTED); localStorage.setItem(MUTED, '1'); } catch (e) {}
    if (!done && !TutorSync.off()) {
      TutorSync.setOff(true);
      view.insertBefore(el('div', 'notice i-mute', icon('info-circle') + '<div class="grow">This browser no longer sends ' +
        'its own answers, so trying questions here does not count as a student. You can turn that back on under ' +
        '<a href="#/account">Your account</a>.</div>'), view.children[1] || null);
    }
  }
  function when() {
    return cache && cache.at ? 'Updated ' + cache.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  }
  function refreshBtn() {
    var b = el('button', 'btn-plain', icon('refresh') + 'Refresh');
    b.title = when();
    b.onclick = function () { load(true); };
    return b;
  }

  /* ------------------------------------------------ one question, by step */
  function renderOne(s) {
    var sec = one.sec, p = one.p, D = T.data();
    var q = (s.questions || []).filter(function (x) { return x.section === sec.name && x.question_number === p.number; })[0];
    var st = {};
    (s.steps || []).forEach(function (x) { if (x.section === sec.name && x.question_number === p.number) st[x.step] = x; });

    var head = el('div', 'card i-body i-qhead');
    head.style.setProperty('--sc', sec.color[0]);
    var i = sec.problems.indexOf(p), prev = sec.problems[i - 1], next = sec.problems[i + 1];
    var nav = el('div', 'i-qnav');
    nav.innerHTML = '<span class="q-sec"><span class="m-ic">' + icon(sec.icon) + '</span>' + esc(sec.name) + ' · Question ' +
      esc(p.number) + '</span><span class="acts-row">' +
      (prev ? '<a class="btn-plain" href="#/instructor/' + sec.slug + '/' + encodeURIComponent(prev.number) + '">' + icon('arrow-back-up') + 'Q' + esc(prev.number) + '</a>' : '') +
      (next ? '<a class="btn-plain" href="#/instructor/' + sec.slug + '/' + encodeURIComponent(next.number) + '">Q' + esc(next.number) + ' ' + icon('chevron-right') + '</a>' : '') +
      '<a class="btn-plain" href="#/s/' + sec.slug + '/' + encodeURIComponent(p.number) + '">' + icon('player-play') + 'Open as a student</a></span>';
    head.appendChild(nav);
    var body = el('div', 'q-body' + (p.image ? ' has-fig' : ''));
    body.appendChild(T.md(p.full, 'q-text'));
    if (p.image) body.appendChild(el('div', 'q-fig i-fig', ''));
    head.appendChild(body);
    if (p.image) body.querySelector('.i-fig').appendChild(T.figure(p.image, 'Figure for ' + sec.name + ' ' + p.number));
    view.appendChild(head);

    var c = el('div', 'card i-body');
    if (!q) {
      c.appendChild(el('p', '', 'No answers to this question yet' + (since ? ' since ' + esc(since) : '') + '.'));
    } else {
      var stats = el('div', 'stats');
      stats.innerHTML =
        '<div class="stat"><b>' + q.learners + '</b><span>students</span></div>' +
        '<div class="stat good"><b>' + pct(q.right_first_time, q.first_answers) + '%</b><span>right first time (' + q.right_first_time + '/' + q.first_answers + ')</span></div>' +
        '<div class="stat"><b>' + q.guided + '</b><span>used the steps</span></div>' +
        '<div class="stat"><b>' + q.sent_back + '</b><span>sent back after fixing a step</span></div>' +
        '<div class="stat"><b>' + pct(q.correct, q.answers) + '%</b><span>of all answers right (' + q.correct + '/' + q.answers + ')</span></div>';
      c.appendChild(stats);
    }
    var acts = el('div', 'acts-row i-filter');
    acts.appendChild(refreshBtn());
    if (since) acts.appendChild(el('span', 'menu-note', 'Since ' + esc(since)));
    c.appendChild(acts);
    view.appendChild(c);

    var c2 = el('div', 'card i-body');
    c2.appendChild(el('h3', '', 'The steps'));
    c2.appendChild(el('p', 'menu-note', 'For each step: how often a student’s first ever pick was wrong, of the students who reached it. ' +
      'The worst step is marked.'));
    var worst = null;
    p.steps.forEach(function (s0, k) {
      var x = st[String(k + 1)];
      if (x && x.picks && x.slips && (!worst || x.slips / x.picks > worst.slips / worst.picks)) worst = x;
    });
    var list = el('div', 'i-steps');
    p.steps.forEach(function (s0, k) {
      var x = st[String(k + 1)], pill = T.pillOf(s0.type);
      var r = el('div', 'i-step' + (x && worst === x ? ' worst' : ''));
      var right = s0.options.filter(function (o) { return o.original === s0.correct; })[0];
      r.innerHTML = '<div class="i-sn">' + (k + 1) + '</div><div class="i-sb"><div class="i-sq"></div>' +
        (right ? '<div class="i-sa"><small>Right answer</small> <span></span></div>' : '<div class="i-sa"><small>Final answer: entered in the answer box</small></div>') +
        '</div><div class="i-num">' + (pill ? '<span class="type-pill ' + pill[1] + '">' + pill[2] + '</span><br>' : '') +
        (x ? bar(pct(x.slips, x.picks), 'slip') + '<b>' + pct(x.slips, x.picks) + '%</b> <small>' + x.slips + ' of ' + x.picks + ' wrong first</small>'
           : '<small>' + (s0.options.length ? 'not reached yet' : '') + '</small>') + '</div>';
      T.renderMD(r.querySelector('.i-sq'), s0.text, true);
      if (right) {
        var slot = r.querySelector('.i-sa span');
        if (T.isImage(right.text)) slot.appendChild(T.figure(String(right.text).trim(), 'Right answer'));
        else T.renderMD(slot, right.text, true);
        var w = T.whyOf && T.whyOf(s0);
        if (w) { var wy = el('div', 'i-why'); T.renderMD(wy, w, true); r.querySelector('.i-sb').appendChild(wy); }
      }
      list.appendChild(r);
    });
    c2.appendChild(list);
    view.appendChild(c2);
  }

  function render(s) {
    var D = T.data();
    var day = function (d) { return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '–'; };
    var secBy = {};
    D.sections.forEach(function (x) { secBy[x.name] = x; });

    /* the numbers at the top, and the date filter */
    var c0 = el('div', 'card i-body');
    var stats = el('div', 'stats');
    stats.innerHTML =
      '<div class="stat"><b>' + (s.learners || 0) + '</b><span>students</span></div>' +
      '<div class="stat"><b>' + (s.events || 0) + '</b><span>recorded actions</span></div>' +
      '<div class="stat"><b>' + esc(day(s.first)) + '</b><span>first answer</span></div>' +
      '<div class="stat"><b>' + esc(day(s.last)) + '</b><span>latest answer</span></div>';
    c0.appendChild(stats);
    var f = el('div', 'acts-row i-filter');
    f.innerHTML = '<label>Since <input type="date" id="i-since" value="' + esc(since) + '"></label>';
    f.appendChild(refreshBtn());
    var all = el('button', 'btn-plain', 'Whole term');
    all.onclick = function () { since = ''; load(true); };
    var ex = el('button', 'btn-plain', icon('download') + 'Export all answers (CSV)');
    ex.onclick = function () { exportAll(ex); };
    var out = el('button', 'btn-plain', icon('lock') + 'Forget the key here');
    out.onclick = function () { key = null; try { localStorage.removeItem(KEY_LS); } catch (e) {} window.showInstructor(); };
    f.appendChild(all); f.appendChild(ex); f.appendChild(out);
    c0.appendChild(f);
    view.appendChild(c0);
    $('#i-since').onchange = function () { since = this.value; load(true); };

    if (!s.events) {
      view.appendChild(el('div', 'notice i-body', icon('info-circle') + '<div class="grow">Nothing recorded' +
        (since ? ' since ' + esc(since) : ' yet') + '. Answers appear here a few seconds after students give them.</div>'));
      return;
    }

    /* where students slip: first picks that were wrong, worst first */
    var steps = (s.steps || []).map(function (x) {
      var info = D.typeOf[x.section + '|' + x.question_number + '|' + x.step] || {};
      return { sec: x.section, q: x.question_number, step: x.step, picks: x.picks, slips: x.slips,
               learners: x.learners, text: info.text || '', type: info.type || '', rate: x.picks ? x.slips / x.picks : 0 };
    });
    var minN = Math.max(1, Math.min(5, Math.round((s.learners || 1) / 4)));
    var worst = steps.filter(function (x) { return x.picks >= minN && x.slips; })
      .sort(function (a, b) { return b.rate - a.rate || b.picks - a.picks; }).slice(0, 15);
    var c1 = el('div', 'card i-body');
    c1.appendChild(el('h3', '', 'Where students go wrong first'));
    c1.appendChild(el('p', 'menu-note', 'Steps whose first pick was most often wrong (at least ' + minN +
      ' first pick' + (minN > 1 ? 's' : '') + '). A wrong first pick is where a student’s own working most likely went off.'));
    if (!worst.length) c1.appendChild(el('p', '', 'Not enough step answers yet.'));
    var tb = el('div', 'i-table');
    worst.forEach(function (x) {
      var sec = secBy[x.sec], pill = T.pillOf(x.type);
      var r = el('a', 'i-row');
      if (sec) r.href = '#/instructor/' + sec.slug + '/' + encodeURIComponent(x.q);
      r.style.setProperty('--sc', sec ? sec.color[0] : 'var(--brand)');
      r.innerHTML = '<span class="i-where"><b>' + esc(x.sec) + ' ' + esc(x.q) + '</b> · step ' + esc(x.step) +
        (pill ? ' <span class="type-pill ' + pill[1] + '">' + pill[2] + '</span>' : '') + '</span>' +
        '<span class="i-text"></span>' +
        '<span class="i-num">' + bar(100 * x.rate, 'slip') + '<b>' + pct(x.slips, x.picks) + '%</b> <small>' +
        x.slips + ' of ' + x.picks + '</small></span>';
      T.renderMD(r.querySelector('.i-text'), x.text, true);
      tb.appendChild(r);
    });
    c1.appendChild(tb);
    view.appendChild(c1);

    /* every question, by section */
    var qs = {};
    (s.questions || []).forEach(function (x) { qs[x.section + '|' + x.question_number] = x; });
    var c2 = el('div', 'card i-body');
    c2.appendChild(el('h3', '', 'Questions'));
    c2.appendChild(el('p', 'menu-note', '<b>Right first time</b>: the student’s first ever answer to it was right (retakes do not count). ' +
      '<b>Used the steps</b>: opened the leading questions. <b>Sent back</b>: fixed a step and was sent back to the full question.'));
    D.sections.forEach(function (sec) {
      var rows = sec.problems.map(function (p) { return { p: p, x: qs[sec.name + '|' + p.number] }; })
        .filter(function (r) { return r.x; });
      if (!rows.length) return;
      var tot = rows.reduce(function (a, r) { a.f += r.x.first_answers; a.r += r.x.right_first_time; return a; }, { f: 0, r: 0 });
      var d = el('details', 'grp');
      d.innerHTML = '<summary><span class="name"><span class="dot" style="background:' + sec.color[0] + '"></span>' +
        esc(sec.name) + '</span><span class="score">' + pct(tot.r, tot.f) + '% right first time · ' + rows.length +
        ' of ' + sec.problems.length + ' questions tried</span></summary>';
      var t = el('table', 'i-q');
      t.innerHTML = '<thead><tr><th>Q</th><th>Students</th><th>Right first time</th><th>Used the steps</th><th>Sent back</th><th>All answers right</th></tr></thead>';
      var body = el('tbody');
      rows.forEach(function (r) {
        var x = r.x, tr = el('tr');
        tr.innerHTML = '<td><a href="#/instructor/' + sec.slug + '/' + encodeURIComponent(r.p.number) + '">' + esc(r.p.number) + '</a></td>' +
          '<td>' + x.learners + '</td>' +
          '<td>' + bar(pct(x.right_first_time, x.first_answers), 'ok') + pct(x.right_first_time, x.first_answers) + '% <small>(' +
            x.right_first_time + '/' + x.first_answers + ')</small></td>' +
          '<td>' + x.guided + '</td><td>' + x.sent_back + '</td>' +
          '<td>' + pct(x.correct, x.answers) + '% <small>(' + x.correct + '/' + x.answers + ')</small></td>';
        body.appendChild(tr);
      });
      t.appendChild(body);
      d.appendChild(t);
      c2.appendChild(d);
    });
    view.appendChild(c2);
  }

  async function exportAll(btn) {
    var old = btn.innerHTML;
    btn.disabled = true;
    try {
      var rows = [], after = 0, page;
      do {
        btn.innerHTML = 'Exporting… ' + rows.length;
        page = await TutorSync.rpc('tutor_export', { key: key, after: after }) || [];
        rows = rows.concat(page);
        if (page.length) after = page[page.length - 1].n;
      } while (page.length >= 1000);
      var cols = ['n', 'learner', 'id', 'session_id', 'timestamp', 'section', 'question_number', 'step', 'action', 'details', 'received_at'];
      var cell = function (v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var csv = [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (k) { return cell(r[k]); }).join(','); })).join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'tutor-class-answers-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) {
      alertBox(e.message);
    }
    btn.disabled = false; btn.innerHTML = old;
  }
  function alertBox(m) {
    view.appendChild(el('div', 'notice warn i-body', icon('alert-triangle') + '<div class="grow">' + esc(m) + '</div>'));
  }
};
})();
