(function () {
  const {
    connectSnapshotStream,
    copyText,
    escapeHtml,
    fetchSnapshot,
    formatDateTime,
    formatNumber,
    formatShortPath,
    formatStatusLabel,
    onLanguageChange,
    setConnectionState,
    statusTone,
    t
  } = window.SkillUsageCore;

  const state = {
    snapshot: null
  };

  function monitorCard(label, value, detail, tone, options) {
    const config = options || {};
    const kindClass = config.kind ? ` ${config.kind}-card` : "";
    const showStatus = config.showStatus !== false;
    return `
      <article class="monitor-card panel-shell${kindClass}">
        <div class="monitor-card-top">
          <p class="eyebrow">${escapeHtml(label)}</p>
          ${config.copyValue ? `<button class="copy-button quiet" type="button" data-copy="${escapeHtml(config.copyValue)}">${escapeHtml(t("common.copy"))}</button>` : ""}
        </div>
        <strong class="monitor-value">${escapeHtml(value)}</strong>
        <div class="monitor-foot ${showStatus ? "" : "single-line"}">
          ${showStatus ? `<span class="status-pill ${escapeHtml(statusTone(tone))}">${escapeHtml(formatStatusLabel(tone))}</span>` : ""}
          <span>${escapeHtml(detail)}</span>
        </div>
      </article>
    `;
  }

  function bindCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const copied = await copyText(button.dataset.copy || "");
        const original = button.textContent;
        button.textContent = copied ? t("common.copied") : t("common.copyFailed");
        setTimeout(function () {
          button.textContent = original;
        }, 1200);
      });
    });
  }

  function render(snapshot) {
    state.snapshot = snapshot;
    const monitor = snapshot.monitor || {};
    const runtime = monitor.runtime || {};
    const managed = monitor.managed || {};

    document.getElementById("monitor-overview").innerHTML = [
      monitorCard(
        t("monitor.cards.enabled.label"),
        monitor.enabled ? t("monitor.cards.enabled.valueOn") : t("monitor.cards.enabled.valueOff"),
        monitor.enabled ? t("monitor.cards.enabled.detailOn") : t("monitor.cards.enabled.detailOff"),
        monitor.enabled ? "success" : "idle"
      ),
      monitorCard(
        t("monitor.cards.managed.label"),
        managed.active ? `PID ${managed.pid}` : t("monitor.cards.managed.valueOff"),
        managed.active ? `${managed.host}:${managed.port}` : t("monitor.cards.managed.detailOff"),
        managed.active ? "running" : "idle"
      ),
      monitorCard(
        t("monitor.cards.events.label"),
        formatNumber(runtime.emittedEvents || 0),
        runtime.lastFlushAt ? t("monitor.cards.events.detail", { time: formatDateTime(runtime.lastFlushAt) }) : t("monitor.cards.events.empty"),
        runtime.lastFlushAt ? "success" : "idle"
      )
    ].join("");

    document.getElementById("monitor-matrix").innerHTML = [
      monitorCard(t("monitor.cards.codexHome.label"), formatShortPath(monitor.codexHome), t("monitor.cards.codexHome.detail"), "idle", { copyValue: monitor.codexHome, showStatus: false, kind: "path" }),
      monitorCard(t("monitor.cards.sessionsRoot.label"), formatShortPath(managed.rootDir), t("monitor.cards.sessionsRoot.detail"), managed.active ? "running" : "idle", { copyValue: managed.rootDir, showStatus: false, kind: "path" }),
      monitorCard(t("monitor.cards.stdout.label"), formatShortPath(monitor.stdoutLogFile), t("monitor.cards.stdout.detail"), "idle", { copyValue: monitor.stdoutLogFile, showStatus: false, kind: "path" }),
      monitorCard(t("monitor.cards.stderr.label"), formatShortPath(monitor.stderrLogFile), t("monitor.cards.stderr.detail"), "idle", { copyValue: monitor.stderrLogFile, showStatus: false, kind: "path" }),
      monitorCard(
        t("monitor.cards.lastMatched.label"),
        formatDateTime(runtime.lastMatchedAt),
        runtime.lastMatchedAt ? t("monitor.cards.lastMatched.detail", { count: formatNumber(runtime.matchedLines || 0) }) : t("monitor.cards.lastMatched.empty"),
        runtime.lastMatchedAt ? "success" : "idle"
      ),
      monitorCard(
        t("monitor.cards.currentPid.label"),
        String(monitor.currentPid || t("common.empty")),
        t("monitor.cards.currentPid.detail", { time: formatDateTime(monitor.currentStartedAt) }),
        "idle"
      )
    ].join("");

    bindCopyButtons();
  }

  fetchSnapshot("12h").then(render).catch(console.error);
  connectSnapshotStream(function () {
    fetchSnapshot("12h").then(render).catch(console.error);
  }, setConnectionState);
  onLanguageChange(function () {
    if (state.snapshot) {
      render(state.snapshot);
    }
  });
})();
