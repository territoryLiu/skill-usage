const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSnapshot } = require("../lib/snapshot");

const sampleEvents = [
  {
    skill: "usage",
    status: "success",
    startedAt: "2026-04-03T02:10:00.000Z",
    endedAt: "2026-04-03T02:10:02.000Z",
    durationMs: 2000,
    source: "chat",
    sessionId: "s-1",
    model: "gpt-5.4",
    details: "ok"
  },
  {
    skill: "usage",
    status: "error",
    startedAt: "2026-04-02T22:10:00.000Z",
    endedAt: "2026-04-02T22:10:01.000Z",
    durationMs: 1000,
    source: "chat",
    sessionId: "s-1",
    model: "gpt-5.4",
    details: "boom"
  },
  {
    skill: "skill-usage",
    status: "success",
    startedAt: "2026-01-10T08:00:00.000Z",
    endedAt: "2026-01-10T08:00:03.000Z",
    durationMs: 3000,
    source: "cli",
    sessionId: "s-2",
    model: "gpt-5.1-codex-mini",
    details: "seed"
  }
];

test("buildSnapshot filters summary and skills by selected range", () => {
  const snapshot = buildSnapshot(sampleEvents, {
    now: "2026-04-03T03:00:00.000Z",
    range: "12h",
    year: 2026
  });

  assert.equal(snapshot.range, "12h");
  assert.equal(snapshot.summary.totalCalls, 2);
  assert.equal(snapshot.skills.length, 1);
  assert.equal(snapshot.skills[0].skill, "usage");
  assert.equal(snapshot.summary.errorRate, 50);
});

test("buildSnapshot includes yearly history for the current year", () => {
  const snapshot = buildSnapshot(sampleEvents, {
    now: "2026-04-03T03:00:00.000Z",
    range: "1y",
    year: 2026
  });

  assert.equal(snapshot.history.year, 2026);
  assert.equal(snapshot.history.activeDays, 3);
  assert.equal(snapshot.history.longestStreak, 2);

  const april = snapshot.history.months.find((month) => month.month === 4);
  assert.deepEqual(april.days.slice(0, 3), [
    { date: "2026-04-01", calls: 0, level: 0 },
    { date: "2026-04-02", calls: 1, level: 1 },
    { date: "2026-04-03", calls: 1, level: 1 }
  ]);
});
