const MAX_RECENT_EVENTS = 30;
const SKILL_COLORS = [
  "#f06b59",
  "#56b0e8",
  "#f0b12c",
  "#75c176",
  "#d96fd2",
  "#8d8cf7",
  "#f18c6a",
  "#55d1b4"
];

const RANGE_CONFIG = {
  "12h": { bucketType: "hour", buckets: 12 },
  "1d": { bucketType: "hour", buckets: 24 },
  "1m": { bucketType: "day", buckets: 30 },
  "1y": { bucketType: "month", buckets: 12 }
};

function normalizeRange(range) {
  return Object.prototype.hasOwnProperty.call(RANGE_CONFIG, range) ? range : "12h";
}

function toTimestamp(value) {
  return new Date(value).getTime();
}

function percentile(values, target) {
  if (!values.length) {
    return 0;
  }

  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(target * values.length) - 1));
  return values[index];
}

function floorToHour(date) {
  const value = new Date(date);
  value.setUTCMinutes(0, 0, 0);
  return value;
}

function floorToDay(date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function floorToMonth(date) {
  const value = new Date(date);
  value.setUTCDate(1);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function shiftBucket(date, bucketType, amount) {
  const value = new Date(date);
  if (bucketType === "hour") {
    value.setUTCHours(value.getUTCHours() + amount);
    return value;
  }

  if (bucketType === "day") {
    value.setUTCDate(value.getUTCDate() + amount);
    return value;
  }

  value.setUTCMonth(value.getUTCMonth() + amount);
  return value;
}

function getBucketStart(date, bucketType) {
  if (bucketType === "hour") {
    return floorToHour(date);
  }

  if (bucketType === "day") {
    return floorToDay(date);
  }

  return floorToMonth(date);
}

function formatBucketLabel(date, bucketType) {
  if (bucketType === "hour") {
    return `${String(date.getUTCHours()).padStart(2, "0")}:00`;
  }

  if (bucketType === "day") {
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  return `${date.getUTCMonth() + 1}月`;
}

function buildTimeline(events, range, nowValue) {
  const normalizedRange = normalizeRange(range);
  const config = RANGE_CONFIG[normalizedRange];
  const now = new Date(nowValue || Date.now());
  const endBucket = getBucketStart(now, config.bucketType);
  const timeline = [];

  for (let offset = config.buckets - 1; offset >= 0; offset -= 1) {
    const bucketStart = shiftBucket(endBucket, config.bucketType, -offset);
    timeline.push({
      bucketStart: bucketStart.toISOString(),
      label: formatBucketLabel(bucketStart, config.bucketType),
      calls: 0,
      errors: 0,
      totalDurationMs: 0
    });
  }

  const lookup = new Map(timeline.map((item) => [item.bucketStart, item]));

  for (const event of events) {
    const bucketStart = getBucketStart(new Date(event.startedAt), config.bucketType).toISOString();
    const bucket = lookup.get(bucketStart);
    if (!bucket) {
      continue;
    }

    bucket.calls += 1;
    bucket.totalDurationMs += Number(event.durationMs) || 0;
    if (event.status === "error") {
      bucket.errors += 1;
    }
  }

  return timeline;
}

function buildSkillSummaries(events) {
  const skillMap = new Map();

  for (const event of events) {
    if (!skillMap.has(event.skill)) {
      skillMap.set(event.skill, {
        skill: event.skill,
        calls: 0,
        completedCalls: 0,
        activeCalls: 0,
        successes: 0,
        errors: 0,
        totalDurationMs: 0,
        minDurationMs: Number.POSITIVE_INFINITY,
        maxDurationMs: 0,
        durations: [],
        sources: new Map(),
        models: new Map(),
        sessions: new Map(),
        lastSeenAt: event.startedAt,
        lastStatus: event.status,
        lastDetails: event.details,
        color: SKILL_COLORS[skillMap.size % SKILL_COLORS.length]
      });
    }

    const summary = skillMap.get(event.skill);
    summary.calls += 1;
    summary.lastSeenAt = summary.lastSeenAt > event.startedAt ? summary.lastSeenAt : event.startedAt;
    summary.lastStatus = event.status;
    summary.lastDetails = event.details || summary.lastDetails;
    summary.sources.set(event.source, (summary.sources.get(event.source) || 0) + 1);
    summary.models.set(event.model, (summary.models.get(event.model) || 0) + 1);
    summary.sessions.set(event.sessionId, (summary.sessions.get(event.sessionId) || 0) + 1);

    if (event.status === "running") {
      summary.activeCalls += 1;
      continue;
    }

    summary.completedCalls += 1;
    summary.totalDurationMs += Number(event.durationMs) || 0;
    summary.minDurationMs = Math.min(summary.minDurationMs, Number(event.durationMs) || 0);
    summary.maxDurationMs = Math.max(summary.maxDurationMs, Number(event.durationMs) || 0);
    summary.durations.push(Number(event.durationMs) || 0);

    if (event.status === "error") {
      summary.errors += 1;
    } else {
      summary.successes += 1;
    }
  }

  return [...skillMap.values()]
    .map((summary) => {
      summary.durations.sort((left, right) => left - right);
      const avgDurationMs = summary.completedCalls
        ? Math.round(summary.totalDurationMs / summary.completedCalls)
        : 0;
      const failureRate = summary.completedCalls
        ? Number(((summary.errors / summary.completedCalls) * 100).toFixed(1))
        : 0;

      return {
        skill: summary.skill,
        calls: summary.calls,
        completedCalls: summary.completedCalls,
        activeCalls: summary.activeCalls,
        successes: summary.successes,
        errors: summary.errors,
        totalDurationMs: summary.totalDurationMs,
        avgDurationMs,
        minDurationMs: Number.isFinite(summary.minDurationMs) ? summary.minDurationMs : 0,
        maxDurationMs: summary.maxDurationMs,
        p95DurationMs: percentile(summary.durations, 0.95),
        failureRate,
        sourceBreakdown: [...summary.sources.entries()]
          .sort((left, right) => right[1] - left[1])
          .map(([label, value]) => ({ label, value })),
        modelBreakdown: [...summary.models.entries()]
          .sort((left, right) => right[1] - left[1])
          .map(([label, value]) => ({ label, value })),
        sessionCount: summary.sessions.size,
        lastSeenAt: summary.lastSeenAt,
        lastStatus: summary.lastStatus,
        lastDetails: summary.lastDetails,
        color: summary.color
      };
    })
    .sort((left, right) => right.calls - left.calls || right.totalDurationMs - left.totalDurationMs);
}

function buildYearlyHistory(events, year) {
  const dailyCounts = new Map();

  for (const event of events) {
    const date = new Date(event.startedAt);
    if (date.getUTCFullYear() !== year) {
      continue;
    }

    const key = date.toISOString().slice(0, 10);
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
  }

  const months = [];
  let longestStreak = 0;
  let currentStreak = 0;

  for (let month = 0; month < 12; month += 1) {
    const days = [];
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const calls = dailyCounts.get(key) || 0;
      const level = calls >= 6 ? 4 : calls >= 4 ? 3 : calls >= 2 ? 2 : calls >= 1 ? 1 : 0;

      if (calls > 0) {
        currentStreak += 1;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }

      days.push({ date: key, calls, level });
    }

    months.push({ month: month + 1, days });
  }

  return {
    year,
    activeDays: [...dailyCounts.values()].filter((value) => value > 0).length,
    longestStreak,
    months
  };
}

function filterEventsByRange(events, range, nowValue) {
  const normalizedRange = normalizeRange(range);
  const now = new Date(nowValue || Date.now());
  const config = RANGE_CONFIG[normalizedRange];
  const start = shiftBucket(getBucketStart(now, config.bucketType), config.bucketType, -(config.buckets - 1)).getTime();
  return events.filter((event) => toTimestamp(event.startedAt) >= start);
}

function buildSnapshot(events, options = {}) {
  const now = options.now || new Date().toISOString();
  const range = normalizeRange(options.range);
  const year = Number(options.year || new Date(now).getUTCFullYear());
  const filteredEvents = filterEventsByRange(events, range, now).sort(
    (left, right) => toTimestamp(right.startedAt) - toTimestamp(left.startedAt)
  );
  const completedEvents = filteredEvents.filter((event) => event.status !== "running");
  const runningEvents = filteredEvents.filter((event) => event.status === "running");
  const skills = buildSkillSummaries(filteredEvents);
  const totalErrors = completedEvents.filter((event) => event.status === "error").length;
  const totalDurationMs = completedEvents.reduce((sum, event) => sum + (Number(event.durationMs) || 0), 0);

  return {
    generatedAt: new Date(now).toISOString(),
    range,
    summary: {
      totalCalls: filteredEvents.length,
      completedCalls: completedEvents.length,
      activeCalls: runningEvents.length,
      uniqueSkills: skills.length,
      totalDurationMs,
      avgDurationMs: completedEvents.length ? Math.round(totalDurationMs / completedEvents.length) : 0,
      errorRate: completedEvents.length ? Number(((totalErrors / completedEvents.length) * 100).toFixed(1)) : 0,
      successRate: completedEvents.length
        ? Number((((completedEvents.length - totalErrors) / completedEvents.length) * 100).toFixed(1))
        : 0
    },
    skills,
    timeline: buildTimeline(filteredEvents, range, now),
    history: buildYearlyHistory(events, year),
    activeEvents: runningEvents.slice(0, MAX_RECENT_EVENTS),
    recentEvents: filteredEvents.slice(0, MAX_RECENT_EVENTS)
  };
}

module.exports = {
  buildSnapshot,
  buildYearlyHistory,
  buildTimeline,
  filterEventsByRange,
  normalizeRange
};
