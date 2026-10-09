/* ========================================
   Nano Hero — Lessons
   ========================================
   Each lesson is a list of blocks: markdown text ({ md }) or a hands-on
   drill ({ challenge }). A challenge has a number of rounds; each round can:
     setup     → load a fresh buffer { text, filename, cursor, lineNumbers, saved }
     after     → keys to run silently after setup (to create a scenario)
     target    → { row, col } or { row, line: true }: move the cursor there
     goal      → the buffer must end up exactly like this text
     checks    → [{ label, test(sim, log) }]: all must pass
     requireSave / requireExit → extra conditions for goal rounds
   Challenge-level options: block { keys, message }, readOnly (message), rows, tip.
*/

const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];
const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const saved = log => log.some(e => e.type === 'save');

const READ_ONLY = 'Movement drill — editing is switched off';
const NO_DELETE = ['Backspace', 'Delete', 'C-h', 'C-d'];
const MOVE_KEYS = ['Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown', 'C-a', 'C-e', 'C-y', 'C-v',
  'C-p', 'C-b', 'C-Left', 'C-Right', 'C-Home', 'C-End', 'M-\\', 'M-/', 'C-_', 'C-/', 'M-g'];

// Pick a random spot in a non-empty line, away from the cursor.
function randomTarget(sim, { rowFilter = () => true, colFor } = {}) {
  const rows = sim.lines
    .map((l, i) => i)
    .filter(i => sim.lines[i].trim() && i !== sim.row && rowFilter(i));
  const row = pick(rows);
  const line = sim.lines[row];
  const col = colFor ? colFor(line) : rnd(line.length);
  return { row, col };
}

// ---------- Sample files ----------
const SERVER_CONF = `# /etc/nginx/sites-available/default
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}`;

function logFile(n) {
  const levels = ['INFO ', 'INFO ', 'INFO ', 'DEBUG', 'WARN '];
  const msgs = ['request served', 'cache hit', 'cache miss', 'user logged in', 'job queued', 'job finished',
    'connection opened', 'connection closed', 'config reloaded', 'slow query'];
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = `${String(9 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:${String(rnd(60)).padStart(2, '0')}`;
    out.push(`${t} ${pick(levels)} ${pick(msgs)}`);
  }
  return out.join('\n');
}

const FRUITS = ['apple', 'banana', 'cherry', 'damson', 'elderberry', 'fig', 'grape', 'guava', 'kiwi', 'lemon',
  'lychee', 'mango', 'nectarine', 'olive', 'orange', 'papaya', 'peach', 'persimmon', 'plum', 'pomegranate',
  'quince', 'raspberry', 'tangerine', 'apricot', 'coconut', 'durian', 'feijoa', 'jackfruit', 'kumquat', 'rhubarb',
  'blueberry', 'cranberry', 'starfruit', 'satsuma', 'clementine', 'avocado', 'honeydew', 'cantaloupe'];

const FUNCS = ['loadConfig', 'saveUser', 'parseArgs', 'sendEmail', 'resizeImage', 'connectDb', 'renderPage', 'hashPassword'];
const TODOS = ['validate the input', 'handle errors', 'add a timeout', 'write tests', 'log failures', 'cache the result',
  'retry on failure', 'check permissions'];

