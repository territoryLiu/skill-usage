const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

async function waitForServer(child) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server start timeout")), 10000);
    child.stdout.on("data", (chunk) => {
      if (String(chunk).includes("Skill dashboard running")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      if (text.trim()) {
        clearTimeout(timer);
        reject(new Error(text));
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early with code ${code}`));
    });
  });
}

test("GET /api/stats honors the selected range and exposes yearly history", async (t) => {
  const codexHome = path.join(__dirname, ".tmp-codex-home");
  const dataDir = path.join(codexHome, "data", "skill-usage");
  await fs.rm(codexHome, { recursive: true, force: true });
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(
    path.join(dataDir, "skill-events.jsonl"),
    [
      JSON.stringify({
        id: "a",
        skill: "usage",
        status: "success",
        startedAt: "2026-04-03T02:10:00.000Z",
        endedAt: "2026-04-03T02:10:01.000Z",
        durationMs: 1000,
        source: "chat",
        sessionId: "s-1",
        model: "gpt-5.4",
        trigger: "manual",
        details: "ok",
        metadata: {},
        createdAt: "2026-04-03T02:10:01.000Z"
      }),
      JSON.stringify({
        id: "b",
        skill: "skill-usage",
        status: "success",
        startedAt: "2026-01-10T08:00:00.000Z",
        endedAt: "2026-01-10T08:00:02.000Z",
        durationMs: 2000,
        source: "cli",
        sessionId: "s-2",
        model: "gpt-5.1-codex-mini",
        trigger: "manual",
        details: "seed",
        metadata: {},
        createdAt: "2026-01-10T08:00:02.000Z"
      })
    ].join("\n") + "\n",
    "utf8"
  );

  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: "33210",
      HOST: "127.0.0.1",
      CODEX_HOME: codexHome
    }
  });

  t.after(async () => {
    child.kill();
    await fs.rm(codexHome, { recursive: true, force: true });
  });

  await waitForServer(child);

  const response = await fetch("http://127.0.0.1:33210/api/stats?range=12h");
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.range, "12h");
  assert.equal(payload.summary.totalCalls, 1);
  assert.equal(payload.history.activeDays, 2);
});
