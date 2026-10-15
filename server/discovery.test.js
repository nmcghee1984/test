const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test: nodeTest, after } = require("node:test");
const { isLoopbackHost, isSecureApiUrl } = require("../src/data/networkPolicy");
const {
  createRateLimiter,
  generateAnswer,
  isAllowedAssistantOrigin,
  isUofGSourceUrl,
  validateQuestion,
} = require("./assistant");

const previousDataDir = process.env.DATA_DIR;
const previousDelay = process.env.OAI_REQUEST_DELAY_MS;
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "uofg-life-discovery-"));
process.env.DATA_DIR = testDataDir;
process.env.OAI_REQUEST_DELAY_MS = "0";

const { getFormats, getIdentify, getPage, parseOaiXml, recordsFromResponse } = require("./oai");
const { activeSources, sourceById, sources } = require("./sources");
const { indexPath, readIndex, upsertRecords, writeIndex } = require("./store");
const { acquireLock, getFromDate, requestOai, runHarvest } = require("./harvest");
const { createServer, publicRecord } = require("./index");

let testQueue = Promise.resolve();
function test(name, run) {
  nodeTest(name, async (context) => {
    const current = testQueue.then(() => run(context));
    testQueue = current.catch(() => {});
    await current;
  });
}

const sampleRecord = (identifier, title, subject = "Climate research") => `
<record><header><identifier>${identifier}</identifier><datestamp>2025-06-03</datestamp></header>
<metadata><oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${title}</dc:title><dc:creator>Researcher One</dc:creator><dc:creator>Researcher Two</dc:creator>
<dc:subject>${subject}</dc:subject><dc:identifier>https://eprints.gla.ac.uk/id/eprint/123</dc:identifier>
</oai_dc:dc></metadata></record>`;

test("environment loader parses local settings and preserves existing process values", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "uofg-life-env-"));
  try {
    await fs.promises.writeFile(
      path.join(directory, ".env"),
      '# ignored\nNEW_TEST_ENV = "hello world"\nEXISTING_TEST_ENV=from-file\nmalformed\n',
      "utf8",
    );
    await fs.promises.writeFile(
      path.join(directory, ".env.server"),
      "SERVER_ONLY_TEST_ENV=server-secret\nEXISTING_TEST_ENV=server-file\n",
      "utf8",
    );
    const childEnvironment = { ...process.env, EXISTING_TEST_ENV: "preserved" };
    delete childEnvironment.NEW_TEST_ENV;
    const result = spawnSync(process.execPath, [
      "-e",
      "require(process.argv[1])(); console.log(JSON.stringify({ value: process.env.NEW_TEST_ENV, existing: process.env.EXISTING_TEST_ENV, serverOnly: process.env.SERVER_ONLY_TEST_ENV }))",
      path.resolve(__dirname, "env.js"),
    ], {
      cwd: directory,
      env: childEnvironment,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { value: "hello world", existing: "preserved", serverOnly: "server-secret" });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("network policy permits HTTPS or loopback-only development endpoints", () => {
  assert.equal(isSecureApiUrl("https://api.example.edu"), true);
  assert.equal(isSecureApiUrl("http://localhost:8787"), true);
  assert.equal(isSecureApiUrl("http://127.10.2.3:8787"), true);
  assert.equal(isSecureApiUrl("http://[::1]:8787"), true);
  assert.equal(isSecureApiUrl("http://192.168.1.20:8787"), false);
  assert.equal(isSecureApiUrl("http://example.edu"), false);
  assert.equal(isSecureApiUrl("https://user:pass@example.edu"), false);
  assert.equal(isSecureApiUrl("https://api.example.edu/api"), false);
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("::1"), true);
  assert.equal(isLoopbackHost("0.0.0.0"), false);
});

test("API host guard rejects public and LAN bind addresses", () => {
  const { assertLoopbackHost } = require("./index");
  assert.doesNotThrow(() => assertLoopbackHost("127.0.0.1"));
  assert.doesNotThrow(() => assertLoopbackHost("localhost"));
  assert.throws(() => assertLoopbackHost("0.0.0.0"), /must be a loopback address/);
  assert.throws(() => assertLoopbackHost("192.168.1.20"), /must be a loopback address/);
  const invalidBind = spawnSync(process.execPath, [path.resolve(__dirname, "index.js")], {
    env: { ...process.env, API_HOST: "0.0.0.0" },
    encoding: "utf8",
    timeout: 3000,
  });
  assert.notEqual(invalidBind.status, 0);
  assert.match(invalidBind.stderr, /API_HOST must be a loopback address/);
});

test("assistant origin allowlist rejects untrusted and malformed origins", () => {
  assert.equal(isAllowedAssistantOrigin("http://localhost:8084"), true);
  assert.equal(isAllowedAssistantOrigin("http://127.0.0.1:8093"), true);
  assert.equal(isAllowedAssistantOrigin("https://attacker.example"), false);
  assert.equal(isAllowedAssistantOrigin("null"), false);
  assert.equal(isAllowedAssistantOrigin("http://localhost:8084.evil.example"), false);
  assert.equal(isAllowedAssistantOrigin(undefined), true);
});

test("assistant validates bounded questions and limits repeated requests", () => {
  assert.equal(validateQuestion("  Where is the library?  "), "Where is the library?");
  assert.equal(validateQuestion(" "), null);
  assert.equal(validateQuestion("x".repeat(501)), null);
  assert.equal(validateQuestion({ question: "hi" }), null);
  let currentTime = 100;
  const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => currentTime });
  assert.equal(allow("127.0.0.1"), true);
  assert.equal(allow("127.0.0.1"), true);
  assert.equal(allow("127.0.0.1"), false);
  assert.equal(allow("::1"), true);
  currentTime += 1000;
  assert.equal(allow("127.0.0.1"), true);
});

