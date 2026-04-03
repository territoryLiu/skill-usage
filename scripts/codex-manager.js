const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const SKILL_NAME = "skill-usage";
const DEFAULT_PORT = Number(process.env.PORT || 3210);
const DEFAULT_HOST = process.env.HOST || "127.0.0.1";
const SCRIPT_DIR = __dirname;
const SOURCE_ROOT = path.resolve(SCRIPT_DIR, "..");
const PROCESS_FILE_NAME = "dashboard-process.json";
const RUNTIME_IGNORES = new Set([".git", "node_modules", "data"]);

function parseArgs(argv) {
  const [command = "status", ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, options };
}

function getDefaultCodexHome() {
  if (process.env.CODEX_HOME) {
    return process.env.CODEX_HOME;
  }

  if (process.platform === "win32") {
    return path.join(process.env.USERPROFILE || os.homedir(), ".codex");
  }

  return path.join(os.homedir(), ".codex");
}

function resolveCodexHome(options) {
  return path.resolve(options["codex-home"] || getDefaultCodexHome());
}

function resolveInstallRoot(codexHome) {
  return path.join(codexHome, "skills", SKILL_NAME);
}

function resolvePersistentDataRoot(codexHome) {
  return path.join(codexHome, "data", SKILL_NAME);
}

function getDataDir(rootDir) {
  return path.join(rootDir, "data");
}

function getPidFile(rootDir) {
  return path.join(getDataDir(rootDir), PROCESS_FILE_NAME);
}

function getPersistentEventsFile(dataRoot) {
  return path.join(dataRoot, "skill-events.jsonl");
}

function getPersistentStdoutLog(dataRoot) {
  return path.join(dataRoot, "dashboard.stdout.log");
}

function getPersistentStderrLog(dataRoot) {
  return path.join(dataRoot, "dashboard.stderr.log");
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !error || error.code !== "ESRCH";
  }
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(targetPath) {
  await fsp.mkdir(targetPath, { recursive: true });
}

async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const content = await fsp.readFile(filePath, "utf8");
  if (!content.trim()) {
    return null;
  }

  return JSON.parse(content);
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function removeFileIfExists(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function ensurePersistentDataDir(dataRoot) {
  await ensureDir(dataRoot);

  const requiredFiles = [
    getPersistentEventsFile(dataRoot),
    getPersistentStdoutLog(dataRoot),
    getPersistentStderrLog(dataRoot)
  ];

  for (const filePath of requiredFiles) {
    if (!(await pathExists(filePath))) {
      await fsp.writeFile(filePath, "", "utf8");
    }
  }
}

async function resetPersistentData(dataRoot) {
  await ensureDir(dataRoot);
  await Promise.all([
    fsp.writeFile(getPersistentEventsFile(dataRoot), "", "utf8"),
    fsp.writeFile(getPersistentStdoutLog(dataRoot), "", "utf8"),
    fsp.writeFile(getPersistentStderrLog(dataRoot), "", "utf8")
  ]);
}

async function copyRecursive(sourcePath, destinationPath) {
  const stat = await fsp.stat(sourcePath);

  if (stat.isDirectory()) {
    await ensureDir(destinationPath);
    const entries = await fsp.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(
        path.join(sourcePath, entry.name),
        path.join(destinationPath, entry.name)
      );
    }
    return;
  }

  await ensureDir(path.dirname(destinationPath));
  await fsp.copyFile(sourcePath, destinationPath);
}

async function installSkill({ sourceRoot, targetRoot, dataRoot }) {
  await ensurePersistentDataDir(dataRoot);

  if (path.resolve(sourceRoot) === path.resolve(targetRoot)) {
    console.log(`当前目录已经是已安装目录: ${targetRoot}`);
    return;
  }

  const targetParent = path.dirname(targetRoot);
  await ensureDir(targetParent);

  if (await pathExists(targetRoot)) {
    await fsp.rm(targetRoot, { recursive: true, force: true });
  }

  await ensureDir(targetRoot);
  const entries = await fsp.readdir(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (RUNTIME_IGNORES.has(entry.name)) {
      continue;
    }

    await copyRecursive(
      path.join(sourceRoot, entry.name),
      path.join(targetRoot, entry.name)
    );
  }

  console.log(`已安装到: ${targetRoot}`);
  console.log(`Codex skills 目录: ${targetParent}`);
}

async function readProcessState(rootDir) {
  const pidFile = getPidFile(rootDir);
  const state = await readJsonIfExists(pidFile);
  if (!state) {
    return null;
  }

  if (isProcessAlive(state.pid)) {
    return state;
  }

  await removeFileIfExists(pidFile);
  return null;
}

async function readLastLogLines(filePath, limit = 20) {
  if (!(await pathExists(filePath))) {
    return "";
  }

  const content = await fsp.readFile(filePath, "utf8");
  return content.split(/\r?\n/).filter(Boolean).slice(-limit).join("\n");
}

