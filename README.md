# Skill Usage Dashboard

A zero-dependency real-time dashboard for monitoring skill invocations across Claude Code and Codex sessions.

## Capabilities

- Real-time statistics: total calls, cumulative/average duration, success rate, active calls
- Per-skill leaderboard: call count, avg/P95/max duration, failure rate, source/model breakdown
- Live updates via Server-Sent Events (no manual refresh needed)
- JSONL persistence for external tooling integration
- 24-hour timeline with hourly aggregation
- Demo data injection for testing
- Optional Codex auto-monitoring via local `sessions/**/*.jsonl`
- Built-in monitor status panel for PID, log path, and Codex home visibility
- Copy-to-clipboard path actions and recent monitor heartbeat timestamps

## Quick Start

```bash
npm start
```

Then open: http://127.0.0.1:3210

To inject demo data, click "注入演示数据".

## Codex 一键安装与自动监控

单目录说明（统一口径）：

- 迁移完成后，唯一 skill 目录将是 `C:/Users/<你的用户名>/.codex/skills/skill-usage`
- 迁移完成后，该目录既是维护目录，也是运行目录
- 不再存在单独的源码副本 / 安装副本双目录模型

Codex 监控入口统一使用 `codex-manager.js` / `npm run codex:*`。

启动监控：

```bash
npm run codex:start
```

Windows:

```bat
scripts\start-codex-monitor.cmd
```

Ubuntu:

```bash
chmod +x scripts/start-codex-monitor.sh
./scripts/start-codex-monitor.sh
```

唯一 skill 目录：

```text
C:\Users\<你的用户名>\.codex\skills\skill-usage
```

固定持久化数据目录：

```text
C:\Users\<你的用户名>\.codex\data\skill-usage
```

说明：

- `install` / `install-and-start` 不再清空历史事件与日志
- 历史数据固定写入 `CODEX_HOME/data/skill-usage`

默认监控目录：

```text
C:\Users\<你的用户名>\.codex\sessions
```

后台停止命令：

```bash
npm run codex:stop
```

Windows:

```bat
scripts\stop-codex-monitor.cmd
```

Ubuntu:

```bash
chmod +x scripts/stop-codex-monitor.sh
./scripts/stop-codex-monitor.sh
```

查看运行状态：

```bash
npm run codex:status
```

Windows:

```bat
scripts\status-codex-monitor.cmd
```

Ubuntu:

```bash
chmod +x scripts/status-codex-monitor.sh
./scripts/status-codex-monitor.sh
```

重置持久化数据（清空 events/stdout/stderr）：

```bash
node scripts/codex-manager.js reset-data
```

自动监控原理：

- 扫描 Codex 的 `sessions/**/*.jsonl`
- 解析 function call 记录中的命令参数
- 识别其中是否访问了 `CODEX_HOME/skills/...`
- 按 `session + turn + skill` 聚合成一次 skill 调用
- 自动写入 `CODEX_HOME/data/skill-usage` 下的事件流和 JSONL 数据文件
- 启动前会检查 `dashboard-process.json`，已在运行时不会重复拉起

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Aggregated statistics snapshot |
| `/api/events` | POST | Write one or more events |
| `/api/stream` | GET | SSE real-time updates |
| `/api/demo/seed` | POST | Inject demo data |

## Event Format

POST to `/api/events`:

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

## Example Usage

### PowerShell

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3210/api/events -ContentType 'application/json' -Body '{
  "skill":"openwiki",
  "status":"success",
  "durationMs":4200,
  "source":"cli",
  "sessionId":"demo-session",
  "model":"claude-sonnet-4-6",
  "details":"wiki page refreshed"
}'
```

### cURL

```bash
curl -X POST http://127.0.0.1:3210/api/events \
  -H 'Content-Type: application/json' \
  -d '{"skill":"pdf","status":"success","durationMs":3400}'
```

## File Structure

```
skill-usage/
├── SKILL.md              # Skill definition for Claude Code / Codex
├── server.js             # Node HTTP server (zero dependencies)
├── package.json          # npm scripts
├── public/               # Frontend assets
│   ├── index.html        # Dashboard UI
│   ├── app.js            # Client-side rendering
│   └── styles.css        # Signal Board styling
├── scripts/
│   ├── codex-manager.js   # Cross-platform install/start/stop manager
│   ├── codex-log-monitor.js
│   ├── start-codex-monitor.cmd
│   ├── start-codex-monitor.sh
│   ├── stop-codex-monitor.cmd
│   ├── stop-codex-monitor.sh
│   ├── status-codex-monitor.cmd
│   └── status-codex-monitor.sh
└── data/
    └── dashboard-process.json # Managed process state (single skill directory)
```

Persistent runtime data location:

```text
CODEX_HOME/data/skill-usage/
├── skill-events.jsonl
├── dashboard.stdout.log
└── dashboard.stderr.log
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3210 | Server port |
| `HOST` | 127.0.0.1 | Bind address |
| `ENABLE_CODEX_MONITOR` | `0` | Enable Codex log watcher when set to `1` |
| `CODEX_HOME` | `%USERPROFILE%\.codex` | Codex home directory |
| `CODEX_MONITOR_POLL_MS` | `1500` | Log polling interval |
| `CODEX_MONITOR_IDLE_MS` | `12000` | Idle window before a detected use is flushed |
