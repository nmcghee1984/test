const path = require("node:path");
process.env.DATA_DIR = path.join(process.cwd(), "data", "e2e-playwright");
process.env.API_HOST = "127.0.0.1";
process.env.API_PORT = "8789";

const { createServer } = require("./index");
const { sources } = require("./sources");
const { writeIndex } = require("./store");
const source = sources[0];

const records = Array.from({ length: 30 }, (_, index) => ({
  id: `${source.id}:e2e-${index}`,
  source: source.id,
  sourceIdentifier: `oai:e2e:${index}`,
  title: index === 0 ? "University research example 0: Climate resilience across Glasgow campuses" : `University research example ${index}`,
  creators: [index === 0 ? "Glasgow Research Group" : `Researcher ${index}`],
  subjects: index === 0 ? ["Climate adaptation", "Urban resilience"] : [`Subject ${index}`],
  ...(index === 0 ? { description: "A public metadata example about climate resilience in Glasgow." } : {}),
  publicationDate: "2025",
  datePrecision: "as-supplied",
  recordUrl: `https://eprints.gla.ac.uk/id/eprint/${1000 + index}`,
  rights: ["Public metadata"],
  accessStatement: "Public metadata",
  fetchedAt: new Date(Date.UTC(2025, 0, 30 - index)).toISOString(),
}));

async function main() {
  await writeIndex({
    schemaVersion: 1,
    records,
    sources: {
      [source.id]: {
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        lastError: null,
        metadataPrefix: "oai_dc",
        granularity: "YYYY-MM-DD",
        boundedImport: true,
        hasMore: true,
        recordCount: records.length,
      },
    },
    updatedAt: new Date().toISOString(),
    coverage: "Deterministic Playwright fixture; not University repository content.",
  });

  const server = createServer();
  server.listen(Number(process.env.API_PORT), process.env.API_HOST, () => {
    console.log(`E2E fixture API listening on http://${process.env.API_HOST}:${process.env.API_PORT}.`);
  });
  const shutdown = () => server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Could not start the Playwright fixture API.", error);
  process.exitCode = 1;
});
