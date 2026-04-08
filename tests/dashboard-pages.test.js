const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

async function readPublicFile(name) {
  return fs.readFile(path.join(__dirname, "..", "public", name), "utf8");
}

function readHeader(html) {
  return html.split("</header>")[0];
}

test("home page trims landing copy and keeps shared board header", async () => {
  const html = await readPublicFile("index.html");

  assert.ok(html.includes("技能看板"));
  assert.ok(html.includes('rel="icon"'));
  assert.ok(html.includes('/favicon.svg'));
  assert.ok(html.includes('id="timeframe-switch"'));
  assert.ok(html.includes("language-toggle"));
  assert.ok(html.includes("趋势"));
  assert.ok(html.includes("历史"));
  assert.doesNotMatch(readHeader(html), /timeframe-switch/);
  assert.ok(!html.includes("brandEyebrow"));
  assert.ok(!html.includes("技能用量"));
  assert.ok(!html.includes("实时动态"));
  assert.ok(!html.includes(">最近<"));
  assert.ok(!html.includes('id="event-stream"'));
  assert.ok(!html.includes("趋势/历史"));
  assert.ok(!html.includes("Leaderboard"));
  assert.ok(!html.includes("Top Skills"));
  assert.ok(!html.includes("把最常用的 skill 先请上台"));
  assert.ok(!html.includes("刷新快照"));
  assert.ok(!html.includes("注入演示数据"));
  assert.ok(!html.includes("All Skills Ranking"));
  assert.ok(!html.includes("完整榜单"));
});

test("monitor page simplifies headings and exposes language toggle", async () => {
  const html = await readPublicFile("monitor.html");

  assert.ok(html.includes('rel="icon"'));
  assert.ok(html.includes('/favicon.svg'));
  assert.ok(!html.includes('id="timeframe-switch"'));
  assert.ok(html.includes("language-toggle"));
  assert.ok(html.includes("技能看板"));
  assert.ok(html.includes("运行状态"));
  assert.ok(html.includes("监控路径"));
  assert.ok(!html.includes("brandEyebrow"));
  assert.ok(!html.includes("技能用量"));
  assert.ok(!html.includes("monitor.overview.title"));
  assert.ok(!html.includes("monitor.runtime.title"));
  assert.ok(!html.includes("监控状态总览"));
  assert.ok(!html.includes("路径与进程"));
});

test("trend page focuses on timeline and detail table only", async () => {
  const html = await readPublicFile("trends.html");

  assert.ok(html.includes('rel="icon"'));
  assert.ok(html.includes('/favicon.svg'));
  assert.ok(html.includes('id="timeframe-switch"'));
  assert.ok(html.includes("language-toggle"));
  assert.ok(html.includes("技能看板"));
  assert.ok(html.includes("时间趋势"));
  assert.ok(html.includes("调用记录"));
  assert.doesNotMatch(readHeader(html), /timeframe-switch/);
  assert.ok(!html.includes("brandEyebrow"));
  assert.ok(!html.includes("技能用量"));
  assert.ok(!html.includes("trend.chart.title"));
  assert.ok(!html.includes("trend.table.title"));
  assert.ok(!html.includes("趋势/历史"));
  assert.ok(!html.includes("年度活跃分布"));
  assert.ok(!html.includes("activity-calendar"));
});

test("history page exists as a dedicated route with shared board header", async () => {
  const html = await readPublicFile("history.html");

  assert.ok(html.includes('rel="icon"'));
  assert.ok(html.includes('/favicon.svg'));
  assert.ok(!html.includes('id="timeframe-switch"'));
  assert.ok(html.includes("language-toggle"));
  assert.ok(html.includes("技能看板"));
  assert.ok(html.includes("history-summary"));
  assert.ok(html.includes("activity-calendar"));
  assert.ok(html.includes("趋势"));
  assert.ok(html.includes("历史"));
  assert.ok(!html.includes("brandEyebrow"));
  assert.ok(!html.includes("技能用量"));
});
