export type Phase =
  | "idle"
  | "ready"
  | "transcribing"
  | "transcribed"
  | "generating"
  | "complete"
  | "error";

export type TranscriptSegment = {
  id: string;
  time?: string;
  seconds?: number;
  text: string;
};

export type KeyConcept = {
  term: string;
  explanation: string;
  sourceSegmentId?: string;
  importance?: number;
};

export type StudyQuestion = {
  question: string;
  difficulty: "easy" | "medium" | "hard";
};

export type StudyNotes = {
  title: string;
  summary: string;
  keyConcepts: KeyConcept[];
  importantDetails: string[];
  studyQuestions: StudyQuestion[];
};

export type SelectedMedia = {
  name: string;
  sizeLabel: string;
  durationLabel?: string;
  isDemo?: boolean;
};
