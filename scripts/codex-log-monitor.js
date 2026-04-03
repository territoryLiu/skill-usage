const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_POLL_MS = Math.max(500, Number(process.env.CODEX_MONITOR_POLL_MS) || 1500);
const DEFAULT_IDLE_MS = Math.max(3000, Number(process.env.CODEX_MONITOR_IDLE_MS) || 12000);

function getDefaultCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

function normalizeWindowsPath(value) {
  return String(value || "").replace(/\//g, "\\");
}

function collectStringValues(value, results) {
  if (typeof value === "string") {
    results.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, results);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectStringValues(item, results);
    }
  }
}

function deriveSkillNameFromResolvedPath(candidatePath, skillsDir) {
  const normalizedSkillsDir = path.normalize(normalizeWindowsPath(skillsDir));
  const normalizedCandidate = path.normalize(normalizeWindowsPath(candidatePath));
  const lowerSkillsDir = normalizedSkillsDir.toLowerCase();
  const lowerCandidate = normalizedCandidate.toLowerCase();

  if (!lowerCandidate.startsWith(lowerSkillsDir)) {
    return null;
  }

  let relativePath = normalizedCandidate.slice(normalizedSkillsDir.length);
  relativePath = relativePath.replace(/^\\+/, "");
  if (!relativePath) {
    return null;
  }

  const parts = relativePath.split("\\").filter(Boolean);
  if (!parts.length) {
    return null;
  }

  if (parts[0].startsWith(".") && parts.length > 1) {
    return parts[1];
  }

  return parts[0];
}

function deriveSkillNameFromText(text, skillsDir) {
  const normalizedText = normalizeWindowsPath(text);
  const normalizedSkillsDir = path.normalize(normalizeWindowsPath(skillsDir));
  const lowerText = normalizedText.toLowerCase();
  const lowerSkillsDir = normalizedSkillsDir.toLowerCase();
  const index = lowerText.indexOf(lowerSkillsDir);

  if (index === -1) {
    return null;
  }

  let endIndex = normalizedText.length;
  const terminators = ['"', "'", "`", " ", "\t", "\r", "\n", ")", "]", "}", ","];

  for (let position = index; position < normalizedText.length; position += 1) {
    const character = normalizedText[position];
    if (position > index && terminators.includes(character)) {
      endIndex = position;
      break;
    }
  }

  const candidatePath = normalizedText.slice(index, endIndex);
  return deriveSkillNameFromResolvedPath(candidatePath, skillsDir);
}

function extractSkillName(args, skillsDir) {
  const candidates = [];
  collectStringValues(args, candidates);

  for (const candidate of candidates) {
    const directMatch = deriveSkillNameFromResolvedPath(candidate, skillsDir);
    if (directMatch) {
      return directMatch;
    }

    const embeddedMatch = deriveSkillNameFromText(candidate, skillsDir);
    if (embeddedMatch) {
      return embeddedMatch;
    }
  }

  return null;
}

function updateSessionContext(record, context = {}) {
  const next = { ...context };
  if (!record || typeof record !== "object") {
    return next;
  }

  if (record.type === "event_msg" && record.payload && typeof record.payload === "object") {
    if (record.payload.type === "task_started" && typeof record.payload.turn_id === "string") {
      next.turnId = record.payload.turn_id;
    }
  }

  if (record.type === "turn_context" && record.payload && typeof record.payload === "object") {
    if (typeof record.payload.turn_id === "string") {
      next.turnId = record.payload.turn_id;
    }

    if (typeof record.payload.model === "string") {
      next.model = record.payload.model;
    }
  }

  return next;
}

function parseSessionFunctionCallRecord(record, skillsDir, context = {}) {
  if (!record || record.type !== "response_item") {
    return null;
  }

  const payload = record.payload;
  if (!payload || payload.type !== "function_call" || typeof payload.name !== "string") {
    return null;
  }

  let args;
  try {
    args =
      typeof payload.arguments === "string" ? JSON.parse(payload.arguments) : payload.arguments || {};
  } catch {
    return null;
  }

  const skill = extractSkillName(args, skillsDir);
  if (!skill) {
    return null;
  }

  const timestamp = new Date(record.timestamp);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  const sessionId =
    typeof context.sessionId === "string" && context.sessionId ? context.sessionId : "unknown-session";
  const turnId =
    typeof context.turnId === "string" && context.turnId
      ? context.turnId
      : typeof payload.call_id === "string" && payload.call_id
        ? payload.call_id
        : "unknown-turn";

  return {
    timestamp,
    skill,
    sessionId,
    turnId,
    toolName: payload.name,
    model: typeof context.model === "string" && context.model ? context.model : "unknown"
  };
}

