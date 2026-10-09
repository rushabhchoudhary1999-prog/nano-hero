/* ========================================
   Nano Hero — Application
   ======================================== */
import { Nano, prettyKey } from './nano.js';
import { SECTIONS, LESSONS } from './lessons.js';

const PROGRESS_KEY = 'nano-hero-progress-v2';
const FILE_KEY = 'nano-hero-file';
const app = document.getElementById('app');

// ========================================
// Utilities
// ========================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

// ========================================
// Progress
// ========================================
const progress = storageGet(PROGRESS_KEY, { challenges: {} });
progress.challenges ||= {};

const challengeKeys = lesson => lesson.blocks
  .map((block, i) => (block.challenge ? `${lesson.id}:${i}` : null))
  .filter(Boolean);

const isLessonDone = lesson => challengeKeys(lesson).every(k => progress.challenges[k]?.done);
const doneCount = () => LESSONS.filter(isLessonDone).length;
const firstIncomplete = () => LESSONS.find(l => !isLessonDone(l)) || LESSONS[0];

function recordChallenge(key, ms) {
  const prev = progress.challenges[key];
  progress.challenges[key] = { done: true, best: prev?.best ? Math.min(prev.best, ms) : ms };
  storageSet(PROGRESS_KEY, progress);
  return progress.challenges[key];
}

function renderHeaderProgress() {
  $('#headerProgress').textContent = `${doneCount()}/${LESSONS.length}`;
  $('#headerProgressLink').href = `#/lessons/${firstIncomplete().id}`;
}

// ========================================
// Markdown (headings, paragraphs, lists, tables, code, quotes)
// ========================================
const KEY_PATTERN = /^(\^.{1,2}|M-.{1,3}|F\d{1,2}|Ctrl\+.+|Alt\+.+|Enter|Esc|Tab|Home|End|PgUp|PgDn|Backspace|[←→↑↓]|[YNA])$/;

function renderInline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = escapeHtml(out)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => {
    const code = codes[i];
    return KEY_PATTERN.test(code) ? `<kbd>${escapeHtml(code)}</kbd>` : `<code>${escapeHtml(code)}</code>`;
  });
}

const splitRow = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

