/* ========================================
   Nano Hero — in-browser nano simulator
   ========================================
   A small model of GNU nano: buffer with nano's trailing "magic line", cursor,
   mark, cut buffer, undo/redo, prompts (write out, exit, search, replace,
   go to line), help screen, line numbers and comments.

   Keys are normalised to nano-style names: 'C-k' (Ctrl+K), 'M-u' (Alt+U),
   'Up', 'Enter', 'F6', or a single printable character. Pressing Esc and then
   a key works as Meta, exactly like real nano.
*/

const NAMED_KEYS = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown',
  Enter: 'Enter', Backspace: 'Backspace', Delete: 'Delete', Tab: 'Tab', Escape: 'Escape',
};

// Characters for physical keys, so Alt/Option combos work on every layout and OS.
const CODE_CHARS = {
  Backslash: ['\\', '|'], Slash: ['/', '?'], Comma: [',', '<'], Period: ['.', '>'],
  BracketLeft: ['[', '{'], BracketRight: [']', '}'], Minus: ['-', '_'], Equal: ['=', '+'],
  Semicolon: [';', ':'], Quote: ["'", '"'], Backquote: ['`', '~'],
};
const SHIFTED_DIGITS = ')!@#$%^&*(';

function codeChar(e) {
  const code = e.code || '';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(code)) return e.shiftKey ? SHIFTED_DIGITS[code[5]] : code[5];
  if (CODE_CHARS[code]) return CODE_CHARS[code][e.shiftKey ? 1 : 0];
  return e.key && e.key.length === 1 ? e.key.toLowerCase() : null;
}

const BINDINGS = {
  Up: 'up', 'C-p': 'up', Down: 'down', Left: 'left', 'C-b': 'left', Right: 'right',
  Home: 'home', 'C-a': 'home', End: 'end', 'C-e': 'end',
  PageUp: 'pageup', 'C-y': 'pageup', PageDown: 'pagedown', 'C-v': 'pagedown',
  'M-\\': 'firstline', 'M-|': 'firstline', 'C-Home': 'firstline',
  'M-/': 'lastline', 'M-?': 'lastline', 'C-End': 'lastline',
  'C-Left': 'prevword', 'C-Right': 'nextword',
  'C-_': 'gotoline', 'C-/': 'gotoline', 'M-g': 'gotoline',
  'C-w': 'search', F6: 'search', 'C-f': 'search', 'M-w': 'findnext', 'M-q': 'findprev',
  'C-\\': 'replace', 'M-r': 'replace',
  'C-k': 'cut', F9: 'cut', 'C-u': 'paste', F10: 'paste', 'M-6': 'copy', 'M-^': 'copy',
  'M-a': 'mark', 'C-6': 'mark', 'C-^': 'mark',
  'M-u': 'undo', 'M-e': 'redo',
  'C-o': 'writeout', F3: 'writeout', 'C-s': 'save', 'C-x': 'exit', F2: 'exit',
  'C-g': 'help', F1: 'help', 'C-c': 'location',
  'M-#': 'linenumbers', 'M-3': 'comment', 'M-]': 'bracket',
  Backspace: 'backspace', 'C-h': 'backspace', Delete: 'delete', 'C-d': 'delete',
  Enter: 'enter', Tab: 'tab', 'C-l': 'refresh',
  'C-t': 'unsupported', 'C-r': 'unsupported', 'C-j': 'unsupported',
};

export const EDIT_ACTIONS = new Set([
  'type', 'enter', 'tab', 'backspace', 'delete', 'cut', 'paste', 'undo', 'redo', 'replace', 'comment',
]);

const HINTS = {
  main: [
    [['^G', 'Help'], ['^O', 'Write Out'], ['^W', 'Where Is'], ['^K', 'Cut'], ['^T', 'Execute'], ['^C', 'Location']],
    [['^X', 'Exit'], ['^R', 'Read File'], ['^\\', 'Replace'], ['^U', 'Paste'], ['^J', 'Justify'], ['^_', 'Go To Line']],
  ],
  write: [
    [['^G', 'Help'], ['M-D', 'DOS Format'], ['M-A', 'Append'], ['M-B', 'Backup File']],
    [['^C', 'Cancel'], ['M-M', 'Mac Format'], ['M-P', 'Prepend'], ['^T', 'Browse']],
  ],
  search: [
    [['^G', 'Help'], ['M-C', 'Case Sens'], ['M-B', 'Backwards'], ['M-R', 'Reg.exp.']],
    [['^C', 'Cancel'], ['^Y', 'First Line'], ['^V', 'Last Line'], ['^R', 'Replace']],
  ],
  goto: [
    [['^G', 'Help'], ['^Y', 'First Line'], ['^T', 'Go To Text']],
    [['^C', 'Cancel'], ['^V', 'Last Line']],
  ],
  yesno: [[['Y', 'Yes']], [['N', 'No'], ['^C', 'Cancel']]],
  yesnoall: [[['Y', 'Yes'], ['A', 'All']], [['N', 'No'], ['^C', 'Cancel']]],
  help: [
    [['^L', 'Refresh'], ['^Y', 'Prev Page'], ['^V', 'Next Page']],
    [['^X', 'Close'], ['M-\\', 'First Line'], ['M-/', 'Last Line']],
  ],
};

