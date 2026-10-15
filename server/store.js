const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { setTimeout: wait } = require("node:timers/promises");

let pendingWrite = Promise.resolve();

const emptyIndex = () => ({
  schemaVersion: 1,
  records: [],
  sources: {},
  updatedAt: null,
  coverage: "No repository records have been imported yet.",
});

function indexPath() {
  return path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"), "discovery-index.json");
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDiscoveryRecord(record) {
  return Boolean(record)
    && typeof record === "object"
    && typeof record.id === "string"
    && typeof record.source === "string"
    && typeof record.sourceIdentifier === "string"
    && typeof record.title === "string"
    && isStringArray(record.creators)
    && isStringArray(record.subjects)
    && typeof record.recordUrl === "string"
    && isStringArray(record.rights)
    && typeof record.fetchedAt === "string";
}

async function readIndex() {
  try {
    const value = JSON.parse(await fs.readFile(indexPath(), "utf8"));
    if (
      value?.schemaVersion !== 1
      || !Array.isArray(value.records)
      || !value.records.every(isDiscoveryRecord)
      || !value.sources
      || typeof value.sources !== "object"
      || Array.isArray(value.sources)
    ) {
      throw new Error("Discovery index has an unsupported format.");
    }
    return { ...emptyIndex(), ...value };
  } catch (error) {
    if (error?.code === "ENOENT") return emptyIndex();
    throw error;
  }
}

async function writeIndexAtomically(serialized) {
  const file = indexPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 });
    for (let attempt = 0; ; attempt += 1) {
      try {
        await fs.rename(temporary, file);
        break;
      } catch (error) {
        const transientWindowsLock = process.platform === "win32"
          && ["EPERM", "EACCES", "EBUSY"].includes(error?.code)
          && attempt < 5;
        if (!transientWindowsLock) throw error;
        await wait(20 * (2 ** attempt));
      }
    }
  } catch (error) {
    try {
      await fs.unlink(temporary);
    } catch (cleanupError) {
      if (cleanupError?.code !== "ENOENT") throw cleanupError;
    }
    throw error;
  }
}

function writeIndex(index) {
  const serialized = JSON.stringify(index);
  const operation = pendingWrite.then(() => writeIndexAtomically(serialized));
  pendingWrite = operation.catch(() => {});
  return operation;
}

function upsertRecords(index, sourceId, incoming, deleted) {
  const keyFor = (record) => `${record.source}\u0000${record.sourceIdentifier}`;
  const records = new Map(index.records.map((record) => [keyFor(record), record]));
  for (const identifier of deleted) records.delete(`${sourceId}\u0000${identifier}`);
  for (const record of incoming) records.set(keyFor(record), record);
  return [...records.values()];
}

module.exports = { emptyIndex, indexPath, readIndex, upsertRecords, writeIndex };
