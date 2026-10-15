require("./env")();
const { getFormats, getIdentify, getPage, recordsFromResponse } = require("./oai");
const { requestOai } = require("./harvest");
const { activeSources } = require("./sources");

async function main() {
  const source = activeSources()[0];
  if (!source) throw new Error("No OAI-PMH sources are enabled.");
  const identifyResponse = await requestOai(source, { verb: "Identify" });
  const identify = getIdentify(identifyResponse.root);
  const formatResponse = await requestOai(source, { verb: "ListMetadataFormats" });
  const formats = getFormats(formatResponse.root);
  if (!formats.includes("oai_dc")) throw new Error("The repository does not advertise oai_dc.");
  const recordsResponse = await requestOai(source, { verb: "ListRecords", metadataPrefix: "oai_dc" });
  const records = recordsResponse.noRecordsMatch
    ? { records: [], deleted: [] }
    : recordsFromResponse(recordsResponse.root, source);
  const continuation = recordsResponse.noRecordsMatch ? { token: "", cursor: null } : getPage(recordsResponse.root);
  console.log(JSON.stringify({
    source: source.name,
    endpoint: source.endpoint,
    repositoryName: identify.repositoryName,
    metadataPrefix: "oai_dc",
    granularity: identify.granularity,
    responseRecords: records.records.length,
    deletedRecords: records.deleted.length,
    hasMore: Boolean(continuation.token),
    cursor: continuation.cursor,
    checkedAt: new Date().toISOString(),
    note: "Read-only bounded smoke check; it does not persist imported records.",
  }, null, 2));
}

main().catch((error) => {
  console.error(`OAI-PMH smoke check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
