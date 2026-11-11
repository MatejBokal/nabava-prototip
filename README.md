# Nabava Taprav

A simple, mobile-first purchase list. It holds the articles and their suppliers, plus a back-office area where each article's name *at the supplier* is set, so every order email names things exactly as that supplier expects.

- Enter the current stock and the app calculates how much to order, or type the order quantity directly.
- Each article is assigned to a supplier. Orders are sent per supplier: the app opens a prepared email in the user's mail app (Outlook), and the user presses send.
- Sales can be imported to drive ordering, and recipes are read from a Google Sheet (see [docs/plans](docs/plans) for the history of how features were planned).

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase (database, auth, edge functions), Vitest.

## Development

Requires Node.js and npm.

```sh
npm i
cp .env.example .env   # then fill in the three Supabase values
npm run dev            # http://localhost:8080
```

Other scripts: `npm run lint`, `npm test`, `npm run build`.

## How we work

GitHub is the only place this project lives, and [Claude Code](https://claude.com/claude-code) is how it gets developed. There are two collaborators, working at the same time, so:

- Nobody commits directly to `main`. Every change is made on its own branch and arrives through a pull request.
- Claude Code does the git work (branching, committing, pushing, opening the pull request), following the rules in [CLAUDE.md](CLAUDE.md).
- The repository owner reviews and merges pull requests.