test("assistant calls only the fixed OpenAI HTTPS endpoint and rejects unsafe upstream responses", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-server-only-secret";
  process.env.OPENAI_MODEL = "gpt-4.1-mini";
  try {
    let requestUrl;
    let requestOptions;
    const answer = await generateAnswer("Where can I find student support?", async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return new Response(JSON.stringify({ output: [
        {
          type: "message",
          role: "assistant",
          content: [{
            type: "output_text",
            text: "See the student support page.",
            annotations: [
              { type: "url_citation", title: "Student support", url: "https://www.gla.ac.uk/myglasgow/students/support/", start_index: 0, end_index: 29 },
            ],
          }],
        },
        {
          type: "web_search_call",
          action: { sources: [
            { title: "Student support", url: "https://www.gla.ac.uk/myglasgow/students/support/" },
            { title: "Outside domain", url: "https://attacker.example/fake" },
          ] },
        },
      ] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    assert.deepEqual(answer, {
      answer: "See the student support page.",
      status: "cited",
      serviceLinks: require("./assistant").withheld().serviceLinks,
      sources: [{ title: "www.gla.ac.uk/myglasgow/students/support/", url: "https://www.gla.ac.uk/myglasgow/students/support/" }],
    });
    assert.equal(requestUrl, "https://api.openai.com/v1/responses");
    assert.equal(requestOptions.method, "POST");
    assert.equal(requestOptions.headers.authorization, "Bearer test-server-only-secret");
    const requestBody = JSON.parse(requestOptions.body);
    assert.equal(requestBody.model, "gpt-4.1-mini");
    assert.equal(requestBody.input, "Where can I find student support?");
    assert.deepEqual(requestBody.tools[0].filters.allowed_domains, ["gla.ac.uk"]);
    assert.equal(requestBody.tool_choice, "required");
    assert.match(requestBody.instructions, /Answer University-specific questions only with information supported by those results/);
    assert.doesNotMatch(requestOptions.body, /test-server-only-secret/);

    assert.equal((await generateAnswer("question", async () => new Response(JSON.stringify({ output: [] }), { status: 200 }))).status, "unverified");
    await assert.rejects(
      generateAnswer("question", async () => new Response("", { status: 429 })),
      /temporarily busy/,
    );
    assert.equal(isUofGSourceUrl("https://www.gla.ac.uk/students/"), true);
    assert.equal(isUofGSourceUrl("https://gla.ac.uk.attacker.example/"), false);
    assert.equal(isUofGSourceUrl("http://www.gla.ac.uk/"), false);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
});

test("local AI HTTP route enforces origin, input, disabled-key, and preflight policies", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousOrigins = process.env.API_ALLOWED_ORIGINS;
  delete process.env.OPENAI_API_KEY;
  delete process.env.API_ALLOWED_ORIGINS;
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const statusResponse = await fetch(`${base}/api/assistant/status`, {
      headers: { origin: "http://localhost:8084" },
    });
    const status = await statusResponse.json();
    assert.equal(status.configured, false);
    assert.equal(status.provider, "OpenAI");
    assert.equal(statusResponse.headers.get("cache-control"), "no-store");
    assert.equal(statusResponse.headers.get("access-control-allow-origin"), "http://localhost:8084");

    const deniedOrigin = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ question: "hello" }),
    });
    assert.equal(deniedOrigin.status, 403);
    assert.equal(deniedOrigin.headers.get("access-control-allow-origin"), null);

    const deniedPreflight = await fetch(`${base}/api/assistant`, {
      method: "OPTIONS",
      headers: { origin: "https://attacker.example", "access-control-request-method": "POST" },
    });
    assert.equal(deniedPreflight.status, 403);

    const allowedPreflight = await fetch(`${base}/api/assistant`, {
      method: "OPTIONS",
      headers: { origin: "http://localhost:8084", "access-control-request-method": "POST" },
    });
    assert.equal(allowedPreflight.status, 204);
    assert.match(allowedPreflight.headers.get("access-control-allow-methods"), /POST/);

    const disabled = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "http://localhost:8084", "content-type": "application/json" },
      body: JSON.stringify({ question: "a confidential question" }),
    });
    assert.equal(disabled.status, 503);
    assert.doesNotMatch(await disabled.text(), /confidential question/);

    const invalidType = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "http://localhost:8084", "content-type": "text/plain" },
      body: "question",
    });
    assert.equal(invalidType.status, 415);

    const invalidQuestion = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "http://localhost:8084", "content-type": "application/json" },
      body: JSON.stringify({ question: "x".repeat(501) }),
    });
    assert.equal(invalidQuestion.status, 400);

    const oversized = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "http://localhost:8084", "content-type": "application/json" },
      body: JSON.stringify({ question: "x".repeat(3000) }),
    });
    assert.equal(oversized.status, 413);

    const malformedJson = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "http://localhost:8084", "content-type": "application/json" },
      body: "{",
    });
    assert.equal(malformedJson.status, 400);

    const rateLimited = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { origin: "http://localhost:8084", "content-type": "application/json" },
      body: JSON.stringify({ question: "hello" }),
    });
    assert.equal(rateLimited.status, 429);
    assert.doesNotMatch(await rateLimited.text(), /confidential question/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousOrigins === undefined) delete process.env.API_ALLOWED_ORIGINS;
    else process.env.API_ALLOWED_ORIGINS = previousOrigins;
  }
});

