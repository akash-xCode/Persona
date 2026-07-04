# Persona Chatbot

A simple Next.js chatbot for a cohort assignment. It lets the user chat with Hitesh or Piyush in a curated Hinglish teaching style with short replies and a private server-side API key.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`

## Environment variables

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `APP_PASSCODE`
- `SESSION_SECRET`

## Notes

- No database is used
- Persona behavior is stored in local text files
- Replies are capped to 5 lines maximum
- The server refuses prompt, key, and internal-config leakage requests
