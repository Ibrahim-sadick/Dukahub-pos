# duka-backend

Backend foundation for the Duka POS system.

## Tech

- Node.js + Express.js (TypeScript)
- MySQL + Prisma ORM
- JWT access token + refresh token (stored hashed in DB)
- MinIO client (future-ready)

## Quick start

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run migrations (requires a running MySQL database):
   - `npm run prisma:migrate:dev`
5. Seed plans/modules:
   - `npm run prisma:seed`
6. Start server:
   - `npm run dev`

## Common issues

- Prisma commands fail with `Environment variable not found: DATABASE_URL`:
  - Create `.env` from `.env.example` and set `DATABASE_URL` to your MySQL connection string.

## API

- `POST /api/auth/signup`
- `POST /api/auth/login/admin`
- `POST /api/auth/login/staff`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/plans`
- `POST /api/subscriptions/select-plan`
- `GET /api/subscriptions/current`
- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `GET /api/business/me`