test("source registry exposes only its configured allowlist", () => {
  assert.deepEqual(activeSources().map((source) => source.id), ["enlighten-publications"]);
  assert.equal(sourceById("enlighten-publications"), sources[0]);
  assert.equal(sourceById("https://attacker.invalid"), undefined);
});

function response(xml) {
  return new Response(xml, { status: 200, headers: { "content-type": "text/xml; charset=utf-8" } });
}

after(() => {
  if (previousDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = previousDataDir;
  if (previousDelay === undefined) delete process.env.OAI_REQUEST_DELAY_MS;
  else process.env.OAI_REQUEST_DELAY_MS = previousDelay;
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test("parses OAI metadata fields, XML entities, and missing optional fields", () => {
  const source = sources[0];
  const xml = `<OAI-PMH><ListRecords>${sampleRecord("oai:test:1", "Glasgow &amp; climate", "Climate &amp; energy")}</ListRecords></OAI-PMH>`;
  const parsed = parseOaiXml(xml);
  const result = recordsFromResponse(parsed.root, source);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].title, "Glasgow & climate");
  assert.deepEqual(result.records[0].creators, ["Researcher One", "Researcher Two"]);
  assert.deepEqual(result.records[0].subjects, ["Climate & energy"]);
  assert.equal(result.records[0].description, undefined);
  assert.equal(result.records[0].publicationDate, undefined);
  assert.equal(result.records[0].recordUrl, "https://eprints.gla.ac.uk/id/eprint/123");
});

test("parses repository identify, metadata format, and attributed resumption token", () => {
  const identify = getIdentify(parseOaiXml("<OAI-PMH><Identify><repositoryName>Enlighten</repositoryName><granularity>YYYY-MM-DD</granularity><earliestDatestamp>2000-01-01</earliestDatestamp></Identify></OAI-PMH>").root);
  const formats = getFormats(parseOaiXml("<OAI-PMH><ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix></metadataFormat></ListMetadataFormats></OAI-PMH>").root);
  const page = getPage(parseOaiXml("<OAI-PMH><ListRecords><resumptionToken cursor=\"2\" completeListSize=\"7\">continue-here</resumptionToken></ListRecords></OAI-PMH>").root);
  assert.equal(identify.repositoryName, "Enlighten");
  assert.deepEqual(formats, ["oai_dc"]);
  assert.deepEqual(page, { token: "continue-here", cursor: "2" });
});

test("incremental harvest dates respect repository timestamp granularity and overlap", () => {
  assert.equal(getFromDate({ lastSuccessAt: "2025-06-10T13:14:15.000Z" }, "YYYY-MM-DDThh:mm:ssZ"), "2025-06-08T13:14:15Z");
  assert.equal(getFromDate({ lastSuccessAt: "2025-06-10T00:00:00.000Z" }, "YYYY-MM-DD"), "2025-06-08");
  assert.equal(getFromDate({}, "YYYY-MM-DD"), null);
});

test("rejects malformed XML and document type declarations", () => {
  assert.throws(() => parseOaiXml("<OAI-PMH><Identify></OAI-PMH>"), /Invalid OAI-PMH XML/);
  assert.throws(() => parseOaiXml('<!DOCTYPE x [<!ENTITY e "bad">]><OAI-PMH/>'), /forbidden document type/);
  assert.throws(() => parseOaiXml("<html/>"), /root was missing/);
});

test("handles standard OAI errors, noRecordsMatch, CDATA and unqualified repository responses", () => {
  const noRecords = parseOaiXml('<OAI-PMH><error code="noRecordsMatch">No records match the request.</error></OAI-PMH>');
  assert.equal(noRecords.noRecordsMatch, true);
  assert.throws(
    () => parseOaiXml('<OAI-PMH><error code="badVerb">Illegal OAI verb.</error></OAI-PMH>'),
    /OAI-PMH badVerb: Illegal OAI verb/,
  );
  const source = sources[0];
  const parsed = parseOaiXml(`<OAI-PMH><ListRecords>${sampleRecord("oai:test:cdata", "<![CDATA[Glasgow record]]>")}</ListRecords></OAI-PMH>`);
  assert.equal(recordsFromResponse(parsed.root, source).records[0].title, "Glasgow record");
  assert.deepEqual(
    recordsFromResponse(parseOaiXml(`<OAI-PMH><ListRecords><record><header><identifier>oai:test:no-metadata</identifier></header></record></ListRecords></OAI-PMH>`).root, source),
    { records: [], deleted: [] },
  );
});

test("OAI request retries transient status and network failures, but not permanent failures", async () => {
  let attempts = 0;
  const successfulXml = "<OAI-PMH><Identify><repositoryName>Test</repositoryName></Identify></OAI-PMH>";
  const result = await requestOai(sources[0], { verb: "Identify" }, {
    wait: async () => {},
    fetchImpl: async () => {
      attempts += 1;
      return attempts < 3
        ? new Response("temporarily unavailable", { status: 503 })
        : new Response(successfulXml, { status: 200 });
    },
  });
  assert.equal(attempts, 3);
  assert.equal(getIdentify(result.root).repositoryName, "Test");

  attempts = 0;
  await assert.rejects(requestOai(sources[0], { verb: "Identify" }, {
    wait: async () => {},
    fetchImpl: async () => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    },
  }), /HTTP 404/);
  assert.equal(attempts, 1);

  attempts = 0;
  const networkResult = await requestOai(sources[0], { verb: "Identify" }, {
    wait: async () => {},
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("temporary network failure");
      return new Response(successfulXml, { status: 200 });
    },
  });
  assert.equal(attempts, 2);
  assert.equal(getIdentify(networkResult.root).repositoryName, "Test");

  let retryPause = 0;
  attempts = 0;
  const throttled = await requestOai(sources[0], { verb: "Identify" }, {
    wait: async (milliseconds) => { retryPause = milliseconds; },
    fetchImpl: async () => attempts++ < 2
      ? new Response("slow down", { status: 429, headers: { "retry-after": "2" } })
      : new Response(successfulXml, { status: 200 }),
  });
  assert.equal(retryPause, 2000);
  assert.equal(getIdentify(throttled.root).repositoryName, "Test");
});

