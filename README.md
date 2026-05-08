# Frontend Service (Gateway Console)

Next.js console for your cross-border model business MVP.

Core functions on the homepage:

- Explain dual-market positioning (CN users and global users)
- Create test API key via backend admin endpoint
- Send a chat completion request and display usage/cost feedback

## Prerequisites

- Node.js 20+
- Backend API service running at `http://localhost:8000` (or your own URL)

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```
