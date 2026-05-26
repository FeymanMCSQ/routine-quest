# Routine Quest

A deliberately lean, single-user, JSON-driven routine tracker with cosmetic RPG
flourish. Upload a quest set, check things off, and watch XP / level / streak
tick up. No auth, no accounts — it's a personal accountability tool.

Stack: **Express + Prisma + Prisma Postgres**, with a single static HTML page and a Vercel-ready Express export.

---

## Run it

1. **Install**
   ```bash
   npm install
   ```

2. **Point it at Prisma Postgres**
   ```bash
   cp .env.example .env
   # fill DATABASE_URL from Prisma Postgres
   ```

3. **Apply migrations**
   ```bash
   npm run db:migrate
   ```

4. **Start**
   ```bash
   npm start            # http://localhost:3000
   ```

Open the page, paste `sample-quests.json` (or upload it) into the **Quest Set**
panel, and hit Import.

---

## The quest JSON shape

```json
{
  "daily":  [ { "title": "...", "description": "optional", "xp": 10 } ],
  "weekly": [ { "title": "...", "xp": 30 } ]
}
```

- Only `title` is required. `description` defaults to empty, `xp` defaults to 10.
- Importing **replaces** the current quest set. Your XP, streak, and log are kept.
- A `sample-quests.json` is included.

---

## How it behaves

- **Daily quests** reset at the start of each new day (server local time).
- **Weekly quests** reset at the start of each new ISO week.
- **Claim the Day** unlocks once every daily quest is checked → bumps the streak
  (+25 XP). Miss a day and the streak resets; your best streak is kept forever.
- **Seal the Week** unlocks once every weekly quest is checked (+50 XP).
- **Level** is purely cosmetic: `1 + floor(xp / 100)`.
- The **log** records imports, day-claims, and week-seals.

---

## Endpoints (all return the full state)

| Method | Path                      | Purpose                          |
|--------|---------------------------|----------------------------------|
| GET    | `/healthz`                | Health check with DB ping        |
| GET    | `/api/state`              | Read state (applies resets)      |
| POST   | `/api/import`             | Replace quests from JSON         |
| POST   | `/api/quest/:id/toggle`   | Check/uncheck a quest            |
| POST   | `/api/claim-day`          | Claim the day (streak)           |
| POST   | `/api/claim-week`         | Seal the week                    |
| POST   | `/api/reset`              | Wipe quests, XP, streak, log     |

---

## Files

```
routine-quest/
├─ package.json
├─ .env.example
├─ sample-quests.json
├─ prisma/schema.prisma     # Profile, Quest, LogEntry
├─ prisma/migrations/       # committed schema history
├─ prisma.config.ts         # Prisma config + seed command
├─ vercel.json              # Vercel build/deploy settings
├─ src/
│  ├─ app.ts                # Express app export + local listener
│  └─ db.ts                 # Prisma client + date helpers
├─ lib/prisma.ts            # PrismaPg adapter singleton
└─ public/index.html        # the whole frontend, one file
```

## Vercel deployment

Set `DATABASE_URL` in Vercel to the Prisma Postgres connection string. The
configured build command is:

```bash
npm run vercel-build
```

That runs `prisma migrate deploy` and `prisma generate`, so a fresh deployment
applies committed migrations before serving the app.

## Notes / intentional limits

- **Single user.** One `Profile` row. Add auth + a `userId` foreign key if you
  ever want it multi-user.
- **Migrations, not `db push`.** Schema changes should go through
  `npm run db:migrate` locally and `npm run db:deploy` in production.
- RPG elements are cosmetic by design — no loot tables, no bosses. Just progress
  you can see.