const HELP_TEXT = `Main nano help text

 Shortcuts are written as ^ (Ctrl) or M- (Alt). If an Alt
 shortcut doesn't work, press Esc and then the key instead.

 ^G   F1     Display this help text
 ^X   F2     Close the buffer / exit nano
 ^O   F3     Write the buffer to disk
 ^S          Save without prompting
 ^W   F6     Search forward
 M-W         Repeat search forward
 M-Q         Repeat search backward
 ^\\   M-R    Replace a string
 ^K   F9     Cut the line (or marked region)
 ^U   F10    Paste the cutbuffer
 M-6         Copy the line (or marked region)
 M-A         Set or unset the mark
 M-U         Undo
 M-E         Redo
 ^A   Home   Go to beginning of line
 ^E   End    Go to end of line
 ^Y   PgUp   Go one screenful up
 ^V   PgDn   Go one screenful down
 M-\\         Go to first line of file
 M-/         Go to last line of file
 ^_   M-G    Go to line and column number
 ^C          Report cursor position
 M-#         Toggle line numbers
 M-3         Comment / uncomment line(s)
 M-]         Go to matching bracket`.split('\n');

const UNDO_LABELS = {
  type: 'addition', enter: 'line break', backspace: 'deletion', delete: 'deletion',
  cut: 'cut', paste: 'paste', replace: 'replacement', comment: 'comment', tab: 'addition',
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function commentStringFor(filename = '') {
  return /\.(js|ts|jsx|tsx|c|h|cpp|java|go|rs|css|swift|kt)$/i.test(filename) ? '//' : '#';
}

export class Nano {
  constructor(root, options = {}) {
    this.root = root;
    this.onEvent = options.onEvent || (() => {});
    this.rows = options.rows || 12;
    this.blockedKeys = new Map();
    this.readOnly = null;
    this.targets = [];

    root.classList.add('nano');
    root.tabIndex = 0;
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', 'nano editor simulator — click and use your keyboard');
    root.addEventListener('keydown', e => this.handleKey(e));
    root.addEventListener('keyup', e => { if (e.key === 'Alt') e.preventDefault(); });
    root.addEventListener('mousedown', () => setTimeout(() => root.focus(), 0));
    root.addEventListener('focus', () => this.render());
    root.addEventListener('blur', () => this.render());

    this.load(options);
  }

  // ---------- Public API ----------
  load({ text = '', filename = '', cursor = [0, 0], lineNumbers = false, saved = true, rows } = {}) {
    if (rows) this.rows = rows;
    this.lines = text.split('\n');
    this.ensureMagicLine();
    this.filename = filename;
    this.row = clamp(cursor[0], 0, this.lines.length - 1);
    this.col = clamp(cursor[1], 0, this.lines[this.row].length);
    this.x = this.col;
    this.top = 0;
    this.mark = null;
    this.cutBuffer = '';
    this.lastAction = null;
    this.undoStack = [];
    this.redoStack = [];
    this.savedText = saved ? this.text : null;
    this.lineNumbers = lineNumbers;
    this.prompt = null;
    this.status = null;
    this.help = false;
    this.helpTop = 0;
    this.exited = false;
    this.metaPending = false;
    this.lastSearch = '';
    this.matchHighlight = null;
    this.scrollToCursor(true);
    this.render();
  }

  get text() { return this.lines.join('\n'); }
  get modified() { return this.text !== this.savedText; }

  setTargets(targets) { this.targets = targets || []; this.scrollToCursor(); this.render(); }

  /** Run keys without events or blocks — used by lessons to set up a scenario. */
  run(keys) {
    for (const key of keys) {
      if (key.startsWith('type:')) [...key.slice(5)].forEach(ch => this.dispatch(ch, true));
      else this.dispatch(key, true);
    }
    this.status = null;
    this.scrollToCursor();
    this.render();
  }

  focus() { this.root.focus({ preventScroll: true }); }

  // ---------- Keyboard ----------
  keyName(e) {
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'OS'].includes(e.key)) return null;
    if (e.metaKey || e.isComposing) return null;
    const named = NAMED_KEYS[e.key] || (/^F\d{1,2}$/.test(e.key) ? e.key : null);
    if (named) {
      if (e.ctrlKey && !e.altKey) return named === 'Escape' ? null : `C-${named}`;
      if (e.altKey && !e.ctrlKey) return `M-${named}`;
      return named;
    }
    if ((e.ctrlKey && e.altKey) || e.getModifierState?.('AltGraph')) {
      return e.key.length === 1 ? e.key : null; // AltGr produces characters on many layouts
    }
    if (e.ctrlKey) { const ch = codeChar(e); return ch ? `C-${ch}` : null; }
    if (e.altKey) { const ch = codeChar(e); return ch ? `M-${ch}` : null; }
    return e.key.length === 1 ? e.key : null;
  }

  handleKey(e) {
    let key = this.keyName(e);
    if (!key) return;

    // Let unbound function keys and Ctrl+Shift combos (devtools, etc.) reach the browser.
    const inMain = !this.prompt && !this.help && !this.exited && !this.metaPending;
    if (inMain && !(key in BINDINGS) && key.length > 1 && (/^F\d/.test(key) || (e.ctrlKey && e.shiftKey && key !== 'C-_'))) return;

    e.preventDefault();
    e.stopPropagation();

    if (this.exited) {
      if (key === 'Enter') this.reopen();
      return;
    }

    if (key === 'Escape') {
      this.metaPending = !this.metaPending;
      return;
    }
    if (this.metaPending) {
      this.metaPending = false;
      if (key.length === 1) key = `M-${key.toLowerCase()}`;
      else if (!key.startsWith('C-') && !key.startsWith('M-')) key = `M-${key}`;
    }

    if (this.help) this.helpKey(key);
    else if (this.prompt) this.promptKey(key);
    else this.dispatch(key);

    this.scrollToCursor();
    this.render();
    // 'key' marks the end of a full keystroke — listeners check goals on this event.
    this.emit({ type: 'key', key });
  }

  dispatch(key, silent = false) {
    const action = BINDINGS[key] || (key.length === 1 ? 'type' : null);
    if (!silent) this.status = null;

    if (!action) {
      if (!silent) this.setStatus(`Unbound key: ${prettyKey(key)}`);
      return;
    }
    if (!silent) {
      const blockKey = key.length === 1 ? 'TEXT' : key;
      if (this.blockedKeys.has(blockKey)) {
        this.setStatus(this.blockedKeys.get(blockKey), 'warn');
        this.emit({ type: 'blocked', key });
        return;
      }
      if (this.readOnly && EDIT_ACTIONS.has(action)) {
        this.setStatus(this.readOnly, 'warn');
        this.emit({ type: 'blocked', key });
        return;
      }
    }

    this.actions[action].call(this, key);
    if (action !== 'mark') this.lastAction = action;
    if (!silent) this.emit({ type: 'action', action, key });
  }

  emit(event) { this.onEvent(event, this); }

  setStatus(text, kind = 'info') { this.status = { text, kind }; }

  // ---------- Buffer helpers ----------
  ensureMagicLine() {
    if (this.lines.length === 0 || this.lines[this.lines.length - 1] !== '') this.lines.push('');
  }

  get lastRow() { return this.lines.length - 1; }
  get line() { return this.lines[this.row]; }

  offsetOf(row, col) {
    let off = 0;
    for (let i = 0; i < row; i++) off += this.lines[i].length + 1;
    return off + col;
  }

  posOf(offset) {
    let row = 0;
    while (row < this.lastRow && offset > this.lines[row].length) {
      offset -= this.lines[row].length + 1;
      row++;
    }
    return [row, clamp(offset, 0, this.lines[row].length)];
  }

  moveTo(row, col) {
    this.row = clamp(row, 0, this.lastRow);
    this.col = clamp(col, 0, this.line.length);
    this.x = this.col;
  }

  pushUndo(kind) {
    const merge = (kind === 'type' || kind === 'backspace' || kind === 'delete') && this.lastAction === kind && this.undoStack.length;
    if (!merge) {
      this.undoStack.push({ lines: [...this.lines], row: this.row, col: this.col, kind });
      if (this.undoStack.length > 300) this.undoStack.shift();
    }
    this.redoStack = [];
  }

  insertText(str) {
    const parts = str.split('\n');
    const before = this.line.slice(0, this.col);
    const after = this.line.slice(this.col);
    if (parts.length === 1) {
      this.lines[this.row] = before + str + after;
      this.col += str.length;
    } else {
      const newLines = [before + parts[0], ...parts.slice(1, -1), parts[parts.length - 1] + after];
      this.lines.splice(this.row, 1, ...newLines);
      this.row += parts.length - 1;
      this.col = parts[parts.length - 1].length;
    }
    this.x = this.col;
    this.ensureMagicLine();
  }

  regionBounds() {
    const a = this.offsetOf(this.mark.row, this.mark.col);
    const b = this.offsetOf(this.row, this.col);
    return a <= b ? [a, b] : [b, a];
  }

  takeRegion(remove) {
    const [start, end] = this.regionBounds();
    const text = this.text;
    const chunk = text.slice(start, end);
    if (remove) {
      this.lines = (text.slice(0, start) + text.slice(end)).split('\n');
      this.ensureMagicLine();
      [this.row, this.col] = this.posOf(start);
      this.x = this.col;
    }
    this.mark = null;
    return chunk;
  }

  // ---------- Viewport ----------
  scrollToCursor(center = false) {
    const maxTop = Math.max(0, this.lines.length - this.rows);
    if (center) this.top = this.row - Math.floor(this.rows / 2);
    else if (this.row < this.top) this.top = this.row;
    else if (this.row >= this.top + this.rows) this.top = this.row - this.rows + 1;
    // Keep a target on screen too, whenever it fits together with the cursor.
    const target = this.targets[0];
    if (target && Math.abs(target.row - this.row) < this.rows) {
      if (target.row < this.top) this.top = target.row;
      else if (target.row >= this.top + this.rows) this.top = target.row - this.rows + 1;
    }
    this.top = clamp(this.top, 0, maxTop);
  }

  // ---------- Prompts ----------
  openPrompt(prompt) {
    this.prompt = { value: '', ...prompt };
    this.prompt.pos = this.prompt.value.length;
  }

  closePrompt() { this.prompt = null; this.matchHighlight = null; }

  promptKey(key) {
    const p = this.prompt;
    if (key === 'C-c') {
      this.closePrompt();
      if (p.onCancel) p.onCancel(); else this.setStatus('Cancelled');
      this.emit({ type: 'cancel' });
      return;
    }
    if (p.choices) {
      const choice = key.length === 1 ? key.toLowerCase() : null;
      if (choice && p.choices[choice]) p.choices[choice]();
      return;
    }
    if (key === 'Enter') {
      this.closePrompt();
      p.onSubmit(p.value);
    } else if (key.length === 1) {
      p.value = p.value.slice(0, p.pos) + key + p.value.slice(p.pos);
      p.pos++;
    } else if (key === 'Backspace' || key === 'C-h') {
      if (p.pos > 0) { p.value = p.value.slice(0, p.pos - 1) + p.value.slice(p.pos); p.pos--; }
    } else if (key === 'Delete' || key === 'C-d') {
      p.value = p.value.slice(0, p.pos) + p.value.slice(p.pos + 1);
    } else if (key === 'Left') p.pos = Math.max(0, p.pos - 1);
    else if (key === 'Right') p.pos = Math.min(p.value.length, p.pos + 1);
    else if (key === 'Home' || key === 'C-a') p.pos = 0;
    else if (key === 'End' || key === 'C-e') p.pos = p.value.length;
    else if (p.hints === 'search' && (key === 'C-y' || key === 'C-v')) {
      this.closePrompt();
      this.moveTo(key === 'C-y' ? 0 : this.lastRow, 0);
    }
  }

  helpKey(key) {
    const max = Math.max(0, HELP_TEXT.length - this.rows);
    if (key === 'C-x' || key === 'C-g' || key === 'F1' || key === 'q') {
      this.help = false;
      this.emit({ type: 'helpclose' });
    } else if (key === 'Down' || key === 'C-n') this.helpTop = Math.min(max, this.helpTop + 1);
    else if (key === 'Up' || key === 'C-p') this.helpTop = Math.max(0, this.helpTop - 1);
    else if (key === 'PageDown' || key === 'C-v') this.helpTop = Math.min(max, this.helpTop + this.rows - 2);
    else if (key === 'PageUp' || key === 'C-y') this.helpTop = Math.max(0, this.helpTop - this.rows + 2);
  }

  // ---------- Search ----------
  find(term, dir = 1, { fromCurrent = false } = {}) {
    const hay = this.text.toLowerCase();
    const needle = term.toLowerCase();
    const off = this.offsetOf(this.row, this.col);
    let idx;
    let wrapped = false;
    if (dir > 0) {
      idx = hay.indexOf(needle, fromCurrent ? off : off + 1);
      if (idx === -1) { idx = hay.indexOf(needle); wrapped = true; }
    } else {
      idx = off > 0 ? hay.lastIndexOf(needle, off - 1) : -1;
      if (idx === -1) { idx = hay.lastIndexOf(needle); wrapped = true; }
    }
    if (idx === -1) return null;
    return { idx, wrapped, same: idx === off };
  }

  jumpToMatch(term, dir) {
    const res = this.find(term, dir);
    if (!res) {
      this.setStatus(`"${term}" not found`);
      this.emit({ type: 'search', term, found: false });
      return;
    }
    [this.row, this.col] = this.posOf(res.idx);
    this.x = this.col;
    if (res.same) this.setStatus('This is the only occurrence');
    else if (res.wrapped) this.setStatus('Search Wrapped');
    this.scrollToCursor(this.row < this.top || this.row >= this.top + this.rows);
    this.emit({ type: 'search', term, found: true });
  }

  // ---------- Saving / exiting ----------
  writeFile(name) {
    this.filename = name;
    this.savedText = this.text;
    const count = this.lastRow;
    this.setStatus(`Wrote ${count} line${count === 1 ? '' : 's'}`);
    this.emit({ type: 'save', filename: name });
  }

  promptWrite(then) {
    this.openPrompt({
      label: 'File Name to Write',
      value: this.filename,
      hints: 'write',
      onSubmit: name => {
        if (!name.trim()) { this.setStatus('Cancelled'); return; }
        this.writeFile(name.trim());
        if (then) then();
      },
    });
  }

  quit() {
    this.exited = true;
    this.mark = null;
    this.prompt = null;
    this.emit({ type: 'exit' });
  }

  reopen() {
    const text = this.savedText ?? '';
    const { filename, rows, lineNumbers } = this;
    this.load({ text, filename, rows, lineNumbers });
    this.emit({ type: 'reopen' });
  }

  // ---------- Actions ----------
  actions = {
    up() { if (this.row > 0) { this.row--; this.col = Math.min(this.x, this.line.length); } },
    down() { if (this.row < this.lastRow) { this.row++; this.col = Math.min(this.x, this.line.length); } },
    left() {
      if (this.col > 0) this.col--;
      else if (this.row > 0) { this.row--; this.col = this.line.length; }
      this.x = this.col;
    },
    right() {
      if (this.col < this.line.length) this.col++;
      else if (this.row < this.lastRow) { this.row++; this.col = 0; }
      this.x = this.col;
    },
    home() { this.col = 0; this.x = 0; },
    end() { this.col = this.line.length; this.x = this.col; },
    pageup() {
      const d = Math.max(1, this.rows - 2);
      this.top = Math.max(0, this.top - d);
      this.row = Math.max(0, this.row - d);
      this.col = Math.min(this.x, this.line.length);
    },
    pagedown() {
      const d = Math.max(1, this.rows - 2);
      this.top = Math.min(Math.max(0, this.lines.length - this.rows), this.top + d);
      this.row = Math.min(this.lastRow, this.row + d);
      this.col = Math.min(this.x, this.line.length);
    },
    firstline() { this.moveTo(0, 0); },
    lastline() { this.moveTo(this.lastRow, this.lines[this.lastRow].length); },
    prevword() {
      let off = this.offsetOf(this.row, this.col);
      const t = this.text;
      while (off > 0 && !/\w/.test(t[off - 1])) off--;
      while (off > 0 && /\w/.test(t[off - 1])) off--;
      [this.row, this.col] = this.posOf(off); this.x = this.col;
    },
    nextword() {
      let off = this.offsetOf(this.row, this.col);
      const t = this.text;
      while (off < t.length && /\w/.test(t[off])) off++;
      while (off < t.length && !/\w/.test(t[off])) off++;
      [this.row, this.col] = this.posOf(off); this.x = this.col;
    },

    type(ch) {
      this.pushUndo('type');
      this.insertText(ch);
    },
    tab() { this.pushUndo('tab'); this.insertText('    '); },
    enter() { this.pushUndo('enter'); this.insertText('\n'); },
    backspace() {
      if (this.col === 0 && this.row === 0) return;
      this.pushUndo('backspace');
      if (this.col > 0) {
        this.lines[this.row] = this.line.slice(0, this.col - 1) + this.line.slice(this.col);
        this.col--;
      } else {
        const prevLen = this.lines[this.row - 1].length;
        this.lines[this.row - 1] += this.line;
        this.lines.splice(this.row, 1);
        this.row--;
        this.col = prevLen;
      }
      this.x = this.col;
      this.ensureMagicLine();
    },
    delete() {
      if (this.col === this.line.length && this.row === this.lastRow) return;
      this.pushUndo('delete');
      if (this.col < this.line.length) {
        this.lines[this.row] = this.line.slice(0, this.col) + this.line.slice(this.col + 1);
      } else {
        this.lines[this.row] += this.lines[this.row + 1];
        this.lines.splice(this.row + 1, 1);
      }
      this.ensureMagicLine();
    },

    cut() {
      const accumulate = this.lastAction === 'cut';
      if (this.mark) {
        this.pushUndo('cut');
        this.cutBuffer = this.takeRegion(true);
        return;
      }
      if (this.row === this.lastRow) return; // the empty magic line: nothing to cut
      this.pushUndo('cut');
      const [removed] = this.lines.splice(this.row, 1);
      this.cutBuffer = (accumulate ? this.cutBuffer : '') + removed + '\n';
      this.col = 0;
      this.x = 0;
      this.ensureMagicLine();
    },
    copy() {
      const accumulate = this.lastAction === 'copy';
      if (this.mark) {
        this.cutBuffer = this.takeRegion(false);
        return;
      }
      if (this.row === this.lastRow) return;
      this.cutBuffer = (accumulate ? this.cutBuffer : '') + this.line + '\n';
      this.row++;
      this.col = Math.min(this.x, this.line.length);
    },
    paste() {
      if (!this.cutBuffer) { this.setStatus('Cutbuffer is empty'); return; }
      this.pushUndo('paste');
      this.insertText(this.cutBuffer);
    },
    mark() {
      if (this.mark) { this.mark = null; this.setStatus('Mark Unset'); }
      else { this.mark = { row: this.row, col: this.col }; this.setStatus('Mark Set'); }
    },
    undo() {
      const snap = this.undoStack.pop();
      if (!snap) { this.setStatus('Nothing to undo'); return; }
      this.redoStack.push({ lines: [...this.lines], row: this.row, col: this.col, kind: snap.kind });
      this.lines = snap.lines;
      this.moveTo(snap.row, snap.col);
      this.mark = null;
      this.setStatus(`Undid ${UNDO_LABELS[snap.kind] || 'action'}`);
      this.lastAction = 'undo';
    },
    redo() {
      const snap = this.redoStack.pop();
      if (!snap) { this.setStatus('Nothing to redo'); return; }
      this.undoStack.push({ lines: [...this.lines], row: this.row, col: this.col, kind: snap.kind });
      this.lines = snap.lines;
      this.moveTo(snap.row, snap.col);
      this.setStatus(`Redid ${UNDO_LABELS[snap.kind] || 'action'}`);
    },

    writeout() { this.promptWrite(); },
    save() {
      if (this.filename) this.writeFile(this.filename);
      else this.promptWrite();
    },
    exit() {
      if (!this.modified) { this.quit(); return; }
      this.openPrompt({
        label: 'Save modified buffer? ',
        hints: 'yesno',
        choices: {
          y: () => { this.closePrompt(); this.promptWrite(() => this.quit()); },
          n: () => { this.closePrompt(); this.quit(); },
        },
      });
    },

    search() {
      const last = this.lastSearch;
      this.openPrompt({
        label: last ? `Search [${last}]` : 'Search',
        hints: 'search',
        onSubmit: value => {
          const term = value || last;
          if (!term) { this.setStatus('Cancelled'); return; }
          this.lastSearch = term;
          this.jumpToMatch(term, 1);
        },
      });
    },
    findnext() {
      if (!this.lastSearch) { this.setStatus('No current search pattern'); return; }
      this.jumpToMatch(this.lastSearch, 1);
    },
    findprev() {
      if (!this.lastSearch) { this.setStatus('No current search pattern'); return; }
      this.jumpToMatch(this.lastSearch, -1);
    },
    replace() {
      const last = this.lastSearch;
      this.openPrompt({
        label: last ? `Search (to replace) [${last}]` : 'Search (to replace)',
        hints: 'search',
        onSubmit: value => {
          const term = value || last;
          if (!term) { this.setStatus('Cancelled'); return; }
          this.lastSearch = term;
          this.openPrompt({
            label: 'Replace with',
            hints: 'search',
            onSubmit: repl => this.startReplace(term, repl),
          });
        },
      });
    },

    gotoline() {
      this.openPrompt({
        label: 'Enter line number, column number',
        hints: 'goto',
        onSubmit: value => {
          const m = value.trim().match(/^(-?\d+)?\s*(?:[,\s]\s*(\d+))?$/);
          if (!value.trim() || !m || (!m[1] && !m[2])) { this.setStatus('Invalid line or column number'); return; }
          let line = m[1] ? parseInt(m[1], 10) : this.row + 1;
          if (line < 0) line = this.lines.length + line + 1;
          const col = m[2] ? parseInt(m[2], 10) : 1;
          this.moveTo(line - 1, col - 1);
          this.scrollToCursor(true);
          this.emit({ type: 'goto', line });
        },
      });
    },

    help() { this.help = true; this.helpTop = 0; this.emit({ type: 'help' }); },

    location() {
      const total = this.text.length;
      const off = this.offsetOf(this.row, this.col);
      const pct = (a, b) => Math.round((a / Math.max(1, b)) * 100);
      const n = this.lines.length;
      const len = this.line.length + 1;
      this.setStatus(`line ${this.row + 1}/${n} (${pct(this.row + 1, n)}%), col ${this.col + 1}/${len} (${pct(this.col + 1, len)}%), char ${off + 1}/${total + 1} (${pct(off + 1, total + 1)}%)`);
    },

    linenumbers() {
      this.lineNumbers = !this.lineNumbers;
      this.setStatus(`Line numbering ${this.lineNumbers ? 'enabled' : 'disabled'}`);
    },

    comment() {
      const cs = commentStringFor(this.filename);
      let first = this.row;
      let last = this.row;
      if (this.mark) {
        first = Math.min(this.mark.row, this.row);
        last = Math.max(this.mark.row, this.row);
        const endCol = this.mark.row > this.row ? this.mark.col : this.col;
        if (last > first && endCol === 0) last--;
      }
      if (first === this.lastRow) return;
      last = Math.min(last, this.lastRow - 1);
      this.pushUndo('comment');
      const range = this.lines.slice(first, last + 1);
      const uncomment = range.every(l => l.startsWith(cs));
      for (let i = first; i <= last; i++) {
        this.lines[i] = uncomment ? this.lines[i].slice(cs.length) : cs + this.lines[i];
      }
      if (this.row >= first && this.row <= last) {
        this.col = clamp(this.col + (uncomment ? -cs.length : cs.length), 0, this.line.length);
        this.x = this.col;
      }
      this.mark = null;
      this.setStatus(`${uncomment ? 'Uncommented' : 'Commented'} ${last - first + 1} line${last > first ? 's' : ''}`);
    },

    bracket() {
      const pairs = { '(': ')', '[': ']', '{': '}', '<': '>' };
      const closers = Object.fromEntries(Object.entries(pairs).map(([a, b]) => [b, a]));
      const t = this.text;
      const off = this.offsetOf(this.row, this.col);
      const ch = t[off];
      if (!pairs[ch] && !closers[ch]) { this.setStatus('Not a bracket'); return; }
      const open = pairs[ch] ? ch : closers[ch];
      const close = pairs[open];
      const dir = pairs[ch] ? 1 : -1;
      let depth = 0;
      for (let i = off; i >= 0 && i < t.length; i += dir) {
        if (t[i] === open) depth += dir;
        else if (t[i] === close) depth -= dir;
        if (depth === 0) { [this.row, this.col] = this.posOf(i); this.x = this.col; return; }
      }
      this.setStatus('No matching bracket');
    },

    refresh() {},
    unsupported(key) { this.setStatus(`${prettyKey(key)} isn't available in this simulator`); },
  };

  startReplace(term, repl) {
    const total = this.text.toLowerCase().split(term.toLowerCase()).length - 1;
    if (!total) { this.setStatus(`"${term}" not found`); return; }
    this.pushUndo('replace');
    this.lastAction = 'replace';
    const state = { term, repl, total, processed: 0, count: 0 };
    const finish = () => {
      this.closePrompt();
      if (state.count === 0) this.undoStack.pop();
      this.setStatus(`Replaced ${state.count} occurrence${state.count === 1 ? '' : 's'}`);
      this.emit({ type: 'replace', term, repl, count: state.count });
    };
    const replaceHere = () => {
      const off = this.offsetOf(this.row, this.col);
      const t = this.text;
      this.lines = (t.slice(0, off) + repl + t.slice(off + term.length)).split('\n');
      this.ensureMagicLine();
      [this.row, this.col] = this.posOf(off + repl.length);
      this.x = this.col;
      state.count++;
    };
    const step = (skip) => {
      if (state.processed >= state.total) { finish(); return; }
      // After a replacement the cursor sits just past it; after a skip, search past the current match.
      const res = this.find(term, 1, { fromCurrent: !skip });
      if (!res) { finish(); return; }
      [this.row, this.col] = this.posOf(res.idx);
      this.x = this.col;
      this.matchHighlight = { row: this.row, col: this.col, len: term.length };
      this.scrollToCursor(this.row < this.top || this.row >= this.top + this.rows);
      this.openPrompt({
        label: 'Replace this instance?',
        hints: 'yesnoall',
        onCancel: finish,
        choices: {
          y: () => { state.processed++; replaceHere(); step(false); },
          n: () => { state.processed++; step(true); },
          a: () => {
            replaceHere(); state.processed++;
            while (state.processed < state.total) {
              const next = this.find(term, 1, { fromCurrent: true });
              if (!next) break;
              [this.row, this.col] = this.posOf(next.idx);
              replaceHere(); state.processed++;
            }
            finish();
          },
        },
      });
    };
    step(false);
  }

  // ---------- Rendering ----------
  render() {
    const focused = document.activeElement === this.root;
    this.root.classList.toggle('is-focused', focused);

    if (this.exited) {
      this.root.innerHTML = `
        <div class="nano-term">
          <div>$ nano ${esc(this.filename)}</div>
          <div>$ <span class="nano-cur">&nbsp;</span></div>
          <div class="nano-term-hint">nano has exited — press <b>Enter</b> to open the file again</div>
        </div>
        ${focused ? '' : '<div class="nano-blur">Click to focus</div>'}`;
      return;
    }

    const title = `<div class="nano-title"><span>GNU nano 7.2</span><span>${esc(this.filename || 'New Buffer')}</span><span>${this.modified ? 'Modified' : ''}</span></div>`;

    let body = '';
    if (this.help) {
      for (let i = 0; i < this.rows; i++) {
        body += `<div class="nano-row">${esc(HELP_TEXT[this.helpTop + i] ?? '') || '&nbsp;'}</div>`;
      }
    } else {
      const gutterWidth = String(this.lines.length).length;
      const lineTargets = new Set(this.targets.filter(t => t.line).map(t => t.row));
      for (let i = this.top; i < this.top + this.rows; i++) {
        const exists = i < this.lines.length;
        const gutter = this.lineNumbers
          ? `<span class="nano-gutter">${exists ? String(i + 1).padStart(gutterWidth) : ' '.repeat(gutterWidth)} </span>`
          : '';
        const cls = lineTargets.has(i) ? 'nano-row tgt-line' : 'nano-row';
        body += `<div class="${cls}">${gutter}${exists ? this.renderLine(i, focused) : ''}&#8203;</div>`;
      }
    }

    let status = '<div class="nano-status">&nbsp;</div>';
    if (this.prompt) {
      const p = this.prompt;
      const value = p.value ?? '';
      const before = esc(value.slice(0, p.pos));
      const at = esc(value[p.pos] ?? ' ');
      const after = esc(value.slice(p.pos + 1));
      const sep = p.choices ? '' : ': ';
      status = `<div class="nano-status prompt">${esc(p.label)}${sep}${before}<span class="nano-cur">${at === ' ' ? '&nbsp;' : at}</span>${after}</div>`;
    } else if (this.status) {
      status = `<div class="nano-status"><span class="nano-msg ${this.status.kind}">[ ${esc(this.status.text)} ]</span></div>`;
    } else if (this.metaPending) {
      status = '<div class="nano-status"><span class="nano-pending">Esc… (next key is Meta)</span></div>';
    }

    const hintSet = HINTS[this.help ? 'help' : this.prompt?.hints || 'main'];
    const hints = hintSet.map(row => `<div class="nano-hints">${
      row.map(([k, label]) => `<span><b>${esc(k)}</b> ${esc(label)}</span>`).join('')
    }</div>`).join('');

    this.root.innerHTML = `${title}<div class="nano-body">${body}</div>${status}${hints}${focused ? '' : '<div class="nano-blur">Click to focus</div>'}`;
  }

  renderLine(i, focused) {
    const line = this.lines[i];
    const targets = this.targets.filter(t => !t.line && t.row === i);
    const showCursor = !this.prompt && !this.help && i === this.row;
    let region = null;
    if (this.mark) {
      const [s, e] = this.regionBounds();
      region = [s - this.offsetOf(i, 0), e - this.offsetOf(i, 0)];
    }
    const hl = this.matchHighlight && this.matchHighlight.row === i ? this.matchHighlight : null;

    const end = Math.max(line.length, ...targets.map(t => t.col + 1), showCursor ? this.col + 1 : 0);
    let html = '';
    let run = '';
    let runCls = '';
    const flush = () => {
      if (!run) return;
      html += runCls ? `<span class="${runCls}">${run}</span>` : run;
      run = '';
    };
    for (let c = 0; c < end; c++) {
      const classes = [];
      if (region && c >= region[0] && c < region[1]) classes.push('sel');
      if (hl && c >= hl.col && c < hl.col + hl.len) classes.push('hl');
      if (targets.some(t => t.col === c)) classes.push('tgt');
      if (showCursor && c === this.col) classes.push(focused ? 'nano-cur' : 'nano-cur blur');
      const cls = classes.join(' ');
      const ch = c < line.length ? esc(line[c]) : ' ';
      if (cls !== runCls) { flush(); runCls = cls; }
      run += ch;
    }
    flush();
    return html;
  }
}

export function prettyKey(key) {
  if (key.startsWith('C-')) return `^${key.slice(2).toUpperCase()}`;
  if (key.startsWith('M-')) return `M-${key.slice(2).toUpperCase()}`;
  return key;
}
