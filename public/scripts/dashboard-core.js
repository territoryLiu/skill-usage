(function (root) {
  const TIMEFRAMES = ["12h", "1d", "1m", "1y"];
  const RANGE_STORAGE_KEY = "skill-usage-range";
  const LANGUAGE_STORAGE_KEY = "skill-usage-language";
  let currentLanguage = "zh";
  let lastConnectionState = true;

  const TRANSLATIONS = {
    zh: {
      "doc.home": "技能看板",
      "doc.monitor": "监控 | 技能看板",
      "doc.trends": "趋势 | 技能看板",
      "doc.history": "历史 | 技能看板",
      brandEyebrow: "技能用量",
      brandTitle: "技能看板",
      "nav.home": "首页",
      "nav.monitor": "监控",
      "nav.trends": "趋势",
      "nav.history": "历史",
      "lang.zh": "中",
      "lang.en": "EN",
      "language.toggle": "切换语言",
      "connection.online": "实时连接正常",
      "connection.offline": "连接断开，准备重连",
      "status.success": "正常",
      "status.error": "异常",
      "status.running": "运行中",
      "status.idle": "空闲",
      "common.unknown": "未知",
      "common.empty": "--",
      "common.copy": "复制",
      "common.copied": "已复制",
      "common.copyFailed": "失败",
      "home.live.eyebrow": "实时动态",
      "home.live.title": "最近",
      "home.summary.totalCalls.label": "总调用次数",
      "home.summary.totalCalls.hint": "{skills} 个 skill",
      "home.summary.avgDuration.label": "平均耗时",
      "home.summary.avgDuration.hint": "累计 {duration}",
      "home.summary.successRate.label": "全局成功率",
      "home.summary.successRate.hint": "错误率 {rate}",
      "home.summary.activeSkills.label": "活跃技能数",
      "home.summary.activeSkills.hint": "{count} 个运行中",
      "home.podium.empty": "还没有足够的 skill 调用记录来生成领奖台。",
      "home.podium.rank": "TOP {rank}",
      "home.leaderboard.empty": "榜单还在等第四位选手出现。",
      "home.ranking.calls": "{count} 次调用",
      "home.ranking.error": "错率 {value}",
      "home.feed.empty": "实时流暂时空着，等下一次调用登场。",
      "trend.chart.eyebrow": "时间趋势",
      "trend.chart.title": "趋势",
      "trend.table.eyebrow": "调用记录",
      "trend.table.title": "明细",
      "trend.focus.all": "全局",
      "trend.focus.skill": "聚焦：{skill}",
      "trend.empty": "当前范围内还没有趋势数据。",
      "trend.emptyTable": "当前筛选下没有调用明细。",
      "trend.point.tooltip": "{label} · {calls} 次 · 错误 {errors}",
      "table.skill": "技能",
      "table.status": "状态",
      "table.duration": "耗时",
      "table.source": "来源",
      "table.model": "模型",
      "table.time": "时间",
      "history.hero.eyebrow": "年度记录",
      "history.hero.title": "历史",
      "history.hero.copy": "把趋势和历史拆开后，信息层级会安静很多。",
      "history.empty": "历史数据尚不足以生成年度日历。",
      "history.summary.activeDays.label": "年度活跃天数",
      "history.summary.activeDays.hint": "今年至少有一次调用的日期数",
      "history.summary.longestStreak.label": "最长连续记录",
      "history.summary.longestStreak.hint": "连续有调用的最长天数",
      "history.summary.activeMonths.label": "活跃月份",
      "history.summary.activeMonths.hint": "至少出现过一次调用的月份数",
      "history.summary.peakDay.label": "单日峰值",
      "history.summary.peakDay.hint": "{date} 达到最高",
      "history.summary.peakDay.hintEmpty": "当前还没有有效日期",
      "history.month": "{month}月",
      "monitor.overview.eyebrow": "运行状态",
      "monitor.overview.title": "状态",
      "monitor.runtime.eyebrow": "监控路径",
      "monitor.runtime.title": "进程",
      "monitor.cards.enabled.label": "监控开关",
      "monitor.cards.enabled.valueOn": "已启用",
      "monitor.cards.enabled.valueOff": "未启用",
      "monitor.cards.enabled.detailOn": "正在消费 Codex sessions",
      "monitor.cards.enabled.detailOff": "当前未启用自动监控",
      "monitor.cards.managed.label": "托管进程",
      "monitor.cards.managed.valueOff": "未检测到",
      "monitor.cards.managed.detailOff": "当前服务非托管方式启动",
      "monitor.cards.events.label": "已写入事件",
      "monitor.cards.events.detail": "最近刷新 {time}",
      "monitor.cards.events.empty": "等待第一笔监控事件",
      "monitor.cards.codexHome.label": "Codex Home",
      "monitor.cards.codexHome.detail": "监控根目录",
      "monitor.cards.sessionsRoot.label": "Sessions 目录",
      "monitor.cards.sessionsRoot.detail": "当前托管根目录",
      "monitor.cards.stdout.label": "stdout 日志",
      "monitor.cards.stdout.detail": "服务标准输出",
      "monitor.cards.stderr.label": "stderr 日志",
      "monitor.cards.stderr.detail": "服务错误输出",
      "monitor.cards.lastMatched.label": "最近命中",
      "monitor.cards.lastMatched.detail": "累计匹配 {count} 行",
      "monitor.cards.lastMatched.empty": "等待第一笔命中",
      "monitor.cards.currentPid.label": "当前服务 PID",
      "monitor.cards.currentPid.detail": "启动于 {time}"
    },
    en: {
      "doc.home": "Skill Board",
      "doc.monitor": "Monitor | Skill Board",
      "doc.trends": "Trends | Skill Board",
      "doc.history": "History | Skill Board",
      brandEyebrow: "Skill Usage",
      brandTitle: "Skill Board",
      "nav.home": "Home",
      "nav.monitor": "Monitor",
      "nav.trends": "Trends",
      "nav.history": "History",
      "lang.zh": "CN",
      "lang.en": "EN",
      "language.toggle": "Switch language",
      "connection.online": "Live stream healthy",
      "connection.offline": "Disconnected, retrying",
      "status.success": "Success",
      "status.error": "Error",
      "status.running": "Running",
      "status.idle": "Idle",
      "common.unknown": "Unknown",
      "common.empty": "--",
      "common.copy": "Copy",
      "common.copied": "Copied",
      "common.copyFailed": "Failed",
      "home.live.eyebrow": "Live Feed",
      "home.live.title": "Recent",
      "home.summary.totalCalls.label": "Total Calls",
      "home.summary.totalCalls.hint": "{skills} skills tracked",
      "home.summary.avgDuration.label": "Avg Duration",
      "home.summary.avgDuration.hint": "Total {duration}",
      "home.summary.successRate.label": "Success Rate",
      "home.summary.successRate.hint": "Error rate {rate}",
      "home.summary.activeSkills.label": "Active Skills",
      "home.summary.activeSkills.hint": "{count} running now",
      "home.podium.empty": "Not enough calls yet to build the podium.",
      "home.podium.rank": "TOP {rank}",
      "home.leaderboard.empty": "The board is waiting for a fourth skill.",
      "home.ranking.calls": "{count} calls",
      "home.ranking.error": "Err {value}",
      "home.feed.empty": "The live feed is quiet for now.",
      "trend.chart.eyebrow": "Timeline",
      "trend.chart.title": "Trend",
      "trend.table.eyebrow": "Activity Log",
      "trend.table.title": "Details",
      "trend.focus.all": "Overview",
      "trend.focus.skill": "Focus: {skill}",
      "trend.empty": "No trend data in this range yet.",
      "trend.emptyTable": "No rows match the current filter.",
      "trend.point.tooltip": "{label} · {calls} calls · {errors} errors",
      "table.skill": "Skill",
      "table.status": "Status",
      "table.duration": "Duration",
      "table.source": "Source",
      "table.model": "Model",
      "table.time": "Time",
      "history.hero.eyebrow": "Year View",
      "history.hero.title": "History",
      "history.hero.copy": "Trends handle the pulse; history keeps the long memory.",
      "history.empty": "There is not enough data to build the yearly calendar yet.",
      "history.summary.activeDays.label": "Active Days",
      "history.summary.activeDays.hint": "Days with at least one call this year",
      "history.summary.longestStreak.label": "Longest Streak",
      "history.summary.longestStreak.hint": "Longest run of active days",
      "history.summary.activeMonths.label": "Active Months",
      "history.summary.activeMonths.hint": "Months with at least one call",
      "history.summary.peakDay.label": "Peak Day",
      "history.summary.peakDay.hint": "Highest day on {date}",
      "history.summary.peakDay.hintEmpty": "No valid peak day yet",
      "history.month": "M{month}",
      "monitor.overview.eyebrow": "Runtime State",
      "monitor.overview.title": "Status",
      "monitor.runtime.eyebrow": "Paths",
      "monitor.runtime.title": "Process",
      "monitor.cards.enabled.label": "Monitor",
      "monitor.cards.enabled.valueOn": "Enabled",
      "monitor.cards.enabled.valueOff": "Disabled",
      "monitor.cards.enabled.detailOn": "Consuming Codex sessions",
      "monitor.cards.enabled.detailOff": "Auto monitor is off",
      "monitor.cards.managed.label": "Managed PID",
      "monitor.cards.managed.valueOff": "Not found",
      "monitor.cards.managed.detailOff": "Service is not managed right now",
      "monitor.cards.events.label": "Events Written",
      "monitor.cards.events.detail": "Last flush {time}",
      "monitor.cards.events.empty": "Waiting for the first event",
      "monitor.cards.codexHome.label": "Codex Home",
      "monitor.cards.codexHome.detail": "Monitor root directory",
      "monitor.cards.sessionsRoot.label": "Sessions Root",
      "monitor.cards.sessionsRoot.detail": "Managed service root",
      "monitor.cards.stdout.label": "stdout Log",
      "monitor.cards.stdout.detail": "Service standard output",
      "monitor.cards.stderr.label": "stderr Log",
      "monitor.cards.stderr.detail": "Service error output",
      "monitor.cards.lastMatched.label": "Last Match",
      "monitor.cards.lastMatched.detail": "Matched {count} lines",
      "monitor.cards.lastMatched.empty": "Waiting for the first match",
      "monitor.cards.currentPid.label": "Current PID",
      "monitor.cards.currentPid.detail": "Started at {time}"
    }
  };

  function getLanguage() {
    try {
      const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return value === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  }

  function setLanguage(language) {
    currentLanguage = language === "en" ? "en" : "zh";
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    } catch {
      // ignore storage failures
    }
    applyI18n();
    root.dispatchEvent(new CustomEvent("skillusage:languagechange", {
      detail: { language: currentLanguage }
    }));
  }

  function t(key, params) {
    const table = TRANSLATIONS[currentLanguage] || TRANSLATIONS.zh;
    const fallback = TRANSLATIONS.zh || {};
    let template = table[key] || fallback[key] || key;
    Object.entries(params || {}).forEach(function (entry) {
      const token = `{${entry[0]}}`;
      template = template.replaceAll(token, String(entry[1]));
    });
    return template;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(currentLanguage === "en" ? "en-US" : "zh-CN").format(value || 0);
  }

  function formatDuration(value) {
    const durationMs = Number(value) || 0;
    if (durationMs >= 60000) {
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

  function formatDateTime(value) {
    if (!value) {
      return t("common.empty");
    }

    return new Intl.DateTimeFormat(currentLanguage === "en" ? "en-US" : "zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(value));
  }

  function formatShortPath(value) {
    if (!value) {
      return t("common.empty");
    }

    const normalized = String(value);
    if (normalized.length <= 56) {
      return normalized;
    }

    return `${normalized.slice(0, 24)}...${normalized.slice(-24)}`;
  }

  function formatStatusLabel(value) {
    return t(`status.${statusTone(value)}`);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getSavedRange() {
    try {
      const value = localStorage.getItem(RANGE_STORAGE_KEY);
      return TIMEFRAMES.includes(value) ? value : "12h";
    } catch {
      return "12h";
    }
  }

  function setSavedRange(range) {
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, range);
    } catch {
      // ignore storage failures
    }
  }

  async function fetchSnapshot(range) {
    const response = await fetch(`/api/stats?range=${encodeURIComponent(range || "12h")}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch snapshot: ${response.status}`);
    }

    return response.json();
  }

  function connectSnapshotStream(onSnapshot, onConnectionChange) {
    const source = new EventSource("/api/stream");
    source.addEventListener("open", function () {
      onConnectionChange(true);
    });
    source.addEventListener("snapshot", function (event) {
      onConnectionChange(true);
      onSnapshot(JSON.parse(event.data));
    });
    source.onerror = function () {
      onConnectionChange(false);
    };
    return source;
  }

  async function copyText(value) {
    if (!value) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      return true;
    } catch {
      return false;
    }
  }

  async function seedDemoData(count) {
    const response = await fetch(`/api/demo/seed?count=${encodeURIComponent(count || 60)}`, {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`Failed to seed demo data: ${response.status}`);
    }

    return response.json();
  }

  function renderTimeframeSwitch(container, activeRange, onChange) {
    if (!container) {
      return;
    }

    container.innerHTML = TIMEFRAMES.map(function (range) {
      const activeClass = range === activeRange ? "is-active" : "";
      return `<button class="timeframe-chip ${activeClass}" type="button" data-range="${range}">${range.toUpperCase()}</button>`;
    }).join("");

    container.querySelectorAll("[data-range]").forEach(function (button) {
      button.addEventListener("click", function () {
        const nextRange = button.dataset.range;
        setSavedRange(nextRange);
        onChange(nextRange);
      });
    });
  }

  function renderLanguageToggle(container) {
    if (!container) {
      return;
    }

    container.innerHTML = ["zh", "en"].map(function (language) {
      const activeClass = language === currentLanguage ? "is-active" : "";
      return `<button class="language-chip ${activeClass}" type="button" data-language="${language}" aria-label="${escapeHtml(t("language.toggle"))}">${escapeHtml(t(`lang.${language}`))}</button>`;
    }).join("");

    container.querySelectorAll("[data-language]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLanguage(button.dataset.language || "zh");
      });
    });
  }

  function applyI18n() {
    const page = (document.body && document.body.dataset.page) || "home";
    document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";
    document.documentElement.dataset.language = currentLanguage;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.dataset.i18n || "");
    });
    document.title = t(`doc.${page}`);
    renderLanguageToggle(document.getElementById("language-toggle"));
    setConnectionState(lastConnectionState);
  }

  function setConnectionState(online) {
    lastConnectionState = Boolean(online);
    const pill = document.getElementById("connection-pill");
    const text = document.getElementById("connection-text");
    if (!pill || !text) {
      return;
    }

    pill.classList.toggle("offline", !lastConnectionState);
    text.textContent = lastConnectionState ? t("connection.online") : t("connection.offline");
  }

  function onLanguageChange(handler) {
    root.addEventListener("skillusage:languagechange", handler);
  }

  function statusTone(value) {
    const normalized = String(value || "idle").toLowerCase();
    return ["success", "error", "running"].includes(normalized) ? normalized : "idle";
  }

  currentLanguage = getLanguage();
  applyI18n();

  root.SkillUsageCore = {
    TIMEFRAMES,
    applyI18n,
    copyText,
    connectSnapshotStream,
    escapeHtml,
    fetchSnapshot,
    formatDateTime,
    formatDuration,
    formatNumber,
    formatPercent,
    formatShortPath,
    formatStatusLabel,
    getLanguage,
    getSavedRange,
    onLanguageChange,
    renderLanguageToggle,
    renderTimeframeSwitch,
    seedDemoData,
    setConnectionState,
    setLanguage,
    setSavedRange,
    statusTone,
    t
  };
})(typeof globalThis !== "undefined" ? globalThis : this);

