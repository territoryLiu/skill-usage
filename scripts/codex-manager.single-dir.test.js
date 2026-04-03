const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const manager = require("./codex-manager");

test("resolveInstallRoot points directly at CODEX_HOME/skills/skill-usage", () => {
  const codexHome = path.join("C:\\", "Users", "Lenovo", ".codex");
  assert.equal(typeof manager.resolveInstallRoot, "function");
  assert.equal(
    manager.resolveInstallRoot(codexHome),
    path.join(codexHome, "skills", "skill-usage")
  );
});

test("installSkill is exported for single-directory migration work", () => {
  assert.equal(typeof manager.installSkill, "function");
});
