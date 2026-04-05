"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  StopCircle,
  RotateCcw,
  Play,
  FileText,
  Users,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { OntarioDecaEvent } from "@/lib/ontario-deca-data";
import {
  getCategoryTemplate,
  getPrepTimeMinutes,
  getPresentationTimeMinutes,
  getEntryLimit,
  getEntryFormat,
  isRoleplayEvent,
  ROLEPLAY_PI_SCORING,
  PREPARED_EVENT_SCORING,
} from "@/lib/ontario-deca-data";

interface Session {
  id: string;
  score: number | null;
  pi_scores?: Record<string, number> | null;
  feedback: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

interface EventPracticeClientProps {
  event: OntarioDecaEvent;
  initialSessions: Session[];
}

/** Case data returned by the API (narrower than legacy CaseData) */
interface ApiCaseData {
  cluster?: string;
  instructionalArea?: string;
  eventCode?: string;
}

const DECA_SECTION_HEADERS = [
  "CAREER CLUSTER",
  "INSTRUCTIONAL AREA",
  "EVENT NAME",
  "PARTICIPANT INSTRUCTIONS",
  "21st CENTURY SKILLS",
  "PERFORMANCE INDICATORS",
  "EVENT SITUATION",
] as const;

export type DecaCaseSections = Partial<Record<(typeof DECA_SECTION_HEADERS)[number], string>>;

function parseDecaCaseFormat(text: string): DecaCaseSections | null {
  const sections: DecaCaseSections = {};
  const normalized = text.replace(/\r\n/g, "\n");

  for (let i = 0; i < DECA_SECTION_HEADERS.length; i++) {
    const header = DECA_SECTION_HEADERS[i];
    const nextHeader = DECA_SECTION_HEADERS[i + 1];
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const headerPattern = new RegExp(`(?:^|\\n)${escaped}\\s*\\n`, "im");
    const match = normalized.match(headerPattern);
    if (!match) continue;

    const startIdx = (match.index ?? 0) + match[0].length;
    let endIdx = normalized.length;

    if (nextHeader) {
      const nextEscaped = nextHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nextPattern = new RegExp(`\\n\\s*${nextEscaped}\\s*\\n`, "im");
      const nextMatch = normalized.slice(startIdx).search(nextPattern);
      if (nextMatch >= 0) endIdx = startIdx + nextMatch;
    }

    const content = normalized.slice(startIdx, endIdx).trim();
    if (content) sections[header as keyof DecaCaseSections] = content;
  }
  return Object.keys(sections).length > 0 ? sections : null;
}

function parseLegacyCaseFormat(text: string): Record<string, string> | null {
  const sections: Record<string, string> = {};
  const parts = text.split(/\*\*([^*]+):\*\*/);
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i]?.trim();
    const content = parts[i + 1]?.trim();
    if (header && content) sections[header] = content;
  }
  return Object.keys(sections).length > 0 ? sections : null;
}

