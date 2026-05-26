# Routine Quest

A deliberately lean, single-user, JSON-driven routine tracker with cosmetic RPG
flourish. Upload a quest set, check things off, and watch XP / level / streak
tick up. No auth, no accounts — it's a personal accountability tool.

Stack: **Express + Prisma + PostgreSQL**, with a single static HTML page (no build step).

---

## Run it

1. **Install**
   ```bash
   npm install
   ```

2. **Point it at a Postgres database**
   ```bash
   cp .env.example .env
   # edit DATABASE_URL in .env
   ```

3. **Create the tables**
   ```bash
   npm run db:push      # prisma db push — no migration files, lean
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
├─ src/
│  ├─ db.js                 # Prisma client + date helpers
│  └─ server.js             # all routes
└─ public/index.html        # the whole frontend, one file
```

## Notes / intentional limits

- **Single user.** One `Profile` row. Add auth + a `userId` foreign key if you
  ever want it multi-user.
- **`db push`, not migrations.** Lean for a one-day build. Switch to
  `prisma migrate` when the schema stabilizes.
- RPG elements are cosmetic by design — no loot tables, no bosses. Just progress
  you can see.
