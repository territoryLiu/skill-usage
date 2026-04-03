---
name: skill-usage
description: Real-time dashboard for tracking skill invocation counts, duration, success rates, and trends. Use this skill when users want to monitor skill usage analytics, visualize skill call metrics, debug skill performance issues, or integrate skill telemetry into their workflow. The dashboard auto-updates via SSE and persists events to JSONL for external analysis.
---

# Skill Usage Dashboard

A zero-dependency real-time dashboard for monitoring skill invocations across Claude Code and Codex sessions.

## Quick Start

1. Start the dashboard server:
   ```bash
   cd <skill-path>
   npm start
   ```

2. Open http://127.0.0.1:3210 in your browser

3. To inject demo data for testing, click "注入演示数据".

## Codex Auto Monitor

This project now uses a single sessions-based monitor flow for Codex.

After migration, the single skill directory is:
`CODEX_HOME/skills/skill-usage`
After migration, this directory is both the maintained source directory and the runtime directory.

Install and start:
```bash
npm run codex:start
```

Windows script:
```bat
scripts\start-codex-monitor.cmd
```

Ubuntu script:
```bash
chmod +x scripts/start-codex-monitor.sh
./scripts/start-codex-monitor.sh
```

Stop:
```bash
npm run codex:stop
```

Windows script:
```bat
scripts\stop-codex-monitor.cmd
```

Ubuntu script:
```bash
chmod +x scripts/stop-codex-monitor.sh
./scripts/stop-codex-monitor.sh
```

Status:
```bash
npm run codex:status
```

Windows script:
```bat
scripts\status-codex-monitor.cmd
```

Ubuntu script:
```bash
chmod +x scripts/status-codex-monitor.sh
./scripts/status-codex-monitor.sh
```

Reset persistent data (clear events/stdout/stderr):
```bash
node scripts/codex-manager.js reset-data
```

Persistent data path:
```text
CODEX_HOME/data/skill-usage
```

Notes:
- `install` / `install-and-start` no longer clear historical data.
- Managed runtime data is fixed under `CODEX_HOME/data/skill-usage`.

The monitor reads `CODEX_HOME/sessions/**/*.jsonl`, detects function calls that reference `CODEX_HOME/skills/...`, groups them by `session + turn + skill`, and emits usage events automatically.

## Architecture Overview

```
skill-usage/
├── SKILL.md              # This file
├── server.js             # Node HTTP server (zero dependencies)
├── package.json          # npm scripts
├── public/               # Frontend assets
│   ├── index.html        # Dashboard UI
│   ├── app.js            # Client-side rendering
│   └── styles.css        # Signal Board styling
├── scripts/
│   ├── codex-log-monitor.js
│   ├── codex-manager.js
│   ├── start-codex-monitor.cmd
│   ├── start-codex-monitor.sh
│   ├── stop-codex-monitor.cmd
│   ├── stop-codex-monitor.sh
│   ├── status-codex-monitor.cmd
│   └── status-codex-monitor.sh
└── data/
    └── dashboard-process.json # Managed process state (single skill directory)
```

Persistent runtime data:
```text
CODEX_HOME/data/skill-usage/
├── skill-events.jsonl
├── dashboard.stdout.log
└── dashboard.stderr.log
```

## Core Features

| Feature | Description |
|---------|-------------|
| Real-time updates | SSE pushes new events to all connected clients instantly |
| Skill aggregation | Calls, avg/P95/max duration, success/error rates per skill |
| Source breakdown | Distribution by chat/api/cli/workflow |
| Model distribution | Which models are calling which skills |
| 24-hour timeline | Hourly call volume with error highlighting |
| JSONL persistence | Append-only log for external tooling integration |
| Codex auto-monitor | Watches `sessions/**/*.jsonl` and emits usage events automatically |
| Monitor status panel | Shows PID, log paths, and Codex home directly in the UI |
| Quick path copy | Copies Codex and dashboard paths directly from the UI |

## API Endpoints

### GET /api/stats
Returns aggregated statistics snapshot.

### POST /api/events
Write one or more events. Accepts single object or array:
```json
{
  "skill": "frontend-design",
  "status": "success",
  "startedAt": "2026-04-01T08:20:00.000Z",
  "endedAt": "2026-04-01T08:20:05.600Z",
  "durationMs": 5600,
  "source": "chat",
  "sessionId": "session-42",
  "model": "claude-sonnet-4-6",
  "trigger": "manual",
  "details": "completed end-to-end",
  "metadata": { "promptTokens": 1200, "completionTokens": 800 }
}
```

### GET /api/stream
SSE endpoint for real-time updates. Clients receive `snapshot` events on data changes.

### POST /api/demo/seed?count=N
Inject N random demo events for testing.

## Event Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| skill | string | Yes | Skill identifier |
| status | string | No | `success`, `error`, or `running` (default: success) |
| startedAt | ISO date | No | When the call started |
| endedAt | ISO date | No | When it completed |
| durationMs | number | No | Duration in milliseconds |
| source | string | No | Origin: `chat`, `api`, `cli`, `workflow` |
| sessionId | string | No | Session identifier |
| model | string | No | Model that made the call |
| trigger | string | No | `manual`, `agent`, `schedule`, `retry` |
| details | string | No | Human-readable notes |
| metadata | object | No | Arbitrary key-value pairs |

## Integration Patterns

### Pattern 1: Direct POST from skill wrapper
When a skill completes, POST its metrics directly:
```javascript
await fetch('http://127.0.0.1:3210/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skill: 'my-skill-name',
    status: 'success',
    durationMs: endTime - startTime,
    source: 'cli',
    model: process.env.CLAUDE_MODEL || 'unknown'
  })
});
```

### Pattern 2: Codex sessions-based capture
Use the bundled watcher to infer usage from Codex session JSONL files:
```bash
npm run codex:start
```

Detection rule:
- Parse function-call records from `sessions/**/*.jsonl`
- Infer the skill name from any path under `CODEX_HOME/skills/...`
- Group by `session + turn + skill`
- Flush a completed usage event after a short idle window

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3210 | Server port |
| HOST | 127.0.0.1 | Bind address |
| MAX_RECENT_EVENTS | 30 | Recent events to show in UI |
| MAX_TIMELINE_BUCKETS | 24 | Timeline hour buckets |
| ENABLE_CODEX_MONITOR | 0 | Enable Codex log watcher when set to `1` |
| CODEX_HOME | `%USERPROFILE%\.codex` | Codex home directory |
| CODEX_MONITOR_POLL_MS | 1500 | Log polling interval |
| CODEX_MONITOR_IDLE_MS | 12000 | Idle window before emitting a usage event |

## Troubleshooting

**Port already in use**: Change `PORT` environment variable or edit server.js line 8.

**No data appearing**: Check that `CODEX_HOME/data/skill-usage/skill-events.jsonl` exists and is writable. Click "注入演示数据" to seed test data.

**SSE not updating**: Check browser console for connection errors. The server broadcasts on file changes via `fs.watch()`.

## When to Use This Skill

- Monitoring skill health and performance over time
- Debugging why a skill might be failing or slow
- Understanding which skills are most frequently used
- Building aggregate analytics across sessions
- Setting up alerts for skill failures or latency spikes
