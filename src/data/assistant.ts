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
  return response.json() as Promise<AssistantStatus>;
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
  const payload = await response.json() as {
    answer?: unknown;
    sources?: unknown;
    error?: unknown;
  };
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "The assistant could not answer this question.");
  }
  if (typeof payload.answer !== "string" || !payload.answer.trim()) {
    throw new Error("The assistant returned no usable answer.");
  }
  const sources = Array.isArray(payload.sources)
    ? payload.sources.filter((source): source is { title: string; url: string } =>
      typeof source?.title === "string" && typeof source?.url === "string"
      && isUofGSourceUrl(source.url),
    )
    : [];
  return { answer: payload.answer.trim(), sources };
}