test("OAI request enforces response-size and timeout limits", async () => {
  const xml = "<OAI-PMH><Identify><repositoryName>Large response</repositoryName></Identify></OAI-PMH>";
  await assert.rejects(requestOai(sources[0], { verb: "Identify" }, {
    responseLimit: 16,
    fetchImpl: async () => new Response(xml, { status: 200 }),
  }), /exceeds the 16-byte limit/);
  await assert.rejects(requestOai(sources[0], { verb: "Identify" }, {
    responseLimit: 16,
    fetchImpl: async () => new Response(xml, { status: 200, headers: { "content-length": "100" } }),
  }), /exceeds the 16-byte limit/);

  await assert.rejects(requestOai(sources[0], { verb: "Identify" }, {
    timeoutMs: 5,
    attempts: 1,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    }),
  }), /timed out after 5 ms/);
});

test("index reads reject corrupt JSON, unsupported schemas, and malformed records", async () => {
  const file = indexPath();
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, "{not-json", "utf8");
  await assert.rejects(readIndex(), SyntaxError);
  await fs.promises.writeFile(file, JSON.stringify({ schemaVersion: 9, records: [], sources: {} }), "utf8");
  await assert.rejects(readIndex(), /unsupported format/);
  await fs.promises.writeFile(file, JSON.stringify({ schemaVersion: 1, records: [{ title: "incomplete" }], sources: {} }), "utf8");
  await assert.rejects(readIndex(), /unsupported format/);
  await fs.promises.writeFile(file, JSON.stringify({ schemaVersion: 1, records: [], sources: null }), "utf8");
  await assert.rejects(readIndex(), /unsupported format/);
  await writeIndex({ schemaVersion: 1, records: [], sources: {}, updatedAt: null, coverage: "test" });
  assert.equal((await readIndex()).records.length, 0);
});