async function readAppendedText(filePath, startOffset, endOffset) {
  if (endOffset <= startOffset) {
    return "";
  }

  const handle = await fsp.open(filePath, "r");
  try {
    const length = endOffset - startOffset;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, startOffset);
    return buffer.toString("utf8");
  } finally {
    await handle.close();
  }
}

function buildMonitorEvent(invocation) {
  const durationMs = Math.max(
    250,
    invocation.lastSeenAt.getTime() - invocation.startedAt.getTime()
  );

  return {
    skill: invocation.skill,
    status: "success",
    startedAt: invocation.startedAt.toISOString(),
    endedAt: invocation.lastSeenAt.toISOString(),
    durationMs,
    source: "codex-monitor",
    sessionId: invocation.sessionId,
    model: invocation.model || "unknown",
    trigger: "auto-monitor",
    details: `Auto-detected from Codex ${invocation.sourceLabel} (${invocation.toolCalls} tool calls in one turn).`,
    metadata: {
      monitor: invocation.monitorSource,
      sessionId: invocation.sessionId,
      turnId: invocation.turnId,
      toolCalls: invocation.toolCalls,
      lastToolName: invocation.lastToolName,
      ...(invocation.threadId ? { threadId: invocation.threadId } : {})
    }
  };
}

function deriveSessionIdFromFilePath(filePath, sessionsDir) {
  const relativePath = path.relative(sessionsDir, filePath);
  if (!relativePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  return relativePath.replace(/\\/g, "/").replace(/\.jsonl$/i, "");
}

async function listSessionFiles(rootDir) {
  const results = [];

  async function walk(currentDir) {
    let entries;
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return;
      }

      throw error;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && /\.jsonl$/i.test(entry.name)) {
        results.push(entryPath);
      }
    }
  }

  await walk(rootDir);
  results.sort();
  return results;
}

