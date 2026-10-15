const http = require("node:http");
require("./env")();
const { publicSource, sources } = require("./sources");
const { readIndex } = require("./store");
const { isLoopbackHost } = require("../src/data/networkPolicy");
const {
  createRateLimiter,
  generateAnswer,
  isAllowedAssistantOrigin,
  readJsonBody,
  validateQuestion,
} = require("./assistant");

const PORT = Number(process.env.API_PORT || 8787);
const HOST = process.env.API_HOST || "127.0.0.1";
const PAGE_SIZE = 25;

function json(response, status, value, { origin = "*", cacheControl = "public, max-age=30" } = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "x-content-type-options": "nosniff",
  };
  if (origin) headers["access-control-allow-origin"] = origin;
  if (origin !== "*") headers.vary = "Origin";
  response.writeHead(status, headers);
  response.end(JSON.stringify(value));
}

function publicRecord(record, index) {
  const source = sources.find((item) => item.id === record.source);
  if (!source) return null;
  let url;
  try {
    url = new URL(record.recordUrl);
  } catch {
    return null;
  }
  const allowedHost = new URL(source.homepage).hostname;
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || !(url.hostname === allowedHost || url.hostname.endsWith(`.${allowedHost}`))
  ) {
    return null;
  }
  return {
    ...record,
    sourceName: source.name,
    sourceHomepage: source.homepage,
    mode: "CACHED",
  };
}

function searchRecords(index, query) {
  const q = (query.q ?? "").trim().slice(0, 200).toLocaleLowerCase();
  const source = query.source ?? "";
  const records = index.records
    .filter((record) => !source || record.source === source)
    .map((record) => publicRecord(record, index))
    .filter(Boolean)
    .map((record) => {
      const fields = [
        record.title,
        ...record.creators,
        ...record.subjects,
        record.description ?? "",
      ];
      const normalized = fields.join(" ").toLocaleLowerCase();
      const matched = q ? normalized.includes(q) : true;
      const titleMatch = q && record.title.toLocaleLowerCase().includes(q);
      return { record, matched, titleMatch: Boolean(titleMatch) };
    })
    .filter((item) => item.matched)
    .sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch)
      || (b.record.fetchedAt ?? "").localeCompare(a.record.fetchedAt ?? ""))
    .map((item) => item.record);
  const start = Number(query.cursor ?? 0);
  if (!Number.isSafeInteger(start) || start < 0 || start > records.length) {
    throw new Error("cursor must be a non-negative result offset.");
  }
  return {
    records: records.slice(start, start + PAGE_SIZE),
    total: records.length,
    nextCursor: start + PAGE_SIZE < records.length ? String(start + PAGE_SIZE) : null,
    query: q,
    source: source || null,
    coverage: index.coverage,
    indexUpdatedAt: index.updatedAt,
  };
}