test("concurrent index updates serialize into a valid replaceable file", async () => {
  const writes = Array.from({ length: 12 }, (_, item) => writeIndex({
    schemaVersion: 1,
    records: [],
    sources: {},
    updatedAt: new Date(Date.UTC(2025, 0, item + 1)).toISOString(),
    coverage: `writer-${item}`,
  }));
  await Promise.all(writes);
  const index = await readIndex();
  assert.equal(index.schemaVersion, 1);
  assert.equal(index.records.length, 0);
  assert.match(index.coverage, /^writer-\d+$/);
  await assert.doesNotReject(writeIndex({ ...index, coverage: "replacement-completed" }));
  assert.equal((await readIndex()).coverage, "replacement-completed");
});

test("harvest lock rejects concurrent runs and can be released", async () => {
  const release = await acquireLock();
  await assert.rejects(acquireLock(), /A harvest is already running/);
  await release();
  const releaseAgain = await acquireLock();
  await releaseAgain();
});

test("handles deleted records and de-duplicates by source and OAI identifier", () => {
  const parsed = parseOaiXml(`<OAI-PMH><ListRecords>
    ${sampleRecord("oai:test:1", "Old title")}
    <record><header status="deleted"><identifier>oai:test:gone</identifier></header></record>
  </ListRecords></OAI-PMH>`);
  const incoming = recordsFromResponse(parsed.root, sources[0]);
  assert.deepEqual(incoming.deleted, ["oai:test:gone"]);
  const old = { source: sources[0].id, sourceIdentifier: "oai:test:1", title: "Old" };
  const index = { records: [old] };
  const updated = upsertRecords(index, sources[0].id, [{ ...old, title: "New" }], ["oai:test:gone"]);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].title, "New");
});

