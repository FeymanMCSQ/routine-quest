import fs from "node:fs/promises";

const baseUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

function stateSignature(state: any) {
  return JSON.stringify({
    profile: state.profile,
    daily: state.daily,
    weekly: state.weekly,
    log: state.log,
  });
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await api("/api/reset", { method: "POST" });

  const sample = await fs.readFile("sample-quests.json", "utf8");
  await api("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: sample,
  });

  let state = await api("/api/state");
  await api(`/api/quest/${state.daily[0].id}/toggle`, { method: "POST" });
  state = await api("/api/dev/time-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dailyDate: localDate(-1) }),
  });
  assert(state.daily.every((quest: any) => !quest.done), "dailyDate rollover did not uncheck daily quests");
  console.log("PASS dailyDate yesterday resets daily quests unchecked");

  state = await api("/api/dev/time-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lastClaim: localDate(-2), streak: 4 }),
  });
  assert(state.profile.streak === 0, "lastClaim two days back did not reset streak to 0");
  console.log("PASS lastClaim two days back resets streak to 0");

  state = await api("/api/state");
  for (const quest of state.daily) {
    if (!quest.done) {
      await api(`/api/quest/${quest.id}/toggle`, { method: "POST" });
    }
  }

  const firstClaim = await api("/api/claim-day", { method: "POST" });
  const secondClaim = await api("/api/claim-day", { method: "POST" });
  assert(firstClaim.profile.claimedToday, "first claim did not mark today claimed");
  assert(secondClaim.profile.xp === firstClaim.profile.xp, "second claim changed XP");
  assert(secondClaim.profile.streak === firstClaim.profile.streak, "second claim changed streak");
  assert(secondClaim.profile.totalDays === firstClaim.profile.totalDays, "second claim changed totalDays");
  assert(secondClaim.log.length === firstClaim.log.length, "second claim wrote another log entry");
  console.log("PASS claiming twice is a no-op on the second call");

  const beforeMalformed = await api("/api/state");
  const malformedResponse = await fetch(`${baseUrl}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not valid json",
  });
  const afterMalformed = await api("/api/state");
  assert(malformedResponse.status === 400, `malformed JSON returned ${malformedResponse.status}, expected 400`);
  assert(
    stateSignature(afterMalformed) === stateSignature(beforeMalformed),
    "malformed JSON changed persisted state",
  );
  console.log("PASS malformed JSON returns 400 and leaves state unchanged");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
