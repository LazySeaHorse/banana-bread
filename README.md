# Banana bRead 🍌

A browser-based viewer for WhatsApp chat exports, rendered in a clean Instagram DM style. Everything stays local — no uploads, no servers.

## Features

- **Import WhatsApp exports** — drop in any `.txt` chat export file
- **Instagram-style UI** — familiar bubble layout with date separators, grouped messages, and avatars
- **Chat stats** — message counts, top emojis, activity by hour/weekday, monthly trends, and more per participant
- **Reactions & edits** — add emoji reactions, edit or delete messages locally
- **Search** — find any message inside a chat and jump to it
- **AI personas** — designate participants as AI-controlled and have them reply using Gemini, OpenAI, Cohere, or Groq (bring your own API key)
- **Custom themes** — pick a gradient color scheme for your message bubbles
- **100% local** — all data is stored in your browser's local storage; nothing ever leaves your device

## Getting Started

```sh
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and import a WhatsApp chat export.

## Building

Produces a single self-contained HTML file (no separate assets needed):

```sh
npm run build
```

The output lands in `dist/`.

## How to export a WhatsApp chat

In WhatsApp, open a chat → ⋮ Menu → **More** → **Export chat** → **Without Media**. Import the resulting `.txt` file into Banana bRead.

## Tech Stack

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vitejs.dev) + [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Zustand](https://zustand-demo.pmnd.rs) — state management
- [react-virtuoso](https://virtuoso.dev) — virtualized message list

## Privacy

API keys for AI providers are stored only in your browser's local storage and are sent directly to the respective provider. They are never transmitted anywhere else.