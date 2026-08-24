/**
 * Speech-to-text.
 *
 * Voice notes must end up as text or they are invisible to search and to the
 * AI features that are the point of the app (§4). But transcription needs a
 * third-party key, and recording shouldn't be blocked on having one — so a
 * missing provider degrades to "PENDING" rather than failing the save.
 * Re-running transcription later picks up exactly where it left off.
 */

export type TranscriptionOutcome =
  | { status: "DONE"; text: string }
  | { status: "PENDING"; reason: string }
  | { status: "FAILED"; error: string };

export function isTranscriptionConfigured(): boolean {
  const provider = (process.env.TRANSCRIPTION_PROVIDER ?? "none").toLowerCase();
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

export async function transcribe(
  audio: Blob,
  fileName: string,
): Promise<TranscriptionOutcome> {
  const provider = (process.env.TRANSCRIPTION_PROVIDER ?? "none").toLowerCase();

  if (provider === "none") {
    return {
      status: "PENDING",
      reason: "No transcription provider configured (set TRANSCRIPTION_PROVIDER).",
    };
  }

  if (provider === "openai") return transcribeWithOpenAI(audio, fileName);

  return { status: "FAILED", error: `Unknown provider "${provider}"` };
}

async function transcribeWithOpenAI(
  audio: Blob,
  fileName: string,
): Promise<TranscriptionOutcome> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { status: "PENDING", reason: "OPENAI_API_KEY is not set." };
  }

  const form = new FormData();
  form.append("file", audio, fileName);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1");

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        status: "FAILED",
        error: `Transcription failed (${res.status}) ${detail.slice(0, 300)}`,
      };
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) return { status: "FAILED", error: "Empty transcript returned." };

    return { status: "DONE", text };
  } catch (err) {
    return {
      status: "FAILED",
      error: err instanceof Error ? err.message : "Unknown transcription error",
    };
  }
}
