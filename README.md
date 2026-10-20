# Entity Ledger: Dead by Daylight Global Match Tracker

A mobile-first PWA for logging a DbD trial in under 10 seconds, with a private personal dashboard and public weekly community leaderboards.
Unofficial, non-commercial fan project. Not affiliated with Behaviour Interactive.

## Stack
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, TanStack Query, Recharts, plus a service worker (`frontend/public/sw.js`) that caches portraits cache-first
- Backend: FastAPI + Motor (MongoDB)
- Auth: email + 4-6 digit PIN (bcrypt) with JWT access/refresh httpOnly cookies, a 5-attempt lockout, and a 6-digit PIN reset code sent by email
- Aggregation: `POST /api/cron/aggregate` (Bearer `WEBHOOK_CRON_SECRET`) runs hourly via `.emergent/crons.yml` and writes the `global_aggregates` collection

## Run locally
```
cd backend && pip install -r requirements.txt && cp .env.example .env   # fill values
uvicorn server:app --host 0.0.0.0 --port 8001
cd frontend && yarn install && cp .env.example .env && yarn start
```
Schedule `POST /api/cron/aggregate` hourly with any cron service if you're not on Emergent.

## Key files
- `backend/server.py`: all API routes (auth, matches, stats, leaderboards, admin, cron)
- `backend/aggregation.py`: weekly and 7-day leaderboard aggregation
- `backend/roster.py`: killer/survivor roster and portrait URLs
- `backend/emailer.py`: transactional email (PIN reset)
- `frontend/src/pages/`: Log, My Stats, Global and Auth screens

## Data model
- users: user_id, email, pin_hash, role, created_at, total_matches, last_survivor_id
- matches: match_id, user_id, timestamp, week_id, killer_id, survivor_id, outcome (true = escape), advanced{chase_seconds, protection_hits, safe_unhooks}
- global_aggregates: week_id, kind (killer|survivor|pick), character_id, total_encounters, kills_escapes, win_rate
- settings: `assets` (portrait kill-switch), `aggregates` (last refresh metadata)
