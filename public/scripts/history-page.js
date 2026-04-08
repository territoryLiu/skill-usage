(function () {
  const { buildHistorySummaryCards } = window.SkillUsageModels;
  const {
    connectSnapshotStream,
    escapeHtml,
    fetchSnapshot,
    formatNumber,
    onLanguageChange,
    setConnectionState,
    t
  } = window.SkillUsageCore;

  const state = {
    snapshot: null
  };

  function renderCalendar(history) {
    if (!history || !history.months || !history.months.length) {
      return `<div class="empty-state">${escapeHtml(t("history.empty"))}</div>`;
    }

    return history.months.map(function (month) {
      return `
        <section class="month-block">
          <h3>${escapeHtml(t("history.month", { month: month.month }))}</h3>
          <div class="month-dots">
            ${month.days.map(function (day) {
              return `<span class="day-dot level-${day.level}" title="${escapeHtml(`${day.date} · ${String(day.calls)}`)}"></span>`;
            }).join("")}
          </div>
        </section>
      `;
    }).join("");
  }

  function render(snapshot) {
    state.snapshot = snapshot;
    document.getElementById("history-summary").innerHTML = buildHistorySummaryCards(snapshot.history).map(function (card) {
      const hint = card.key === "peakDay"
        ? (card.hintDate ? t("history.summary.peakDay.hint", { date: card.hintDate }) : t("history.summary.peakDay.hintEmpty"))
        : t(`history.summary.${card.key}.hint`);
      return `
        <article class="history-stat">
          <p>${escapeHtml(t(`history.summary.${card.key}.label`))}</p>
          <strong>${escapeHtml(formatNumber(card.value))}</strong>
          <span>${escapeHtml(hint)}</span>
        </article>
      `;
    }).join("");
    document.getElementById("activity-calendar").innerHTML = renderCalendar(snapshot.history);
  }

  async function loadSnapshot() {
    const snapshot = await fetchSnapshot("1y");
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
