const fs = require("node:fs");
const path = require("node:path");

module.exports = function loadEnvironment() {
  for (const name of [".env.server", ".env"]) {
    const file = path.resolve(process.cwd(), name);
    let contents;
    try {
      contents = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || line.trimStart().startsWith("#") || process.env[match[1]] !== undefined) continue;
      let value = match[2];
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  }
};
