require("./env")();
const { setTimeout: wait } = require("node:timers/promises");
const { getFormats, getIdentify, getPage, parseOaiXml, recordsFromResponse } = require("./oai");
const { activeSources } = require("./sources");
const { indexPath, readIndex, upsertRecords, writeIndex } = require("./store");
const fs = require("node:fs/promises");

const PAGE_SIZE_LIMIT = 8 * 1024 * 1024;
function integerSetting(name, fallback, { minimum = 1, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

const REQUEST_TIMEOUT_MS = integerSetting("OAI_TIMEOUT_MS", 20000, { maximum: 120000 });
const RESPONSE_LIMIT = integerSetting("OAI_MAX_RESPONSE_BYTES", PAGE_SIZE_LIMIT, { maximum: 64 * 1024 * 1024 });
const MAX_RECORDS = integerSetting("OAI_MAX_RECORDS", 250, { maximum: 5000 });
const REQUEST_DELAY_MS = integerSetting("OAI_REQUEST_DELAY_MS", 1000, { minimum: 0, maximum: 60000 });
const OVERLAP_DAYS = integerSetting("OAI_OVERLAP_DAYS", 2, { minimum: 0, maximum: 365 });
const MAX_PAGES = integerSetting("OAI_MAX_PAGES", 20, { maximum: 500 });

function formatFromDate(date, granularity) {
  if (granularity === "YYYY-MM-DD") return date.toISOString().slice(0, 10);
  if (granularity === "YYYY-MM-DDThh:mm:ssZ") return date.toISOString().replace(/\.\d{3}Z$/, "Z");
  throw new Error(`Unsupported OAI-PMH datestamp granularity: ${granularity || "missing"}`);
}

function getFromDate(sourceState, granularity) {
  if (!sourceState.lastSuccessAt) return null;
  const lastSuccess = new Date(sourceState.lastSuccessAt);
  if (Number.isNaN(lastSuccess.getTime())) return null;
  lastSuccess.setUTCDate(lastSuccess.getUTCDate() - OVERLAP_DAYS);
  return formatFromDate(lastSuccess, granularity);
}

async function readLimited(response, maxBytes) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`OAI-PMH response exceeds the ${maxBytes}-byte limit.`);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`OAI-PMH response exceeds the ${maxBytes}-byte limit.`);
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(joined);
}

function retryDelay(response, attempt) {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 250), 10000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 250), 10000);
  }
  return Math.min(500 * (2 ** attempt), 4000);
}

