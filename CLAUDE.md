# Nabava Taprav

Mobile-first purchase list: articles, suppliers, per-supplier article names, stock-based order calculation, order emails opened in the user's mail app. See README.md.

Stack: React + TypeScript + Vite, Tailwind + shadcn/ui, Supabase, Vitest. Scripts: `npm run dev` (port 8080), `npm run lint`, `npm test`, `npm run build`.

## Who works here

Two collaborators work on this repo at the same time: Matej Bokal (repo owner, technical) and one non-technical teammate. Both use Claude Code. GitHub and Claude Code are the only tools in use; do not reintroduce any other editor or hosting platform.

If the person you are talking to is not technical: reply in the language they write in, use plain words, do all git and terminal steps yourself, and describe changes in terms of what the app now does, not in terms of files.

## Git workflow (always)

- Never commit or push to `main`, and never force-push.
- Start every task on a new branch from an up-to-date `main`: `git fetch origin`, then `git switch -c <firstname>/<short-topic> origin/main` (firstname from `git config user.name`).
- Commit small and often with clear messages. Push the branch with `git push -u origin HEAD`.
- Before opening a pull request: merge the latest `origin/main` into the branch, then run `npm test` and `npm run build`; both must pass. `npm run lint` already reports errors from before this workflow existed (mostly `any` types), so just make sure your change adds no new ones.
- Open the pull request with `gh pr create`. The description says, in plain language, what changed, why, and how to see it working.
- Never merge a pull request. The repo owner reviews and merges.
- If merging `main` produces conflicts: resolve them only when both sides are plainly independent. If both people changed the same logic, stop and tell the user to check with the other collaborator.
- After a pull request is merged, switch back to `main`, pull, and start the next task on a fresh branch.

## Things that can hurt the other person

- The Supabase project is shared and holds real data. Do not apply migrations, change RLS policies or run destructive queries without the owner's explicit go-ahead. New schema changes go in `supabase/migrations/` as additive files and are applied by the owner after merge.
- Never commit `.env` or any secret. `.env.example` lists the variables; the values are shared outside git.
- `src/components/OrderList.tsx` (~55 KB) and `src/hooks/useNabavni.ts` are large and central, so they are the most likely places for two people to collide. Prefer extracting new code into new files over growing them, and keep edits there small and focused.

## Known leftovers

- `supabase/functions/read-recipes` (the recipe lookup behind the sales import dialog) still reads Google Sheets through Lovable's connector gateway (`LOVABLE_API_KEY`, `GOOGLE_SHEETS_API_KEY`). On the new Supabase project (`vqgiduwrltjmachlzesp`) it is not deployed and those secrets do not exist, so the sales import fails with "Uvoz ni uspel"; the rest of the app is unaffected. It should be rewritten to call the Google Sheets API directly. Postponed on purpose: it needs Google Cloud credentials created by a person, so do not start it unasked. Plan: `docs/plans/uvoz-receptur-brez-lovable-2026-11-11.md`.
- `docs/plans/` holds the earlier feature plans. They are history, not instructions, except the read-recipes plan above, which is still to do.
