# Google AI Studio Next Steps

Repository:

```text
https://github.com/syehsyoh-dokling/Umroh-Mandiri
```

## Current status

This repository contains the full MUWAHID Umroh Platform source:

- `apps/web`: Next.js frontend
- `apps/api`: FastAPI backend
- `apps/web/components/site/muwahid-assistant.tsx`: floating MUWAHID Gemini assistant
- `apps/web/app/api/muwahid/route.ts`: server-side Gemini API route

## Important limitation

Google AI Studio Build mode can export AI Studio apps to GitHub and deploy AI Studio apps to Cloud Run.
It currently does not support importing a full local/external Next.js project back into AI Studio as an editable AI Studio Build project.

Because this project is a full Next.js app, the recommended Google path is:

```text
GitHub repo -> Google Cloud Run
```

Use Google AI Studio for:

- Gemini API key
- Gemini prompt/model testing
- lightweight prototype experiments

Use GitHub/Cloud Run for:

- this full production app
- environment variables
- backend/server-side API key handling

## Environment variables for deployment

For the Next.js frontend service:

```env
NEXT_PUBLIC_API_BASE=https://your-api-service-url
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Never put a real Gemini API key in frontend code.

## AI Studio prototype prompt

If you still want a smaller AI Studio Build prototype, paste this into Build mode:

```text
Create a MUWAHID Umroh assistant web app prototype.

Use the brand name MUWAHID and Indonesian language.
Create a landing page for an Umroh digital assistant with:
- hero section for "MUWAHID - Asisten Umroh Digital"
- floating chat button labeled MUWAHID
- chat panel that answers questions about umroh preparation, visa, hotels, transport, manasik, and travel tips
- warm, trustworthy visual style inspired by Makkah/Kaabah, green, gold, and ivory

Use Gemini through process.env.GEMINI_API_KEY or the AI Studio provided API proxy.
Do not hardcode any real API key.
```

## Local commands

```powershell
cd C:\Users\Saifuddin\Documents\Gemini\apps\web
npm install
npm run dev -- -p 3000
npm run build
```
