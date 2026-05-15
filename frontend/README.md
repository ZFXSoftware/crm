# Analytics Hub CRM (Frontend)

React + TypeScript + Vite + Tailwind frontend based on your interactive CRM design.
Includes fully working navigation, pages, tables, modals and charts using mock data.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Where to plug the backend

All seed data lives in:

- `src/data/mock.ts`

To connect a backend:

- Replace the local `useState(seed)` usage with API calls (fetch/axios/etc)
- Keep the provided TypeScript types (`Customer`, `Deal`, `Bill`) as your contract layer

## Routes

- `/sales/performance`
- `/sales/pipeline`
- `/sales/customers`
- `/sales/targets`

- `/finances/bills`
- `/finances/revenue`
- `/finances/roi`
- `/finances/growth`

- `/admin/settings`
- `/admin/users`
- `/admin/permissions`

- `/analytics/reports`
- `/analytics/insights`
- `/analytics/exports`
