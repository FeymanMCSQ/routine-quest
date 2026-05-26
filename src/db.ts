import { prisma } from "../lib/prisma";

export { prisma };

// Date helpers use server-local time because this is a personal routine tracker.
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDate(d);
}

// ISO-ish week key, e.g. 2026-W22. Good enough for weekly resets.
export function weekKey(d = new Date()) {
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

export async function getProfile() {
  let profile = await prisma.profile.findFirst();

  if (!profile) {
    profile = await prisma.profile.create({ data: {} });
  }

  return profile;
}
