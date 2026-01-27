# Movechi - AI Coding Agent Instructions

# Movechi — Copilot instructions (concise)

Purpose: Help an AI coding agent be productive quickly in this repo.

Architecture (high level):
- On-chain: `sources/movechi.move` — core game logic, seasons, resource accounts.
- Frontend: `frontend/` — Vite + React 18 SPA, wallet integration via `@aptos-labs/wallet-adapter-react`.
- Indexer: `scripts/leaderboard-indexer.js` — builds `frontend/public/leaderboard-cache.json` for fast UI loads.

Essential workflows (commands you will run):
- Move build/test/publish (PowerShell, run from project root): `scripts/compile.ps1`, `scripts/build.ps1`, `scripts/publish.ps1`.
- Frontend dev/build: `cd frontend && npm install && npm run dev` / `npm run build`.
- Indexer: `cd scripts && npm install && npm run index` (or `npm run index:watch`).

Project-specific conventions and gotchas:
- Always normalize addresses using `frontend/src/utils/addressUtils.js::normalizeAddress()` before compare/store/emit.
- Season state requires checking both flags: `season_started` && !`claim_window_active` (see `sources/movechi.move`).
- Do not hardcode resource-account addresses — they are created in `init_module()`; read them from on-chain state.
- Leaderboard performance: frontend must prefer `frontend/public/leaderboard-cache.json` (from the indexer) over fetching profiles one-by-one on-chain.

Integration points and env vars:
- Frontend expects VITE_* envs in `.env.local` (e.g. `VITE_CONTRACT_ADDRESS`, `VITE_FULLNODE_URL`).
- Network setup: `frontend/src/config/network.js` returns a `Network.CUSTOM` config pointing to Movement fullnode.
- Vercel serves `frontend/public/leaderboard-cache.json` as a static asset; indexer writes to this path in production.

Files to inspect for examples:
- `sources/movechi.move` — resource accounts, season lifecycle, error codes.
- `frontend/src/utils/addressUtils.js` — normalization utilities (must be reused).
- `frontend/src/hooks/useLeaderboard.js` & `frontend/src/services/*` — leaderboard patterns.
- `scripts/leaderboard-indexer.js` — how cached leaderboards are produced.

What an agent should do first:
1. Read `frontend/src/utils/addressUtils.js` and grep for `normalizeAddress` usages.
2. Open `sources/movechi.move` to understand `init_module()` and season flags.
3. Run `cd frontend && npm run dev` and `node scripts/leaderboard-indexer.js` locally to reproduce developer flow.

If anything above is unclear or you want this expanded (examples, specific code snippets, or CI/deploy notes), tell me which area to expand.