test("bounded harvest follows resumption tokens and persists complete pages", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed.searchParams.get("verb") === "ListRecords"
      ? `${parsed.searchParams.get("verb")}:${parsed.searchParams.get("resumptionToken") ?? "first"}`
      : parsed.searchParams.get("verb"));
    switch (calls[calls.length - 1]) {
      case "Identify":
        return response("<OAI-PMH><Identify><repositoryName>Enlighten</repositoryName><granularity>YYYY-MM-DD</granularity><earliestDatestamp>2000-01-01</earliestDatestamp></Identify></OAI-PMH>");
      case "ListMetadataFormats":
        return response("<OAI-PMH><ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix></metadataFormat></ListMetadataFormats></OAI-PMH>");
      case "ListRecords:first":
        return response(`<OAI-PMH><ListRecords>${sampleRecord("oai:test:one", "First record")}<resumptionToken cursor="0" completeListSize="2">page-two</resumptionToken></ListRecords></OAI-PMH>`);
      case "ListRecords:page-two":
        return response(`<OAI-PMH><ListRecords>${sampleRecord("oai:test:two", "Second record")}<resumptionToken/></ListRecords></OAI-PMH>`);
      default:
        throw new Error(`Unexpected OAI request: ${parsed}`);
    }
  };
  try {
    const result = await runHarvest();
    const index = await readIndex();
    assert.deepEqual(calls, ["Identify", "ListMetadataFormats", "ListRecords:first", "ListRecords:page-two"]);
    assert.equal(result.results[0].mode, "LIVE");
    assert.equal(result.results[0].imported, 2);
    assert.equal(index.records.length, 2);
    assert.equal(index.sources[sources[0].id].pages, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("record and page limits stop pagination and explicitly report remaining source data", async () => {
  const requests = [];
  const fixtureRequest = async (_source, params) => {
    requests.push({ ...params });
    if (params.verb === "Identify") {
      return parseOaiXml("<OAI-PMH><Identify><repositoryName>Enlighten</repositoryName><granularity>YYYY-MM-DD</granularity></Identify></OAI-PMH>");
    }
    if (params.verb === "ListMetadataFormats") {
      return parseOaiXml("<OAI-PMH><ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix></metadataFormat></ListMetadataFormats></OAI-PMH>");
    }
    return parseOaiXml(`<OAI-PMH><ListRecords>
      ${sampleRecord("oai:test:bounded-1", "First bounded record")}
      ${sampleRecord("oai:test:bounded-2", "Second bounded record")}
      <resumptionToken>more-records</resumptionToken>
    </ListRecords></OAI-PMH>`);
  };
  await writeIndex({ schemaVersion: 1, records: [], sources: {}, updatedAt: null, coverage: "" });
  const result = await runHarvest({
    sources: [sources[0]],
    maxRecords: 1,
    maxPages: 1,
    requestOai: fixtureRequest,
    requestDelayMs: 0,
  });
  const index = await readIndex();
  assert.deepEqual(requests.map((item) => item.verb), ["Identify", "ListMetadataFormats", "ListRecords"]);
  assert.equal(result.results[0].imported, 1);
  assert.equal(index.records.length, 1);
  assert.equal(index.sources[sources[0].id].hasMore, true);
  assert.equal(index.sources[sources[0].id].boundedImport, true);
});

test("incremental harvest applies overlap dates, updates records, and removes tombstones", async () => {
  const sourceId = sources[0].id;
  const oldRecord = {
    id: `${sourceId}:oai:test:update`,
    source: sourceId,
    sourceIdentifier: "oai:test:update",
    title: "Old title",
    creators: [],
    subjects: [],
    recordUrl: sources[0].homepage,
    rights: [],
    fetchedAt: "2025-01-01T00:00:00.000Z",
  };
  const deletedRecord = { ...oldRecord, id: `${sourceId}:oai:test:deleted`, sourceIdentifier: "oai:test:deleted", title: "Deleted" };
  const otherSourceRecord = { ...oldRecord, id: "other:preserved", source: "other", sourceIdentifier: "oai:test:other" };
  await writeIndex({
    schemaVersion: 1,
    records: [oldRecord, deletedRecord, otherSourceRecord],
    sources: { [sourceId]: { lastSuccessAt: "2025-06-10T13:14:15.000Z", recordCount: 2 } },
    updatedAt: null,
    coverage: "",
  });
  const requests = [];
  const fixtureRequest = async (_source, params) => {
    requests.push({ ...params });
    if (params.verb === "Identify") {
      return parseOaiXml("<OAI-PMH><Identify><repositoryName>Enlighten</repositoryName><granularity>YYYY-MM-DD</granularity></Identify></OAI-PMH>");
    }
    if (params.verb === "ListMetadataFormats") {
      return parseOaiXml("<OAI-PMH><ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix></metadataFormat></ListMetadataFormats></OAI-PMH>");
    }
    return parseOaiXml(`<OAI-PMH><ListRecords>
      ${sampleRecord("oai:test:update", "Updated title")}
      <record><header status="deleted"><identifier>oai:test:deleted</identifier></header></record>
    </ListRecords></OAI-PMH>`);
  };
  await runHarvest({
    sources: [sources[0]],
    requestOai: fixtureRequest,
    requestDelayMs: 0,
  });
  const index = await readIndex();
  const listRequest = requests.find((item) => item.verb === "ListRecords");
  assert.equal(listRequest.from, "2025-06-08");
  assert.equal(index.records.find((record) => record.sourceIdentifier === "oai:test:update").title, "Updated title");
  assert.equal(index.records.some((record) => record.sourceIdentifier === "oai:test:deleted"), false);
  assert.equal(index.records.some((record) => record.id === "other:preserved"), true);
});

test("a failed later page preserves the prior complete source index", async () => {
  const originalFetch = global.fetch;
  const index = await readIndex();
  const oldRecords = index.records.filter((record) => record.source === sources[0].id);
  const retained = { ...oldRecords[0], title: "Previously indexed record" };
  index.records = [retained];
  index.sources[sources[0].id] = {
    ...index.sources[sources[0].id],
    recordCount: 1,
    lastSuccessAt: "2025-01-01T00:00:00.000Z",
  };
  await writeIndex(index);

  let listRecordsCalls = 0;
  global.fetch = async (url) => {
    const verb = new URL(url).searchParams.get("verb");
    if (verb === "Identify") {
      return response("<OAI-PMH><Identify><repositoryName>Enlighten</repositoryName><granularity>YYYY-MM-DD</granularity></Identify></OAI-PMH>");
    }
    if (verb === "ListMetadataFormats") {
      return response("<OAI-PMH><ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix></metadataFormat></ListMetadataFormats></OAI-PMH>");
    }
    listRecordsCalls += 1;
    if (listRecordsCalls === 1) {
      return response(`<OAI-PMH><ListRecords>${sampleRecord("oai:test:partial", "Must not be committed")}<resumptionToken>next</resumptionToken></ListRecords></OAI-PMH>`);
    }
    throw new Error("Fixture failed on continuation page.");
  };
  try {
    const result = await runHarvest();
    const afterFailure = await readIndex();
    assert.equal(result.results[0].mode, "CACHED");
    assert.equal(afterFailure.records.length, 1);
    assert.equal(afterFailure.records[0].title, "Previously indexed record");
    assert.equal(afterFailure.sources[sources[0].id].lastSuccessAt, "2025-01-01T00:00:00.000Z");
    assert.match(afterFailure.sources[sources[0].id].lastError, /Fixture failed/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("API reports source status, searches safely, and validates filters and cursors", async () => {
  const index = await readIndex();
  const sourceId = sources[0].id;
  index.records[0] = {
    ...index.records[0],
    recordUrl: "https://untrusted.example/record",
  };
  const apiRecord = {
    id: `${sourceId}:api-record`,
    source: sourceId,
    sourceIdentifier: "oai:test:api-record",
    sourceName: sources[0].name,
    sourceHomepage: sources[0].homepage,
    title: "Second safe record",
    creators: [],
    subjects: ["Climate"],
    recordUrl: "https://eprints.gla.ac.uk/id/eprint/567",
    rights: [],
    fetchedAt: "2025-01-01T00:00:00.000Z",
  };
  index.records = [
    { ...apiRecord, id: `${sourceId}:unsafe`, sourceIdentifier: "oai:test:unsafe", title: "Unsafe", recordUrl: "https://untrusted.example/record" },
    apiRecord,
    ...Array.from({ length: 30 }, (_, item) => ({
      ...apiRecord,
      id: `${sourceId}:page-${item}`,
      sourceIdentifier: `oai:test:page-${item}`,
      title: `Second batch item ${item}`,
    })),
  ];
  index.sources[sourceId] = {
    ...index.sources[sourceId],
    recordCount: index.records.length,
    lastSuccessAt: "2025-01-01T00:00:00.000Z",
    lastError: null,
  };
  await writeIndex(index);
  assert.equal(publicRecord(index.records[0], index), null);
  assert.equal(publicRecord({ ...index.records[0], recordUrl: "https://user:password@eprints.gla.ac.uk/record" }, index), null);
  assert.equal(publicRecord({ ...index.records[0], recordUrl: "https://eprints.gla.ac.uk:8443/record" }, index), null);

  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const statusResponse = await fetch(`${base}/api/integrations/status`);
    const status = await statusResponse.json();
    assert.equal(statusResponse.status, 200);
    assert.equal(status.sources[0].mode, "CACHED");
    assert.equal(status.recordCount, 32);

    const searchResponse = await fetch(`${base}/api/discover?q=Second`);
    const search = await searchResponse.json();
    assert.equal(searchResponse.status, 200);
    assert.equal(search.records.length, 25);
    assert.equal(search.total, 31);
    assert.equal(search.nextCursor, "25");
    assert.equal(search.records[0].mode, "CACHED");
    assert.equal(search.mode, "CACHED");
    const nextPage = await (await fetch(`${base}/api/discover?q=Second&cursor=${search.nextCursor}`)).json();
    assert.equal(nextPage.records.length, 6);
    assert.equal(nextPage.nextCursor, null);
    assert.equal(new Set([...search.records, ...nextPage.records].map((item) => item.id)).size, 31);
    const unavailable = await (await fetch(`${base}/api/discover?source=edshare`)).json();
    assert.equal(unavailable.mode, "UNAVAILABLE");
    assert.equal(unavailable.total, 0);

    assert.equal((await fetch(`${base}/api/discover?source=not-a-source`)).status, 400);
    assert.equal((await fetch(`${base}/api/discover?cursor=-1`)).status, 400);
    assert.equal((await fetch(`${base}/api/discover?q=${"x".repeat(201)}`)).status, 400);
    assert.equal((await fetch(`${base}/private`)).status, 404);
    assert.equal((await fetch(`${base}/api/discover`, { method: "POST" })).status, 405);
    const preflight = await fetch(`${base}/api/discover`, { method: "OPTIONS" });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
