import { isObject } from "./validation";
import { API_URL, apiFetch } from "./apiConnection";
import { isSecureApiUrl } from "./networkPolicy";

export type AssistantStatus = {
  configured: boolean;
  provider: "OpenAI";
  model: string;
};

export type AssistantSource = {
  title: string;
  url: string;
};

export type AssistantAnswer = {
  answer: string;
  sources: AssistantSource[];
  status: "cited" | "unverified";
  serviceLinks?: AssistantSource[];
};

function assertAllowedEndpoint() {
  if (!isSecureApiUrl(API_URL)) {
    throw new Error("Refusing to send a question to an insecure AI endpoint. Use HTTPS or localhost development.");
  }
}

function isUofGSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.port
      && (url.hostname === "gla.ac.uk" || url.hostname.endsWith(".gla.ac.uk"));
  } catch {
    return false;
  }
}

export async function fetchAssistantStatus(): Promise<AssistantStatus> {
  assertAllowedEndpoint();
  const response = await apiFetch("/api/assistant/status", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("The local AI service could not be reached.");
  const status: unknown = await response.json();
  if (!isObject(status) || typeof status.configured !== "boolean" || status.provider !== "OpenAI" || typeof status.model !== "string") {
    throw new Error("The assistant returned an unsupported status format.");
  }
  return { configured: status.configured, provider: status.provider, model: status.model };
}

export async function askAssistant(question: string): Promise<AssistantAnswer> {
  assertAllowedEndpoint();
  const response = await apiFetch("/api/assistant", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ question }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload: unknown = await response.json();
  if (!isObject(payload)) throw new Error("The assistant returned an unsupported answer format.");
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "The assistant could not answer this question.");
  }
  if (typeof payload.answer !== "string" || !payload.answer.trim()) {
    throw new Error("The assistant returned no usable answer.");
  }
  const sources = Array.isArray(payload.sources)
    ? payload.sources.filter((source): source is { title: string; url: string } =>
      typeof source?.title === "string" && typeof source?.url === "string"
      && isUofGSourceUrl(source.url) && new URL(source.url).pathname !== "/"
      && !new URL(source.url).search && !new URL(source.url).hash,
    )
    : [];
  if (payload.status !== "cited" || sources.length === 0 || !Array.isArray(payload.sources) || sources.length !== payload.sources.length) {
    return { status: "unverified", answer: "I cannot verify an answer to this enquiry. Please contact University student services.", sources: [] };
  }
  return { status: "cited", answer: payload.answer.trim(), sources };
}
