import {
  ArrowRight,
  AudioLines,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Code2,
  Copy,
  Download,
  FileAudio,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { demoMedia, demoNotes, demoTranscript } from "./data/demo";
import { generateStudyNotes, transcribeMedia } from "./lib/api";
import type {
  Phase,
  SelectedMedia,
  StudyNotes,
  TranscriptSegment,
} from "./types";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ["mp3", "mp4", "wav", "m4a", "mpeg", "mpga", "webm"];

const phaseRank: Record<Phase, number> = {
  idle: 0,
  ready: 0,
  transcribing: 1,
  transcribed: 2,
  generating: 2,
  complete: 3,
  error: 0,
};

type NotesTab = "notes" | "concepts" | "quiz";

function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [media, setMedia] = useState<SelectedMedia | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [activeTab, setActiveTab] = useState<NotesTab>("notes");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transcript = useMemo(
    () => segments.map((segment) => segment.text).join(" "),
    [segments],
  );

  const visibleSegments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return segments;
    return segments.filter((segment) => segment.text.toLowerCase().includes(query));
  }, [searchQuery, segments]);

  const showWorkspace = segments.length > 0;
  const isBusy = phase === "transcribing" || phase === "generating";

  function resetWorkspace() {
    setPhase("idle");
    setMedia(null);
    setSelectedFile(null);
    setSegments([]);
    setNotes(null);
    setSearchQuery("");
    setActiveSegment(null);
    setErrorMessage("");
    setActiveTab("notes");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function loadDemo() {
    setMedia(demoMedia);
    setSelectedFile(null);
    setSegments(demoTranscript);
    setNotes(demoNotes);
    setPhase("complete");
    setErrorMessage("");
    setSearchQuery("");
    setActiveTab("notes");
    window.setTimeout(() => {
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function chooseFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      setErrorMessage(`Unsupported file type. Choose ${SUPPORTED_EXTENSIONS.join(", ")}.`);
      setPhase("error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("This file is larger than the 200 MB upload limit.");
      setPhase("error");
      return;
    }

    setSelectedFile(file);
    setMedia({ name: file.name, sizeLabel: formatFileSize(file.size) });
    setSegments([]);
    setNotes(null);
    setSearchQuery("");
    setErrorMessage("");
    setPhase("ready");
  }

  async function handleTranscribe() {
    if (!selectedFile) return;
    setPhase("transcribing");
    setErrorMessage("");

    try {
      const result = await transcribeMedia(selectedFile);
      setSegments(segmentTranscript(result.transcription));
      setPhase("transcribed");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transcription failed.");
      setPhase("error");
    }
  }

  async function handleGenerateNotes() {
    if (!transcript) return;
    setPhase("generating");
    setErrorMessage("");

    try {
      const generatedNotes = await generateStudyNotes(
        transcript,
        media?.name.replace(/\.[^/.]+$/, "") || "Lecture Notes",
      );
      setNotes(generatedNotes);
      setActiveTab("notes");
      setPhase("complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Note generation failed.");
      setPhase("transcribed");
    }
  }

  async function copyTranscript() {
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadNotes() {
    if (!notes) return;
    const markdown = notesToMarkdown(notes);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(notes.title)}-notes.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function revealSource(segmentId?: string) {
    if (!segmentId) return;
    setActiveSegment(segmentId);
    document.getElementById(segmentId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setActiveSegment(null), 2200);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Transcrib8r home">
          <span className="brand-mark" aria-hidden="true">
            <AudioLines size={21} strokeWidth={2.4} />
          </span>
          <span>Transcrib8r</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#workspace">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </nav>

        <button className="nav-cta" type="button" onClick={loadDemo}>
          Explore the demo
          <ArrowRight size={16} />
        </button>
      </header>

      <main id="top">
        <section className="hero section-wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <Sparkles size={15} />
              AI-powered study workspace
            </p>
            <h1 id="hero-title">
              Turn lectures into notes that <em>actually stick.</em>
            </h1>
            <p className="hero-description">
              Upload a recording and get a searchable transcript, focused notes,
              key concepts, and practice questions in one calm workspace.
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-large" type="button" onClick={loadDemo}>
                <Play size={18} fill="currentColor" />
                Try a sample lecture
              </button>
              <a className="button button-secondary button-large" href="#workspace">
                Upload your own
                <ChevronRight size={18} />
              </a>
            </div>
            <div className="hero-proof" aria-label="Product benefits">
              <span><Check size={15} /> No account required</span>
              <span><Check size={15} /> Your files are not stored</span>
            </div>
          </div>

          <div className="hero-preview" aria-label="Example Transcrib8r output">
            <div className="preview-topline">
              <div className="preview-file">
                <span className="preview-file-icon"><FileAudio size={18} /></span>
                <span>
                  <strong>Neural Networks</strong>
                  <small>Lecture 04 · 48 min</small>
                </span>
              </div>
              <span className="complete-pill"><CircleCheck size={14} /> Ready</span>
            </div>
            <div className="preview-wave" aria-hidden="true">
              {[18, 32, 24, 46, 29, 55, 38, 66, 43, 27, 52, 35, 61, 44, 30, 49, 23, 38, 17].map(
                (height, index) => <i key={index} style={{ height }} />,
              )}
              <span className="wave-progress" />
            </div>
            <div className="preview-time"><span>23:27</span><span>48:12</span></div>
            <div className="preview-insight">
              <span className="insight-icon"><WandSparkles size={17} /></span>
              <p>
                <small>Key concept</small>
                <strong>Backpropagation uses the chain rule to trace how each weight contributed to error.</strong>
              </p>
              <span className="timestamp">23:27</span>
            </div>
            <div className="preview-footer">
              <div><strong>06</strong><span>concepts</span></div>
              <div><strong>05</strong><span>questions</span></div>
              <div><strong>08</strong><span>source moments</span></div>
            </div>
          </div>
        </section>

        <section className="workspace-section section-wrap" id="workspace" aria-labelledby="workspace-title">
          <div className="section-heading">
            <p className="eyebrow">Your study desk</p>
            <h2 id="workspace-title">From recording to review, in one place.</h2>
            <p>Start with your own lecture or explore a complete sample—no API usage required.</p>
          </div>

          <div className="workspace-card">
            <div className="workspace-toolbar">
              <div className="workspace-file">
                <span className="file-icon"><FileAudio size={20} /></span>
                <span>
                  <strong>{media?.name ?? "New lecture"}</strong>
                  <small>
                    {media
                      ? media.isDemo
                        ? "Local demo · no API key needed"
                        : [media.sizeLabel, media.durationLabel].filter(Boolean).join(" · ")
                      : "Upload a supported audio or video file"}
                  </small>
                </span>
              </div>
              <div className="toolbar-actions">
                {media?.isDemo && <span className="demo-badge"><Sparkles size={13} /> Demo mode</span>}
                {media && (
                  <button className="icon-button" type="button" onClick={resetWorkspace} aria-label="Start over">
                    <RotateCcw size={18} />
                  </button>
                )}
              </div>
            </div>

            <ProgressSteps phase={phase} />

            {!showWorkspace && (
              <div className="upload-layout">
                <div
                  className={`dropzone ${isDragging ? "is-dragging" : ""}`}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    if (event.currentTarget === event.target) setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file) chooseFile(file);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    className="visually-hidden"
                    id="lecture-upload"
                    type="file"
                    accept={SUPPORTED_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) chooseFile(file);
                    }}
                  />
                  <span className="dropzone-icon"><UploadCloud size={27} /></span>
                  <h3>{media ? "Ready to transcribe" : "Drop a lecture recording here"}</h3>
                  <p>
                    {media
                      ? `${media.name} · ${media.sizeLabel}`
                      : "MP3, MP4, WAV, M4A, MPEG, MPGA, or WebM up to 200 MB"}
                  </p>
                  {media ? (
                    <div className="selected-actions">
                      <button className="button button-primary" type="button" onClick={handleTranscribe} disabled={isBusy}>
                        {phase === "transcribing" ? <LoaderCircle className="spin" size={18} /> : <AudioLines size={18} />}
                        {phase === "transcribing" ? "Transcribing…" : "Transcribe lecture"}
                      </button>
                      <button className="text-button" type="button" onClick={() => fileInputRef.current?.click()}>
                        Choose another file
                      </button>
                    </div>
                  ) : (
                    <label className="button button-primary" htmlFor="lecture-upload">
                      Choose a file
                      <ArrowRight size={17} />
                    </label>
                  )}
                </div>

                <aside className="sample-card">
                  <span className="sample-label">No recording handy?</span>
                  <div className="sample-visual"><BrainCircuit size={38} /></div>
                  <h3>Explore a finished study pack</h3>
                  <p>See how a 48-minute neural networks lecture becomes concise, source-linked study material.</p>
                  <button className="button button-ink" type="button" onClick={loadDemo}>
                    Open sample
                    <ChevronRight size={17} />
                  </button>
                </aside>
              </div>
            )}

            {errorMessage && (
              <div className="error-banner" role="alert">
                <span><X size={18} /></span>
                <p><strong>Something needs attention</strong>{errorMessage}</p>
                {selectedFile && phase === "error" && (
                  <button type="button" onClick={handleTranscribe}>Try again</button>
                )}
              </div>
            )}

            {media?.isDemo && showWorkspace && (
              <div className="demo-notice" role="status">
                <span><ShieldCheck size={18} /></span>
                <p>
                  <strong>You’re exploring a local sample.</strong>
                  This transcript and study pack load from the app—no upload, backend, or API key is used.
                </p>
                <button type="button" onClick={resetWorkspace}>Upload my lecture</button>
              </div>
            )}

            {showWorkspace && (
              <div className="results-grid">
                <section className="result-pane transcript-pane" aria-labelledby="transcript-title">
                  <div className="pane-header">
                    <div>
                      <span className="pane-kicker">Source</span>
                      <h3 id="transcript-title">Transcript</h3>
                    </div>
                    <button className="icon-button with-label" type="button" onClick={copyTranscript}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <label className="search-field">
                    <Search size={17} />
                    <span className="visually-hidden">Search transcript</span>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search the transcript"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <div className="transcript-scroll">
                    {visibleSegments.length ? visibleSegments.map((segment) => (
                      <article
                        className={`transcript-segment ${activeSegment === segment.id ? "is-active" : ""}`}
                        id={segment.id}
                        key={segment.id}
                      >
                        <span className={segment.time ? "segment-time" : "segment-dot"}>
                          {segment.time || ""}
                        </span>
                        <p>{segment.text}</p>
                      </article>
                    )) : (
                      <p className="empty-search">No transcript moments match “{searchQuery}”.</p>
                    )}
                  </div>
                </section>

                <section className="result-pane notes-pane" aria-labelledby="notes-title">
                  <div className="pane-header">
                    <div>
                      <span className="pane-kicker">Study pack</span>
                      <h3 id="notes-title">Smart notes</h3>
                    </div>
                    {notes && (
                      <button className="icon-button with-label" type="button" onClick={downloadNotes}>
                        <Download size={16} /> Export
                      </button>
                    )}
                  </div>

                  {notes ? (
                    <>
                      <div className="tabs" role="tablist" aria-label="Study note views">
                        {(["notes", "concepts", "quiz"] as NotesTab[]).map((tab) => (
                          <button
                            className={activeTab === tab ? "is-active" : ""}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            onClick={() => setActiveTab(tab)}
                            key={tab}
                          >
                            {tab === "quiz" ? "Questions" : capitalize(tab)}
                          </button>
                        ))}
                      </div>
                      <div className="notes-scroll">
                        {activeTab === "notes" && <NotesOverview notes={notes} />}
                        {activeTab === "concepts" && (
                          <ConceptList notes={notes} onRevealSource={revealSource} />
                        )}
                        {activeTab === "quiz" && <QuestionList notes={notes} />}
                      </div>
                    </>
                  ) : (
                    <div className="generate-state">
                      <span className="generate-icon">
                        {phase === "generating" ? <LoaderCircle className="spin" size={30} /> : <WandSparkles size={30} />}
                      </span>
                      <h4>{phase === "generating" ? "Building your study pack…" : "Your transcript is ready"}</h4>
                      <p>
                        {phase === "generating"
                          ? "Finding the key ideas and writing questions from the full lecture."
                          : "Turn the transcript into a summary, key concepts, details, and practice questions."}
                      </p>
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={handleGenerateNotes}
                        disabled={phase === "generating"}
                      >
                        {phase === "generating" ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
                        {phase === "generating" ? "Generating notes…" : "Generate study notes"}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </section>

        <section className="how-section section-wrap" id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading align-left">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title">Less admin. More understanding.</h2>
          </div>
          <div className="steps-grid">
            <article>
              <span className="step-number">01</span>
              <span className="step-icon"><UploadCloud size={22} /></span>
              <h3>Bring the lecture</h3>
              <p>Drop in a recording from class in any supported audio or video format.</p>
            </article>
            <article>
              <span className="step-number">02</span>
              <span className="step-icon"><AudioLines size={22} /></span>
              <h3>Get the full context</h3>
              <p>Transcrib8r turns the recording into a clean, searchable transcript.</p>
            </article>
            <article>
              <span className="step-number">03</span>
              <span className="step-icon"><BookOpen size={22} /></span>
              <h3>Study what matters</h3>
              <p>Review the summary, concepts, key details, and difficulty-tagged questions.</p>
            </article>
          </div>
        </section>

        <section className="about-strip section-wrap" id="about">
          <div className="about-copy">
            <p className="eyebrow">Built with intention</p>
            <h2>A focused AI tool for the part after class.</h2>
            <p>
              Transcrib8r combines speech recognition with structured note generation to make recorded lectures
              useful—not just searchable. It was designed and built by Hiyab as a full-stack portfolio project.
            </p>
          </div>
          <div className="about-points">
            <span><ShieldCheck size={21} /><strong>Privacy-minded</strong><small>Temporary file processing</small></span>
            <span><Clock3 size={21} /><strong>Time-saving</strong><small>One complete study workflow</small></span>
            <span><BrainCircuit size={21} /><strong>Learning-first</strong><small>Notes built for review</small></span>
          </div>
        </section>
      </main>

      <footer className="site-footer section-wrap">
        <a className="brand" href="#top">
          <span className="brand-mark"><AudioLines size={19} /></span>
          <span>Transcrib8r</span>
        </a>
        <p>Designed and built by Hiyab · 2026</p>
        <a className="github-link" href="https://github.com/hiyab-tesfay/Transcrib8r" target="_blank" rel="noreferrer">
          <Code2 size={18} /> View the source
        </a>
      </footer>
    </div>
  );
}

function ProgressSteps({ phase }: { phase: Phase }) {
  const currentRank = phaseRank[phase];
  const steps = [
    { label: "Upload", icon: UploadCloud },
    { label: "Transcribe", icon: AudioLines },
    { label: "Build notes", icon: Sparkles },
  ];

  return (
    <div className="progress-steps" aria-label="Processing progress">
      {steps.map((step, index) => {
        const complete = currentRank > index;
        const active = currentRank === index;
        const Icon = step.icon;
        return (
          <div className={`progress-step ${complete ? "is-complete" : ""} ${active ? "is-active" : ""}`} key={step.label}>
            <span>{complete ? <Check size={15} /> : <Icon size={15} />}</span>
            <small>{step.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function NotesOverview({ notes }: { notes: StudyNotes }) {
  return (
    <div className="notes-overview">
      <div className="summary-card">
        <span><Sparkles size={17} /> Lecture summary</span>
        <p>{notes.summary}</p>
      </div>
      <div className="detail-list">
        <h4>Important details</h4>
        {notes.importantDetails.map((detail) => (
          <p key={detail}><Check size={15} />{detail}</p>
        ))}
      </div>
    </div>
  );
}

function ConceptList({
  notes,
  onRevealSource,
}: {
  notes: StudyNotes;
  onRevealSource: (segmentId?: string) => void;
}) {
  return (
    <div className="concept-list">
      {notes.keyConcepts.map((concept, index) => (
        <button
          className="concept-card"
          type="button"
          onClick={() => onRevealSource(concept.sourceSegmentId)}
          disabled={!concept.sourceSegmentId}
          key={`${concept.term}-${index}`}
        >
          <span className="concept-index">{String(index + 1).padStart(2, "0")}</span>
          <span><strong>{concept.term}</strong><small>{concept.explanation}</small></span>
          {concept.sourceSegmentId && <ChevronRight size={17} />}
        </button>
      ))}
    </div>
  );
}

function QuestionList({ notes }: { notes: StudyNotes }) {
  return (
    <div className="question-list">
      <p className="quiz-intro">Use these prompts for active recall before checking your notes.</p>
      {notes.studyQuestions.map((item, index) => (
        <article key={`${item.question}-${index}`}>
          <span className={`difficulty difficulty-${item.difficulty}`}>{item.difficulty}</span>
          <strong>{index + 1}. {item.question}</strong>
        </article>
      ))}
    </div>
  );
}

function segmentTranscript(text: string): TranscriptSegment[] {
  const sentences = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const segments: TranscriptSegment[] = [];

  for (let index = 0; index < sentences.length; index += 2) {
    segments.push({
      id: `segment-${index / 2 + 1}`,
      text: sentences.slice(index, index + 2).join(" "),
    });
  }

  return segments.length ? segments : [{ id: "segment-1", text }];
}

function notesToMarkdown(notes: StudyNotes): string {
  const concepts = notes.keyConcepts.map((item) => `- **${item.term}:** ${item.explanation}`).join("\n");
  const details = notes.importantDetails.map((item) => `- ${item}`).join("\n");
  const questions = notes.studyQuestions
    .map((item, index) => `${index + 1}. ${item.question} _(${item.difficulty})_`)
    .join("\n");

  return `# ${notes.title}\n\n## Summary\n\n${notes.summary}\n\n## Key Concepts\n\n${concepts}\n\n## Important Details\n\n${details}\n\n## Study Questions\n\n${questions}\n`;
}

function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default App;
