const state = {
  snapshot: null,
  selectedSkill: null,
  eventSource: null
};

const heroStatusStrip = document.getElementById("hero-status-strip");
const summaryGrid = document.getElementById("summary-grid");
const skillList = document.getElementById("skill-list");
const detailTitle = document.getElementById("detail-title");
const detailStatus = document.getElementById("detail-status");
const detailBody = document.getElementById("detail-body");
const timelineChart = document.getElementById("timeline-chart");
const eventStream = document.getElementById("event-stream");
const eventTableBody = document.getElementById("event-table-body");
const connectionPill = document.getElementById("connection-pill");
const connectionText = document.getElementById("connection-text");
const skillCountLabel = document.getElementById("skill-count-label");
const recentCountLabel = document.getElementById("recent-count-label");
const monitorMeta = document.getElementById("monitor-meta");
const monitorMatrix = document.getElementById("monitor-matrix");
const refreshButton = document.getElementById("refresh-button");
const seedButton = document.getElementById("seed-button");

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

function formatDuration(value) {
  const durationMs = Number(value) || 0;

  if (durationMs >= 60 * 1000) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }

  if (durationMs >= 1000) {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  return `${durationMs}ms`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatDateTime(value) {
  return formatTime(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatShortPath(value) {
  if (!value) {
    return "--";
  }

  const normalized = String(value);
  if (normalized.length <= 58) {
    return normalized;
  }

  return `${normalized.slice(0, 26)}...${normalized.slice(-26)}`;
}

function toneForStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["success", "error", "running"].includes(status)) {
    return status;
  }

  return "idle";
}

async function copyText(value) {
  if (!value) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(value));
      return true;
    }
  } catch {
    // Ignore and try fallback below.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = String(value);
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function renderHeroStatusStrip(snapshot) {
  const monitor = snapshot.monitor || {};
  const runtime = monitor.runtime || {};
  const items = [
    {
      label: "系统节奏",
      value: snapshot.summary.activeCalls > 0 ? "当前有活跃调用" : "当前无活跃调用"
    },
    {
      label: "累计调用",
      value: `${formatNumber(snapshot.summary.totalCalls)} 次 / ${formatNumber(snapshot.summary.uniqueSkills)} 个 skill`
    },
    {
      label: "最近刷新",
      value: runtime.lastFlushAt ? formatDateTime(runtime.lastFlushAt) : "等待第一笔事件"
    }
  ];

  heroStatusStrip.innerHTML = items
    .map(
      (item) => `
        <article class="hero-status-chip">
          <p class="mini-label">${escapeHtml(item.label)}</p>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join("");
}

function renderSummary(snapshot) {
  const items = [
    {
      label: "总调用次数",
      value: formatNumber(snapshot.summary.totalCalls),
      subtext: `${formatNumber(snapshot.summary.uniqueSkills)} 个 skill`
    },
    {
      label: "成功率",
      value: formatPercent(snapshot.summary.successRate),
      subtext: `错误率 ${formatPercent(snapshot.summary.errorRate)}`
    },
    {
      label: "平均耗时",
      value: formatDuration(snapshot.summary.avgDurationMs),
      subtext: `累计 ${formatDuration(snapshot.summary.totalDurationMs)}`
    },
    {
      label: "活跃调用",
      value: formatNumber(snapshot.summary.activeCalls),
      subtext: `已完成 ${formatNumber(snapshot.summary.completedCalls)} 次`
    }
  ];

  summaryGrid.innerHTML = items
    .map(
      (item) => `
        <article class="metric-card">
          <p class="metric-label">${escapeHtml(item.label)}</p>
          <div class="metric-value">${escapeHtml(item.value)}</div>
          <div class="metric-subtext">${escapeHtml(item.subtext)}</div>
        </article>
      `
    )
    .join("");
}

function renderMonitorMatrix(snapshot) {
  const monitor = snapshot.monitor || {};
  const managed = monitor.managed || {};
  const runtime = monitor.runtime || {};
  const enabled = Boolean(monitor.enabled);
  const managedActive = Boolean(managed.active);

  monitorMeta.textContent = enabled ? "自动监控已启用" : "自动监控未启用";

  const items = [
    {
      label: "监控开关",
      value: enabled ? "已启用" : "未启用",
      detail: enabled ? "正在消费 Codex sessions 日志" : "当前进程未开启自动监控",
      tone: enabled ? "success" : "error"
    },
    {
      label: "托管进程",
      value: managedActive ? `PID ${managed.pid}` : "未检测到",
      detail: managedActive ? `${managed.host}:${managed.port}` : "当前服务不是托管方式启动",
      tone: managedActive ? "running" : "idle"
    },
    {
      label: "当前服务 PID",
      value: monitor.currentPid ? String(monitor.currentPid) : "--",
      detail: `启动于 ${formatDateTime(monitor.currentStartedAt)}`,
      tone: "idle"
    },
    {
      label: "监控来源",
      value: formatShortPath(monitor.codexHome),
      detail: "读取 sessions/*.jsonl 并按 turn 聚合真实 skill 调用",
      tone: "idle",
      copyValue: monitor.codexHome || ""
    },
    {
      label: "最近命中",
      value: formatDateTime(runtime.lastMatchedAt),
      detail: `累计命中 ${formatNumber(runtime.matchedLines)} 行`,
      tone: runtime.lastMatchedAt ? "success" : "idle"
    },
    {
      label: "最近刷新",
      value: formatDateTime(runtime.lastFlushAt),
      detail: `已写入 ${formatNumber(runtime.emittedEvents)} 个监控事件`,
      tone: runtime.lastFlushAt ? "running" : "idle"
    },
    {
      label: "输出日志",
      value: formatShortPath(monitor.stdoutLogFile),
      valueTitle: monitor.stdoutLogFile || "--",
      detail: monitor.stderrLogFile
        ? `stderr ${formatShortPath(monitor.stderrLogFile)}`
        : "--",
      detailTitle: monitor.stderrLogFile || "--",
      tone: "idle",
      copyValue: [monitor.stdoutLogFile, monitor.stderrLogFile].filter(Boolean).join("\n")
    },
    {
      label: "会话目录",
      value: managed.rootDir ? formatShortPath(managed.rootDir) : "--",
      detail: "完整路径可复制，界面默认做收短显示",
      tone: "idle",
      copyValue: managed.rootDir || ""
    }
  ];

  monitorMatrix.innerHTML = items
    .map(
      (item) => `
        <article class="monitor-card">
          <div class="monitor-topline">
            <p class="mini-label">${escapeHtml(item.label)}</p>
            ${
              item.copyValue
                ? `<button class="copy-button" type="button" data-copy="${escapeHtml(item.copyValue)}">复制</button>`
                : ""
            }
          </div>
          <div class="monitor-value">
            <strong title="${escapeHtml(item.valueTitle || item.copyValue || item.value)}">${escapeHtml(item.value)}</strong>
          </div>
          <div class="monitor-foot">
            <span class="status-pill ${escapeHtml(item.tone)}">${escapeHtml(item.tone)}</span>
            <span class="monitor-subtext" title="${escapeHtml(item.detailTitle || item.detail)}">${escapeHtml(item.detail)}</span>
          </div>
        </article>
      `
    )
    .join("");

  for (const button of monitorMatrix.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const copied = await copyText(button.dataset.copy || "");
      const previousText = button.textContent;
      button.textContent = copied ? "已复制" : "失败";
      setTimeout(() => {
        button.textContent = previousText;
      }, 1200);
    });
  }
}

function ensureSelectedSkill(snapshot) {
  if (!snapshot.skills.length) {
    state.selectedSkill = null;
    return;
  }

  const exists = snapshot.skills.some((skill) => skill.skill === state.selectedSkill);
  if (!exists) {
    state.selectedSkill = snapshot.skills[0].skill;
  }
}

function renderSkillList(snapshot) {
  skillCountLabel.textContent = `${snapshot.skills.length} skills`;

  if (!snapshot.skills.length) {
    skillList.innerHTML = '<div class="empty-state">还没有 skill 调用记录，先注入演示数据或等待真实调用。</div>';
    return;
  }

  skillList.innerHTML = snapshot.skills
    .map(
      (skill, index) => `
        <button
          class="skill-item ${skill.skill === state.selectedSkill ? "active" : ""}"
          type="button"
          data-skill="${escapeHtml(skill.skill)}"
        >
          <div class="skill-rank">${String(index + 1).padStart(2, "0")}</div>
          <div>
            <div class="skill-name">${escapeHtml(skill.skill)}</div>
            <div class="skill-meta">
              <span class="stat-chip">${formatNumber(skill.calls)} 次调用</span>
              <span class="stat-chip">${formatDuration(skill.avgDurationMs)} 平均耗时</span>
              <span class="stat-chip">${formatPercent(skill.failureRate)} 失败率</span>
            </div>
          </div>
          <div class="status-pill ${escapeHtml(toneForStatus(skill.lastStatus))}">${escapeHtml(skill.lastStatus || "idle")}</div>
        </button>
      `
    )
    .join("");

  for (const button of skillList.querySelectorAll("[data-skill]")) {
    button.addEventListener("click", () => {
      state.selectedSkill = button.dataset.skill;
      render();
    });
  }
}

function renderBreakdown(title, list) {
  if (!list.length) {
    return `
      <div class="detail-card">
        <p class="mini-label">${escapeHtml(title)}</p>
        <div class="empty-state">暂无数据</div>
      </div>
    `;
  }

  const maxValue = Math.max(...list.map((item) => item.value), 1);
  return `
    <div class="detail-card">
      <p class="mini-label">${escapeHtml(title)}</p>
      <div class="breakdown-list">
        ${list
          .slice(0, 5)
          .map(
            (item) => `
              <div class="breakdown-item">
                <span>${escapeHtml(item.label)}</span>
                <div class="breakdown-bar">
                  <div class="breakdown-fill" style="width:${(item.value / maxValue) * 100}%"></div>
                </div>
                <span>${formatNumber(item.value)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderDetail(snapshot) {
  const skill = snapshot.skills.find((item) => item.skill === state.selectedSkill);

  if (!skill) {
    detailTitle.textContent = "暂无数据";
    detailStatus.textContent = "等待事件";
    detailBody.innerHTML = '<div class="empty-state">选择一个 skill 后，这里会显示它的详细统计与来源分布。</div>';
    return;
  }

  detailTitle.textContent = skill.skill;
  detailStatus.textContent = `最近出现于 ${formatTime(skill.lastSeenAt)}`;

  detailBody.innerHTML = `
    <div class="detail-card">
      <div class="stat-chip-row">
        <span class="status-pill ${escapeHtml(toneForStatus(skill.lastStatus))}">${escapeHtml(skill.lastStatus || "idle")}</span>
        <span class="mini-pill">${formatNumber(skill.calls)} 次调用</span>
        <span class="mini-pill">${formatNumber(skill.sessionCount)} 个会话</span>
        <span class="mini-pill">${formatPercent(skill.failureRate)} 失败率</span>
      </div>
      <div class="detail-grid">
        <div class="detail-metric">
          <p class="mini-label">累计耗时</p>
          <div class="detail-value">${formatDuration(skill.totalDurationMs)}</div>
        </div>
        <div class="detail-metric">
          <p class="mini-label">平均耗时</p>
          <div class="detail-value">${formatDuration(skill.avgDurationMs)}</div>
        </div>
        <div class="detail-metric">
          <p class="mini-label">P95</p>
          <div class="detail-value">${formatDuration(skill.p95DurationMs)}</div>
        </div>
        <div class="detail-metric">
          <p class="mini-label">最大耗时</p>
          <div class="detail-value">${formatDuration(skill.maxDurationMs)}</div>
        </div>
      </div>
      <p class="detail-paragraph">最近说明：${escapeHtml(skill.lastDetails || "暂无细节")}</p>
    </div>
    ${renderBreakdown("来源分布", skill.sourceBreakdown)}
    ${renderBreakdown("模型分布", skill.modelBreakdown)}
  `;
}

function renderTimeline(snapshot) {
  const maxCalls = Math.max(...snapshot.timeline.map((item) => item.calls), 1);

  timelineChart.innerHTML = snapshot.timeline
    .map((item) => {
      const height = Math.max(12, Math.round((item.calls / maxCalls) * 220));
      const tooltip = `${item.label} | ${item.calls} 次 | ${formatDuration(item.totalDurationMs)} | 错误 ${item.errors}`;
      const tone = item.errors > 0 ? "error" : "";
      return `
        <div class="timeline-bar-group" title="${escapeHtml(tooltip)}">
          <div class="timeline-bar ${tone}" style="height:${height}px"></div>
          <span class="timeline-label">${escapeHtml(item.label)}</span>
        </div>
      `;
    })
    .join("");
}

function renderEventStream(snapshot) {
  const visibleEvents = snapshot.recentEvents.slice(0, 8);
  recentCountLabel.textContent =
    snapshot.recentEvents.length > visibleEvents.length
      ? `最近 ${visibleEvents.length} / 共 ${snapshot.recentEvents.length} 条`
      : `${visibleEvents.length} 条`;

  if (!visibleEvents.length) {
    eventStream.innerHTML = '<div class="empty-state">实时流为空，等待新的 skill 调用。</div>';
    return;
  }

  eventStream.innerHTML = visibleEvents
    .map(
      (event) => `
        <article class="stream-item">
          <div class="stream-topline">
            <div class="stream-skill">${escapeHtml(event.skill)}</div>
            <div class="stream-highlights">
              <div class="mini-pill stream-duration">${formatDuration(event.durationMs)}</div>
              <div class="status-pill ${escapeHtml(toneForStatus(event.status))}">${escapeHtml(event.status || "idle")}</div>
            </div>
          </div>
          <div class="stream-meta-row">
            <span class="mini-pill">${escapeHtml(event.source || "unknown source")}</span>
            <span class="mini-pill">${escapeHtml(event.model || "unknown model")}</span>
            <span class="mini-pill">${formatTime(event.startedAt)}</span>
          </div>
          <div class="stream-detail">
            ${escapeHtml(event.details || "无补充说明")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderEventTable(snapshot) {
  if (!snapshot.recentEvents.length) {
    eventTableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">还没有可展示的调用明细。</div>
        </td>
      </tr>
    `;
    return;
  }

  eventTableBody.innerHTML = snapshot.recentEvents
    .map(
      (event) => `
        <tr>
          <td>${escapeHtml(event.skill)}</td>
          <td><span class="status-pill ${escapeHtml(toneForStatus(event.status))}">${escapeHtml(event.status || "idle")}</span></td>
          <td>${formatDuration(event.durationMs)}</td>
          <td>${escapeHtml(event.source)}</td>
          <td>${escapeHtml(event.model)}</td>
          <td title="${escapeHtml(event.sessionId)}">${escapeHtml(formatShortPath(event.sessionId))}</td>
          <td>${formatTime(event.startedAt)}</td>
        </tr>
      `
    )
    .join("");
}

function render() {
  const snapshot = state.snapshot;
  if (!snapshot) {
    return;
  }

  ensureSelectedSkill(snapshot);
  renderHeroStatusStrip(snapshot);
  renderSummary(snapshot);
  renderMonitorMatrix(snapshot);
  renderSkillList(snapshot);
  renderDetail(snapshot);
  renderTimeline(snapshot);
  renderEventStream(snapshot);
  renderEventTable(snapshot);
}

async function fetchSnapshot() {
  const response = await fetch("/api/stats");
  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.status}`);
  }

  state.snapshot = await response.json();
  render();
}

function setConnection(online) {
  connectionPill.classList.toggle("offline", !online);
  connectionText.textContent = online ? "实时连接正常" : "连接断开，准备重连";
}

function connectStream() {
  if (state.eventSource) {
    state.eventSource.close();
  }

  const eventSource = new EventSource("/api/stream");
  state.eventSource = eventSource;

  eventSource.addEventListener("open", () => {
    setConnection(true);
  });

  eventSource.addEventListener("snapshot", (event) => {
    setConnection(true);
    state.snapshot = JSON.parse(event.data);
    render();
  });

  eventSource.onerror = () => {
    setConnection(false);
  };
}

async function seedDemoData() {
  seedButton.disabled = true;
  seedButton.textContent = "写入中...";

  try {
    await fetch("/api/demo/seed?count=60", {
      method: "POST"
    });
  } finally {
    seedButton.disabled = false;
    seedButton.textContent = "注入演示数据";
  }
}

refreshButton.addEventListener("click", () => {
  fetchSnapshot().catch(console.error);
});

seedButton.addEventListener("click", () => {
  seedDemoData().catch(console.error);
});

fetchSnapshot().catch(console.error);
connectStream();
