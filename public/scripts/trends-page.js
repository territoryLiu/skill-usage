(function () {
  const {
    connectSnapshotStream,
    escapeHtml,
    fetchSnapshot,
    formatDateTime,
    formatDuration,
    formatStatusLabel,
    getSavedRange,
    onLanguageChange,
    renderTimeframeSwitch,
    setConnectionState,
    statusTone,
    t
  } = window.SkillUsageCore;

  const params = new URLSearchParams(window.location.search);
  const focusedSkill = params.get("skill") || "";
  const state = {
    range: getSavedRange(),
    snapshot: null
  };

  function renderTimeline(timeline) {
    if (!timeline.length) {
      return `<div class="empty-state">${escapeHtml(t("trend.empty"))}</div>`;
    }

    const maxCalls = Math.max.apply(null, timeline.map(function (item) { return item.calls; }).concat([1]));
    return timeline.map(function (item) {
      const height = Math.max(18, Math.round((item.calls / maxCalls) * 220));
      const tooltip = t("trend.point.tooltip", {
        label: item.label,
        calls: item.calls,
        errors: item.errors
      });
      return `
        <article class="timeline-point" title="${escapeHtml(tooltip)}">
          <div class="timeline-fill ${item.errors > 0 ? "has-error" : ""}" style="height:${height}px"></div>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `;
    }).join("");
  }

  function renderEventTable(events) {
    const visibleEvents = focusedSkill
      ? events.filter(function (event) { return event.skill === focusedSkill; })
      : events;

    if (!visibleEvents.length) {
      return `<tr><td colspan="6"><div class="empty-state compact-empty">${escapeHtml(t("trend.emptyTable"))}</div></td></tr>`;
    }

    return visibleEvents.map(function (event) {
      return `
        <tr class="${focusedSkill && event.skill === focusedSkill ? "is-focused-row" : ""}">
          <td>${escapeHtml(event.skill)}</td>
          <td><span class="status-pill ${escapeHtml(statusTone(event.status))}">${escapeHtml(formatStatusLabel(event.status || "idle"))}</span></td>
          <td>${escapeHtml(formatDuration(event.durationMs))}</td>
          <td>${escapeHtml(event.source || t("common.unknown"))}</td>
          <td>${escapeHtml(event.model || t("common.unknown"))}</td>
          <td>${escapeHtml(formatDateTime(event.startedAt))}</td>
        </tr>
      `;
    }).join("");
  }

  function render(snapshot) {
    state.snapshot = snapshot;
    document.getElementById("timeline-chart").innerHTML = renderTimeline(snapshot.timeline || []);
    document.getElementById("event-table-body").innerHTML = renderEventTable(snapshot.recentEvents || []);
    document.getElementById("focus-skill").textContent = focusedSkill ? t("trend.focus.skill", { skill: focusedSkill }) : t("trend.focus.all");
    renderTimeframeSwitch(document.getElementById("timeframe-switch"), state.range, function (nextRange) {
      state.range = nextRange;
      loadSnapshot();
    });
  }

  async function loadSnapshot() {
    const snapshot = await fetchSnapshot(state.range);
    render(snapshot);
  }

  loadSnapshot().catch(console.error);
  connectSnapshotStream(function () {
    loadSnapshot().catch(console.error);
  }, setConnectionState);
  onLanguageChange(function () {
    if (state.snapshot) {
      render(state.snapshot);
    }
  });
})();
