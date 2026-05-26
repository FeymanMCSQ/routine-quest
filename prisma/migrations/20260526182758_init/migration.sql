-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalDays" INTEGER NOT NULL DEFAULT 0,
    "lastClaim" TEXT,
    "lastWeekClaim" TEXT,
    "dailyDate" TEXT,
    "weeklyKey" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 10,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);
