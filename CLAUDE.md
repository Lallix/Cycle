# Cycle

Personal pay-cycle budget app: budgets, expenses, savings, reports and bank statement import.

- **Work / personal:** Personal
- **Port:** 5201 (set in `vite.config.js`, strict)
- **Start:** `npm run dev -- --port 5201 --strictPort` (or the `cycle` entry in `.claude\launch.json`), then open http://localhost:5201/Cycle/
- **GitHub:** https://github.com/Lallix/Cycle (public — deployed to GitHub Pages by `.github\workflows\deploy.yml`; never commit secrets)
- **Stack:** React 18 + Vite + Tailwind, Supabase (shared project and login with GEM Planner; users managed in PGV Admin)
- **Non-code files:** `_files\` — seed data in `_files\data\`, design previews and the UX redesign in `_files\design\`, old versions (v1–v34) in `_files\archive\`. Synced by OneDrive, gitignored.

## Rules
- Only work inside this folder. Never start another app's server.
- Use relative paths only. This folder is opened on two PCs with different Windows usernames (`GideonV` and `lalli`).
- The repo is public: `.env` stays local; never commit transaction data or bank statements.

## Previous discussions
Before starting work, read `_files\docs\claude-history\HANDOVER.md`: where the build stands, key decisions, and open questions from earlier Claude sessions. The full past conversations are in the same folder; search them when you need detail.
