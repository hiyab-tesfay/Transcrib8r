import type { StudyNotes } from "../types";

const configuredBase = import.meta.env.VITE_API_BASE_URL ?? "/api";
const API_BASE_URL = configuredBase.replace(/\/$/, "");

type TranscriptionResponse = {
  transcription: string;
  filename: string;
  language?: string;
};

type NotesApiResponse = {
  notes: string | Record<string, unknown>;
  title?: string;
};

type RawNotes = {
  title?: unknown;
  summary?: unknown;
  key_concepts?: Array<{
    term?: unknown;
    explanation?: unknown;
    importance?: unknown;
  }>;
  important_details?: unknown[];
  study_questions?: Array<{
    question?: unknown;
    difficulty?: unknown;
  }>;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export async function transcribeMedia(file: File): Promise<TranscriptionResponse> {
  const payload = new FormData();
  payload.append("file", file);

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as TranscriptionResponse;
}

export async function generateStudyNotes(
  transcript: string,
  title: string,
): Promise<StudyNotes> {
  const response = await fetch(`${API_BASE_URL}/generate-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, title, format: "json" }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as NotesApiResponse;
  const raw = (
    typeof payload.notes === "string" ? JSON.parse(payload.notes) : payload.notes
  ) as RawNotes;

  return {
    title: String(raw.title || payload.title || title),
    summary: String(raw.summary || "Your notes are ready."),
    keyConcepts: Array.isArray(raw.key_concepts)
      ? raw.key_concepts.map((concept) => ({
          term: String(concept.term || "Key concept"),
          explanation: String(concept.explanation || ""),
          importance: Number(concept.importance || 3),
        }))
      : [],
    importantDetails: Array.isArray(raw.important_details)
      ? raw.important_details.map(String)
      : [],
    studyQuestions: Array.isArray(raw.study_questions)
      ? raw.study_questions.map((item) => ({
          question: String(item.question || "Review this topic."),
          difficulty: normalizeDifficulty(item.difficulty),
        }))
      : [],
  };
}

function normalizeDifficulty(value: unknown): "easy" | "medium" | "hard" {
  return value === "easy" || value === "hard" ? value : "medium";
}
