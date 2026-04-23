# MUWAHID Gemini Assistant

## Run locally

```powershell
cd C:\Users\Saifuddin\Documents\Gemini\apps\web
npm run dev -- -p 3000
```

Open:

```text
http://localhost:3000
```

## Gemini API key

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
VERTEX_SEARCH_PROJECT_ID=umrohmandiri-677a1
VERTEX_SEARCH_LOCATION=global
VERTEX_SEARCH_ENGINE_ID=krb-search
VERTEX_SEARCH_SERVING_CONFIG=default_search
```

`GEMINI_API_KEY` is read only by the server route at `app/api/muwahid/route.ts`.
Do not put real API keys into frontend code.

## Files added for MUWAHID assistant

- `apps/web/components/site/muwahid-assistant.tsx`
- `apps/web/app/api/muwahid/route.ts`
- `apps/web/app/page.tsx`

## Google AI Studio note

This app is a Next.js app. If Google AI Studio Build mode does not accept direct local import,
use this project as the source for a GitHub/Cloud Run deployment flow, or adapt the frontend
into the React app structure generated inside AI Studio.
