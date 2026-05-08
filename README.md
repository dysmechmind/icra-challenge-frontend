# token-router Frontend Service

token-router is a Next.js console for your cross-border model gateway MVP.

Core functions on the homepage:

- Explain dual-market positioning (CN users and global users)
- Register and log in with a session-based console account
- Create test API key via backend admin endpoint
- Send a chat completion request and display usage/cost feedback
- View account balance, limits, and usage history
- Create recharge orders and inspect balance ledger
- Create additional API keys and deactivate old ones
- Read and update admin risk-control settings
- Review and approve pending recharge orders from the console
- Manage model catalog, pricing, activation state, and provider chain from the console

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