function createServer() {
  const authorize = require("./deviceAccess").deviceAccess();
  const allowAssistantRequest = createRateLimiter({ limit: 5, windowMs: 60_000 });
  return http.createServer(async (request, response) => {
    if (!authorize(request)) {
      json(response, 403, { error: "Device access denied. Check Tailscale and API_TESTER_LOGINS." }, { origin: null, cacheControl: "no-store" });
      return;
    }
    let url;
    try {
      url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    } catch {
      json(response, 400, { error: "Invalid request URL." });
      return;
    }

    const origin = request.headers.origin;
    const assistantRoute = url.pathname === "/api/assistant" || url.pathname === "/api/assistant/status";
    if (request.method === "OPTIONS") {
      if (assistantRoute) {
        if (!isAllowedAssistantOrigin(origin)) {
          response.writeHead(403, { "cache-control": "no-store", vary: "Origin" });
          response.end();
          return;
        }
        response.writeHead(204, {
          "access-control-allow-origin": origin || "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "600",
          "cache-control": "no-store",
          vary: "Origin",
        });
      } else {
        response.writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "600",
        });
      }
      response.end();
      return;
    }

    try {
      if (url.pathname === "/api/assistant/status" && request.method === "GET") {
        const allowed = isAllowedAssistantOrigin(origin);
        json(response, allowed ? 200 : 403, {
          configured: Boolean(process.env.OPENAI_API_KEY),
          provider: "OpenAI",
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        }, { origin: allowed ? origin || "*" : null, cacheControl: "no-store" });
        return;
      }

      if (url.pathname === "/api/assistant" && request.method === "POST") {
        const allowed = isAllowedAssistantOrigin(origin);
        if (!allowed) {
          json(response, 403, { error: "This app origin is not allowed to use the local AI service." }, {
            origin: null,
            cacheControl: "no-store",
          });
          return;
        }
        if (!allowAssistantRequest(request.socket.remoteAddress || "unknown")) {
          json(response, 429, { error: "Too many questions. Please wait a minute before trying again." }, {
            origin: origin || "*",
            cacheControl: "no-store",
          });
          return;
        }
        if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
          json(response, 415, { error: "Content-Type must be application/json." }, {
            origin: origin || "*",
            cacheControl: "no-store",
          });
          return;
        }
        try {
          const body = await readJsonBody(request);
          const question = validateQuestion(body?.question);
          if (!question) {
            json(response, 400, { error: "Question must be between 1 and 500 characters." }, {
              origin: origin || "*",
              cacheControl: "no-store",
            });
            return;
          }
          const answer = await generateAnswer(question);
          json(response, 200, answer, { origin: origin || "*", cacheControl: "no-store" });
        } catch (error) {
          const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
          if (status >= 500) console.error("Local AI request failed.", status);
          json(response, status, {
            error: status === 500 ? "The local AI service is temporarily unavailable." : error.message,
          }, { origin: origin || "*", cacheControl: "no-store" });
        }
        return;
      }

      if (request.method !== "GET") {
        json(response, 405, { error: "Method not allowed." });
        return;
      }
      if (url.pathname === "/api/health") {
        json(response, 200, { status: "ok", mode: "LIVE", timestamp: new Date().toISOString() });
        return;
      }
      const index = await readIndex();
      if (url.pathname === "/api/integrations/status") {
        json(response, 200, {
          sources: sources.map((source) => publicSource(source, index.sources[source.id] ?? {})),
          indexUpdatedAt: index.updatedAt,
          recordCount: index.records.length,
          coverage: index.coverage,
        });
        return;
      }
      if (url.pathname === "/api/discover") {
        const source = url.searchParams.get("source");
        const query = url.searchParams.get("q") ?? "";
        if (query.length > 200) {
          json(response, 400, { error: "Search text must be 200 characters or fewer." });
          return;
        }
        if (source && !sources.some((item) => item.id === source)) {
          json(response, 400, { error: "Unknown source filter." });
          return;
        }
        let result;
        try {
          result = searchRecords(index, {
            q: query,
            source,
            cursor: url.searchParams.get("cursor") ?? "0",
          });
        } catch (error) {
          json(response, 400, { error: error instanceof Error ? error.message : "Invalid search request." });
          return;
        }
        const relevantSources = sources.filter((item) => !source || item.id === source);
        const hasCachedIndex = relevantSources.some((item) => (index.sources[item.id]?.recordCount ?? 0) > 0);
        const mode = hasCachedIndex ? "CACHED" : "UNAVAILABLE";
        json(response, 200, { ...result, mode });
        return;
      }
      json(response, 404, { error: "Not found." });
    } catch (error) {
      console.error("Public discovery API request failed.", error);
      json(response, 500, { error: "Discovery data is temporarily unavailable." });
    }
  });
}

function assertLoopbackHost(host) {
  if (!isLoopbackHost(host)) {
    throw new Error("API_HOST must be a loopback address. For device testing, use an HTTPS tunnel with access controls to forward to 127.0.0.1.");
  }
}

if (require.main === module) {
  assertLoopbackHost(HOST);
  createServer().listen(PORT, HOST, () => {
    console.log(`UofG Life public discovery API listening on http://${HOST}:${PORT}.`);
  });
}

module.exports = { assertLoopbackHost, createServer, publicRecord, searchRecords };
