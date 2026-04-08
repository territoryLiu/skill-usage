const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPodiumModel,
  buildLeaderboardRows,
  buildHistorySummaryCards
} = require("../public/scripts/dashboard-models.js");

const skills = [
  { skill: "usage", calls: 9, avgDurationMs: 120, failureRate: 0.1, lastStatus: "success" },
  { skill: "superpowers", calls: 7, avgDurationMs: 250, failureRate: 0.2, lastStatus: "success" },
  { skill: "skill-usage", calls: 5, avgDurationMs: 180, failureRate: 0, lastStatus: "running" },
  { skill: "webapp-testing", calls: 3, avgDurationMs: 800, failureRate: 2.5, lastStatus: "error" }
];

test("buildPodiumModel returns winner-centered cards", () => {
  const podium = buildPodiumModel(skills);
  assert.deepEqual(podium.map((item) => item.rank), [2, 1, 3]);
  assert.equal(podium[1].skill, "usage");
});

test("buildLeaderboardRows skips the top three skills", () => {
  const rows = buildLeaderboardRows(skills);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].displayRank, 4);
});

test("buildHistorySummaryCards returns keyed activity totals", () => {
  const cards = buildHistorySummaryCards({
    activeDays: 259,
    longestStreak: 19,
    months: [
      {
        month: 4,
        days: [
          { date: "2026-04-01", calls: 5, level: 2 },
          { date: "2026-04-02", calls: 8, level: 4 }
        ]
      },
      {
        month: 5,
        days: [
          { date: "2026-05-01", calls: 0, level: 0 }
        ]
      }
    ]
  });
  assert.equal(cards[0].key, "activeDays");
  assert.equal(cards[0].value, 259);
  assert.equal(cards[2].key, "activeMonths");
  assert.equal(cards[2].value, 1);
  assert.equal(cards[3].key, "peakDay");
  assert.equal(cards[3].value, 8);
  assert.equal(cards[3].hintDate, "2026-04-02");
});
