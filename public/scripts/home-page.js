(function () {
  const {
    buildLeaderboardRows,
    buildPodiumModel
  } = window.SkillUsageModels;
  const {
    connectSnapshotStream,
    escapeHtml,
    fetchSnapshot,
    formatDateTime,
    formatDuration,
    formatNumber,
    formatPercent,
    formatStatusLabel,
    getSavedRange,
    onLanguageChange,
    renderTimeframeSwitch,
    setConnectionState,
    statusTone,
    t
  } = window.SkillUsageCore;

  const state = {
    range: getSavedRange(),
    snapshot: null,
    stream: null
  };

  function renderSummaryCards(summary) {
    return [
      {
        label: t("home.summary.totalCalls.label"),
        value: formatNumber(summary.totalCalls),
        hint: t("home.summary.totalCalls.hint", { skills: formatNumber(summary.uniqueSkills) })
      },
      {
        label: t("home.summary.avgDuration.label"),
        value: formatDuration(summary.avgDurationMs),
        hint: t("home.summary.avgDuration.hint", { duration: formatDuration(summary.totalDurationMs) })
      },
      {
        label: t("home.summary.successRate.label"),
        value: formatPercent(summary.successRate),
        hint: t("home.summary.successRate.hint", { rate: formatPercent(summary.errorRate) })
      },
      {
        label: t("home.summary.activeSkills.label"),
        value: formatNumber(summary.uniqueSkills),
        hint: t("home.summary.activeSkills.hint", { count: formatNumber(summary.activeCalls) })
      }
    ].map(function (card) {
      return `
        <article class="metric-card panel-shell compact-card">
          <p class="eyebrow">${escapeHtml(card.label)}</p>
          <strong>${escapeHtml(card.value)}</strong>
          <span>${escapeHtml(card.hint)}</span>
        </article>
      `;
    }).join("");
  }

  function renderPodium(skills) {
    const podium = buildPodiumModel(skills);
    if (!podium.length) {
      return `<div class="empty-state">${escapeHtml(t("home.podium.empty"))}</div>`;
    }

    return podium.map(function (item) {
      return `
        <article class="podium-card rank-${item.rank}">
          <div class="crown ${escapeHtml(item.theme.crown)}" aria-hidden="true">♛</div>
          <div class="podium-badge">${escapeHtml(item.badge)}</div>
          <div class="podium-body tone-${escapeHtml(item.theme.tone)}">
            <p class="podium-rank">${escapeHtml(t("home.podium.rank", { rank: item.rank }))}</p>
            <h3>${escapeHtml(item.skill)}</h3>
            <p class="podium-note">${escapeHtml(formatStatusLabel(item.lastStatus || "idle"))}</p>
            <strong>${escapeHtml(formatNumber(item.calls))}</strong>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderLeaderboard(skills) {
    const rows = buildLeaderboardRows(skills);
    if (!rows.length) {
      return `<div class="empty-state">${escapeHtml(t("home.leaderboard.empty"))}</div>`;
    }

    return rows.map(function (item) {
      return `
        <button class="ranking-row panel-shell" type="button" data-skill="${escapeHtml(item.skill)}">
          <span class="rank-pill">${item.displayRank}</span>
          <div class="ranking-main">
            <strong>${escapeHtml(item.skill)}</strong>
            <div class="ranking-meta">
              <span>${escapeHtml(t("home.ranking.calls", { count: formatNumber(item.calls) }))}</span>
              <span>${escapeHtml(formatDuration(item.avgDurationMs))}</span>
              <span class="status-inline ${escapeHtml(statusTone(item.lastStatus))}">${escapeHtml(t("home.ranking.error", { value: formatPercent(item.failureRate) }))}</span>
            </div>
          </div>
        </button>
      `;
    }).join("");
  }

  function renderEventStream(events) {
    if (!events.length) {
      return `<div class="empty-state">${escapeHtml(t("home.feed.empty"))}</div>`;
    }

    return events.slice(0, 6).map(function (event) {
      return `
        <article class="feed-item">
          <div class="feed-topline">
            <strong>${escapeHtml(event.skill)}</strong>
            <span class="status-pill ${escapeHtml(statusTone(event.status))}">${escapeHtml(formatStatusLabel(event.status || "idle"))}</span>
          </div>
          <div class="feed-meta">
            <span>${escapeHtml(formatDuration(event.durationMs))}</span>
            <span>${escapeHtml(event.source || t("common.unknown"))}</span>
            <span>${escapeHtml(event.model || t("common.unknown"))}</span>
          </div>
          <div class="feed-detail">${escapeHtml(formatDateTime(event.startedAt))}</div>
        </article>
      `;
    }).join("");
  }

  function bindLeaderboardLinks() {
    document.querySelectorAll("[data-skill]").forEach(function (button) {
      button.addEventListener("click", function () {
        const skill = button.dataset.skill;
        window.location.href = `/trends.html?skill=${encodeURIComponent(skill)}`;
      });
    });
  }

  function render(snapshot) {
    const eventStream = document.getElementById("event-stream");
    state.snapshot = snapshot;
    document.getElementById("summary-cards").innerHTML = renderSummaryCards(snapshot.summary);
    document.getElementById("podium-stage").innerHTML = renderPodium(snapshot.skills);
    document.getElementById("leaderboard-list").innerHTML = renderLeaderboard(snapshot.skills);
    if (eventStream) {
      eventStream.innerHTML = renderEventStream(snapshot.recentEvents || []);
    }
    bindLeaderboardLinks();
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
  state.stream = connectSnapshotStream(function () {
    loadSnapshot().catch(console.error);
  }, setConnectionState);
  onLanguageChange(function () {
    if (state.snapshot) {
      render(state.snapshot);
    }
  });
})();
