(function (root, factory) {
  const exportsValue = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exportsValue;
  }
  root.SkillUsageModels = exportsValue;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const podiumOrder = [2, 1, 3];
  const podiumThemeByRank = {
    1: { tone: "gold", accent: "#f06b59", crown: "crown-gold" },
    2: { tone: "silver", accent: "#56b0e8", crown: "crown-silver" },
    3: { tone: "bronze", accent: "#f0b12c", crown: "crown-bronze" }
  };

  function buildPodiumModel(skills) {
    const topThree = (skills || []).slice(0, 3).map(function (skill, index) {
      const rank = index + 1;
      return {
        skill: skill.skill,
        calls: skill.calls,
        lastStatus: skill.lastStatus,
        badge: String(skill.skill || "?").slice(0, 1).toUpperCase(),
        rank,
        theme: podiumThemeByRank[rank]
      };
    });

    if (topThree.length < 3) {
      return [];
    }

    return podiumOrder.map(function (rank) {
      return topThree.find(function (item) {
        return item.rank === rank;
      });
    });
  }

  function buildLeaderboardRows(skills) {
    return (skills || []).slice(3).map(function (skill, index) {
      return {
        skill: skill.skill,
        calls: skill.calls,
        avgDurationMs: skill.avgDurationMs,
        failureRate: skill.failureRate,
        lastStatus: skill.lastStatus,
        displayRank: index + 4
      };
    });
  }

  function getHistoryPeakDay(history) {
    const safeHistory = history || {};
    const months = Array.isArray(safeHistory.months) ? safeHistory.months : [];
    let peak = null;

    months.forEach(function (month) {
      (month.days || []).forEach(function (day) {
        if (!peak || Number(day.calls || 0) > Number(peak.calls || 0)) {
          peak = day;
        }
      });
    });

    return peak || { date: "", calls: 0 };
  }

  function countActiveMonths(history) {
    const safeHistory = history || {};
    const months = Array.isArray(safeHistory.months) ? safeHistory.months : [];

    return months.filter(function (month) {
      return (month.days || []).some(function (day) {
        return Number(day.calls || 0) > 0;
      });
    }).length;
  }

  function buildHistorySummaryCards(history) {
    const safeHistory = history || {};
    const peakDay = getHistoryPeakDay(safeHistory);
    const activeMonths = countActiveMonths(safeHistory);

    return [
      {
        key: "activeDays",
        value: safeHistory.activeDays || 0
      },
      {
        key: "longestStreak",
        value: safeHistory.longestStreak || 0
      },
      {
        key: "activeMonths",
        value: activeMonths
      },
      {
        key: "peakDay",
        value: peakDay.calls || 0,
        hintDate: peakDay.date || ""
      }
    ];
  }

  return {
    buildPodiumModel,
    buildLeaderboardRows,
    buildHistorySummaryCards
  };
});