function startCodexLogMonitor(options) {
  const appendEvents = options.appendEvents;
  const logger = options.logger || console;
  const codexHome = options.codexHome || getDefaultCodexHome();
  const pollMs = Math.max(500, Number(options.pollMs) || DEFAULT_POLL_MS);
  const idleMs = Math.max(3000, Number(options.idleMs) || DEFAULT_IDLE_MS);
  const startAtEnd = options.startAtEnd !== false;
  const skillsDir = path.join(codexHome, "skills");
  const sessionsDir = options.sessionsDir || path.join(codexHome, "sessions");

  const state = {
    polling: false,
    closed: false,
    activeInvocations: new Map(),
    flushChain: Promise.resolve(),
    startedAt: new Date().toISOString(),
    lastPollAt: null,
    lastMatchedAt: null,
    lastFlushAt: null,
    matchedLines: 0,
    emittedEvents: 0,
    sessionFiles: new Map()
  };

  function queueFlush(force = false) {
    state.flushChain = state.flushChain.then(async () => {
      const now = Date.now();
      const finalized = [];

      for (const [key, invocation] of state.activeInvocations.entries()) {
        const idleForMs = now - invocation.lastSeenAt.getTime();
        if (!force && idleForMs < idleMs) {
          continue;
        }

        state.activeInvocations.delete(key);
        finalized.push(buildMonitorEvent(invocation));
      }

      if (finalized.length) {
        await appendEvents(finalized);
        state.emittedEvents += finalized.length;
      }

      state.lastFlushAt = new Date().toISOString();
    }).catch((error) => {
      logger.error("Codex monitor flush failed:", error);
    });
  }

  function recordInvocation(parsed, monitorSource, sourceLabel) {
    state.lastMatchedAt = parsed.timestamp.toISOString();
    state.matchedLines += 1;

    const key = `${parsed.sessionId}::${parsed.turnId}::${parsed.skill}`;
    const existing = state.activeInvocations.get(key);

    if (existing) {
      existing.lastSeenAt = parsed.timestamp;
      existing.model = parsed.model || existing.model;
      existing.toolCalls += 1;
      existing.lastToolName = parsed.toolName;
      if (parsed.threadId) {
        existing.threadId = parsed.threadId;
      }
      return;
    }

    state.activeInvocations.set(key, {
      skill: parsed.skill,
      sessionId: parsed.sessionId,
      threadId: parsed.threadId || null,
      turnId: parsed.turnId,
      model: parsed.model,
      toolCalls: 1,
      lastToolName: parsed.toolName,
      startedAt: parsed.timestamp,
      lastSeenAt: parsed.timestamp,
      monitorSource,
      sourceLabel
    });
  }

  function recordSessionLine(line, fileState) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      return;
    }

    fileState.context = updateSessionContext(record, fileState.context);
    const parsed = parseSessionFunctionCallRecord(record, skillsDir, fileState.context);
    if (!parsed) {
      return;
    }

    recordInvocation(parsed, "session-jsonl", "session jsonl");
  }

  async function processSessionFile(filePath) {
    const stat = await fsp.stat(filePath);
    let fileState = state.sessionFiles.get(filePath);

    if (!fileState) {
      fileState = {
        offset: startAtEnd ? stat.size : 0,
        remainder: "",
        context: {
          sessionId: deriveSessionIdFromFilePath(filePath, sessionsDir)
        }
      };
      state.sessionFiles.set(filePath, fileState);
    }

    if (stat.size < fileState.offset) {
      fileState.offset = 0;
      fileState.remainder = "";
    }

    if (stat.size <= fileState.offset) {
      return;
    }

    const chunk = await readAppendedText(filePath, fileState.offset, stat.size);
    fileState.offset = stat.size;
    const text = fileState.remainder + chunk;
    const lines = text.split(/\r?\n/);
    fileState.remainder = lines.pop() || "";

    for (const line of lines) {
      recordSessionLine(line, fileState);
    }
  }

  async function processSessionFiles() {
    let sessionFiles;
    try {
      sessionFiles = await listSessionFiles(sessionsDir);
    } catch (error) {
      logger.error("Codex monitor session scan failed:", error);
      return;
    }

    const knownPaths = new Set(sessionFiles);
    for (const trackedPath of state.sessionFiles.keys()) {
      if (!knownPaths.has(trackedPath)) {
        state.sessionFiles.delete(trackedPath);
      }
    }

    for (const filePath of sessionFiles) {
      try {
        await processSessionFile(filePath);
      } catch (error) {
        logger.error(`Codex monitor session read failed: ${filePath}`, error);
      }
    }
  }

  async function poll() {
    if (state.polling || state.closed) {
      return;
    }

    state.polling = true;
    state.lastPollAt = new Date().toISOString();
    try {
      await processSessionFiles();
      queueFlush(false);
    } finally {
      state.polling = false;
    }
  }

  const interval = setInterval(() => {
    poll().catch((error) => {
      logger.error("Codex monitor poll failed:", error);
    });
  }, pollMs);

  poll().catch((error) => {
    logger.error("Codex monitor initial poll failed:", error);
  });

  logger.log(`Codex monitor watching session logs in ${sessionsDir}`);

  return {
    stop() {
      state.closed = true;
      clearInterval(interval);
      queueFlush(true);
      return state.flushChain;
    },
    getStatus() {
      return {
        startedAt: state.startedAt,
        lastPollAt: state.lastPollAt,
        lastMatchedAt: state.lastMatchedAt,
        lastFlushAt: state.lastFlushAt,
        matchedLines: state.matchedLines,
        emittedEvents: state.emittedEvents,
        activeInvocations: state.activeInvocations.size,
        trackedSessionFiles: state.sessionFiles.size,
        closed: state.closed,
        sessionsDir,
        skillsDir,
        codexHome
      };
    },
    sessionsDir,
    skillsDir,
    codexHome
  };
}

module.exports = {
  getDefaultCodexHome,
  parseSessionFunctionCallRecord,
  startCodexLogMonitor
};
