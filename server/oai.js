const { XMLParser, XMLValidator } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: false,
  processEntities: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name, path) => (
    name === "record"
    || name === "metadataFormat"
    || name.startsWith("dc:")
    || path.endsWith(".resumptionToken")
  ),
});

function parseOaiXml(xml) {
  if (typeof xml !== "string" || !xml.trim()) throw new Error("OAI-PMH returned an empty response.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("OAI-PMH response contained a forbidden document type.");
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error(`Invalid OAI-PMH XML: ${validation.err?.msg ?? "malformed XML"}`);
  const parsed = parser.parse(xml);
  const root = parsed["OAI-PMH"];
  if (!root || typeof root !== "object") throw new Error("OAI-PMH response root was missing.");
  const error = root.error;
  if (error) {
    const item = Array.isArray(error) ? error[0] : error;
    const message = typeof item === "string" ? item : item?.["#text"];
    const code = item?.["@_code"];
    if (code === "noRecordsMatch") return { root, noRecordsMatch: true };
    throw new Error(`OAI-PMH ${code ?? "error"}: ${String(message ?? "request failed")}`);
  }
  return { root, noRecordsMatch: false };
}

function textValues(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item).trim();
      if (item && typeof item === "object") return String(item["#text"] ?? item["#cdata"] ?? "").trim();
      return "";
    })
    .filter(Boolean);
}

function getText(object, key) {
  return textValues(object?.[key])[0] ?? "";
}

function getTexts(object, key) {
  return [...new Set(textValues(object?.[key]))];
}

function recordsFromResponse(root, source) {
  const response = root.ListRecords;
  const records = response?.record;
  const list = Array.isArray(records) ? records : records ? [records] : [];
  const normalised = [];
  const deleted = [];

  for (const record of list) {
    const header = record?.header;
    const identifier = getText(header, "identifier");
    if (!identifier) continue;
    if (header?.["@_status"] === "deleted") {
      deleted.push(identifier);
      continue;
    }

    const metadata = record?.metadata?.["oai_dc:dc"];
    if (!metadata || typeof metadata !== "object") continue;
    const title = getTexts(metadata, "dc:title")[0] ?? "";
    if (!title) continue;
    const creators = getTexts(metadata, "dc:creator");
    const subjects = getTexts(metadata, "dc:subject");
    const descriptions = getTexts(metadata, "dc:description");
    const dates = getTexts(metadata, "dc:date");
    const rights = getTexts(metadata, "dc:rights");
    const identifiers = getTexts(metadata, "dc:identifier");

    normalised.push({
      id: `${source.id}:${identifier}`,
      source: source.id,
      sourceIdentifier: identifier,
      title,
      creators,
      subjects,
      ...(descriptions.length ? { description: descriptions.join("\n\n") } : {}),
      ...(dates.length ? { publicationDate: dates[0], datePrecision: "as-supplied" } : {}),
      recordUrl: recordUrlFor(source, identifier, identifiers),
      rights,
      ...(rights.length ? { accessStatement: rights.join("; ") } : {}),
      fetchedAt: new Date().toISOString(),
    });
  }
  return { records: normalised, deleted };
}

function recordUrlFor(source, oaiIdentifier, identifiers) {
  const allowedHost = new URL(source.homepage).hostname;
  for (const identifier of identifiers) {
    try {
      const url = new URL(identifier);
      if (url.protocol === "https:" && !url.username && !url.password && !url.port && url.hostname === allowedHost) {
        return url.toString();
      }
    } catch {
      // Non-URL identifiers, including DOIs, are retained only as metadata.
    }
  }
  if (source.id === "enlighten-publications") {
    const numericId = oaiIdentifier.match(/(?:^|:)(\d+)$/)?.[1];
    if (numericId) return `https://${allowedHost}/id/eprint/${numericId}`;
  }
  return source.homepage;
}

function getFormats(root) {
  const items = root.ListMetadataFormats?.metadataFormat;
  const formats = Array.isArray(items) ? items : items ? [items] : [];
  return formats.map((item) => getText(item, "metadataPrefix")).filter(Boolean);
}

function getIdentify(root) {
  const identify = root.Identify;
  if (!identify) throw new Error("OAI-PMH Identify response was missing.");
  return {
    repositoryName: getText(identify, "repositoryName"),
    granularity: getText(identify, "granularity"),
    earliestDatestamp: getText(identify, "earliestDatestamp"),
  };
}

function getPage(root) {
  const response = root.ListRecords;
  const tokenValue = response?.resumptionToken;
  const tokenItem = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;
  const token = textValues(tokenItem)[0] ?? "";
  return { token, cursor: tokenItem?.["@_cursor"] ?? null };
}

module.exports = {
  getFormats,
  getIdentify,
  getPage,
  parseOaiXml,
  recordUrlFor,
  recordsFromResponse,
};