async function startManagedServer({ rootDir, codexHome, dataRoot, port, host }) {
  const existing = await readProcessState(rootDir);
  if (existing) {
    console.log(`dashboard 已在运行，PID: ${existing.pid}`);
    console.log(`访问地址: http://${existing.host}:${existing.port}`);
    return existing;
  }

  await ensurePersistentDataDir(dataRoot);
  const stdoutFd = fs.openSync(getPersistentStdoutLog(dataRoot), "a");
  const stderrFd = fs.openSync(getPersistentStderrLog(dataRoot), "a");
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: host,
    CODEX_HOME: codexHome,
    ENABLE_CODEX_MONITOR: "1"
  };

  const child = spawn(process.execPath, [path.join(rootDir, "server.js")], {
    cwd: rootDir,
    detached: true,
    stdio: ["ignore", stdoutFd, stderrFd],
    env
  });

  child.unref();
  fs.closeSync(stdoutFd);
  fs.closeSync(stderrFd);

  const state = {
    pid: child.pid,
    port,
    host,
    codexHome,
    dataRoot,
    rootDir,
    startedAt: new Date().toISOString()
  };

  await writeJson(getPidFile(rootDir), state);
  await sleep(1200);

  if (!isProcessAlive(child.pid)) {
    await removeFileIfExists(getPidFile(rootDir));
    const stderrTail = await readLastLogLines(getPersistentStderrLog(dataRoot));
    throw new Error(
      stderrTail
        ? `dashboard 启动失败，stderr:\n${stderrTail}`
        : "dashboard 启动失败，进程已退出。"
    );
  }

  console.log(`dashboard 已启动，PID: ${child.pid}`);
  console.log(`访问地址: http://${host}:${port}`);
  console.log(`Codex 监控目录: ${codexHome}`);
  console.log(`数据目录: ${dataRoot}`);
  console.log(`stdout 日志: ${getPersistentStdoutLog(dataRoot)}`);
  console.log(`stderr 日志: ${getPersistentStderrLog(dataRoot)}`);
  return state;
}

async function stopManagedServer(rootDir) {
  const pidFile = getPidFile(rootDir);
  const state = await readJsonIfExists(pidFile);

  if (!state) {
    console.log("未找到运行中的 dashboard。");
    return;
  }

  if (!isProcessAlive(state.pid)) {
    await removeFileIfExists(pidFile);
    console.log(`PID ${state.pid} 不存在，已清理残留状态文件。`);
    return;
  }

  try {
    process.kill(state.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") {
      throw error;
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!isProcessAlive(state.pid)) {
      break;
    }
    await sleep(250);
  }

  if (isProcessAlive(state.pid)) {
    process.kill(state.pid, "SIGKILL");
    await sleep(250);
  }

  await removeFileIfExists(pidFile);
  console.log(`已停止 dashboard 进程，PID: ${state.pid}`);
}

async function showStatus(rootDir, dataRoot) {
  const state = await readProcessState(rootDir);
  if (!state) {
    console.log("dashboard 未运行。");
    console.log(`数据目录: ${dataRoot}`);
    return;
  }

  console.log(`dashboard 运行中，PID: ${state.pid}`);
  console.log(`访问地址: http://${state.host}:${state.port}`);
  console.log(`Codex 监控目录: ${state.codexHome}`);
  console.log(`安装目录: ${state.rootDir}`);
  console.log(`数据目录: ${state.dataRoot || dataRoot}`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const codexHome = resolveCodexHome(options);
  const installRoot = resolveInstallRoot(codexHome);
  const dataRoot = resolvePersistentDataRoot(codexHome);
  const port = Number(options.port || DEFAULT_PORT);
  const host = options.host || DEFAULT_HOST;

  switch (command) {
    case "install": {
      await installSkill({
        sourceRoot: SOURCE_ROOT,
        targetRoot: installRoot,
        dataRoot
      });
      break;
    }
    case "start": {
      if (!(await pathExists(installRoot))) {
        throw new Error(`未找到已安装目录: ${installRoot}。请先执行 install。`);
      }
      await startManagedServer({
        rootDir: installRoot,
        codexHome,
        dataRoot,
        port,
        host
      });
      break;
    }
    case "install-and-start": {
      const running = await readProcessState(installRoot);
      if (running) {
        console.log(`dashboard 已在运行，PID: ${running.pid}`);
        console.log(`访问地址: http://${running.host}:${running.port}`);
        return;
      }

      if (path.resolve(SOURCE_ROOT) !== path.resolve(installRoot)) {
        await installSkill({
          sourceRoot: SOURCE_ROOT,
          targetRoot: installRoot,
          dataRoot
        });
      }
      await startManagedServer({
        rootDir: installRoot,
        codexHome,
        dataRoot,
        port,
        host
      });
      break;
    }
    case "stop": {
      await stopManagedServer(installRoot);
      break;
    }
    case "status": {
      await showStatus(installRoot, dataRoot);
      break;
    }
    case "reset-data": {
      await resetPersistentData(dataRoot);
      console.log(`已清空数据目录: ${dataRoot}`);
      break;
    }
    default:
      throw new Error(`不支持的命令: ${command}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  getDefaultCodexHome,
  resolveInstallRoot,
  resolvePersistentDataRoot,
  ensurePersistentDataDir,
  resetPersistentData,
  installSkill
};
