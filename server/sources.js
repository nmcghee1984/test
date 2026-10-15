const sources = [
  {
    id: "enlighten-publications",
    name: "Enlighten Publications",
    endpoint: "https://eprints.gla.ac.uk/cgi/oai2",
    homepage: "https://eprints.gla.ac.uk/",
    enabled: true,
  },
  {
    id: "enlighten-research-data",
    name: "Enlighten Research Data",
    endpoint: "https://researchdata.gla.ac.uk/cgi/oai2",
    homepage: "https://researchdata.gla.ac.uk/",
    enabled: process.env.ENABLE_RESEARCH_DATA === "true",
  },
  {
    id: "edshare",
    name: "EdShare",
    endpoint: "https://edshare.gla.ac.uk/cgi/oai2",
    homepage: "https://edshare.gla.ac.uk/",
    enabled: process.env.ENABLE_EDSHARE === "true",
  },
];

function activeSources() {
  return sources.filter((source) => source.enabled);
}

function sourceById(id) {
  return sources.find((source) => source.id === id);
}

function publicSource(source, state) {
  const hasRecords = (state.recordCount ?? 0) > 0;
  const mode = hasRecords ? "CACHED" : "UNAVAILABLE";
  return {
    id: source.id,
    name: source.name,
    homepage: source.homepage,
    enabled: source.enabled,
    mode,
    recordCount: state.recordCount ?? 0,
    lastAttemptAt: state.lastAttemptAt ?? null,
    lastSuccessAt: state.lastSuccessAt ?? null,
    error: state.lastError ?? null,
    metadataPrefix: state.metadataPrefix ?? null,
    granularity: state.granularity ?? null,
    boundedImport: Boolean(state.boundedImport),
    hasMore: Boolean(state.hasMore),
  };
}

module.exports = { activeSources, publicSource, sourceById, sources };