// ---------- Lessons ----------
export const SECTIONS = [
  {
    title: 'Basics',
    lessons: [
      {
        id: 'welcome',
        title: 'Welcome to nano',
        keys: 'nano',
        blocks: [
          { md: `nano is the friendly terminal text editor that ships with almost every Linux distribution and macOS. Unlike vim it has **no modes**: open a file and start typing.

\`\`\`bash
nano notes.txt     # open notes.txt (it's created when you save)
\`\`\`

### Reading the screen
- **Title bar** — the nano version, the file name, and *Modified* once you have unsaved changes
- **Edit area** — your text, with the cursor
- **Status bar** — messages like \`[ Wrote 3 lines ]\` and prompts
- **Shortcut list** — the two bottom rows remind you of the most useful keys

### Reading the shortcuts
\`^\` means **Ctrl** and \`M-\` means **Alt** (Meta). So \`^X\` is Ctrl+X and \`M-U\` is Alt+U.

> If an Alt shortcut doesn't work (common on macOS, or when the browser grabs it), press \`Esc\` and **then** the key. \`Esc\` \`U\` is the same as \`M-U\`. That works in real nano too.

The editor below is a nano simulator. Click it and type the text shown in the goal.` },
          {
            challenge: {
              title: 'Just type',
              instruction: 'Type the goal text, exactly. No modes — just start typing.',
              rounds: 3,
              rows: 6,
              round(i) {
                const phrases = ['Hello, nano!', 'No modes. Just typing.', 'I am becoming a nano hero.'];
                return { setup: { text: '', filename: 'hello.txt' }, goal: phrases[i] };
              },
            },
          },
        ],
      },
      {
        id: 'save-exit',
        title: 'Save & Exit',
        keys: '^O ^X',
        blocks: [
          { md: `The two shortcuts you'll use every single time:

| Shortcut | Action |
|---|---|
| \`^O\` | **Write Out** — save. nano asks for the file name; press \`Enter\` to confirm |
| \`^S\` | Save immediately, no prompt |
| \`^X\` | **Exit** nano |
| \`^C\` | Cancel any prompt |

The title bar shows **Modified** while you have unsaved changes.` },
          {
            challenge: {
              title: 'Save the file',
              instruction: 'This file has unsaved changes. Save it: `^O`, then `Enter`.',
              rounds: 3,
              rows: 6,
              round() {
                const notes = ['buy milk\ncall mum\nfix the bike', 'meeting at 10\nbring laptop', 'TODO: learn nano\nTODO: rule the terminal'];
                return {
                  setup: { text: pick(notes), filename: pick(['notes.txt', 'todo.txt', 'list.txt']), saved: false },
                  checks: [{ label: 'File saved', test: (sim, log) => saved(log) && !sim.modified }],
                };
              },
            },
          },
          { md: `### Exiting
\`^X\` exits. If there are unsaved changes nano asks **Save modified buffer?**

- \`Y\` — yes: confirm the file name with \`Enter\` and nano saves and exits
- \`N\` — no: throw the changes away and exit
- \`^C\` — cancel and keep editing` },
          {
            challenge: {
              title: 'Save and quit',
              instruction: 'Save your changes **and** exit. Either `^O` `Enter` `^X`, or `^X` `Y` `Enter`.',
              rounds: 2,
              rows: 6,
              round() {
                return {
                  setup: { text: 'PORT=3000\nDEBUG=false', filename: '.env', saved: false },
                  checks: [
                    { label: 'Changes saved', test: (sim, log) => saved(log) && !sim.modified },
                    { label: 'nano exited', test: sim => sim.exited },
                  ],
                };
              },
            },
          },
          {
            challenge: {
              title: 'Quit without saving',
              instruction: 'Someone made a mess of this file. Leave **without** saving: `^X`, then `N`.',
              rounds: 2,
              rows: 6,
              round() {
                return {
                  setup: { text: 'asdfjkl;\nqwertyuiop\nzxcvbnm', filename: 'important.txt', saved: false },
                  checks: [
                    { label: 'Exited', test: sim => sim.exited },
                    { label: 'Nothing was saved', test: (sim, log) => !saved(log) },
                  ],
                };
              },
            },
          },
        ],
      },
      {
        id: 'bearings',
        title: 'Getting Your Bearings',
        keys: '^G ^C M-#',
        blocks: [
          { md: `Lost? nano has your back.

| Shortcut | Action |
|---|---|
| \`^G\` | **Help** — the full list of shortcuts. \`^X\` closes it |
| \`^C\` | Show the cursor **location** (line, column, character) |
| \`M-#\` | Toggle **line numbers** (or start nano with \`nano -l file\`) |` },
          {
            challenge: {
              title: 'Find your way',
              rounds: 4,
              rows: 10,
              setup: () => ({ text: SERVER_CONF, filename: 'default', cursor: [3, 4] }),
              readOnly: READ_ONLY,
              round(i) {
                return [
                  { instruction: 'Open the help screen with `^G`, then close it with `^X`.',
                    checks: [{ label: 'Help opened', test: (s, log) => log.some(e => e.type === 'help') },
                      { label: 'Help closed', test: s => !s.help }] },
                  { instruction: 'Turn on line numbers with `M-#` (Alt+Shift+3).',
                    checks: [{ label: 'Line numbers on', test: s => s.lineNumbers }] },
                  { instruction: 'Show where the cursor is with `^C`.',
                    checks: [{ label: 'Location shown', test: (s, log) => log.some(e => e.action === 'location') }] },
                  { instruction: 'Turn line numbers off again with `M-#`.',
                    checks: [{ label: 'Line numbers off', test: s => !s.lineNumbers }] },
                ][i];
              },
            },
          },
        ],
      },
    ],
  },
  {
    title: 'Moving Around',
    lessons: [
      {
        id: 'arrows',
        title: 'Arrow Keys',
        keys: '← ↑ ↓ →',
        blocks: [
          { md: `nano is modeless, so movement uses the keys you already know: the **arrow keys**. There's no \`hjkl\` to learn.

Move the cursor onto the **green target**. A new one appears each time you hit it. Go as fast as you can.` },
          {
            challenge: {
              title: 'Hit the targets',
              instruction: 'Move the cursor onto the green target.',
              rounds: 12,
              rows: 18,
              readOnly: READ_ONLY,
              setup: () => ({ text: SERVER_CONF, filename: 'default', cursor: [0, 0] }),
              round(i, sim) { return { target: randomTarget(sim) }; },
            },
          },
        ],
      },
      {
        id: 'line-ends',
        title: 'Line Ends',
        keys: '^A ^E',
        blocks: [
          { md: `Holding an arrow key is slow. Jump instead:

| Shortcut | Action |
|---|---|
| \`^A\` | Jump to the **start** of the line (also \`Home\`) |
| \`^E\` | Jump to the **end** of the line (also \`End\`) |

In this drill ← and → are switched off. Use \`↑\` \`↓\` to change lines, then \`^A\` or \`^E\`.` },
          {
            challenge: {
              title: 'Start or end?',
              instruction: 'Reach the target using `^A` / `^E` (and ↑ ↓).',
              rounds: 10,
              rows: 18,
              readOnly: READ_ONLY,
              block: { keys: ['Left', 'Right', 'Home', 'End', 'C-b', 'C-Left', 'C-Right'], message: '←/→ are off here — use ^A (start) or ^E (end)' },
              setup: () => ({ text: SERVER_CONF, filename: 'default', cursor: [0, 0] }),
              round(i, sim) {
                return { target: randomTarget(sim, { colFor: line => (Math.random() < 0.5 ? 0 : line.length) }) };
              },
            },
          },
        ],
      },
      {
        id: 'top-bottom',
        title: 'Top & Bottom',
        keys: 'M-\\ M-/',
        blocks: [
          { md: `For long files:

| Shortcut | Action |
|---|---|
| \`M-\\\` | Jump to the **first line** (also \`Ctrl+Home\`) |
| \`M-/\` | Jump to the **last line** (also \`Ctrl+End\`) |
| \`^Y\` / \`^V\` | One screen **up** / **down** (also \`PgUp\` / \`PgDn\`) |

In this drill ↑ ↓ and paging are switched off. The target is a whole highlighted line.` },
          {
            challenge: {
              title: 'Bounce',
              rounds: 8,
              rows: 12,
              readOnly: READ_ONLY,
              block: { keys: ['Up', 'Down', 'PageUp', 'PageDown', 'C-y', 'C-v', 'C-p'], message: '↑/↓ are off here — use M-\\ (top) or M-/ (bottom)' },
              setup: () => ({ text: logFile(60), filename: 'server.log', cursor: [30, 0] }),
              round(i, sim) {
                const toBottom = sim.row < sim.lines.length / 2;
                return {
                  instruction: toBottom ? 'Jump to the **bottom** of the file with `M-/`.' : 'Jump to the **top** of the file with `M-\\`.',
                  target: { row: toBottom ? sim.lines.length - 1 : 0, line: true },
                };
              },
            },
          },
        ],
      },
      {
        id: 'go-to-line',
        title: 'Go to Line',
        keys: '^_',
        blocks: [
          { md: `Compiler says *error on line 42*? Jump straight there:

- \`^_\` (Ctrl+Shift+-) opens **Enter line number, column number**
- \`M-G\` and \`^/\` do the same thing
- Type the number and press \`Enter\`. \`42,7\` also sets the column

When you launch nano you can do this up front: \`nano +42 file.txt\`.` },
          {
            challenge: {
              title: 'Line jumper',
              rounds: 6,
              rows: 12,
              readOnly: READ_ONLY,
              block: { keys: ['Up', 'Down', 'PageUp', 'PageDown', 'C-y', 'C-v', 'C-p', 'M-\\', 'M-/', 'C-Home', 'C-End'], message: 'Use ^_ (or M-G) and type the line number' },
              setup: () => ({ text: logFile(90), filename: 'server.log', cursor: [0, 0], lineNumbers: true }),
              round(i, sim) {
                let row;
                do { row = rnd(sim.lines.length - 1); } while (Math.abs(row - sim.row) < 15);
                return { instruction: `Jump to line **${row + 1}**.`, target: { row, line: true } };
              },
            },
          },
        ],
      },
    ],
  },
  {
    title: 'Editing',
    lessons: [
      {
        id: 'cut-paste',
        title: 'Cut & Paste Lines',
        keys: '^K ^U',
        blocks: [
          { md: `nano's clipboard is called the **cutbuffer**.

| Shortcut | Action |
|---|---|
| \`^K\` | **Cut** the current line |
| \`^U\` | **Paste** (uncut) the cutbuffer at the cursor |

\`^K\` with nothing else is also the fastest way to **delete a line**.` },
          {
            challenge: {
              title: 'Delete the junk',
              instruction: 'Delete every `DELETE ME` line with `^K`.',
              rounds: 3,
              rows: 10,
              block: { keys: [...NO_DELETE, 'TEXT'], message: 'Use ^K to cut whole lines' },
              round() {
                const items = shuffle(['- eggs', '- bread', '- coffee', '- apples', '- cheese', '- rice', '- pasta']).slice(0, 5);
                const withJunk = [...items];
                for (let n = 0; n < 2 + rnd(2); n++) withJunk.splice(rnd(withJunk.length + 1), 0, '!!! DELETE ME !!!');
                return { setup: { text: `# Shopping\n${withJunk.join('\n')}`, filename: 'shopping.md' }, goal: `# Shopping\n${items.join('\n')}` };
              },
            },
          },
          { md: `### Moving lines
Cut a line with \`^K\`, move to where it belongs, and paste it with \`^U\`. Pressing \`^K\` several times **in a row** collects all those lines, so you can move a whole block at once.` },
          {
            challenge: {
              title: 'Put it in order',
              instruction: 'One step is out of place. Cut it with `^K`, move, and paste it with `^U`.',
              rounds: 3,
              rows: 9,
              block: { keys: [...NO_DELETE, 'TEXT', 'Enter'], message: 'Typing is off — move lines with ^K and ^U' },
              round() {
                const steps = ['1. Open the file: nano notes.txt', '2. Make your changes', '3. Press ^O to write out',
                  '4. Press Enter to confirm', '5. Press ^X to exit'];
                const mixed = [...steps];
                const from = rnd(5);
                let to;
                do { to = rnd(5); } while (Math.abs(to - from) < 2);
                const [moved] = mixed.splice(from, 1);
                mixed.splice(to, 0, moved);
                return { setup: { text: mixed.join('\n'), filename: 'howto.txt' }, goal: steps.join('\n') };
              },
            },
          },
          {
            challenge: {
              title: 'Move a block',
              instruction: 'Move all three `[later]` lines to the bottom: press `^K` three times in a row, go to the end, `^U`.',
              rounds: 2,
              rows: 10,
              block: { keys: [...NO_DELETE, 'TEXT', 'Enter'], message: 'Typing is off — move lines with ^K and ^U' },
              round() {
                const now = shuffle(['fix login bug', 'review PR #12', 'update README', 'deploy v2.1', 'reply to email']).slice(0, 4).map(t => `[now] ${t}`);
                const later = shuffle(['learn rust', 'clean desk', 'plan offsite', 'read that book']).slice(0, 3).map(t => `[later] ${t}`);
                return { setup: { text: [...later, ...now].join('\n'), filename: 'todo.txt' }, goal: [...now, ...later].join('\n') };
              },
            },
          },
        ],
      },
      {
        id: 'copy',
        title: 'Copy Lines',
        keys: 'M-6',
        blocks: [
          { md: `\`M-6\` **copies** the current line into the cutbuffer without removing it, and moves the cursor down a line. Then paste with \`^U\`.

To duplicate a line: put the cursor on it, press \`M-6\`, then \`^U\`.` },
          {
            challenge: {
              title: 'Copycat',
              rounds: 4,
              rows: 9,
              block: { keys: [...NO_DELETE, 'TEXT', 'Enter', 'C-k'], message: 'Typing is off — copy with M-6, paste with ^U' },
              round(i) {
                const rows = ['id,name,role', '1,ada,admin', '2,linus,dev', '3,grace,dev', '4,ken,ops', '5,margaret,lead'];
                const r = 1 + rnd(rows.length - 1);
                const goal = [...rows];
                if (i % 2 === 0) {
                  goal.splice(r + 1, 0, rows[r]);
                  return { setup: { text: rows.join('\n'), filename: 'users.csv' }, goal: goal.join('\n'),
                    instruction: `Duplicate the line \`${rows[r]}\` (the copy goes right below it).` };
                }
                goal.push(rows[r]);
                return { setup: { text: rows.join('\n'), filename: 'users.csv' }, goal: goal.join('\n'),
                  instruction: `Copy \`${rows[r]}\` to the **end** of the file.` };
              },
            },
          },
        ],
      },
      {
        id: 'mark',
        title: 'Select Text',
        keys: 'M-A',
        blocks: [
          { md: `To work with part of a line instead of whole lines, **set the mark**:

1. Put the cursor at the start of the text and press \`M-A\` (or \`^6\`). The status bar says \`[ Mark Set ]\`
2. Move the cursor. The selection is highlighted
3. \`^K\` cuts the selection, \`M-6\` copies it
4. \`M-A\` again unsets the mark` },
          {
            challenge: {
              title: 'Snip it out',
              rounds: 3,
              rows: 7,
              block: { keys: [...NO_DELETE, 'TEXT'], message: 'Backspace/Delete are off — select with M-A, then ^K' },
              round(i) {
                const cases = shuffle([
                  { text: '---\ntitle: "[DRAFT] Getting started with nano"\nauthor: you\n---', cut: '[DRAFT] ' },
                  { text: 'The quick brown fox (TODO: remove this aside) jumps over the lazy dog.', cut: ' (TODO: remove this aside)' },
                  { text: 'const url = "https://example.com/old-path/api/users";\nfetch(url);', cut: 'old-path/' },
                  { text: 'echo "Deploying..."\nrm -rf ./build --no-preserve-root-just-kidding\nnpm run build', cut: ' --no-preserve-root-just-kidding' },
                ])[0];
                return { setup: { text: cases.text, filename: 'snippet.txt' }, goal: cases.text.replace(cases.cut, ''),
                  instruction: `Remove \`${cases.cut.trim()}\` using the mark (\`M-A\`, move, \`^K\`).` };
              },
            },
          },
        ],
      },
      {
        id: 'undo',
        title: 'Undo & Redo',
        keys: 'M-U M-E',
        blocks: [
          { md: `Everyone makes mistakes. Heroes undo them.

| Shortcut | Action |
|---|---|
| \`M-U\` | **Undo** the last change |
| \`M-E\` | **Redo**: bring back what you undid |

\`^Z\` is *not* undo in nano. In a terminal it suspends nano (type \`fg\` to get back).` },
          {
            challenge: {
              title: 'Time travel',
              rounds: 3,
              rows: 8,
              block: { keys: [...NO_DELETE, 'TEXT', 'Enter', 'C-k', 'C-u'], message: 'Fix it with M-U (undo) and M-E (redo)' },
              round(i) {
                const original = 'Roses are red,\nviolets are blue,\nnano is easy,\nand so are you.';
                if (i < 2) {
                  const damage = i === 0
                    ? ['Down', 'C-k', 'C-k']
                    : ['Down', 'Down', 'End', 'type: NOT', 'Up', 'C-k'];
                  return { setup: { text: original, filename: 'poem.txt' }, after: damage, goal: original,
                    instruction: 'Someone wrecked the poem. Press `M-U` until it matches the goal.' };
                }
                const fixedTypo = original.replace('easy', 'simple');
                return {
                  setup: { text: original, filename: 'poem.txt' },
                  after: ['Down', 'Down', 'End', 'Left', 'Backspace', 'Backspace', 'Backspace', 'Backspace', 'type:simple', 'M-u', 'M-u'],
                  goal: fixedTypo,
                  instruction: 'An edit (easy → simple) was undone by accident. Bring it back: press `M-E` until it matches.',
                };
              },
            },
          },
        ],
      },
    ],
  },
  {
    title: 'Search',
    lessons: [
      {
        id: 'search',
        title: 'Search',
        keys: '^W',
        blocks: [
          { md: `\`^W\` (**Where Is**) opens the search prompt. Type a word and press \`Enter\`. The cursor jumps to the next match, and the search wraps around at the end of the file. Searches ignore case by default.

> **Browser note:** in a browser Ctrl+W closes the tab, so this simulator also accepts **F6** (nano's own alias for Where Is) and **Ctrl+F**. In a real terminal, use \`^W\`.

Movement keys are switched off in this drill. Search is your only way around.` },
          {
            challenge: {
              title: 'Find the fruit',
              rounds: 5,
              rows: 12,
              readOnly: READ_ONLY,
              block: { keys: MOVE_KEYS, message: 'Movement is off — search with ^W (F6 in the browser)' },
              setup() {
                const fruits = shuffle(FRUITS).slice(0, 30);
                return { text: `# Warehouse stock\n${fruits.map(f => `${f.padEnd(14)} ${5 + rnd(95)} crates`).join('\n')}`, filename: 'stock.txt' };
              },
              round(i, sim) {
                const { row } = randomTarget(sim, { rowFilter: r => r > 0 && Math.abs(r - sim.row) > 4 });
                const fruit = sim.lines[row].split(' ')[0];
                return { instruction: `Find **${fruit}**.`, target: { row, col: 0 } };
              },
            },
          },
        ],
      },
      {
        id: 'search-next',
        title: 'Next & Previous',
        keys: 'M-W M-Q',
        blocks: [
          { md: `After a search, repeat it without retyping:

| Shortcut | Action |
|---|---|
| \`M-W\` | Jump to the **next** match |
| \`M-Q\` | Jump to the **previous** match |

You can also press \`^W\` then just \`Enter\`. An empty search reuses the last term, which nano shows in brackets: \`Search [TODO]:\`` },
          {
            challenge: {
              title: 'TODO hunt',
              rounds: 4,
              rows: 12,
              readOnly: READ_ONLY,
              block: { keys: MOVE_KEYS, message: 'Movement is off — search for TODO, then M-W / M-Q' },
              setup() {
                const fns = shuffle(FUNCS).slice(0, 6);
                const todos = shuffle(TODOS);
                return { text: fns.map((f, i) => `function ${f}() {\n  // TODO: ${todos[i]}\n  return null;\n}\n`).join('\n'), filename: 'app.js' };
              },
              round(i, sim) {
                const todoRows = sim.lines.map((l, r) => (l.includes('TODO') ? r : -1)).filter(r => r >= 0 && r !== sim.row);
                const row = pick(todoRows);
                const fn = sim.lines[row - 1].match(/function (\w+)/)[1];
                return { instruction: `Go to the TODO inside **${fn}()**.`, target: { row, col: sim.lines[row].indexOf('TODO') } };
              },
            },
          },
        ],
      },
      {
        id: 'replace',
        title: 'Search & Replace',
        keys: '^\\',
        blocks: [
          { md: `\`^\\\` (Ctrl+Backslash, or \`M-R\`) starts a replace:

1. Type what to search for → \`Enter\`
2. Type the replacement → \`Enter\`
3. For each match nano asks **Replace this instance?** Answer \`Y\` (yes), \`N\` (skip), \`A\` (**all** the rest) or \`^C\` (stop)` },
          {
            challenge: {
              title: 'Rename it',
              rounds: 3,
              rows: 9,
              block: { keys: [...NO_DELETE, 'TEXT', 'Enter', 'C-k', 'C-u'], message: 'Typing is off in the editor — use ^\\ (Replace)' },
              round(i) {
                if (i === 0) {
                  const text = 'function greet(usr) {\n  const name = usr.name;\n  console.log("Hello, " + name);\n  return usr;\n}';
                  return { setup: { text, filename: 'greet.js' }, goal: text.replaceAll('usr', 'user'),
                    instruction: 'Rename every `usr` to `user`. Answer `A` to replace them all.' };
                }
                if (i === 1) {
                  const text = 'docs  = http://docs.example.com\napi   = http://api.example.com\ncdn   = http://cdn.example.com\napi2  = http://api.example.com/v2';
                  const goal = text.split('\n').map(l => (l.includes('api.') ? l.replace('http://', 'https://') : l)).join('\n');
                  return { setup: { text, filename: 'urls.conf' }, goal,
                    instruction: 'Change `http://` to `https://` **only** on the two `api` lines. Answer `Y` or `N` for each match.' };
                }
                const text = 'my favourite colour is green.\nthe colour of the sky is blue.\npick a colour, any colour.';
                return { setup: { text, filename: 'essay.txt' }, goal: text.replaceAll('colour', 'color'),
                  instruction: 'Americanise it: replace every `colour` with `color`.' };
              },
            },
          },
        ],
      },
    ],
  },
  {
    title: 'Power Tools',
    lessons: [
      {
        id: 'comment',
        title: 'Comment Lines',
        keys: 'M-3',
        blocks: [
          { md: `\`M-3\` comments out the current line, or every line in the marked region. Press it again to uncomment. nano picks the comment style from the file type: \`#\` for shell scripts and config files, \`//\` for JavaScript.` },
          {
            challenge: {
              title: 'Silence the debug',
              rounds: 3,
              rows: 9,
              block: { keys: [...NO_DELETE, 'TEXT', 'Enter', 'C-k', 'C-u'], message: 'Typing is off — use M-3' },
              round(i) {
                if (i === 0) {
                  const text = '#!/bin/bash\necho "debug: starting"\ncp -r src/ build/\necho "debug: copied"\ntar -czf release.tgz build/\necho "debug: done"';
                  return { setup: { text, filename: 'deploy.sh' },
                    goal: text.split('\n').map(l => (l.includes('debug') ? `#${l}` : l)).join('\n'),
                    instruction: 'Comment out the three `debug` lines with `M-3`.' };
                }
                if (i === 1) {
                  const text = '#set linenumbers\n#set mouse\nset autoindent\n#set softwrap';
                  return { setup: { text, filename: '.nanorc' }, goal: 'set linenumbers\nset mouse\nset autoindent\n#set softwrap',
                    instruction: 'Uncomment `set linenumbers` and `set mouse` (press `M-3` on each).' };
                }
                const text = 'const total = sum(items);\nconsole.log("debug 1", items);\nconsole.log("debug 2", total);\nconsole.log("debug 3");\nreturn total;';
                return { setup: { text, filename: 'cart.js' },
                  goal: text.split('\n').map(l => (l.startsWith('console') ? `//${l}` : l)).join('\n'),
                  instruction: 'Comment out all three `console.log` lines at once: `M-A` at the start of the first one, press ↓ three times, then `M-3`.' };
              },
            },
          },
        ],
      },
      {
        id: 'nanorc',
        title: 'Configure nano',
        keys: '~/.nanorc',
        blocks: [
          { md: `Make settings permanent by putting them in \`~/.nanorc\`, one per line:

| Option | Effect |
|---|---|
| \`set linenumbers\` | Show line numbers |
| \`set autoindent\` | New lines keep the indentation |
| \`set tabsize 4\` | Tabs are 4 columns wide |
| \`set tabstospaces\` | Insert spaces when you press Tab |
| \`set mouse\` | Click to place the cursor |
| \`set softwrap\` | Wrap long lines on screen |

Now write your own config, using everything you've learned so far.` },
          {
            challenge: {
              title: 'Your first nanorc',
              rounds: 2,
              rows: 9,
              setup: () => ({ text: '# My nano settings\n', filename: '~/.nanorc', cursor: [1, 0] }),
              round(i) {
                const has = line => sim => sim.lines.some(l => l.trim() === line);
                if (i === 0) {
                  return {
                    instruction: 'Add these three lines, then save with `^O` `Enter`.',
                    checks: [
                      { label: 'set linenumbers', test: has('set linenumbers') },
                      { label: 'set autoindent', test: has('set autoindent') },
                      { label: 'set tabsize 4', test: has('set tabsize 4') },
                      { label: 'Saved', test: (sim, log) => saved(log) && !sim.modified },
                    ],
                  };
                }
                return {
                  instruction: 'Also enable the mouse and soft wrapping, then save **and** exit.',
                  checks: [
                    { label: 'set mouse', test: has('set mouse') },
                    { label: 'set softwrap', test: has('set softwrap') },
                    { label: 'Saved', test: sim => !sim.modified },
                    { label: 'Exited', test: sim => sim.exited },
                  ],
                };
              },
            },
          },
        ],
      },
      {
        id: 'final-boss',
        title: 'Final Boss',
        keys: 'review',
        blocks: [
          { md: `Time to use everything at once. Fix this config file so it matches the goal, then **save and exit**. Use any shortcuts you like: replace, cut, search, type.` },
          {
            challenge: {
              title: 'Fix production',
              rounds: 1,
              rows: 10,
              round() {
                const text = '# app.conf\nPORT=8080\nHOST=0.0.0.0\nDEBUG=true\nLOG_LEVEL=debug\nADMIN_PORT=8080\nWORKERS=4';
                const goal = '# app.conf\nPORT=3000\nHOST=0.0.0.0\nLOG_LEVEL=info\nADMIN_PORT=3000\nWORKERS=4';
                return {
                  setup: { text, filename: 'app.conf' },
                  goal, requireSave: true, requireExit: true,
                  instruction: 'Change both ports to `3000` (`^\\`), delete `DEBUG=true` (`^K`), set `LOG_LEVEL=info`, then save and exit.',
                };
              },
            },
          },
        ],
      },
    ],
  },
];

export const LESSONS = SECTIONS.flatMap(section => section.lessons.map(lesson => ({ ...lesson, section: section.title })));
