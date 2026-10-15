import { useEffect, useRef, useState } from "react";
import {
  Linking,
  Pressable as NativePressable,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import {
  askAssistant,
  fetchAssistantStatus,
  type AssistantSource,
  type AssistantStatus,
} from "../data/assistant";

type Message = {
  id: number;
  text: string;
  from: "student" | "assistant";
  sources?: AssistantSource[];
};

const OFFICIAL_SITE = "https://www.gla.ac.uk/";
const STARTER_QUESTIONS = [
  "How do I get academic support?",
  "Where can I find wellbeing help?",
  "How do I get around campus?",
];

export default function AskUofGScreen({
  largerText,
  highContrast,
  onError,
}: {
  largerText: boolean;
  highContrast: boolean;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [serviceStatus, setServiceStatus] = useState<AssistantStatus | null>(null);
  const [serviceError, setServiceError] = useState("");
  const [loading, setLoading] = useState(false);
  const nextMessageId = useRef(0);
  const scale = largerText ? 1.18 : 1;

  useEffect(() => {
    let current = true;
    fetchAssistantStatus().then((status) => {
      if (current) setServiceStatus(status);
    }).catch((error: unknown) => {
      if (current) setServiceError(error instanceof Error ? error.message : "The local AI service is unavailable.");
    });
    return () => { current = false; };
  }, []);

  async function ask(question: string) {
    const text = question.trim().slice(0, 500);
    if (!text || loading) return;
    const questionId = nextMessageId.current++;
    setMessages((current) => [...current, { id: questionId, text, from: "student" }]);
    setDraft("");
    setLoading(true);
    setServiceError("");
    try {
      const result = await askAssistant(text);
      const replyId = nextMessageId.current++;
      setMessages((current) => [...current, {
        id: replyId,
        text: result.answer,
        from: "assistant",
        sources: result.sources,
      }]);
    } catch (error) {
      const replyId = nextMessageId.current++;
      const message = error instanceof Error ? error.message : "The assistant could not answer.";
      setServiceError(message);
      setMessages((current) => [...current, { id: replyId, text: message, from: "assistant" }]);
    } finally {
      setLoading(false);
    }
  }

  async function openOfficialSite() {
    try {
      await Linking.openURL(OFFICIAL_SITE);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not open the University website.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <NativeText accessibilityRole="header" style={[styles.title, { fontSize: 27 * scale }]}>
          Ask UofG
        </NativeText>
        <NativeText style={[styles.subtitle, { fontSize: 15 * scale }]}>
          Ask about UofG using information found on the official University website.
        </NativeText>
      </View>

      <View style={styles.notice}>
        <NativeText style={[styles.noticeTitle, { fontSize: 15 * scale }]}>
          {serviceStatus?.configured ? `AI connected · ${serviceStatus.provider}` : "AI prototype · setup required"}
        </NativeText>
        <NativeText style={[styles.noticeBody, { fontSize: 14 * scale }]}>
          {serviceStatus?.configured
            ? "Answers are AI-generated, not official UofG advice. The assistant searches public gla.ac.uk pages and shows source links, but may still misinterpret them. Questions are sent to OpenAI through the local server; web search may incur API charges. Don't enter passwords, student numbers, health details or other private information. The app does not save this conversation; provider processing follows OpenAI API terms."
            : "Connect a local OpenAI API key to enable answers. When enabled, questions are sent to OpenAI and web search is limited to public gla.ac.uk pages; search may incur API charges. Don't enter passwords, student numbers, health details or other private information."}
        </NativeText>
      </View>

      {serviceError ? (
        <View style={styles.errorNotice} accessibilityRole="alert">
          <NativeText style={[styles.errorText, { fontSize: 14 * scale }]}>{serviceError}</NativeText>
        </View>
      ) : null}

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <NativeText accessibilityRole="header" style={[styles.sectionTitle, { fontSize: 19 * scale }]}>
            What would you like help with?
          </NativeText>
          {STARTER_QUESTIONS.map((question) => (
            <NativePressable
              key={question}
              onPress={() => void ask(question)}
              disabled={loading || !serviceStatus?.configured}
              accessibilityRole="button"
              style={styles.suggestion}
            >
              <NativeText style={[styles.suggestionText, { fontSize: 14 * scale }]}>{question}</NativeText>
            </NativePressable>
          ))}
        </View>
      ) : (
        <View style={styles.messageList} accessibilityLiveRegion="polite" aria-live="polite">
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.message, message.from === "student" ? styles.studentMessage : styles.assistantMessage]}
            >
              <NativeText style={[
                styles.messageText,
                { fontSize: 15 * scale, color: highContrast ? "#102B3F" : "#173047" },
              ]}>
                {message.text}
              </NativeText>
              {message.from === "assistant" && message.sources?.length ? (
                <View style={styles.sources}>
                  <NativeText style={[styles.sourceHeading, { fontSize: 13 * scale }]}>
                    Official UofG sources
                  </NativeText>
                  {message.sources.map((source) => (
                    <NativePressable
                      key={source.url}
                      onPress={() => void Linking.openURL(source.url).catch((error: unknown) => {
                        onError(error instanceof Error ? error.message : "Could not open this University source.");
                      })}
                      accessibilityRole="link"
                      accessibilityLabel={`Open UofG source: ${source.title}`}
                      style={styles.sourceLink}
                    >
                      <NativeText style={[styles.sourceLinkText, { fontSize: 14 * scale }]}>
                        {source.title}
                      </NativeText>
                    </NativePressable>
                  ))}
                </View>
              ) : message.from === "assistant" ? (
                <NativePressable
                  onPress={() => void openOfficialSite()}
                  accessibilityRole="link"
                  accessibilityLabel="Search the official University of Glasgow website"
                  style={styles.sourceLink}
                >
                  <NativeText style={[styles.sourceLinkText, { fontSize: 14 * scale }]}>
                    Visit the official UofG website
                  </NativeText>
                </NativePressable>
              ) : null}
            </View>
          ))}
          {loading ? (
            <NativeText accessibilityLiveRegion="polite" aria-live="polite" style={[styles.footer, { fontSize: 14 * scale }]}>
              Waiting for an AI response…
            </NativeText>
          ) : null}
        </View>
      )}

      <View style={styles.composer}>
        <NativeTextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => { void ask(draft); }}
          placeholder="Ask about UofG"
          placeholderTextColor="#526777"
          accessibilityLabel="Type a question for the UofG website assistant"
          maxLength={500}
          multiline
          editable={Boolean(serviceStatus?.configured) && !loading}
          style={[styles.input, { fontSize: 16 * scale }]}
        />
        <NativePressable
          onPress={() => { void ask(draft); }}
          disabled={!draft.trim() || !serviceStatus?.configured || loading}
          accessibilityRole="button"
          accessibilityLabel="Send question"
          style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
        >
          <NativeText style={[styles.sendText, { fontSize: 15 * scale }]}>Send</NativeText>
        </NativePressable>
      </View>
      <NativeText style={[styles.footer, { fontSize: 12 * scale }]}>
        No account needed · not an official UofG service · verify important answers
      </NativeText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  intro: { marginBottom: 2 },
  title: { color: "#173047", fontWeight: "800" },
  subtitle: { color: "#526777", lineHeight: 22, marginTop: 5 },
  notice: { padding: 14, borderRadius: 12, backgroundColor: "#FFF5D6", borderWidth: 1, borderColor: "#876100" },
  noticeTitle: { color: "#102B3F", fontWeight: "800", marginBottom: 5 },
  noticeBody: { color: "#102B3F", lineHeight: 21 },
  errorNotice: { padding: 12, borderRadius: 10, backgroundColor: "#FCE8E8", borderWidth: 1, borderColor: "#8C2020" },
  errorText: { color: "#702020", lineHeight: 20 },
  emptyState: { gap: 10, paddingVertical: 4 },
  sectionTitle: { color: "#173047", fontWeight: "700", marginBottom: 2 },
  suggestion: { minHeight: 48, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#526777", backgroundColor: "#FFFFFF", borderRadius: 12 },
  suggestionText: { color: "#173047" },
  messageList: { gap: 12, paddingBottom: 4 },
  message: { padding: 14, borderRadius: 14, borderWidth: 1 },
  studentMessage: { alignSelf: "flex-end", maxWidth: "90%", backgroundColor: "#E8F3F8", borderColor: "#526777" },
  assistantMessage: { alignSelf: "stretch", backgroundColor: "#FFFFFF", borderColor: "#526777" },
  messageText: { lineHeight: 23 },
  sourceLink: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: 5 },
  sources: { borderTopWidth: 1, borderTopColor: "#CBD5DC", marginTop: 10, paddingTop: 6 },
  sourceHeading: { color: "#526777", fontWeight: "700", marginTop: 4 },
  sourceLinkText: { color: "#011451", fontWeight: "700", textDecorationLine: "underline" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#526777", backgroundColor: "#FFFFFF", color: "#173047" },
  sendButton: { minHeight: 48, minWidth: 64, justifyContent: "center", alignItems: "center", paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#011451" },
  sendButtonDisabled: { opacity: 0.65 },
  sendText: { color: "#FFFFFF", fontWeight: "700" },
  footer: { color: "#526777", textAlign: "center" },
});
