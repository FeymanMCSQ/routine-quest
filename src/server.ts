import path from "node:path";
import express from "express";
import { getProfile, localDate, prisma, weekKey, yesterday } from "./db";

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    return res.status(400).json({ error: "Malformed JSON." });
  }

  next(error);
});
app.use(express.static(path.join(process.cwd(), "public")));

const lvl = (xp: number) => 1 + Math.floor(xp / 100);

// Applies day/week rollovers and streak-break before reading state.
// This is the single source of truth the UI renders from.
async function syncAndRead() {
  let profile = await getProfile();
  const today = localDate();
  const wk = weekKey();
  const data: {
    dailyDate?: string;
    weeklyKey?: string;
    streak?: number;
  } = {};

  if (profile.dailyDate !== today) {
    await prisma.quest.updateMany({ where: { type: "DAILY" }, data: { done: false } });
    data.dailyDate = today;
  }

  if (profile.weeklyKey !== wk) {
    await prisma.quest.updateMany({ where: { type: "WEEKLY" }, data: { done: false } });
    data.weeklyKey = wk;
  }

  if (profile.lastClaim && profile.lastClaim !== today && profile.lastClaim !== yesterday()) {
    data.streak = 0;
  }

  if (Object.keys(data).length) {
    profile = await prisma.profile.update({ where: { id: profile.id }, data });
  }

  const quests = await prisma.quest.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });
  const daily = quests.filter((quest) => quest.type === "DAILY");
  const weekly = quests.filter((quest) => quest.type === "WEEKLY");
  const log = await prisma.logEntry.findMany({ orderBy: { id: "desc" }, take: 20 });

  return {
    profile: {
      xp: profile.xp,
      level: lvl(profile.xp),
      xpInLevel: profile.xp % 100,
      streak: profile.streak,
      bestStreak: profile.bestStreak,
      totalDays: profile.totalDays,
      claimedToday: profile.lastClaim === today,
      sealedThisWeek: profile.lastWeekClaim === wk,
    },
    daily,
    weekly,
    log: log.map((entry) => ({ date: entry.date, text: entry.text })),
    flags: {
      hasDaily: daily.length > 0,
      hasWeekly: weekly.length > 0,
      allDailyDone: daily.length > 0 && daily.every((quest) => quest.done),
      allWeeklyDone: weekly.length > 0 && weekly.every((quest) => quest.done),
    },
  };
}

async function log(text: string) {
  await prisma.logEntry.create({ data: { date: localDate(), text } });
}

app.get("/api/state", async (_req, res) => {
  try {
    res.json(await syncAndRead());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not read state." });
  }
});

app.post("/api/import", async (req, res) => {
  try {
    const body = req.body || {};
    const norm = (arr: unknown, type: "DAILY" | "WEEKLY") =>
      (Array.isArray(arr) ? arr : []).map((quest, i) => ({
        title: String(quest.title || "Untitled quest").slice(0, 140),
        description: String(quest.description || "").slice(0, 280),
        xp: Number.isFinite(+quest.xp) ? Math.max(0, Math.min(999, Math.round(+quest.xp))) : 10,
        type,
        order: i,
        done: false,
      }));

    const rows = [...norm(body.daily, "DAILY"), ...norm(body.weekly, "WEEKLY")];

    if (rows.length === 0) {
      return res.status(400).json({ error: "JSON must contain a non-empty 'daily' or 'weekly' array." });
    }

    await prisma.quest.deleteMany({});
    await prisma.quest.createMany({ data: rows });

    const profile = await getProfile();
    await prisma.profile.update({
      where: { id: profile.id },
      data: { dailyDate: localDate(), weeklyKey: weekKey() },
    });

    const d = rows.filter((row) => row.type === "DAILY").length;
    const w = rows.filter((row) => row.type === "WEEKLY").length;
    await log(`Imported ${d} daily + ${w} weekly quests.`);

    res.json(await syncAndRead());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Import failed - check the JSON shape." });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.post("/api/dev/time-state", async (req, res) => {
    try {
      const body = req.body || {};
      const profile = await getProfile();
      const data: {
        dailyDate?: string | null;
        weeklyKey?: string | null;
        lastClaim?: string | null;
        streak?: number;
      } = {};

      if ("dailyDate" in body) data.dailyDate = body.dailyDate === null ? null : String(body.dailyDate);
      if ("weeklyKey" in body) data.weeklyKey = body.weeklyKey === null ? null : String(body.weeklyKey);
      if ("lastClaim" in body) data.lastClaim = body.lastClaim === null ? null : String(body.lastClaim);
      if ("streak" in body) {
        const streak = Number(body.streak);
        if (!Number.isFinite(streak) || streak < 0) {
          return res.status(400).json({ error: "streak must be a non-negative number." });
        }
        data.streak = Math.round(streak);
      }

      await prisma.profile.update({ where: { id: profile.id }, data });
      res.json(await syncAndRead());
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not set dev time state." });
    }
  });
}

app.post("/api/quest/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const result = await prisma.$transaction(async (tx) => {
      const quest = await tx.quest.findUnique({ where: { id } });
      if (!quest) return null;

      const nowDone = !quest.done;
      let profile = await tx.profile.findFirst();
      if (!profile) {
        profile = await tx.profile.create({ data: {} });
      }

      const xp = Math.max(0, profile.xp + (nowDone ? quest.xp : -quest.xp));

      await tx.quest.update({ where: { id }, data: { done: nowDone } });
      await tx.profile.update({ where: { id: profile.id }, data: { xp } });

      return { nowDone, xp };
    });

    if (!result) return res.status(404).json({ error: "No such quest." });

    res.json(await syncAndRead());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Toggle failed." });
  }
});

app.post("/api/claim-day", async (_req, res) => {
  try {
    const state = await syncAndRead();
    if (!state.flags.allDailyDone) return res.status(400).json({ error: "Finish all daily quests first." });
    if (state.profile.claimedToday) return res.json(state);

    const profile = await getProfile();
    const today = localDate();
    const streak = profile.lastClaim === yesterday() ? profile.streak + 1 : 1;
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        lastClaim: today,
        streak,
        bestStreak: Math.max(profile.bestStreak, streak),
        totalDays: profile.totalDays + 1,
        xp: profile.xp + 25,
      },
    });
    await log(`Day claimed - streak ${streak}. (+25 XP)`);
    res.json(await syncAndRead());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Claim failed." });
  }
});

app.post("/api/claim-week", async (_req, res) => {
  try {
    const state = await syncAndRead();
    if (!state.flags.allWeeklyDone) return res.status(400).json({ error: "Finish all weekly quests first." });
    if (state.profile.sealedThisWeek) return res.json(state);

    const profile = await getProfile();
    await prisma.profile.update({
      where: { id: profile.id },
      data: { lastWeekClaim: weekKey(), xp: profile.xp + 50 },
    });
    await log("Week sealed. (+50 XP)");
    res.json(await syncAndRead());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Seal failed." });
  }
});

app.post("/api/reset", async (_req, res) => {
  try {
    await prisma.logEntry.deleteMany({});
    await prisma.quest.deleteMany({});
    const profile = await getProfile();
    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        xp: 0,
        streak: 0,
        bestStreak: 0,
        totalDays: 0,
        lastClaim: null,
        lastWeekClaim: null,
        dailyDate: null,
        weeklyKey: null,
      },
    });
    res.json(await syncAndRead());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Reset failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Routine Quest running on http://localhost:${PORT}`));
