# Skill 使用看板

一个零依赖的实时看板，用于监控 Claude Code 和 Codex 会话中的 Skill 调用情况。

## 功能特性

- 实时统计：总调用次数、累计/平均耗时、成功率、活跃调用数
- 按 Skill 排行：调用次数、平均/P95/最大耗时、失败率、来源/模型分布
- 基于 Server-Sent Events 的实时更新，无需手动刷新
- JSONL 持久化，方便接入外部工具
- 24 小时时间线，按小时聚合
- 支持注入演示数据，便于测试
- 可选开启 Codex 本地 `sessions/**/*.jsonl` 自动监控
- 内置监控状态面板，可查看 PID、日志路径和 Codex Home
- 支持一键复制路径，以及查看最近一次监控心跳时间戳

## 快速开始

```bash
npm start
```

然后打开： http://127.0.0.1:3210

如果要注入演示数据，点击“注入演示数据”。

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

Windows：

```bat
scripts\start-codex-monitor.cmd
```

Ubuntu：

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

Windows：

```bat
scripts\stop-codex-monitor.cmd
```

Ubuntu：

```bash
chmod +x scripts/stop-codex-monitor.sh
./scripts/stop-codex-monitor.sh
```

查看运行状态：

```bash
npm run codex:status
```

Windows：

```bat
scripts\status-codex-monitor.cmd
```

Ubuntu：

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

## API 接口

| 接口 | 方法 | 说明 |
|----------|--------|-------------|
| `/api/stats` | GET | 返回聚合统计快照 |
| `/api/events` | POST | 写入一条或多条事件 |
| `/api/stream` | GET | SSE 实时更新流 |
| `/api/demo/seed` | POST | 注入演示数据 |

## 事件格式

向 `/api/events` 发送 POST：

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

## 使用示例

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

## 目录结构

```text
skill-usage/
├── SKILL.md              # Claude Code / Codex 的 Skill 定义
├── server.js             # Node HTTP 服务（零依赖）
├── package.json          # npm 脚本
├── public/               # 前端静态资源
│   ├── index.html        # 看板首页
│   ├── app.js            # 客户端渲染逻辑
│   └── styles.css        # Signal Board 样式
├── scripts/
│   ├── codex-manager.js   # 跨平台安装 / 启动 / 停止管理器
│   ├── codex-log-monitor.js
│   ├── start-codex-monitor.cmd
│   ├── start-codex-monitor.sh
│   ├── stop-codex-monitor.cmd
│   ├── stop-codex-monitor.sh
│   ├── status-codex-monitor.cmd
│   └── status-codex-monitor.sh
└── data/
    └── dashboard-process.json # 托管进程状态（单 skill 目录模型）
```

运行时持久化数据目录：

```text
CODEX_HOME/data/skill-usage/
├── skill-events.jsonl
├── dashboard.stdout.log
└── dashboard.stderr.log
```

## 配置项

| 变量 | 默认值 | 说明 |
|----------|---------|-------------|
| `PORT` | 3210 | 服务端口 |
| `HOST` | 127.0.0.1 | 绑定地址 |
| `ENABLE_CODEX_MONITOR` | `0` | 设为 `1` 时开启 Codex 日志监控 |
| `CODEX_HOME` | `%USERPROFILE%\.codex` | Codex 主目录 |
| `CODEX_MONITOR_POLL_MS` | `1500` | 日志轮询间隔 |
| `CODEX_MONITOR_IDLE_MS` | `12000` | 识别到一次调用后，空闲多久才落盘 |