async function requestOai(source, params, options = {}) {
  const url = new URL(source.endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const responseLimit = options.responseLimit ?? RESPONSE_LIMIT;
  const fetchImpl = options.fetchImpl ?? fetch;
  const pause = options.wait ?? wait;
  const attempts = options.attempts ?? 3;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { accept: "application/xml,text/xml;q=0.9" },
        signal: controller.signal,
      });
      if (!response.ok) {
        const transient = response.status === 429 || response.status >= 500;
        if (transient && attempt < attempts - 1) {
          await response.body?.cancel();
          await pause(retryDelay(response, attempt));
          continue;
        }
        throw new Error(`OAI-PMH request returned HTTP ${response.status}.`);
      }
      return parseOaiXml(await readLimited(response, responseLimit));
    } catch (error) {
      lastError = error;
      const transient = error?.name === "AbortError" || error instanceof TypeError;
      if (!transient || attempt === attempts - 1) {
        if (error?.name === "AbortError") {
          throw new Error(`OAI-PMH request timed out after ${timeoutMs} ms.`);
        }
        throw error;
      }
      await pause(retryDelay(response, attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("OAI-PMH request failed.");
}

async function acquireLock() {
  const lockPath = `${indexPath()}.lock`;
  await fs.mkdir(require("node:path").dirname(lockPath), { recursive: true });
  try {
    const handle = await fs.open(lockPath, "wx", 0o600);
    await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return async () => {
      await handle.close();
      try {
        await fs.unlink(lockPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    };
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("A harvest is already running.");
    throw error;
  }
}

async function harvestOne(source, index, options = {}) {
  const request = options.requestOai ?? requestOai;
  const pause = options.wait ?? wait;
  const requestDelayMs = options.requestDelayMs ?? REQUEST_DELAY_MS;
  const maxRecords = options.maxRecords ?? MAX_RECORDS;
  const maxPages = options.maxPages ?? MAX_PAGES;
  const sourceState = index.sources[source.id] ?? {};
  const startedAt = new Date().toISOString();
  index.sources[source.id] = { ...sourceState, lastAttemptAt: startedAt, lastError: null };
  await writeIndex(index);

  try {
    const identified = await request(source, { verb: "Identify" });
    const identify = getIdentify(identified.root);
    if (requestDelayMs > 0) await pause(requestDelayMs);

    const formatsResponse = await request(source, { verb: "ListMetadataFormats" });
    const formats = getFormats(formatsResponse.root);
    if (!formats.includes("oai_dc")) {
      throw new Error("Source does not advertise the required oai_dc metadata format.");
    }

    const from = getFromDate(sourceState, identify.granularity);
    let params = { verb: "ListRecords", metadataPrefix: "oai_dc" };
    if (from) params.from = from;

    let imported = 0;
    let pages = 0;
    let deleted = [];
    let token = "";
    let stagedRecords = index.records;
    while (pages < maxPages && imported < maxRecords) {
      if (requestDelayMs > 0) await pause(requestDelayMs);
      const page = await request(source, params);
      pages += 1;
      if (page.noRecordsMatch) break;
      const batch = recordsFromResponse(page.root, source);
      deleted = deleted.concat(batch.deleted);
      const remaining = maxRecords - imported;
      const boundedRecords = batch.records.slice(0, remaining);
      stagedRecords = upsertRecords({ ...index, records: stagedRecords }, source.id, boundedRecords, batch.deleted);
      imported += boundedRecords.length;
      const continuation = getPage(page.root);
      token = continuation.token;
      if (!token) break;
      params = { verb: "ListRecords", resumptionToken: token };
    }

    const hasMore = Boolean(token) && (pages >= maxPages || imported >= maxRecords);
    const completedAt = new Date().toISOString();
    index.records = stagedRecords;
    const recordCount = index.records.filter((record) => record.source === source.id).length;
    index.sources[source.id] = {
      ...index.sources[source.id],
      lastAttemptAt: startedAt,
      lastSuccessAt: completedAt,
      lastError: null,
      repositoryName: identify.repositoryName || source.name,
      granularity: identify.granularity,
      earliestDatestamp: identify.earliestDatestamp,
      metadataPrefix: "oai_dc",
      recordCount,
      lastRunImported: imported,
      lastRunDeleted: deleted.length,
      pages,
      boundedImport: !from || hasMore,
      hasMore,
      lastHarvestAt: completedAt,
    };
    index.updatedAt = completedAt;
    await writeIndex(index);
    return { source: source.id, mode: "LIVE", imported, deleted: deleted.length, recordCount, pages, bounded: !from || hasMore };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown OAI-PMH error.";
    index.sources[source.id] = {
      ...index.sources[source.id],
      lastAttemptAt: startedAt,
      lastError: message,
      recordCount: index.records.filter((record) => record.source === source.id).length,
    };
    await writeIndex(index);
    return {
      source: source.id,
      mode: index.sources[source.id].recordCount ? "CACHED" : "UNAVAILABLE",
      imported: 0,
      deleted: 0,
      recordCount: index.sources[source.id].recordCount,
      error: message,
    };
  }
}

async function runHarvest(options = {}) {
  const releaseLock = await acquireLock();
  try {
    const index = await readIndex();
    const results = [];
    const enabled = options.sources ?? activeSources();
    for (const source of enabled) {
      results.push(await harvestOne(source, index, options));
    }
    index.coverage = `Bounded OAI-PMH harvest${enabled.length > 1 ? " across enabled sources" : " from enabled sources"}; up to ${options.maxRecords ?? MAX_RECORDS} records per source in each run. Search covers only imported metadata, not full text or the complete university repositories.`;
    index.updatedAt = new Date().toISOString();
    await writeIndex(index);
    return { completedAt: index.updatedAt, results };
  } finally {
    await releaseLock();
  }
}

if (require.main === module) {
  runHarvest().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (result.results.every((item) => item.mode === "UNAVAILABLE")) process.exitCode = 1;
  }).catch((error) => {
    console.error(`Harvest failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

module.exports = { acquireLock, formatFromDate, getFromDate, harvestOne, readLimited, requestOai, runHarvest };