function markdownToHtml(md) {
  const lines = md.split('\n');
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const [head, , ...body] = rows;
      html.push(`<div class="table-wrap"><table><thead><tr>${splitRow(head).map(c => `<th>${renderInline(c)}</th>`).join('')}</tr></thead><tbody>${
        body.map(r => `<tr>${splitRow(r).map(c => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (line.startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      html.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }
    const list = line.match(/^\s*(\d+\.|[-*])\s+/);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      const items = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(lines[i++].replace(pattern, ''));
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map(item => `<li>${renderInline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length + 1;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(```|\s*\||>|\s*(\d+\.|[-*])\s|#{1,3}\s)/.test(lines[i])) para.push(lines[i++]);
    html.push(`<p>${para.map(renderInline).join(' ')}</p>`);
  }
  return html.join('');
}

// ========================================
// Live cleanup between views
// ========================================
let cleanups = [];
function onCleanup(fn) { cleanups.push(fn); }
function runCleanups() { cleanups.forEach(fn => fn()); cleanups = []; }

// Warn before leaving mid-drill (Ctrl+W closes the tab in browsers!)
const activeChallenges = new Set();
window.addEventListener('beforeunload', e => {
  if ([...activeChallenges].some(c => c.startedAt && !c.finished)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ========================================
// Free editor (home page + playground)
// ========================================
const ACTION_LABELS = {
  up: 'up', down: 'down', left: 'left', right: 'right', home: 'line start', end: 'line end',
  pageup: 'page up', pagedown: 'page down', firstline: 'first line', lastline: 'last line',
  prevword: 'prev word', nextword: 'next word', gotoline: 'go to line', search: 'where is',
  findnext: 'next match', findprev: 'prev match', replace: 'replace', cut: 'cut', paste: 'paste',
  copy: 'copy', mark: 'mark', undo: 'undo', redo: 'redo', writeout: 'write out', save: 'save',
  exit: 'exit', help: 'help', location: 'location', linenumbers: 'line numbers', comment: 'comment',
  bracket: 'bracket', backspace: 'backspace', delete: 'delete', enter: 'newline', tab: 'tab',
};

const WELCOME_TEXT = `Welcome to Nano Hero!

This is a working nano editor. Click here and try:

  - Type anywhere. nano has no modes.
  - ^O then Enter writes the file out (saves it)
  - ^K cuts a line, ^U pastes it back
  - M-6 copies a line, M-A starts a selection
  - F6 (^W in a real terminal) searches, M-W finds next
  - ^\\ replaces text, ^_ jumps to a line number
  - M-U undoes, M-E redoes
  - M-# toggles line numbers, ^G shows the help screen
  - ^X exits (press Enter to reopen)

When you're happy, hit Download to save the file to your computer.`;

function downloadName(name) {
  return (name || 'untitled.txt').split('/').pop() || 'untitled.txt';
}

function mountWorkbench(container, { rows }) {
  container.innerHTML = `
    <div class="window">
      <div class="window-bar">
        <div class="window-dots"><span></span><span></span><span></span></div>
        <span class="window-title" data-role="title">hello.txt</span>
        <div class="window-actions">
          <button type="button" class="tool-btn" data-role="new" title="Start an empty file">New</button>
          <button type="button" class="tool-btn" data-role="open" title="Open a text file from your computer">Open…</button>
          <button type="button" class="tool-btn tool-primary" data-role="download" title="Download the current buffer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>
            Download
          </button>
          <input type="file" data-role="file" accept=".txt,.md,.sh,.conf,.cfg,.ini,.json,.js,.ts,.py,.yml,.yaml,.csv,.log,.nanorc,text/*" hidden>
        </div>
      </div>
      <div data-role="nano"></div>
    </div>
    <div class="keyfeed" data-role="feed" aria-live="polite"><span class="keyfeed-empty">Click the editor and press some nano keys — they'll show up here.</span></div>`;

  const saved = storageGet(FILE_KEY, null);
  const titleEl = $('[data-role="title"]', container);
  const feed = $('[data-role="feed"]', container);
  const fileInput = $('[data-role="file"]', container);
  const keys = [];

  const updateTitle = () => {
    titleEl.textContent = `${sim.filename || 'New Buffer'}${sim.modified ? ' •' : ''}`;
  };

  const sim = new Nano($('[data-role="nano"]', container), {
    rows,
    text: saved?.text ?? WELCOME_TEXT,
    filename: saved?.filename ?? 'hello.txt',
    onEvent(ev) {
      if (ev.type === 'action' && ev.key) {
        const label = ev.key.length === 1 ? null : ACTION_LABELS[ev.action];
        if (label) {
          keys.push(`<span class="keychip"><kbd>${escapeHtml(prettyKey(ev.key))}</kbd>${label}</span>`);
          if (keys.length > 8) keys.shift();
          feed.innerHTML = keys.join('');
        }
      }
      if (ev.type === 'save') {
        storageSet(FILE_KEY, { text: sim.text, filename: sim.filename });
        toast(`Saved <b>${escapeHtml(sim.filename)}</b> — it's kept in this browser. <button type="button" class="toast-link" data-download>Download</button>`);
      }
      if (ev.type === 'key') updateTitle();
    },
  });
  updateTitle();

  const download = () => {
    const blob = new Blob([sim.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: downloadName(sim.filename) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  $('[data-role="download"]', container).addEventListener('click', download);
  $('[data-role="new"]', container).addEventListener('click', () => {
    if (sim.modified && !confirm('Discard unsaved changes?')) return;
    sim.load({ text: '', filename: 'untitled.txt', rows });
    updateTitle();
    sim.focus();
  });
  $('[data-role="open"]', container).addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > 512 * 1024) { toast('That file is too big for the simulator (max 512 KB).'); return; }
    const text = (await file.text()).replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    sim.load({ text: text.replace(/\n$/, ''), filename: file.name, rows });
    updateTitle();
    toast(`Opened <b>${escapeHtml(file.name)}</b>`);
    sim.focus();
  });

  const onToastClick = e => { if (e.target.matches('[data-download]')) download(); };
  document.addEventListener('click', onToastClick);
  onCleanup(() => document.removeEventListener('click', onToastClick));
  return sim;
}

// ========================================
// Toasts
// ========================================
function toast(html) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('leaving'), 3800);
  setTimeout(() => el.remove(), 4200);
}

// ========================================
// Challenge runner
// ========================================
const normLines = text => {
  const lines = text.split('\n').map(l => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
};

class Challenge {
  constructor(el, spec, key, onComplete) {
    this.el = el;
    this.spec = spec;
    this.key = key;
    this.onComplete = onComplete;
    el.innerHTML = `
      <header class="ch-head">
        <div class="ch-title"><span class="ch-tag">Practice</span>${escapeHtml(spec.title)}</div>
        <div class="ch-meta">
          <span class="ch-round" title="Round"></span>
          <span class="ch-timer" title="Time">00:00</span>
          <button type="button" class="ch-restart" title="Start this drill over">↻ restart</button>
        </div>
      </header>
      <p class="ch-instruction"></p>
      <div class="ch-progress"><div class="ch-progress-fill"></div></div>
      <div class="ch-editor"></div>
      <div class="ch-goal"></div>
      <div class="ch-done hidden"></div>
      ${spec.block ? `<p class="ch-tip">🔒 ${escapeHtml(spec.block.message)}</p>` : ''}`;

    this.els = {
      round: $('.ch-round', el), timer: $('.ch-timer', el), instruction: $('.ch-instruction', el),
      fill: $('.ch-progress-fill', el), goal: $('.ch-goal', el), done: $('.ch-done', el), editor: $('.ch-editor', el),
    };
    this.sim = new Nano(this.els.editor, { rows: spec.rows || 10, onEvent: ev => this.onEvent(ev) });
    $('.ch-restart', el).addEventListener('click', () => { this.start(); this.sim.focus(); });
    activeChallenges.add(this);
    this.start();
  }

  start() {
    clearInterval(this.ticker);
    clearTimeout(this.pending);
    this.round = 0;
    this.startedAt = null;
    this.finished = false;
    this.transitioning = false;
    this.el.classList.remove('is-done');
    this.els.done.classList.add('hidden');
    this.els.timer.textContent = '00:00';
    this.sim.blockedKeys = new Map((this.spec.block?.keys || []).map(k => [k, this.spec.block.message]));
    this.sim.readOnly = this.spec.readOnly || null;
    if (this.spec.setup) this.sim.load({ rows: this.spec.rows, ...this.spec.setup() });
    this.loadRound();
  }

  loadRound() {
    const cfg = this.spec.round(this.round, this.sim) || {};
    if (cfg.setup) this.sim.load({ rows: this.spec.rows, ...cfg.setup });
    if (cfg.after) this.sim.run(cfg.after);
    this.cfg = cfg;
    this.log = [];
    this.transitioning = false;
    this.sim.setTargets(cfg.target ? [cfg.target] : []);
    this.els.instruction.innerHTML = renderInline(cfg.instruction || this.spec.instruction || '');
    this.renderStatus();
  }

  renderStatus() {
    const total = this.spec.rounds;
    this.els.round.textContent = `${Math.min(this.round + 1, total)} / ${total}`;
    this.els.fill.style.width = `${(this.round / total) * 100}%`;
    this.renderGoal();
  }

  renderGoal() {
    const { cfg, sim } = this;
    if (this.finished || cfg.target) { this.els.goal.innerHTML = ''; return; }
    let html = '';
    if (cfg.goal != null) {
      const goal = normLines(cfg.goal);
      const cur = normLines(sim.text);
      html += `<div class="goal-title">Goal — make the file look like this</div><div class="goal-lines">${goal.map((line, i) => {
        const ok = cur[i] === line;
        return `<div class="goal-line ${ok ? 'ok' : ''}"><span class="goal-mark">${ok ? '✓' : '•'}</span><code>${escapeHtml(line) || '&nbsp;'}</code></div>`;
      }).join('')}</div>`;
      if (cur.length > goal.length) html += `<div class="goal-extra">− ${cur.length - goal.length} extra line${cur.length - goal.length > 1 ? 's' : ''} to remove</div>`;
      const extra = [];
      if (cfg.requireSave) extra.push(['Saved', this.isSaved()]);
      if (cfg.requireExit) extra.push(['Exited nano', sim.exited]);
      if (extra.length) html += `<div class="checklist">${extra.map(([l, ok]) => this.checkItem(l, ok)).join('')}</div>`;
    }
    if (cfg.checks) {
      html += `<div class="checklist">${cfg.checks.map(c => this.checkItem(c.label, c.test(sim, this.log))).join('')}</div>`;
    }
    this.els.goal.innerHTML = html;
  }

  checkItem(label, ok) {
    return `<div class="check ${ok ? 'ok' : ''}"><span class="goal-mark">${ok ? '✓' : '○'}</span>${escapeHtml(label)}</div>`;
  }

  isSaved() { return this.log.some(e => e.type === 'save') && !this.sim.modified; }

  roundComplete() {
    const { cfg, sim } = this;
    if (cfg.target) {
      const t = cfg.target;
      return sim.row === t.row && (t.line || sim.col === t.col) && !sim.prompt && !sim.help && !sim.exited;
    }
    if (cfg.goal != null) {
      const same = normLines(sim.text).join('\n') === normLines(cfg.goal).join('\n');
      return same && (cfg.requireExit ? sim.exited : !sim.prompt)
        && (!cfg.requireSave || this.isSaved());
    }
    if (cfg.checks) return cfg.checks.every(c => c.test(sim, this.log));
    return false;
  }

  onEvent(ev) {
    if (this.finished || this.transitioning) return;
    this.log.push(ev);
    if (ev.type !== 'key') return;
    if (!this.startedAt) {
      this.startedAt = performance.now();
      this.ticker = setInterval(() => { this.els.timer.textContent = formatTime(performance.now() - this.startedAt); }, 200);
    }
    this.renderGoal();
    if (this.roundComplete()) this.advance();
  }

  advance() {
    this.round++;
    this.els.editor.classList.remove('flash');
    void this.els.editor.offsetWidth;
    this.els.editor.classList.add('flash');
    if (this.round >= this.spec.rounds) { this.finish(); return; }
    this.renderStatus();
    if (this.cfg.target) { this.loadRound(); return; }
    this.transitioning = true;
    this.els.instruction.innerHTML = '<span class="ch-nice">✓ Nice! Next round…</span>';
    this.pending = setTimeout(() => this.loadRound(), 900);
  }

  finish() {
    this.finished = true;
    clearInterval(this.ticker);
    const ms = performance.now() - this.startedAt;
    const prevBest = progress.challenges[this.key]?.best;
    const record = recordChallenge(this.key, ms);
    this.sim.setTargets([]);
    this.els.fill.style.width = '100%';
    this.els.round.textContent = `${this.spec.rounds} / ${this.spec.rounds}`;
    this.els.timer.textContent = formatTime(ms);
    this.els.goal.innerHTML = '';
    this.els.instruction.innerHTML = '';
    this.el.classList.add('is-done');
    const newBest = !prevBest || ms < prevBest;
    this.els.done.innerHTML = `
      <span class="ch-done-icon">✓</span>
      <span>Complete in <b>${formatTime(ms)}</b>${newBest ? ' — <span class="ch-best">new best!</span>' : ` · best ${formatTime(record.best)}`}</span>
      <button type="button" class="btn btn-secondary btn-sm" data-again>Play again</button>`;
    this.els.done.classList.remove('hidden');
    $('[data-again]', this.els.done).addEventListener('click', () => { this.start(); this.sim.focus(); });
    this.onComplete();
  }

  destroy() {
    clearInterval(this.ticker);
    clearTimeout(this.pending);
    activeChallenges.delete(this);
  }
}

// ========================================
// Views
// ========================================
const totalDrills = LESSONS.reduce((n, l) => n + l.blocks.filter(b => b.challenge).reduce((m, b) => m + b.challenge.rounds, 0), 0);

function renderHome() {
  const next = firstIncomplete();
  const started = doneCount() > 0;
  app.innerHTML = `
    <section class="landing container">
      <div class="landing-copy">
        <span class="eyebrow">Interactive nano tutorial</span>
        <h1>Learn nano.<br><span class="accent">Finally make it stick.</span></h1>
        <p class="lead">Hands-on lessons inside a real nano simulator. Build muscle memory with timed drills, right in your browser, from your very first <kbd>^X</kbd> to search &amp; replace.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="#/lessons/${next.id}">${started ? 'Continue Learning' : 'Start Learning nano'} →</a>
          <a class="btn btn-secondary btn-lg" href="#/playground">Open Playground</a>
        </div>
        <div class="landing-stats">
          <div><b>${LESSONS.length}</b><span>lessons</span></div>
          <div><b>${totalDrills}</b><span>drill rounds</span></div>
          <div><b>0</b><span>installs</span></div>
        </div>
      </div>
      <div class="landing-editor" id="homeWorkbench"></div>
    </section>

    <section class="how container">
      <h2>How it works</h2>
      <div class="how-grid">
        <div class="how-card"><span class="how-num">1</span><h3>Learn by doing</h3><p>Every lesson has drills in a working nano editor. Real keystrokes, real feedback.</p></div>
        <div class="how-card"><span class="how-num">2</span><h3>Build muscle memory</h3><p>Fresh targets and puzzles every round, a timer to beat, and the slow way switched off so the right shortcut sticks.</p></div>
        <div class="how-card"><span class="how-num">3</span><h3>Structured from zero</h3><p>From opening your first file to search &amp; replace, selections and your own <code>~/.nanorc</code>.</p></div>
      </div>
    </section>

    <section class="curriculum container">
      <h2>The course</h2>
      <div class="curriculum-grid">
        ${SECTIONS.map(section => `
          <div class="curriculum-card">
            <h3>${escapeHtml(section.title)}</h3>
            <ol>${section.lessons.map(lesson => `
              <li><a href="#/lessons/${lesson.id}" class="${isLessonDone(lesson) ? 'done' : ''}">
                <span class="cl-check">${isLessonDone(lesson) ? '✓' : ''}</span>
                <span class="cl-title">${escapeHtml(lesson.title)}</span>
                <code class="cl-keys">${escapeHtml(lesson.keys)}</code>
              </a></li>`).join('')}
            </ol>
          </div>`).join('')}
      </div>
      <div class="final-cta"><a class="btn btn-primary btn-lg" href="#/lessons/${next.id}">${started ? 'Continue' : 'Start'} with “${escapeHtml(next.title)}” →</a></div>
    </section>`;
  mountWorkbench($('#homeWorkbench'), { rows: 15 });
}

function renderPlayground() {
  app.innerHTML = `
    <section class="playground container">
      <header class="page-head">
        <h1>Playground</h1>
        <p>A full nano to experiment in. Open a file from your computer, edit it, and download the result. Saving (<kbd>^O</kbd>) keeps it in this browser.</p>
      </header>
      <div class="playground-grid">
        <div id="playWorkbench"></div>
        <aside class="playground-side">${cheatsheetHtml(true)}</aside>
      </div>
    </section>`;
  mountWorkbench($('#playWorkbench'), { rows: 22 });
}

// ---------- Lessons ----------
function sidebarHtml(current) {
  return `
    <div class="sidebar-head">
      <span>Lessons</span>
      <button type="button" class="sidebar-close" id="sidebarClose" aria-label="Close lessons">✕</button>
    </div>
    ${SECTIONS.map(section => `
      <div class="side-section">
        <div class="side-section-title">${escapeHtml(section.title)}</div>
        ${section.lessons.map(lesson => `
          <a href="#/lessons/${lesson.id}" class="side-lesson ${lesson.id === current.id ? 'active' : ''} ${isLessonDone(lesson) ? 'done' : ''}" ${lesson.id === current.id ? 'aria-current="page"' : ''}>
            <span class="side-check" aria-hidden="true">${isLessonDone(lesson) ? '✓' : ''}</span>
            <span class="side-title">${escapeHtml(lesson.title)}</span>
            <code class="side-keys">${escapeHtml(lesson.keys)}</code>
          </a>`).join('')}
      </div>`).join('')}
    <div class="side-progress">
      <div class="progress-bar"><div class="progress-fill" style="width:${(doneCount() / LESSONS.length) * 100}%"></div></div>
      <span>${doneCount()} of ${LESSONS.length} lessons complete</span>
    </div>`;
}

function renderLesson(id) {
  const index = LESSONS.findIndex(l => l.id === id);
  if (index === -1) { location.hash = '#/'; return; }
  const lesson = LESSONS[index];
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  document.title = `${lesson.title} — Nano Hero`;

  app.innerHTML = `
    <div class="lesson-layout container">
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <aside class="sidebar" id="sidebar" aria-label="Lessons">${sidebarHtml(lesson)}</aside>
      <article class="lesson">
        <button type="button" class="lessons-toggle" id="lessonsToggle">☰ All lessons</button>
        <header class="lesson-head">
          <div class="eyebrow">${escapeHtml(lesson.section)} · Lesson ${index + 1} of ${LESSONS.length}</div>
          <h1>${escapeHtml(lesson.title)} <code class="lesson-keys">${escapeHtml(lesson.keys)}</code></h1>
        </header>
        <p class="touch-note">These drills need a physical keyboard. Plug one in or come back on a computer.</p>
        ${lesson.blocks.map((block, i) => (block.md
          ? `<div class="prose">${markdownToHtml(block.md)}</div>`
          : `<section class="challenge" data-block="${i}"></section>`)).join('')}
        <div class="lesson-complete ${isLessonDone(lesson) ? '' : 'hidden'}" id="lessonComplete">
          <span>🎉 Lesson complete!</span>
          ${next ? `<a class="btn btn-primary" href="#/lessons/${next.id}">Next: ${escapeHtml(next.title)} →</a>` : '<a class="btn btn-primary" href="#/cheatsheet">You beat the course 🦸 — grab the cheatsheet</a>'}
        </div>
        <nav class="lesson-nav">
          ${prev ? `<a class="nav-card" href="#/lessons/${prev.id}"><span>← Back <kbd>Alt+←</kbd></span><b>${escapeHtml(prev.title)}</b></a>` : '<span></span>'}
          ${next ? `<a class="nav-card next" href="#/lessons/${next.id}"><span>Next <kbd>Alt+→</kbd></span><b>${escapeHtml(next.title)}</b></a>` : ''}
        </nav>
      </article>
    </div>`;

  const challenges = $$('.challenge', app).map(el => {
    const blockIndex = Number(el.dataset.block);
    const key = `${lesson.id}:${blockIndex}`;
    return new Challenge(el, lesson.blocks[blockIndex].challenge, key, () => {
      $('#sidebar').innerHTML = sidebarHtml(lesson);
      bindSidebar();
      renderHeaderProgress();
      if (isLessonDone(lesson)) {
        $('#lessonComplete').classList.remove('hidden');
        toast(`Lesson complete: <b>${escapeHtml(lesson.title)}</b> 🎉`);
      }
    });
  });
  onCleanup(() => challenges.forEach(c => c.destroy()));

  const bindSidebar = () => {
    $('#sidebarClose').addEventListener('click', closeSidebar);
  };
  bindSidebar();
  $('#lessonsToggle').addEventListener('click', openSidebar);
  $('#sidebarBackdrop').addEventListener('click', closeSidebar);

  const onKey = e => {
    if (e.target.closest('.nano') || e.target.matches('input, textarea')) return;
    if (e.altKey && e.key === 'ArrowRight' && next) location.hash = `#/lessons/${next.id}`;
    if (e.altKey && e.key === 'ArrowLeft' && prev) location.hash = `#/lessons/${prev.id}`;
  };
  document.addEventListener('keydown', onKey);
  onCleanup(() => document.removeEventListener('keydown', onKey));
}

function openSidebar() { document.body.classList.add('sidebar-open'); }
function closeSidebar() { document.body.classList.remove('sidebar-open'); }

// ---------- Cheatsheet ----------
const CHEATSHEET = [
  { title: 'File', keys: [['^O', 'Write out (save as)'], ['^S', 'Save'], ['^X', 'Exit / close buffer'], ['^R', 'Read file into buffer'], ['^G', 'Help']] },
  { title: 'Move', keys: [['← ↑ ↓ →', 'Move cursor'], ['^A', 'Start of line'], ['^E', 'End of line'], ['^Y', 'Page up'], ['^V', 'Page down'], ['M-\\', 'First line'], ['M-/', 'Last line'], ['^_', 'Go to line, column'], ['M-]', 'Matching bracket']] },
  { title: 'Edit', keys: [['^K', 'Cut line / selection'], ['^U', 'Paste'], ['M-6', 'Copy line / selection'], ['M-A', 'Set / unset mark'], ['M-U', 'Undo'], ['M-E', 'Redo'], ['M-3', 'Comment / uncomment'], ['^J', 'Justify paragraph']] },
  { title: 'Search', keys: [['^W', 'Where is (search)'], ['M-W', 'Next match'], ['M-Q', 'Previous match'], ['^\\', 'Replace'], ['Y / N / A', 'Yes / No / All'], ['^C', 'Cancel prompt']] },
  { title: 'Info', keys: [['^C', 'Cursor location'], ['M-#', 'Toggle line numbers'], ['Esc then key', 'Same as M-key'], ['nano -l file', 'Open with line numbers'], ['nano +42 file', 'Open at line 42']] },
];

function cheatsheetHtml(compact = false) {
  return `<div class="cheatsheet-grid ${compact ? 'compact' : ''}">${CHEATSHEET.map(cat => `
    <div class="cheat-card" data-cat>
      <h3>${cat.title}</h3>
      <table>${cat.keys.map(([k, d]) => `<tr data-text="${escapeHtml(`${k} ${d}`.toLowerCase())}"><td><kbd>${escapeHtml(k)}</kbd></td><td>${escapeHtml(d)}</td></tr>`).join('')}</table>
    </div>`).join('')}</div>`;
}

function renderCheatsheet() {
  app.innerHTML = `
    <section class="container cheatsheet">
      <header class="page-head">
        <h1>nano Cheatsheet</h1>
        <p><kbd>^</kbd> = Ctrl, <kbd>M-</kbd> = Alt (or press Esc first).</p>
        <input type="search" class="cheat-filter" id="cheatFilter" placeholder="Filter shortcuts… e.g. paste, ^K, line" aria-label="Filter shortcuts">
      </header>
      ${cheatsheetHtml()}
      <p class="cheat-empty hidden" id="cheatEmpty">No shortcuts match.</p>
    </section>`;
  $('#cheatFilter').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    let any = false;
    $$('[data-cat]', app).forEach(card => {
      let visible = 0;
      $$('tr', card).forEach(tr => {
        const show = !q || tr.dataset.text.includes(q);
        tr.hidden = !show;
        if (show) visible++;
      });
      card.hidden = visible === 0;
      if (visible) any = true;
    });
    $('#cheatEmpty').classList.toggle('hidden', any);
  });
}

// ========================================
// Router
// ========================================
function route() {
  runCleanups();
  closeSidebar();
  const [view, param] = location.hash.replace(/^#\/?/, '').split('/');
  $$('.nav-link[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === (view || 'home')));
  document.body.dataset.view = view || 'home';

  if (view === 'lessons') renderLesson(param || firstIncomplete().id);
  else if (view === 'playground') { document.title = 'Playground — Nano Hero'; renderPlayground(); }
  else if (view === 'cheatsheet') { document.title = 'Cheatsheet — Nano Hero'; renderCheatsheet(); }
  else { document.title = 'Nano Hero — Learn nano interactively'; renderHome(); }

  renderHeaderProgress();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
