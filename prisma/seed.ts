import { prisma } from "../lib/prisma";

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function main() {
  const [profileCount, questCount, logCount] = await Promise.all([
    prisma.profile.count(),
    prisma.quest.count(),
    prisma.logEntry.count(),
  ]);

  if (profileCount === 0) {
    await prisma.profile.create({
      data: {
        dailyDate: localDate(),
        weeklyKey: weekKey(),
      },
    });
  }

  if (questCount === 0) {
    await prisma.quest.createMany({
      data: [
        {
          title: "Morning reset",
          description: "Make the bed, hydrate, and choose today's top task.",
          type: "DAILY",
          xp: 10,
          order: 0,
        },
        {
          title: "Focused work block",
          description: "Complete one distraction-free deep work session.",
          type: "DAILY",
          xp: 20,
          order: 1,
        },
        {
          title: "Weekly review",
          description: "Review wins, misses, and adjust next week's quests.",
          type: "WEEKLY",
          xp: 40,
          order: 0,
        },
      ],
    });
  }

  if (logCount === 0) {
    await prisma.logEntry.createMany({
      data: [
        {
          date: localDate(),
          text: "Routine Quest seeded with starter quests.",
        },
        {
          date: localDate(),
          text: "Database connection verified through Prisma Postgres.",
        },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
