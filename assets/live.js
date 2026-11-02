/* Live study layer for ISA Study Lab.
   Adds study tools around the original course material; it does not rewrite it. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pages = window.PAGES || [];
  const page = window.PAGE || null;
  const storage = {
    get(key, fallback) {
      try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
      catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (_) { return false; }
    }
  };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const titleFor = p => p?.s || p?.t || 'Study page';
  const moduleLink = id => pages.find(p => p.id === id);
  let done = storage.get('isa', {}) || {};
  let sectionDone = storage.get('isasections', {}) || {};
  let bookmarks = storage.get('isabookmarks', []) || [];
  let navOriginal = typeof window.nav === 'function' ? window.nav : null;

  function coreTopics() { return pages.filter(p => /^t\d+$/.test(p.id)); }
  function percent(value, total) { return total ? Math.round(value / total * 100) : 0; }

  function decorateNav() {
    const nav = $('#nav');
    if (!nav) return;
    const first = $('a:first-child', nav);
    if (first) {
      first.classList.add('brand-link');
      first.setAttribute('aria-label', 'ISA Study Lab home');
      first.innerHTML = '<span class="brand-mark">ISA</span><span class="brand-copy"><strong>ISA Study Lab</strong><small>BUC3126 · Study space</small></span>';
    }
    if (!$('.mobile-nav-trigger', nav)) {
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'mobile-nav-trigger';
      trigger.textContent = '☰ Menu';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', () => {
        const opened = nav.classList.toggle('mobile-open');
        trigger.setAttribute('aria-expanded', String(opened));
        trigger.textContent = opened ? '✕ Close' : '☰ Menu';
      });
      first?.after(trigger);
    }
    const topics = coreTopics();
    const completed = topics.filter(p => !!done[p.id]).length;
    let overview = $('.nav-overview', nav);
    if (!overview) {
      overview = document.createElement('div');
      overview.className = 'nav-overview';
      const insertion = $('.mobile-nav-trigger', nav) || first;
      insertion?.after(overview);
    }
    overview.innerHTML = `<div class="nav-overview-line"><strong>Course progress</strong><small>${completed} / ${topics.length} topics</small></div><div class="nav-track" role="progressbar" aria-label="Core topic progress" aria-valuemin="0" aria-valuemax="${topics.length}" aria-valuenow="${completed}"><span style="width:${percent(completed, topics.length)}%"></span></div>`;

    let saved = $('.nav-bookmarks', nav);
    if (!saved) { saved = document.createElement('div'); saved.className = 'nav-bookmarks'; nav.append(saved); }
    const valid = bookmarks.filter(b => b && b.pageFile && b.secId);
    saved.innerHTML = `<h4>Saved sections</h4>${valid.length ? valid.map(b => `<a href="${escapeHTML(b.pageFile)}#${encodeURIComponent(b.secId)}"><i></i>${escapeHTML(b.pageTitle || 'Topic')} · ${escapeHTML(b.title || 'Section')}</a>`).join('') : '<p>Use the bookmark icon beside any section heading to keep a quick link here.</p>'}`;
    let foot = $('.nav-foot', nav);
    if (!foot) { foot = document.createElement('div'); foot.className = 'nav-foot'; nav.append(foot); }
    foot.innerHTML = 'Keyboard: <b>/</b> search · <b>Esc</b> close panels<br>Progress and notes stay in this browser.';
  }

  if (navOriginal) {
    window.nav = function wrappedNav() {
      navOriginal();
      done = storage.get('isa', {});
      decorateNav();
      refreshDashboard();
    };
  }

  function refreshDashboard() {
    const dashboard = $('.study-dashboard');
    if (!dashboard) return;
    done = storage.get('isa', {});
    const topics = coreTopics();
    const completed = topics.filter(p => !!done[p.id]).length;
    const allCompleted = pages.filter(p => !!done[p.id]).length;
    const pct = percent(completed, topics.length);
    const last = storage.get('isalastpage', null);
    const lastPage = last && moduleLink(last.id);
    const continueText = lastPage ? titleFor(lastPage) : 'Start with Topic 1';
    const continueHref = lastPage ? lastPage.f : (moduleLink('t1')?.f || 'topic-1.html');
    const lastMeta = last?.date ? `Last opened ${new Date(last.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}` : 'Your next session starts here';
    dashboard.innerHTML = `
      <section class="dashboard-card primary">
        <div class="dashboard-eyebrow">Core topic progress</div>
        <strong class="dashboard-value">${completed}<span style="font-family:Inter,system-ui;font-size:15px;color:#778279"> / ${topics.length}</span></strong>
        <p>${pct}% of the nine core topics marked as studied. Mark a topic when you have worked through it.</p>
        <div class="dashboard-track"><span style="width:${pct}%"></span></div>
        <span class="dashboard-small">${topics.length - completed} topic${topics.length - completed === 1 ? '' : 's'} still to check off</span>
      </section>
      <section class="dashboard-card">
        <div class="dashboard-eyebrow">Continue studying</div>
        <strong class="dashboard-value" style="font-size:21px">${escapeHTML(continueText)}</strong>
        <p>${escapeHTML(lastMeta)}</p>
        <a class="dashboard-link" href="${escapeHTML(continueHref)}">Pick up where you left off <span aria-hidden="true">→</span></a>
      </section>
      <section class="dashboard-card">
        <div class="dashboard-eyebrow">Study library</div>
        <strong class="dashboard-value">${allCompleted}<span style="font-family:Inter,system-ui;font-size:15px;color:#778279"> / ${pages.length}</span></strong>
        <p>Guides, practical work, revision phases and reference material tracked.</p>
        <a class="dashboard-link" href="phase-4-tests.html">Go to mixed revision <span aria-hidden="true">→</span></a>
      </section>`;
  }

  function buildHomeTools() {
    if (!$('#app') || page) return;
    const hero = $('.hero', $('#app'));
    if (!hero || $('.study-dashboard', $('#app'))) return;
    const dashboard = document.createElement('div');
    dashboard.className = 'study-dashboard';
    hero.after(dashboard);
    refreshDashboard();
  }

  function updateSectionProgress() {
    if (!page) return;
    const sections = $$('.md details.sec');
    const complete = sections.filter(d => !!sectionDone[`${page.id}:${d.id}`]).length;
    const target = $('#section-progress');
    if (target) target.innerHTML = `<strong>${complete} / ${sections.length}</strong> sections checked off <span class="section-progress-note">· tracked on this device</span>`;
  }

  function bookmarkKey(pageId, secId) { return `${pageId}:${secId}`; }
  function updateBookmarkNav() {
    bookmarks = storage.get('isabookmarks', []);
    decorateNav();
  }

  function decorateSections() {
    if (!page) return;
    $$('.md details.sec').forEach(section => {
      const summary = $('summary.st', section);
      if (!summary || $('.section-controls', summary)) return;
      const sectionTitle = summary.textContent.trim();
      const key = bookmarkKey(page.id, section.id);
      const isDone = !!sectionDone[key];
      const isSaved = bookmarks.some(b => b && b.key === key);
      const controls = document.createElement('span');
      controls.className = 'section-controls';
      controls.innerHTML = `<button type="button" class="section-check" aria-label="Mark section complete" aria-pressed="${isDone}" title="${isDone ? 'Mark as not yet studied' : 'Mark section studied'}">${isDone ? '✓' : '○'}</button><button type="button" class="section-save" aria-label="${isSaved ? 'Remove bookmark' : 'Save bookmark'}" aria-pressed="${isSaved}" title="${isSaved ? 'Remove bookmark' : 'Save this section'}">${isSaved ? '◆' : '◇'}</button>`;
      summary.append(controls);
      const check = $('.section-check', controls);
      check.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        sectionDone[key] = !sectionDone[key];
        storage.set('isasections', sectionDone);
        check.setAttribute('aria-pressed', String(!!sectionDone[key]));
        check.textContent = sectionDone[key] ? '✓' : '○';
        check.title = sectionDone[key] ? 'Mark as not yet studied' : 'Mark section studied';
        updateSectionProgress();
      });
      const save = $('.section-save', controls);
      save.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        bookmarks = storage.get('isabookmarks', []);
        const exists = bookmarks.some(b => b && b.key === key);
        if (exists) bookmarks = bookmarks.filter(b => b.key !== key);
        else bookmarks.push({ key, pageId:page.id, pageFile:page.f, pageTitle:titleFor(page), secId:section.id, title:sectionTitle });
        storage.set('isabookmarks', bookmarks);
        const savedNow = !exists;
        save.setAttribute('aria-pressed', String(savedNow));
        save.setAttribute('aria-label', savedNow ? 'Remove bookmark' : 'Save bookmark');
        save.title = savedNow ? 'Remove bookmark' : 'Save this section';
        save.textContent = savedNow ? '◆' : '◇';
        updateBookmarkNav();
      });
    });
    updateSectionProgress();
  }

  function makeUtilityBar() {
    if (!page || !$('.tb') || $('.live-utility')) return;
    const utility = document.createElement('div');
    utility.className = 'live-utility';
    utility.innerHTML = `<div class="live-utility-left"><span id="section-progress"></span></div><div class="live-utility-actions"><button type="button" id="open-notes">✎ Page notes</button><button type="button" id="toggle-focus">Focus view</button><button type="button" id="open-clock">◷ Focus clock</button></div>`;
    $('.tb').after(utility);
    $('#open-notes').addEventListener('click', openNotes);
    $('#toggle-focus').addEventListener('click', toggleFocus);
    $('#open-clock').addEventListener('click', () => { toggleTimerPanel(true); $('#focus-chip')?.setAttribute('aria-expanded', 'true'); });
  }

  function updateReadingProgress() {
    const line = $('#reading-line span');
    if (!line) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? Math.max(0, Math.min(100, window.scrollY / max * 100)) : 0;
    line.style.width = `${value}%`;
  }

  function makeReadingLine() {
    if ($('#reading-line')) return;
    const line = document.createElement('div');
    line.id = 'reading-line';
    line.innerHTML = '<span></span>';
    document.body.append(line);
    window.addEventListener('scroll', updateReadingProgress, { passive:true });
    window.addEventListener('resize', updateReadingProgress);
    updateReadingProgress();
  }

  let notesPage = page?.id || 'home';
  function openNotes() {
    $('#notes-backdrop')?.classList.add('open');
    $('#notes-panel')?.classList.add('open');
    $('#notes-panel')?.setAttribute('aria-hidden', 'false');
    $('#page-notes')?.focus();
  }
  function closeNotes() {
    $('#notes-backdrop')?.classList.remove('open');
    $('#notes-panel')?.classList.remove('open');
    $('#notes-panel')?.setAttribute('aria-hidden', 'true');
  }
  function exportNotes() {
    const text = $('#page-notes')?.value || '';
    const label = page ? titleFor(page) : 'ISA Study Notes';
    const blob = new Blob([`${label}\n${'='.repeat(label.length)}\n\n${text}\n`], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(page?.id || 'isa-home')}-notes.txt`;
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function buildNotesPanel() {
    if ($('#notes-panel')) return;
    const backdrop = document.createElement('div');
    backdrop.id = 'notes-backdrop';
    backdrop.addEventListener('click', closeNotes);
    const panel = document.createElement('aside');
    panel.id = 'notes-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Study notes');
    panel.innerHTML = `<div class="notes-head"><div><h2>My study notes</h2><p>${escapeHTML(page ? titleFor(page) : 'ISA Study Lab')} · saved in this browser</p></div><button type="button" id="close-notes" aria-label="Close notes">✕</button></div><textarea id="page-notes" placeholder="Write your own explanation, questions to revisit, examples, or points you want to remember…"></textarea><div class="notes-foot"><span id="notes-state">Autosaved as you type</span><button type="button" id="export-notes">Export .txt</button></div>`;
    document.body.append(backdrop, panel);
    const allNotes = storage.get('isanotes', {});
    $('#page-notes').value = allNotes[notesPage] || '';
    $('#page-notes').addEventListener('input', () => {
      const latest = storage.get('isanotes', {});
      latest[notesPage] = $('#page-notes').value;
      const saved = storage.set('isanotes', latest);
      $('#notes-state').textContent = saved ? 'Saved in this browser' : 'Could not save: browser storage is full';
    });
    $('#close-notes').addEventListener('click', closeNotes);
    $('#export-notes').addEventListener('click', exportNotes);
  }

  let focusState = storage.get('isafocus', { duration:1500, remaining:1500, endsAt:null, running:false, finished:false });
  let timerInterval = null;
  const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${Math.max(0, seconds % 60).toString().padStart(2,'0')}`;
  function remainingTime() {
    if (!focusState.running || !focusState.endsAt) return Math.max(0, focusState.remaining);
    return Math.max(0, Math.ceil((focusState.endsAt - Date.now()) / 1000));
  }
  function persistTimer() { storage.set('isafocus', focusState); }
  function renderTimer() {
    const remaining = remainingTime();
    const formatted = formatTime(remaining);
    if ($('#focus-time')) $('#focus-time').textContent = formatted;
    if ($('#focus-chip-time')) $('#focus-chip-time').textContent = formatted;
    if ($('#focus-start')) $('#focus-start').textContent = focusState.running ? 'Running' : (focusState.finished ? 'Start again' : 'Start');
    if ($('#focus-start')) $('#focus-start').disabled = focusState.running;
    if ($('#focus-status')) $('#focus-status').textContent = focusState.finished ? 'Session complete. Take a short break, then come back.' : (focusState.running ? 'Stay with one task until the clock ends.' : 'Choose a duration, then start when ready.');
    $$('.focus-preset button').forEach(button => button.classList.toggle('active', Number(button.dataset.minutes) * 60 === focusState.duration));
    if (focusState.running && remaining <= 0) {
      focusState.running = false; focusState.finished = true; focusState.remaining = 0; focusState.endsAt = null; persistTimer();
      if ($('#focus-chip')) $('#focus-chip').setAttribute('aria-label', 'Focus session complete');
    }
  }
  function timerTick() { renderTimer(); if (!focusState.running && timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
  function startTimer() {
    if (focusState.running) return;
    if (focusState.remaining <= 0 || focusState.finished) { focusState.remaining = focusState.duration; focusState.finished = false; }
    focusState.running = true;
    focusState.endsAt = Date.now() + focusState.remaining * 1000;
    persistTimer(); renderTimer();
    if (!timerInterval) timerInterval = setInterval(timerTick, 250);
  }
  function pauseTimer() {
    if (!focusState.running) return;
    focusState.remaining = remainingTime(); focusState.running = false; focusState.endsAt = null; persistTimer(); renderTimer();
  }
  function resetTimer() {
    focusState.running = false; focusState.finished = false; focusState.remaining = focusState.duration; focusState.endsAt = null; persistTimer(); renderTimer();
  }
  function toggleTimerPanel(forceOpen = false) {
    const panel = $('#focus-panel');
    if (!panel) return;
    panel.hidden = forceOpen ? false : !panel.hidden;
    if (!panel.hidden) renderTimer();
  }
  function buildTimer() {
    if ($('#focus-dock')) return;
    const dock = document.createElement('div');
    dock.id = 'focus-dock';
    dock.innerHTML = `<div id="focus-panel" hidden><div class="focus-panel-top"><span>FOCUS SESSION</span><button type="button" id="focus-close" aria-label="Close focus timer">✕</button></div><strong class="focus-time" id="focus-time">25:00</strong><div class="focus-preset" aria-label="Focus session length"><button type="button" data-minutes="15">15 min</button><button type="button" data-minutes="25">25 min</button><button type="button" data-minutes="45">45 min</button></div><div class="focus-actions"><button type="button" class="p" id="focus-start">Start</button><button type="button" id="focus-pause">Pause</button><button type="button" id="focus-reset">Reset</button></div><div class="focus-status" id="focus-status"></div></div><button type="button" id="focus-chip" aria-expanded="false"><span class="focus-dot"></span><span id="focus-chip-time">25:00</span><span>Focus clock</span></button>`;
    document.body.append(dock);
    $('#focus-chip').addEventListener('click', () => {
      toggleTimerPanel();
      $('#focus-chip').setAttribute('aria-expanded', String(!$('#focus-panel').hidden));
    });
    $('#focus-close').addEventListener('click', () => { $('#focus-panel').hidden = true; $('#focus-chip').setAttribute('aria-expanded','false'); });
    $('#focus-start').addEventListener('click', startTimer);
    $('#focus-pause').addEventListener('click', pauseTimer);
    $('#focus-reset').addEventListener('click', resetTimer);
    $$('.focus-preset button').forEach(button => button.addEventListener('click', () => {
      if (focusState.running) return;
      const duration = Number(button.dataset.minutes) * 60;
      focusState.duration = duration; focusState.remaining = duration; focusState.finished = false; focusState.endsAt = null; persistTimer(); renderTimer();
    }));
    renderTimer();
    if (focusState.running) timerInterval = setInterval(timerTick, 250);
  }

  function toggleFocus() {
    const active = document.body.classList.toggle('focus-mode');
    const button = $('#toggle-focus');
    if (button) button.textContent = active ? 'Exit focus view' : 'Focus view';
  }

  function setLastVisited() {
    if (!page) return;
    storage.set('isalastpage', {id:page.id, date:new Date().toISOString()});
  }

  function keyboardShortcuts() {
    document.addEventListener('keydown', event => {
      const tag = event.target?.tagName;
      const typing = ['INPUT','TEXTAREA','SELECT'].includes(tag) || event.target?.isContentEditable;
      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); $('#q')?.focus();
      }
      if (event.key === 'Escape') { closeNotes(); if ($('#focus-panel')) $('#focus-panel').hidden = true; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); $('#q')?.focus();
      }
    });
  }

  function improveSearch() {
    const search = $('#q');
    if (search) {
      search.setAttribute('aria-label', 'Search the whole study guide');
      search.placeholder = 'Search the whole guide · e.g. segregation of duties, SYN flood, audit evidence';
      const wrap = search.parentElement;
      if (wrap && !$('.search-hint', wrap)) {
        const hint = document.createElement('div');
        hint.className = 'search-hint';
        hint.textContent = 'Press / or Ctrl + K to search';
        hint.style.cssText = 'margin:0 0 12px 4px;color:#879087;font-size:10px;';
        search.after(hint);
      }
    }
  }

  function init() {
    decorateNav();
    buildHomeTools();
    decorateSections();
    makeUtilityBar();
    buildNotesPanel();
    buildTimer();
    makeReadingLine();
    improveSearch();
    setLastVisited();
    keyboardShortcuts();
    updateSectionProgress();
    refreshDashboard();
    if (page) document.title = `${titleFor(page)} · ISA Study Lab`;
  }

  init();
})();