export function EventPracticeClient({
  event,
  initialSessions,
}: EventPracticeClientProps) {
  const template = getCategoryTemplate(event.category_key);
  const prepMin = getPrepTimeMinutes(event) ?? 0;
  const presMin = getPresentationTimeMinutes(event) ?? 10;
  const prepSec = prepMin * 60;
  const presSec = presMin * 60;
  const participants = template?.participants ?? "1";
  const isTeam = participants !== "1";

  const PREP_OPTIONS = [0, 5, 10, 15, 20] as const;
  const PRES_OPTIONS = [5, 10, 15, 20] as const;
  const safePrep = (PREP_OPTIONS as readonly number[]).includes(prepMin) ? prepMin : 10;
  const safePres = (PRES_OPTIONS as readonly number[]).includes(presMin) ? presMin : 10;

  const [step, setStep] = useState<"intro" | "prep" | "presentation" | "results">("intro");
  const [caseStudy, setCaseStudy] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<ApiCaseData | null>(null);
  const [studentResponse, setStudentResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customPrepMin, setCustomPrepMin] = useState(safePrep);
  const [customPresMin, setCustomPresMin] = useState(safePres);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(prepSec);
  const [presSecondsLeft, setPresSecondsLeft] = useState(presSec);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resultData, setResultData] = useState<{
    overall_score?: number;
    pi_scores?: Record<string, number>;
    strengths?: string[];
    improvements?: string[];
    tips?: string[];
    overall_feedback?: string;
  } | null>(null);
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [practiceStartTime, setPracticeStartTime] = useState<number | null>(null);
  const [caseStudyExpanded, setCaseStudyExpanded] = useState(true);
  const [prepNotes, setPrepNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const interimTranscriptRef = useRef("");
  /** Synced immediately when a session row is created — avoids stale state / double-start inserts */
  const sessionIdRef = useRef<string | null>(null);
  const sessionCreatingRef = useRef(false);

  const clearPracticeSessionId = useCallback(() => {
    sessionIdRef.current = null;
    setCurrentSessionId(null);
  }, []);

  const isRoleplay = isRoleplayEvent(event);
  const isPrepared = !isRoleplay;

  const handleEndPractice = useCallback(async () => {
    const activeSessionId = sessionIdRef.current ?? currentSessionId;
    console.log("[practice] Submit clicked, session ID:", activeSessionId);
    if (!activeSessionId) {
      toast.error("Session was lost. Please start a new practice.");
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const responseText = studentResponse.trim();
    if (!responseText) {
      toast.error("Please enter or record your response before submitting.");
      return;
    }
    const duration = practiceStartTime ? Math.round((Date.now() - practiceStartTime) / 1000) : null;
    setIsLoading(true);
    try {
      console.log("[practice] Sending to evaluation API...");
      const res = await fetch("/api/practice/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_code: event.code,
          case_study: caseStudy,
          student_response: responseText,
          instructional_area: caseData?.instructionalArea,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Request failed: ${res.status}`);
      }
      const data = (await res.json()) as {
        overall_score?: number;
        pi_scores?: Record<string, number>;
        feedback?: string;
        result?: {
          strengths?: string[];
          improvements?: string[];
          event_specific_tips?: string[];
          overall_feedback?: string;
        };
      };
      console.log("[practice] Evaluation response:", {
        overall_score: data?.overall_score,
        hasFeedback: !!data?.feedback,
        pi_scores: data?.pi_scores,
      });
      const content = data?.feedback ?? "";
      setFeedback(content);
      setResultData({
        overall_score: data?.overall_score,
        pi_scores: data?.pi_scores,
        strengths: data?.result?.strengths,
        improvements: data?.result?.improvements,
        tips: data?.result?.event_specific_tips,
        overall_feedback: data?.result?.overall_feedback,
      });
      setStep("results");

      const score = data?.overall_score ?? null;
      console.log("[practice] Updating database with score:", score);

      const savePayload = {
        session_id: activeSessionId,
        event_code: event.code,
        event_category: event.name,
        category: template?.category_name ?? event.category_key,
        score,
        pi_scores: data?.pi_scores ?? null,
        feedback: content,
        duration_seconds: duration,
        case_study: caseStudy,
        student_response: responseText,
      };

      const saveRes = await fetch("/api/practice/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });

      const updateResult = saveRes.ok
        ? { ok: true, id: (await saveRes.json().catch(() => ({}))).id }
        : {
            ok: false,
            status: saveRes.status,
            error: await saveRes.text(),
          };
      console.log("[practice] Database update result:", updateResult);

      if (!saveRes.ok) {
        const errText =
          typeof updateResult === "object" && "error" in updateResult ? updateResult.error : "";
        let saveErr: { error?: string } = {};
        try {
          saveErr = errText ? JSON.parse(errText) : {};
        } catch {
          saveErr = { error: errText || `Request failed: ${saveRes.status}` };
        }
        console.error("[practice] Save failed:", saveRes.status, saveErr);
        toast.error(saveErr.error ?? "Session could not be updated. Try refreshing.");
      }

      const histRes = await fetch("/api/practice/history");
      if (histRes.ok) {
        const hist = await histRes.json();
        const forEvent = (hist.sessions ?? []).filter(
          (s: { event_code?: string; event_category?: string }) =>
            (s.event_code || s.event_category) === event.code
        );
        setSessions(
          forEvent.map((s: Session) => ({
            id: s.id,
            score: s.score,
            pi_scores: s.pi_scores,
            feedback: s.feedback,
            duration_seconds: s.duration_seconds,
            created_at: s.created_at,
          }))
        );
      }
    } catch (err) {
      toast.error("Could not get feedback. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSessionId,
    event.code,
    event.name,
    event.category_key,
    template?.category_name,
    practiceStartTime,
    studentResponse,
    caseStudy,
    caseData?.instructionalArea,
  ]);

  useEffect(() => {
    if (step !== "prep" && step !== "presentation") return;
    const isPrep = step === "prep";
    const secondsLeft = isPrep ? prepSecondsLeft : presSecondsLeft;
    if (secondsLeft <= 0) {
      if (isPrep && customPrepMin > 0) {
        setStep("presentation");
        setPresSecondsLeft(customPresMin * 60);
      } else {
        handleEndPractice();
        return;
      }
    }
    timerRef.current = setInterval(() => {
      if (isPrep) {
        setPrepSecondsLeft((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return s - 1;
        });
      } else {
        setPresSecondsLeft((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return s - 1;
        });
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, prepSecondsLeft, presSecondsLeft, customPrepMin, customPresMin, handleEndPractice]);

  const startPractice = async () => {
    const createSession = async (caseStudyText?: string) => {
      if (sessionIdRef.current) {
        console.log("[practice] Session already exists, skipping duplicate create");
        return;
      }
      if (sessionCreatingRef.current) {
        console.log("[practice] Session create already in progress");
        return;
      }
      sessionCreatingRef.current = true;
      console.log("[practice] Creating session on start...");
      try {
        const startRes = await fetch("/api/practice/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_code: event.code,
            event_category: event.name,
            category: template?.category_name ?? event.category_key,
            case_study: caseStudyText ?? null,
          }),
        });
        if (startRes.ok) {
          const { id } = await startRes.json();
          console.log("[practice] Session created, ID:", id);
          if (id) {
            sessionIdRef.current = id;
            setCurrentSessionId(id);
          }
        } else {
          console.error("[practice] Create session failed:", startRes.status, await startRes.text());
        }
      } finally {
        sessionCreatingRef.current = false;
      }
    };

    if (isPrepared) {
      setPracticeStartTime(Date.now());
      await createSession();
      setStep("presentation");
      setPresSecondsLeft(customPresMin * 60);
      return;
    }
    setIsLoading(true);
    setPracticeStartTime(Date.now());
    try {
      const res = await fetch("/api/practice/generate-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_code: event.code }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; debug?: string };
        const msg = err?.debug ?? err?.error ?? `Request failed: ${res.status}`;
        throw new Error(msg);
      }
      const data = (await res.json()) as {
        case_study?: string;
        case_data?: ApiCaseData;
      };
      const study = data?.case_study ?? "";
      setCaseStudy(study);
      setCaseData(data?.case_data ?? null);
      setStudentResponse("");
      await createSession(study);
      const prep = customPrepMin * 60;
      const pres = customPresMin * 60;
      if (customPrepMin > 0) {
        setStep("prep");
        setPrepSecondsLeft(prep);
      } else {
        setStep("presentation");
        setPresSecondsLeft(pres);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate case study. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const startPresentation = () => {
    setStep("presentation");
    setPresSecondsLeft(customPresMin * 60);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      interimTranscriptRef.current = "";
      return;
    }

    const SpeechRecognitionClass =
      (typeof window !== "undefined" &&
        ((window as Window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
          (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition)) ||
      null;

    if (!SpeechRecognitionClass) {
      toast.error(
        "Voice input is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i]![0]!.transcript;
          if (event.results[i]!.isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (final) {
          setStudentResponse((prev) => (prev ? `${prev} ${final}`.trim() : final));
        }
        interimTranscriptRef.current = interim;
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          toast.error("Microphone access was denied.");
        } else if (event.error !== "aborted") {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      toast.error("Could not start voice input.");
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentSecondsLeft = step === "prep" ? prepSecondsLeft : presSecondsLeft;
  const currentPhaseLabel = step === "prep" ? "Prep" : "Presentation";

  const decaSections = caseStudy ? parseDecaCaseFormat(caseStudy) : null;
  const legacySections = caseStudy && !decaSections ? parseLegacyCaseFormat(caseStudy) : null;

  const CaseStudyCard = ({ compact = false }: { compact?: boolean }) => {
    if (!caseStudy) return null;
    if (compact) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setCaseStudyExpanded(!caseStudyExpanded)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900"
          >
            Case Study
            {caseStudyExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {caseStudyExpanded && (
            <div className="border-t border-gray-100 px-4 py-3">
              {decaSections ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="font-semibold uppercase text-[var(--gray-500)]">Event</p>
                    <p className="text-[var(--gray-800)]">
                      {decaSections["EVENT NAME"]} — {decaSections["INSTRUCTIONAL AREA"]}
                    </p>
                  </div>
                  <p className="whitespace-pre-wrap text-[var(--gray-700)]">
                    {decaSections["EVENT SITUATION"]}
                  </p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-gray-700">
                  {caseStudy}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }
    if (decaSections) {
      const skills = decaSections["21st CENTURY SKILLS"]
        ?.split(/\n/)
        .map((s) => s.replace(/^[•\-]\s*/, "").trim())
        .filter(Boolean) ?? [];
      const indicators = decaSections["PERFORMANCE INDICATORS"]
        ?.split(/\n/)
        .map((s) => s.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean) ?? [];
      const participantInstructions = decaSections["PARTICIPANT INSTRUCTIONS"]
        ?.split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean) ?? [];

      return (
        <div className="space-y-6">
          {/* Header section */}
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--deca-blue)]/5 p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[var(--deca-blue)]/20 px-3 py-1 text-xs font-semibold text-[var(--deca-blue)]">
                {decaSections["CAREER CLUSTER"]}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[var(--gray-700)]">
                {decaSections["INSTRUCTIONAL AREA"]}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-[var(--gray-900)]">
              {decaSections["EVENT NAME"]}
            </h2>
            <p className="mt-1 text-sm text-[var(--gray-500)]">
              {prepMin} min prep · {presMin} min presentation
            </p>
          </div>

          {/* Participant Instructions */}
          <div className="rounded-[var(--radius-md)] border-2 border-[var(--deca-blue)]/30 bg-[var(--gray-50)] p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
              Participant Instructions
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--gray-800)]">
              {participantInstructions.map((item, i) => (
                <li key={i} className="pl-1">
                  {item.replace(/^\d+\.\s*/, "")}
                </li>
              ))}
            </ol>
          </div>

          {/* 21st Century Skills */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)] mb-2">
              21st Century Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--deca-gold)]/20 px-3 py-1.5 text-sm font-medium text-[var(--gray-800)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)] mb-3">
              Performance Indicators
            </h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--gray-800)]">
              {indicators.map((ind, i) => (
                <li key={i} className="pl-1">{ind}</li>
              ))}
            </ol>
          </div>

          {/* Event Situation */}
          <div className="rounded-[var(--radius-md)] border-2 border-[var(--gray-300)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)] mb-3">
              Event Situation
            </h3>
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-[var(--gray-900)]">
              {decaSections["EVENT SITUATION"]}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#0072CE]/10 px-2 py-0.5 text-xs font-semibold text-[#0072CE]">
            {event.name}
          </span>
          <span className="text-xs text-gray-500">
            {prepMin} min prep · {presMin} min presentation
          </span>
        </div>
        {legacySections ? (
          <div className="space-y-4">
            {Object.entries(legacySections).map(([header, content]) => (
              <div key={header}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  {header}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-900">
                  {content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-gray-900">
            {caseStudy}
          </pre>
        )}
      </div>
    );
  };

  const entryLimit = getEntryLimit(event);
  const entryFormat = getEntryFormat(event);

  if (isPrepared) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href="/practice"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0072CE] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Practice Hub
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-500">({event.code})</p>
          {(entryFormat || entryLimit) && (
            <p className="mt-2 text-sm text-gray-600">
              {entryFormat && entryLimit
                ? `${entryFormat} format, ${entryLimit} max`
                : entryFormat || entryLimit}
              {event.category_key === "integrated_marketing_campaign" &&
                " — Pitch deck format, max 20 slides"}
            </p>
          )}
        </div>
        {step === "intro" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-gray-600">
              Upload a PDF or paste your plan/report below. The AI will evaluate
              it using the event rubric:
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-gray-600">
              {Object.entries(PREPARED_EVENT_SCORING).map(([k, v]) => (
                <li key={k}>
                  {k}: /{v}
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload PDF (optional)
                </label>
                <input
                  id="written-pdf"
                  type="file"
                  accept="application/pdf"
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0072CE] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:hover:bg-[#004B87]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Or paste your written content
                </label>
                <textarea
                  id="written-content"
                  rows={12}
                  placeholder="Paste your business plan, marketing campaign, operations research report, or project management submission here..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-[#0072CE] focus:outline-none focus:ring-1 focus:ring-[#0072CE]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const pdfInput = document.getElementById("written-pdf") as HTMLInputElement;
                const textarea = document.getElementById("written-content") as HTMLTextAreaElement;
                const pdfFile = pdfInput?.files?.[0];
                const pastedContent = textarea?.value?.trim();

                if (!pdfFile && !pastedContent) {
                  toast.error("Please upload a PDF or paste your written content.");
                  return;
                }

                setIsLoading(true);
                setPracticeStartTime(Date.now());
                try {
                  let sessionId = sessionIdRef.current ?? currentSessionId;
                  if (!sessionId) {
                    const createRes = await fetch("/api/practice/start", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_code: event.code,
                        event_category: event.name,
                        category: template?.category_name ?? event.category_key,
                      }),
                    });
                    if (createRes.ok) {
                      const { id } = await createRes.json();
                      if (id) {
                        sessionId = id;
                        sessionIdRef.current = id;
                        setCurrentSessionId(id);
                      }
                    }
                  }

                  let res: Response;
                  if (pdfFile) {
                    const formData = new FormData();
                    formData.append("file", pdfFile);
                    formData.append("event_code", event.code);
                    res = await fetch("/api/practice/evaluate-pdf", {
                      method: "POST",
                      body: formData,
                      credentials: "same-origin",
                    });
                  } else {
                    res = await fetch("/api/practice", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        event_code: event.code,
                        event_category: event.name,
                        category: template?.category_name ?? event.category_key,
                        messages: [
                          {
                            role: "user",
                            content: `[Written submission for evaluation]\n\n${pastedContent}`,
                          },
                        ],
                        request_feedback: true,
                      }),
                    });
                  }

                  const rawBody = await res.text();
                  let data = {} as {
                    content?: string;
                    pi_scores?: Record<string, number>;
                    overall_score?: number;
                    error?: string;
                  };
                  try {
                    data = rawBody ? (JSON.parse(rawBody) as typeof data) : {};
                  } catch {
                    data = {
                      error:
                        rawBody.slice(0, 280) ||
                        `Request failed (${res.status} ${res.statusText || ""})`.trim(),
                    };
                  }

                  if (!res.ok) {
                    const msg =
                      data.error ||
                      (res.status === 413
                        ? "Upload too large for the server. Use a smaller PDF or paste text."
                        : "Something went wrong. Please try again.");
                    console.error("[practice] evaluate failed:", res.status, msg);
                    toast.error(msg);
                    return;
                  }

                  setFeedback(data?.content ?? "");
                  setStep("results");

                  const duration = practiceStartTime
                    ? Math.round((Date.now() - practiceStartTime) / 1000)
                    : null;
                  const score =
                    data?.overall_score ??
                    (() => {
                      const scoreMatch = (data?.content ?? "").match(
                        /(?:Overall\s+)?Score[:\s]*(\d+)(?:\/100)?/i
                      );
                      return scoreMatch ? parseInt(scoreMatch[1], 10) : null;
                    })();
                  const saveRes = await fetch("/api/practice/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      session_id: sessionId,
                      event_code: event.code,
                      event_category: event.name,
                      category: template?.category_name ?? event.category_key,
                      score,
                      pi_scores: data?.pi_scores ?? null,
                      feedback: data?.content ?? "",
                      duration_seconds: duration,
                      student_response: (pastedContent ?? studentResponse.trim()) || null,
                    }),
                  });
                  if (!saveRes.ok) {
                    const text = await saveRes.text();
                    let saveErr: { error?: string } = {};
                    try {
                      saveErr = JSON.parse(text);
                    } catch {
                      saveErr = { error: text || `Request failed: ${saveRes.status}` };
                    }
                    console.error("[practice] Prepared save failed:", saveRes.status, saveErr);
                    toast.error(saveErr.error ?? "Session could not be updated. Try refreshing.");
                  }
                } catch (e) {
                  console.error("[practice] evaluate request error:", e);
                  toast.error(
                    e instanceof Error
                      ? e.message
                      : "Could not evaluate. Please try again."
                  );
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="mt-4 flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004B87] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Evaluate My Submission
            </button>
          </div>
        )}
        {step === "results" && feedback && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Evaluation Results
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="points-earned-badge inline-flex items-center gap-1.5 rounded-full border border-[#00539B20] bg-[#E8F1FA] px-3.5 py-1.5 font-bold text-[13px] text-[#00539B]">
                +5 PTS ◇
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                {feedback}
              </pre>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  clearPracticeSessionId();
                  setStep("intro");
                  setFeedback(null);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#0072CE] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004B87]"
              >
                <RotateCcw className="h-4 w-4" />
                Submit Another
              </button>
              <Link
                href="/practice"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Practice Hub
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in-up">
      <Link
        href="/practice"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--deca-blue)] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Practice
      </Link>

      {step === "intro" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Event details — 7 cols */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-[var(--gray-900)]">{event.name}</h1>
                <span className="rounded-full bg-[var(--gray-100)] px-2 py-0.5 text-xs font-medium text-[var(--gray-600)]">
                  {event.code}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--gray-500)]">
                {template?.category_name ?? event.category_key}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-2">
                Format
              </h3>
              <p className="text-sm text-[var(--gray-700)]">
                Individual event — you&apos;ll receive a case study and present your solution to a panel of judges.
                {isTeam && (
                  <span className="mt-2 block text-amber-600">
                    Note: This is solo practice. The real event has {participants} participants.
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-2">
                What to expect
              </h3>
              <ul className="space-y-2 text-sm text-[var(--gray-700)]">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" />
                  {customPrepMin > 0
                    ? `${customPrepMin} minutes to read and prepare your response`
                    : "You&apos;ll receive the case study when you start"}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" />
                  {customPresMin} minutes to present your solution
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" />
                  AI will act as a judge and provide feedback
                </li>
              </ul>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-2">
                Performance Indicators
              </h3>
              <ul className="space-y-1 text-sm text-[var(--gray-700)]">
                {Object.entries(ROLEPLAY_PI_SCORING).map(([k, v]) => (
                  <li key={k}>• {k.replace("[cluster]", event.cluster)}: /{v}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-2">
                Past Attempts
              </h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-[var(--gray-500)]">
                  No previous attempts. Your practice history will appear here.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--gray-700)]">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-medium text-[var(--deca-blue)]">
                        {s.score != null ? `${(s.score / 10).toFixed(1)}/10` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Session config — 5 cols */}
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--gray-50)] p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--gray-500)] mb-4">
                Practice Session
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-medium text-[var(--gray-700)]">Prep Time</label>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={customPrepMin}
                      onChange={(e) => setCustomPrepMin(Number(e.target.value))}
                      className="rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-sm text-[var(--gray-900)]"
                    >
                      {PREP_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m === 0 ? "0 min" : `${m} min`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-[var(--gray-700)]">Presentation Time</label>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={customPresMin}
                      onChange={(e) => setCustomPresMin(Number(e.target.value))}
                      className="rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-sm text-[var(--gray-900)]"
                    >
                      {PRES_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startPractice}
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--deca-blue)] text-[15px] font-bold text-white transition hover:bg-[var(--deca-blue-dark)] disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  Start Practice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "prep" && caseStudy && (
        <div className="space-y-6">
          {/* Timer bar */}
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]">
                  Prep Phase
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("End this practice session? Your progress will not be saved.")) {
                      clearPracticeSessionId();
                      setStep("intro");
                      setCaseStudy(null);
                      setCaseData(null);
                      setPrepNotes("");
                      setStudentResponse("");
                    }
                  }}
                  className="text-xs font-medium text-[var(--gray-500)] hover:text-[var(--gray-700)]"
                >
                  End Session ×
                </button>
              </div>
              <span
                className={`text-2xl font-bold ${
                  prepSecondsLeft <= 10
                    ? "text-[var(--error)]"
                    : prepSecondsLeft <= 60
                      ? "text-[var(--warning)]"
                      : "text-[var(--gray-900)]"
                }`}
              >
                {formatTime(prepSecondsLeft)} remaining
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--gray-200)]">
              <div
                className={`h-full rounded-full transition-all ${
                  prepSecondsLeft <= 10 ? "bg-[var(--error)]" : "bg-[var(--deca-blue)]"
                }`}
                style={{
                  width: `${((customPrepMin * 60 - prepSecondsLeft) / (customPrepMin * 60)) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">
              <CaseStudyCard />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 shadow-sm">
                <label className="text-[13px] font-medium text-[var(--gray-700)]">
                  Your Notes
                </label>
                <p className="mt-0.5 text-xs text-[var(--gray-500)]">
                  Type your notes and key points here during prep time.
                </p>
                <textarea
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder="Key points, structure, examples..."
                  rows={12}
                  className="mt-3 w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 py-2 text-[15px] leading-[1.7] text-[var(--gray-800)] placeholder:text-[var(--gray-400)] focus:border-[var(--deca-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--deca-blue)]"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={startPresentation}
              className="flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--deca-blue-dark)]"
            >
              Ready to Present →
            </button>
          </div>
        </div>
      )}

      {step === "presentation" && caseStudy && (
        <div className="flex flex-col space-y-6">
          {/* Timer bar */}
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]">
                  Presentation Phase
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("End this practice session? Your response will not be evaluated.")) {
                      clearPracticeSessionId();
                      setStep("intro");
                      setCaseStudy(null);
                      setCaseData(null);
                      setPrepNotes("");
                      setStudentResponse("");
                    }
                  }}
                  className="text-xs font-medium text-[var(--gray-500)] hover:text-[var(--gray-700)]"
                >
                  End Session ×
                </button>
              </div>
              <span
                className={`text-2xl font-bold ${
                  presSecondsLeft <= 10
                    ? "text-[var(--error)]"
                    : presSecondsLeft <= 60
                      ? "text-[var(--warning)]"
                      : "text-[var(--gray-900)]"
                }`}
              >
                {formatTime(presSecondsLeft)} remaining
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--gray-200)]">
              <div
                className={`h-full rounded-full transition-all ${
                  presSecondsLeft <= 10 ? "bg-[var(--error)]" : "bg-[var(--deca-blue)]"
                }`}
                style={{
                  width: `${((customPresMin * 60 - presSecondsLeft) / (customPresMin * 60)) * 100}%`,
                }}
              />
            </div>
          </div>
          {/* Dimmed case study + notes */}
          <div className="grid grid-cols-12 gap-6 opacity-70">
            <div className="col-span-12 lg:col-span-7">
              <CaseStudyCard compact />
            </div>
            <div className="col-span-12 lg:col-span-5">
              <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 shadow-sm">
                <p className="text-[13px] font-medium text-[var(--gray-700)]">Your Notes</p>
                <pre className="mt-2 whitespace-pre-wrap text-sm text-[var(--gray-600)]">
                  {prepNotes || "(No notes)"}
                </pre>
              </div>
            </div>
          </div>
          {/* Presentation input */}
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-sm font-semibold text-[var(--gray-900)]">
              💬 Presentation Input
            </h3>
            <p className="mt-1 text-xs text-[var(--gray-500)]">
              Type or speak your presentation response here. The AI judge is listening.
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    isRecording
                      ? "bg-red-600 text-white shadow-md animate-pulse"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {isRecording ? (
                    <StopCircle className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {isRecording ? "Stop Recording" : "Voice Input"}
                </button>
                {isRecording && (
                  <span className="flex items-center gap-2 text-sm text-red-600">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                    </span>
                    Listening...
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={studentResponse}
              onChange={(e) => setStudentResponse(e.target.value)}
              placeholder="Type your presentation response here, or use Voice Input to speak and transcribe."
              rows={10}
              className="mt-3 block min-h-[200px] w-full rounded-[var(--radius-sm)] border border-[var(--gray-200)] px-4 py-3 text-[15px] leading-[1.7] text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:border-[var(--deca-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--deca-blue)]"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleEndPractice}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--deca-blue-dark)] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Response →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "results" && feedback && (
        <div className="space-y-6">
          {/* Page header with actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-[var(--gray-900)]">
              {event.name} — Results
            </h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearPracticeSessionId();
                  setStep("intro");
                  setCaseStudy(null);
                  setCaseData(null);
                  setStudentResponse("");
                  setPrepNotes("");
                  setFeedback(null);
                  setResultData(null);
                }}
                className="flex items-center gap-2 rounded-lg bg-[var(--deca-blue)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)]"
              >
                <RotateCcw className="h-4 w-4" />
                Practice Again ↻
              </button>
              <Link
                href="/practice"
                className="flex items-center gap-2 rounded-lg border border-[var(--gray-200)] bg-white px-4 py-2 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Practice
              </Link>
            </div>
          </div>

          {/* Overall score */}
          {resultData?.overall_score != null && (
            <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)] mb-4">
                Overall Score
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-4 ${
                    resultData.overall_score >= 80
                      ? "border-[var(--success)] text-[var(--success)]"
                      : resultData.overall_score >= 60
                        ? "border-[var(--deca-gold)] text-[var(--deca-gold)]"
                        : "border-[var(--warning)] text-[var(--warning)]"
                  }`}
                >
                  <span className="text-3xl font-bold">
                    {(resultData.overall_score / 10).toFixed(1)}
                  </span>
                </div>
                <div>
                  <p className="text-lg text-[var(--gray-400)]">out of 10</p>
                  {resultData.overall_feedback && (
                    <p className="mt-1 text-sm text-[var(--gray-700)]">
                      &quot;{resultData.overall_feedback}&quot;
                    </p>
                  )}
                </div>
                <div className="points-earned-badge inline-flex items-center gap-1.5 rounded-full border border-[var(--deca-blue)]/20 bg-[var(--deca-blue-light)] px-3.5 py-1.5 font-bold text-[13px] text-[var(--deca-blue)]">
                  +5 PTS ◇
                </div>
              </div>
            </div>
          )}

          {/* Category scores */}
          {resultData?.pi_scores && Object.keys(resultData.pi_scores).length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Object.entries(resultData.pi_scores).map(([name, score]) => {
                const max = name.includes("Knowledge") || name.includes("Critical") ? 30 : name.includes("Communication") ? 25 : 15;
                const pct = (score / max) * 100;
                return (
                  <div
                    key={name}
                    className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-4 shadow-sm"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--gray-500)] truncate" title={name}>
                      {name.split(" ")[0]}
                    </p>
                    <p className="mt-1 text-xl font-bold text-[var(--deca-blue)]">
                      {score}/{max}
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--gray-200)]">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 80 ? "bg-[var(--success)]" : pct >= 60 ? "bg-[var(--deca-gold)]" : "bg-[var(--warning)]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed feedback */}
          <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)] mb-4">
              Detailed Feedback
            </h3>
            {resultData?.strengths && resultData.strengths.length > 0 && (
              <div className="mb-6 border-l-4 border-[var(--success)] pl-4">
                <p className="text-sm font-semibold text-[var(--gray-900)]">✅ Strengths</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--gray-700)]">
                  {resultData.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {resultData?.improvements && resultData.improvements.length > 0 && (
              <div className="mb-6 border-l-4 border-[var(--deca-gold)] pl-4">
                <p className="text-sm font-semibold text-[var(--gray-900)]">🔶 Areas for Improvement</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--gray-700)]">
                  {resultData.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {resultData?.tips && resultData.tips.length > 0 && (
              <div className="border-l-4 border-[var(--deca-blue)] pl-4">
                <p className="text-sm font-semibold text-[var(--gray-900)]">💡 Tips for Next Time</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--gray-700)]">
                  {resultData.tips.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {(!resultData?.strengths?.length && !resultData?.improvements?.length && !resultData?.tips?.length) && (
              <div className="rounded-lg bg-[var(--gray-50)] p-4">
                <pre className="whitespace-pre-wrap text-sm text-[var(--gray-800)]">{feedback}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "results" && sessions.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-[var(--gray-900)]">
            Your history for {event.code}
          </h2>
          <ul className="mt-4 space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3"
              >
                <span className="text-sm text-[var(--gray-500)]">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-3">
                  {s.duration_seconds != null && (
                    <span className="text-xs text-[var(--gray-500)]">
                      {Math.floor(s.duration_seconds / 60)}m
                    </span>
                  )}
                  {s.score != null && (
                    <span className="rounded-full bg-[var(--deca-blue-light)] px-2.5 py-0.5 text-sm font-medium text-[var(--deca-blue)]">
                      {(s.score / 10).toFixed(1)}/10
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
