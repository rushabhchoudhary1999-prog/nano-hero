# Nano Hero 🦸

> **Learn nano. Finally make it stick.**

An interactive, [vim-hero](https://www.vim-hero.com/)-style course for the GNU nano text editor. Every lesson has hands-on drills inside a working **nano simulator** in the browser. You use real keystrokes, beat a timer, and the slow way is switched off so the right shortcut sticks.

## ✨ Features

- **Working nano in the browser**: cursor movement, cut/copy/paste, mark (selection), undo/redo, write out, exit prompts, search, search & replace, go to line, help screen, line numbers, comments
- **17 lessons, 86 drill rounds** in 5 sections: Basics → Moving Around → Editing → Search → Power Tools
- **Three drill types**: hit the green target, edit the file to match a goal (with a live line-by-line diff), or complete a checklist (save, exit, …)
- **Timer, round counter and best times**, with progress saved in your browser
- **Home page editor** that works for real: edit `hello.txt`, **Download** it, **Open…** a file from your computer, or start a **New** one
- **Playground**: a large editor with the cheatsheet beside it
- **Searchable cheatsheet**
- Dark/light theme, responsive layout, no dependencies, no build step

## 🚀 Quick Start

```bash
npm run dev
# → http://localhost:3000
```

> Opening `index.html` straight from disk (`file://`) won't work, because browsers block ES modules there. Use `npm run dev` or any static server.

## ⌨️ Browser notes

The simulator captures keys while it's focused, but browsers reserve a few:

| nano key | In the browser |
|---|---|
| `^W` (search) | Ctrl+W closes the tab, so use **F6** (nano's own alias) or **Ctrl+F** |
| `M-` (Alt) keys | If the browser or OS grabs one, press **Esc then the key**, just like real nano |
| `^_` (go to line) | Ctrl+Shift+- , or **M-G** |

If you press Ctrl+W by accident during a drill, the page asks before closing.

## 📁 Project Structure

```
nano-hero/
├── index.html   # Page shell (header, footer, toast area)
├── styles.css   # All styles
├── app.js       # Router, views, drill runner, progress, download/open
├── nano.js      # The nano simulator engine
├── lessons.js   # Lesson content and drill generators
├── server.js    # Dev server (Node, no deps)
└── package.json
```

## 🎨 Adding lessons

Lessons live in `lessons.js`. A lesson is a list of blocks, either markdown (`{ md }`) or a drill (`{ challenge }`):

```js
{
  id: 'my-lesson', title: 'My Lesson', keys: '^K',
  blocks: [
    { md: 'Explanation with `^K` shown as a key.' },
    { challenge: {
        title: 'Delete the junk',
        rounds: 3,
        rows: 10,                                   // editor height
        block: { keys: ['Backspace'], message: 'Use ^K' }, // optional: switch keys off
        round(i, sim) {
          return {
            setup: { text: 'a\nJUNK\nb', filename: 'x.txt' },
            goal: 'a\nb',                           // or: target: { row, col }  or: checks: [...]
          };
        },
    } },
  ],
}
```

Routes are hash-based (`#/lessons/<id>`, `#/playground`, `#/cheatsheet`), so the site works on any static host (GitHub Pages, Netlify, Vercel) without rewrite rules.

## 📄 License

MIT
