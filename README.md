# Umroh Platform

## Stack
- Frontend: Next.js (TypeScript)
- Backend: FastAPI (Python)
- Database: MySQL
- Shared master wilayah API: FastAPI + MySQL (`master_wilayah_shared`)

## Run

### Frontend
cd apps/web
npm run dev

### Backend
cd apps/api
venv\Scripts\activate
uvicorn app.main:app --reload

## Docs

- General project notes: `docs/`
- Reusable master wilayah API: `docs/04-master-wilayah-api.md`
