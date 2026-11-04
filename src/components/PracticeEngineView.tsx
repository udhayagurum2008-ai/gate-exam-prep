import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  FolderPlus,
  Grid,
  HelpCircle,
  MessageSquarePlus,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  AnswerRecord,
  CustomRevisionList,
  DifficultyType,
  EnrichedQuestion,
  ExamCategory,
  ExamMarkingScheme,
  ExamSessionResult,
  FilterState,
  PracticeMode,
  QuestionNote,
  QuestionReport,
  SectionType,
  SortOption,
  StatusFilter,
  SubjectDomain,
} from '../types/gate';
import {
  calculateExamResult,
  DOMAIN_SHORT_LABELS,
  EXAM_MARKING_SCHEMES,
  getAvailableTopics,
} from '../lib/engine';

interface PracticeEngineViewProps {
  allQuestions: EnrichedQuestion[];
  filteredQuestions: EnrichedQuestion[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  practiceMode: PracticeMode;
  setPracticeMode: (mode: PracticeMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  answers: Record<string, AnswerRecord>;
  bookmarks: Set<string>;
  notes: Record<string, QuestionNote>;
  customLists: CustomRevisionList[];
  onAnswerQuestion: (questionId: string, selectedIndex: number, timeSpentMs: number) => void;
  onRevealAnswer: (questionId: string, timeSpentMs: number) => void;
  onClearSingleQuestion: (questionId: string) => void;
  onToggleBookmark: (questionId: string) => void;
  onSaveNote: (questionId: string, text: string) => void;
  onSubmitReport: (report: Omit<QuestionReport, 'createdAt'>) => void;
  onToggleQuestionInList: (listId: string, questionId: string) => void;
  onShuffleFiltered: () => void;
  onResetFilters: () => void;
  onResetAllProgress: () => void;
  onCompleteExam: (
    result: ExamSessionResult,
    examQuestions: EnrichedQuestion[],
    selections: Record<string, number | null>
  ) => void;
}

export const PracticeEngineView: React.FC<PracticeEngineViewProps> = ({
  allQuestions,
  filteredQuestions,
  currentIndex,
  setCurrentIndex,
  practiceMode,
  setPracticeMode,
  filters,
  setFilters,
  answers,
  bookmarks,
  notes,
  customLists,
  onAnswerQuestion,
  onRevealAnswer,
  onClearSingleQuestion,
  onToggleBookmark,
  onSaveNote,
  onSubmitReport,
  onToggleQuestionInList,
  onShuffleFiltered,
  onResetFilters,
  onResetAllProgress,
  onCompleteExam,
}) => {
  const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now());
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [gridPage, setGridPage] = useState<number>(0);
  const [jumpInput, setJumpInput] = useState<string>('');
  const [showNoteEditor, setShowNoteEditor] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<QuestionReport['reason']>('unclear_explanation');
  const [reportComment, setReportComment] = useState<string>('');
  const [reportSubmittedToast, setReportSubmittedToast] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showListDropdown, setShowListDropdown] = useState<boolean>(false);

  // Exam Simulation State
  const [examStatus, setExamStatus] = useState<'setup' | 'running' | 'review_confirm' | 'completed'>('setup');
  const [examQuestionCount, setExamQuestionCount] = useState<number>(15);
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(20);
  const [examDomainFilter, setExamDomainFilter] = useState<'all_filtered' | 'ece_gate' | 'placement_full'>('all_filtered');
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('gate_standard');
  const [examQuestions, setExamQuestions] = useState<EnrichedQuestion[]>([]);
  const [examIndex, setExamIndex] = useState<number>(0);
  const [examSelections, setExamSelections] = useState<Record<string, number | null>>({});
  const [examMarkedReview, setExamMarkedReview] = useState<Set<string>>(new Set());
  const [examRemainingSec, setExamRemainingSec] = useState<number>(1200);
  const [examLastResult, setExamLastResult] = useState<ExamSessionResult | null>(null);

  const currentQuestion = filteredQuestions[currentIndex];

  // Reset per-question timer and sync note draft when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
    setShowListDropdown(false);
    if (currentQuestion) {
      const existingNote = notes[currentQuestion.id]?.text || '';
      setNoteDraft(existingNote);
      setShowNoteEditor(Boolean(existingNote));
    }
    setGridPage(Math.floor(currentIndex / 50));
  }, [currentIndex, currentQuestion?.id]);

  // Exam countdown timer
  useEffect(() => {
    if (practiceMode !== 'exam' || examStatus !== 'running') return;
    const timer = window.setInterval(() => {
      setExamRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [practiceMode, examStatus]);

  // Auto-submit exam if timer hits 0
  useEffect(() => {
    if (practiceMode === 'exam' && examStatus === 'running' && examRemainingSec === 0 && examQuestions.length > 0) {
      handleFinishExam();
    }
  }, [examRemainingSec, practiceMode, examStatus]);

  // Keyboard shortcuts for Normal/Topic/Weakness/Revision/Random practice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (practiceMode === 'exam') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (currentQuestion && !answers[currentQuestion.id]) {
          const elapsed = Math.max(500, Date.now() - questionStartTime);
          onAnswerQuestion(currentQuestion.id, idx, elapsed);
        }
      } else if (e.key.toLowerCase() === 'b' && currentQuestion) {
        onToggleBookmark(currentQuestion.id);
      } else if (e.key.toLowerCase() === 's' && currentQuestion && !answers[currentQuestion.id]) {
        const elapsed = Math.max(500, Date.now() - questionStartTime);
        onRevealAnswer(currentQuestion.id, elapsed);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const availableTopics = useMemo(
    () => getAvailableTopics(allQuestions, filters.sec, filters.domain),
    [allQuestions, filters.sec, filters.domain]
  );

  const liveStats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let answered = 0;
    Object.values(answers).forEach((a) => {
      if (a.correct === true) {
        correct++;
        answered++;
      } else if (a.correct === false && a.selected !== null) {
        wrong++;
        answered++;
      }
    });
    const legacyScore = correct - wrong;
    const gateScore = Math.round((correct - wrong / 3) * 100) / 100;
    return { correct, wrong, answered, legacyScore, gateScore };
  }, [answers]);

  const handleNext = () => {
    if (!filteredQuestions.length) return;
    setCurrentIndex((prev) => (prev < filteredQuestions.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (!filteredQuestions.length) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredQuestions.length - 1));
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= filteredQuestions.length) {
      setCurrentIndex(num - 1);
      setJumpInput('');
    }
  };

  // Start Exam Simulation
  const handleStartExam = () => {
    let pool = filteredQuestions.length >= examQuestionCount ? [...filteredQuestions] : [...allQuestions];
    if (examDomainFilter === 'ece_gate') {
      pool = allQuestions.filter(
        (q) => !q.isDuplicateStem && (q.domain === 'ece_core' || q.domain === 'eng_math' || q.exam.includes('GATE'))
      );
    } else if (examDomainFilter === 'placement_full') {
      pool = allQuestions.filter((q) => !q.isDuplicateStem && q.exam.includes('Placement'));
    }

    // Shuffle pool deterministically with Fisher-Yates
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    const selectedQuestions = copy.slice(0, Math.min(examQuestionCount, copy.length));
    setExamQuestions(selectedQuestions);
    setExamIndex(0);
    setExamSelections({});
    setExamMarkedReview(new Set());
    setExamRemainingSec(examDurationMinutes * 60);
    setExamLastResult(null);
    setExamStatus('running');
  };

  const handleFinishExam = () => {
    const scheme: ExamMarkingScheme =
      EXAM_MARKING_SCHEMES.find((s) => s.id === selectedSchemeId) || EXAM_MARKING_SCHEMES[0];
    const timeLimitSec = examDurationMinutes * 60;
    const durationSec = Math.max(1, timeLimitSec - examRemainingSec);
    const title =
      examDomainFilter === 'ece_gate'
        ? `GATE ECE Mock (${examQuestions.length} Q)`
        : examDomainFilter === 'placement_full'
        ? `Placement Mock (${examQuestions.length} Q)`
        : `Custom Mock Exam (${examQuestions.length} Q)`;

    const result = calculateExamResult(
      examQuestions,
      examSelections,
      scheme,
      durationSec,
      timeLimitSec,
      title
    );
    setExamLastResult(result);
    setExamStatus('completed');
    onCompleteExam(result, examQuestions, examSelections);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const modeTabs: { id: PracticeMode; label: string }[] = [
    { id: 'normal', label: 'Normal Practice' },
    { id: 'exam', label: 'Exam Simulation' },
    { id: 'topic', label: 'Topic Practice' },
    { id: 'weakness', label: 'Weakness Practice' },
    { id: 'revision', label: 'Revision Mode' },
    { id: 'random', label: 'Random Challenge' },
  ];

  // ============================================================================
  // RENDER EXAM SIMULATION MODE
  // ============================================================================
  if (practiceMode === 'exam') {
    const currentExamQ = examQuestions[examIndex];
    const scheme =
      EXAM_MARKING_SCHEMES.find((s) => s.id === selectedSchemeId) || EXAM_MARKING_SCHEMES[0];

    return (
      <div className="space-y-6">
        {/* Mode Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="flex flex-wrap items-center gap-1">
            {modeTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPracticeMode(t.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  practiceMode === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {examStatus === 'running' && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums font-bold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Time Left: {formatTimer(examRemainingSec)}
              </span>
              <button
                type="button"
                onClick={() => setExamStatus('review_confirm')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
              >
                Review &amp; Submit Exam
              </button>
            </div>
          )}
        </div>

        {/* Exam Setup State */}
        {examStatus === 'setup' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Configure Timed Exam Simulation
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Simulate real test conditions with answer-changing before submission, question review palette, and transparent marking rules.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="examPresetSelect"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Question Pool &amp; Pattern
                </label>
                <select
                  id="examPresetSelect"
                  value={examDomainFilter}
                  onChange={(e) => setExamDomainFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="all_filtered">
                    Current Filtered Pool ({filteredQuestions.length.toLocaleString()} questions)
                  </option>
                  <option value="ece_gate">
                    GATE ECE Core + Engineering Math + Aptitude
                  </option>
                  <option value="placement_full">
                    Core &amp; IT Placement Assessment Pool
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="examCountSelect"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Number of Questions &amp; Duration
                </label>
                <select
                  id="examCountSelect"
                  value={examQuestionCount}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setExamQuestionCount(count);
                    if (count === 15) setExamDurationMinutes(20);
                    else if (count === 30) setExamDurationMinutes(45);
                    else if (count === 65) setExamDurationMinutes(180);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={15}>15 Questions — 20 Minutes (Quick Sprint)</option>
                  <option value={30}>30 Questions — 45 Minutes (Subject Test)</option>
                  <option value={65}>65 Questions — 180 Minutes (Full Length Mock)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Marking Scheme (Transparent &amp; Configurable)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXAM_MARKING_SCHEMES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSchemeId(s.id)}
                    className={`p-3.5 text-left rounded-lg border transition-colors cursor-pointer ${
                      selectedSchemeId === s.id
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      {s.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleStartExam}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Start Timed Examination
              </button>
            </div>
          </div>
        )}

        {/* Active Exam Running State */}
        {examStatus === 'running' && currentExamQ && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Question Panel (8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    Question {examIndex + 1} of {examQuestions.length}
                  </div>
                  <div>
                    <span>{currentExamQ.topic}</span>
                    <span className="mx-1.5">·</span>
                    <span>{currentExamQ.diff}</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono">+{scheme.correctMarks} / −{Math.round(scheme.negativeMarks * 100) / 100}</span>
                  </div>
                </div>

                <div className="py-5 text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {currentExamQ.q}
                </div>

                <div className="space-y-2.5">
                  {currentExamQ.opts.map((opt, idx) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const isSelected = examSelections[currentExamQ.id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setExamSelections((prev) => ({
                            ...prev,
                            [currentExamQ.id]: idx,
                          }))
                        }
                        className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 dark:border-blue-500 text-slate-900 dark:text-slate-100'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {letters[idx]}
                        </span>
                        <span className="text-sm leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExamMarkedReview((prev) => {
                        const next = new Set(prev);
                        if (next.has(currentExamQ.id)) next.delete(currentExamQ.id);
                        else next.add(currentExamQ.id);
                        return next;
                      });
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                      examMarkedReview.has(currentExamQ.id)
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-800 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {examMarkedReview.has(currentExamQ.id) ? '★ Marked for Review' : 'Mark for Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExamSelections((prev) => ({
                        ...prev,
                        [currentExamQ.id]: null,
                      }))
                    }
                    className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Clear Response
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={examIndex === 0}
                    onClick={() => setExamIndex((i) => Math.max(0, i - 1))}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (examIndex < examQuestions.length - 1) {
                        setExamIndex((i) => i + 1);
                      } else {
                        setExamStatus('review_confirm');
                      }
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    {examIndex < examQuestions.length - 1 ? 'Save & Next →' : 'Review Summary →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Question Palette (4 cols) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Question Navigation Palette
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mb-4 font-mono tabular-nums">
                  <div>
                    Answered: <b>{Object.values(examSelections).filter((v) => v !== null && v !== undefined).length}</b>
                  </div>
                  <div>
                    Marked Review: <b>{examMarkedReview.size}</b>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-80 overflow-y-auto p-1">
                  {examQuestions.map((q, idx) => {
                    const isAnswered =
                      examSelections[q.id] !== undefined && examSelections[q.id] !== null;
                    const isMarked = examMarkedReview.has(q.id);
                    const isCurrent = idx === examIndex;

                    let btnCls =
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
                    if (isAnswered && isMarked) {
                      btnCls = 'bg-purple-600 text-white border-purple-600';
                    } else if (isMarked) {
                      btnCls = 'bg-amber-500 text-white border-amber-500';
                    } else if (isAnswered) {
                      btnCls = 'bg-emerald-600 text-white border-emerald-600';
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setExamIndex(idx)}
                        className={`h-9 rounded-lg border text-xs font-mono tabular-nums font-semibold transition-all cursor-pointer ${btnCls} ${
                          isCurrent ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExamStatus('review_confirm')}
                  className="w-full py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                >
                  Proceed to Pre-Submission Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pre-Submission Review Screen */}
        {examStatus === 'review_confirm' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Review Before Final Submission
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Answered</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
                  {Object.values(examSelections).filter((v) => v !== null && v !== undefined).length}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Unanswered</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300 mt-1">
                  {examQuestions.length -
                    Object.values(examSelections).filter((v) => v !== null && v !== undefined).length}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Marked for Review</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 mt-1">
                  {examMarkedReview.size}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setExamStatus('running')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                ← Return to Questions
              </button>
              <button
                type="button"
                onClick={handleFinishExam}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Confirm &amp; Submit Final Exam
              </button>
            </div>
          </div>
        )}

        {/* Completed Exam Scorecard & Detailed Solutions */}
        {examStatus === 'completed' && examLastResult && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {examLastResult.title} · {examLastResult.mode}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Examination Performance Scorecard
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setExamStatus('setup')}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                >
                  Start Another Mock Exam
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
                <div>
                  <div className="text-xs text-slate-500">Final Score</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                    {examLastResult.score} / {examLastResult.maxScore}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Accuracy</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {examLastResult.accuracy}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Correct</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
                    ✓ {examLastResult.correct}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Incorrect</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-1">
                    ✗ {examLastResult.wrong}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Time Taken</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                    {formatTimer(examLastResult.durationSec)}
                  </div>
                </div>
              </div>
            </div>

            {/* Question-by-Question Solution Review */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Detailed Question &amp; Solution Review
              </h3>
              {examQuestions.map((q, idx) => {
                const userSel = examSelections[q.id];
                const isCorrect = userSel === q.ans;
                const letters = ['A', 'B', 'C', 'D'];
                return (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono font-semibold">
                        Q{idx + 1} · {q.id} · {q.topic}
                      </span>
                      <span
                        className={`font-semibold ${
                          userSel === undefined || userSel === null
                            ? 'text-slate-500'
                            : isCorrect
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {userSel === undefined || userSel === null
                          ? 'Unattempted (0)'
                          : isCorrect
                          ? `✓ Correct (+${scheme.correctMarks})`
                          : `✗ Incorrect (−${Math.round(scheme.negativeMarks * 100) / 100})`}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                      {q.q}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div>
                        <b>Your Answer:</b>{' '}
                        {userSel !== undefined && userSel !== null
                          ? `${letters[userSel]}. ${q.opts[userSel]}`
                          : 'Not Attempted'}
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400">
                        <b>Correct Option:</b> {letters[q.ans]}. {q.opts[q.ans]}
                      </div>
                      <div className="pt-2 text-slate-600 dark:text-slate-400">
                        <b>Solution:</b> {q.sol}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        <b>Formula / Key Takeaway:</b> {q.form}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER INTERACTIVE PRACTICE ENGINE (NORMAL, TOPIC, WEAKNESS, REVISION, RANDOM)
  // ============================================================================
  const savedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isBookmarked = currentQuestion ? bookmarks.has(currentQuestion.id) : false;
  const letters = ['A', 'B', 'C', 'D'];
  const totalGridPages = Math.ceil(filteredQuestions.length / 50);
  const gridSlice = filteredQuestions.slice(gridPage * 50, (gridPage + 1) * 50);

  return (
    <div className="space-y-5">
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Practice Modes">
          {modeTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={practiceMode === t.id}
              onClick={() => setPracticeMode(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                practiceMode === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                uniqueStemsOnly: !prev.uniqueStemsOnly,
              }))
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
              filters.uniqueStemsOnly
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Verify 100% unique question stems across all 20,000 question IDs"
          >
            {filters.uniqueStemsOnly
              ? `✓ Unique Stems (${allQuestions.length.toLocaleString()})`
              : `All ${allQuestions.length.toLocaleString()} IDs`}
          </button>

          <button
            type="button"
            onClick={() => setShowGrid((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
          >
            <Grid className="w-3.5 h-3.5" />
            {showGrid ? 'Hide Grid' : 'Question Grid'}
          </button>
        </div>
      </div>

      {/* Multi-Filter & Search Panel */}
      <section
        aria-label="Question Filters"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Section Filter (Preserves original #sectionFilter ID) */}
          <div>
            <label htmlFor="sectionFilter" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Bank Section
            </label>
            <select
              id="sectionFilter"
              value={filters.sec}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  sec: e.target.value as 'all' | SectionType,
                }));
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Sections ({allQuestions.length.toLocaleString()})</option>
              <option value="technical">Technical (ECE + Math + CS)</option>
              <option value="quant">Quantitative Aptitude</option>
              <option value="reasoning">Reasoning / Verbal</option>
            </select>
          </div>

          {/* 2. Subject Domain Filter */}
          <div>
            <label htmlFor="domainFilter" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Engineering Domain
            </label>
            <select
              id="domainFilter"
              value={filters.domain}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  domain: e.target.value as 'all' | SubjectDomain,
                }));
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Domains</option>
              <option value="ece_core">GATE ECE Core Subjects</option>
              <option value="eng_math">Engineering Mathematics</option>
              <option value="cs_placement">CS / IT &amp; Coding</option>
              <option value="quant_aptitude">Quantitative Aptitude</option>
              <option value="reasoning_verbal">Logical &amp; Verbal</option>
            </select>
          </div>

          {/* 3. Topic Filter (Preserves original #topicFilter ID) */}
          <div>
            <label htmlFor="topicFilter" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Topic ({availableTopics.length})
            </label>
            <select
              id="topicFilter"
              value={filters.topic}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  topic: e.target.value,
                }));
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Topics ({availableTopics.length})</option>
              {availableTopics.map((t) => (
                <option key={t.topic} value={t.topic}>
                  {t.topic} ({t.count})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Difficulty Filter (Preserves original #difficultyFilter ID) */}
          <div>
            <label htmlFor="difficultyFilter" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Difficulty
            </label>
            <select
              id="difficultyFilter"
              value={filters.diff}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  diff: e.target.value as 'all' | DifficultyType,
                }));
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* 5. Exam Filter (Preserves original #examFilter ID) */}
          <div>
            <label htmlFor="examFilter" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Target Exam
            </label>
            <select
              id="examFilter"
              value={filters.exam}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  exam: e.target.value as 'all' | ExamCategory,
                }));
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Exams</option>
              <option value="GATE">GATE</option>
              <option value="Placement">Placement</option>
              <option value="GATE + Placement">GATE + Placement</option>
            </select>
          </div>

          {/* 6. Status Filter (Preserves original #statusFilter ID) */}
          <div>
            <label htmlFor="statusFilter" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Response Status
            </label>
            <select
              id="statusFilter"
              value={filters.status}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as StatusFilter,
                }));
              }}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Questions</option>
              <option value="unanswered">Unanswered</option>
              <option value="answered">Answered</option>
              <option value="correct">Correct</option>
              <option value="wrong">Wrong</option>
              <option value="revealed">Answer Revealed</option>
              <option value="bookmarked">Bookmarked</option>
              <option value="due_revision">Due for Revision</option>
              <option value="repeated_mistakes">Repeated Mistakes (2+)</option>
            </select>
          </div>
        </div>

        {/* Search Input + Sort + Action Buttons Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="searchInput"
              type="text"
              value={filters.search}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value,
                }));
              }}
              placeholder="Search by question text, topic, ID (e.g. T401), formula, or keyword..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Sort questions by"
              value={filters.sortBy}
              onChange={(e) => {
                setCurrentIndex(0);
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as SortOption,
                }));
              }}
              className="px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="default">Sort: Default Order</option>
              <option value="id_asc">Sort: Question ID</option>
              <option value="difficulty_asc">Sort: Easy → Hard</option>
              <option value="difficulty_desc">Sort: Hard → Easy</option>
              <option value="most_mistakes">Sort: Most Mistakes</option>
              <option value="recently_attempted">Sort: Recently Attempted</option>
            </select>

            <button
              type="button"
              onClick={onShuffleFiltered}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Shuffle
            </button>

            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Reset Filters
            </button>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset Progress
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2.5 py-1 rounded-lg">
                <span className="text-xs font-medium text-rose-800 dark:text-rose-300">Confirm reset?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetAllProgress();
                    setShowResetConfirm(false);
                  }}
                  className="px-2 py-1 text-xs font-bold bg-rose-600 text-white rounded cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live Stats Strip + Progress Bar (Preserves original IDs: #shownCount, #questionNumber, #correctCount, #wrongCount, #answeredCount, #score) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums text-slate-600 dark:text-slate-400">
            <span>
              Showing: <b id="shownCount" className="text-slate-900 dark:text-slate-100">{filteredQuestions.length}</b>
            </span>
            <span>·</span>
            <span>
              Question:{' '}
              <b id="questionNumber" className="text-slate-900 dark:text-slate-100">
                {filteredQuestions.length ? `${currentIndex + 1}/${filteredQuestions.length}` : '0'}
              </b>
            </span>
            <span>·</span>
            <span>
              Correct: <b id="correctCount" className="text-emerald-600 dark:text-emerald-400">{liveStats.correct}</b>
            </span>
            <span>·</span>
            <span>
              Wrong: <b id="wrongCount" className="text-rose-600 dark:text-rose-400">{liveStats.wrong}</b>
            </span>
            <span>·</span>
            <span>
              Answered: <b id="answeredCount" className="text-slate-900 dark:text-slate-100">{liveStats.answered}</b>
            </span>
            <span>·</span>
            <span>
              Net Score: <b id="score" className="text-slate-900 dark:text-slate-100">{liveStats.legacyScore}</b>
            </span>
            <span>·</span>
            <span>
              GATE Marks (+1/−0.33): <b className="text-blue-600 dark:text-blue-400">{liveStats.gateScore}</b>
            </span>
          </div>

          {/* Direct Jump to Question # */}
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5">
            <label htmlFor="jumpInput" className="sr-only">
              Jump to question number
            </label>
            <input
              id="jumpInput"
              type="number"
              min={1}
              max={Math.max(1, filteredQuestions.length)}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={`Jump 1–${filteredQuestions.length}`}
              className="w-32 px-2.5 py-1 text-xs font-mono tabular-nums rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>

        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            id="progress"
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-200"
            style={{
              width: `${
                filteredQuestions.length
                  ? Math.min(100, ((currentIndex + 1) / filteredQuestions.length) * 100)
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Collapsible Paginated Question Navigation Grid */}
      {showGrid && filteredQuestions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Question Palette (Showing {gridPage * 50 + 1}–{Math.min(filteredQuestions.length, (gridPage + 1) * 50)} of{' '}
              {filteredQuestions.length.toLocaleString()})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={gridPage === 0}
                onClick={() => setGridPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                ← Prev 50
              </button>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Page {gridPage + 1} / {totalGridPages}
              </span>
              <button
                type="button"
                disabled={gridPage >= totalGridPages - 1}
                onClick={() => setGridPage((p) => Math.min(totalGridPages - 1, p + 1))}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Next 50 →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-25 gap-1.5">
            {gridSlice.map((q, idx) => {
              const absIdx = gridPage * 50 + idx;
              const a = answers[q.id];
              const isCurr = absIdx === currentIndex;
              let colorCls =
                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
              if (a?.correct === true) {
                colorCls = 'bg-emerald-600 text-white border-emerald-600';
              } else if (a?.correct === false && a?.selected !== null) {
                colorCls = 'bg-rose-600 text-white border-rose-600';
              } else if (a?.revealed) {
                colorCls = 'bg-amber-500 text-white border-amber-500';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(absIdx)}
                  className={`h-8 rounded border text-[11px] font-mono tabular-nums font-semibold cursor-pointer ${colorCls} ${
                    isCurr ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                  }`}
                  title={`${q.id}: ${q.topic}`}
                >
                  {absIdx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Question Card or Empty State */}
      {!currentQuestion ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            No questions match your current filters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Try resetting your section, topic, status, or search text filters to view available questions from the {allQuestions.length.toLocaleString()}-question bank.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {/* Card Header with Clean Unboxed Metadata & Action Controls */}
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Unboxed Metadata Line per Zero-Pill Discipline */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {DOMAIN_SHORT_LABELS[currentQuestion.domain]}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {currentQuestion.topic}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    currentQuestion.diff === 'Hard'
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : currentQuestion.diff === 'Medium'
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-emerald-600 dark:text-emerald-400 font-medium'
                  }
                >
                  {currentQuestion.diff}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentQuestion.exam}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">ID: {currentQuestion.id}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">{currentQuestion.sourceFile}</span>
                {currentQuestion.isDuplicateStem && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className="text-amber-600 dark:text-amber-400 font-mono text-[11px]"
                      title={`Question stem also appears as ${currentQuestion.canonicalId}`}
                    >
                      Duplicate Stem of {currentQuestion.canonicalId}
                    </span>
                  </>
                )}
              </div>

              {/* Action Buttons: Bookmark, Note, Add to List, Report */}
              <div className="flex items-center gap-1.5 relative">
                <button
                  type="button"
                  onClick={() => onToggleBookmark(currentQuestion.id)}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNoteEditor((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    notes[currentQuestion.id]?.text
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Note</span>
                </button>

                {/* Add to Revision List */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowListDropdown((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                  {showListDropdown && (
                    <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 z-20 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-1">
                        Save to Revision List
                      </div>
                      {customLists.map((lst) => {
                        const inList = lst.questionIds.includes(currentQuestion.id);
                        return (
                          <button
                            key={lst.id}
                            type="button"
                            onClick={() => onToggleQuestionInList(lst.id, currentQuestion.id)}
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{lst.name}</span>
                            {inList && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  aria-label="Flag or report question issue"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flag</span>
                </button>
              </div>
            </div>

            {/* Question Stem */}
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
              {currentQuestion.q}
            </div>
          </div>

          {/* Options Grid */}
          <div className="p-5 sm:p-6 space-y-2.5">
            {currentQuestion.opts.map((opt, idx) => {
              const isAnswered = Boolean(savedAnswer);
              const isCorrectOption = idx === currentQuestion.ans;
              const isSelectedWrong =
                isAnswered && savedAnswer?.selected === idx && !savedAnswer.correct;
              const isSelectedCorrect =
                isAnswered && savedAnswer?.selected === idx && savedAnswer.correct;

              let optionCls =
                'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100';

              if (isAnswered) {
                if (isCorrectOption) {
                  optionCls =
                    'border-emerald-500 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200';
                } else if (isSelectedWrong) {
                  optionCls =
                    'border-rose-500 dark:border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200';
                } else {
                  optionCls =
                    'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 opacity-80';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => {
                    const elapsed = Math.max(500, Date.now() - questionStartTime);
                    onAnswerQuestion(currentQuestion.id, idx, elapsed);
                  }}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${optionCls} ${
                    isAnswered ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isAnswered && isCorrectOption
                          ? 'bg-emerald-600 text-white'
                          : isSelectedWrong
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {letters[idx]}
                    </span>
                    <span className="text-sm sm:text-base leading-relaxed">{opt}</span>
                  </div>

                  {/* Explicit semantic label + icon (never signal state by color alone) */}
                  {isAnswered && isCorrectOption && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      {isSelectedCorrect ? 'Correct Choice' : 'Correct Answer'}
                    </span>
                  )}
                  {isSelectedWrong && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 shrink-0">
                      <XCircle className="w-4 h-4" />
                      Your Choice
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Solution & Formula Explanation Callout */}
          {savedAnswer && (
            <div className="px-5 sm:px-6 pb-5">
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {savedAnswer.correct ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ✓ Correct Answer — {letters[currentQuestion.ans]}. {currentQuestion.opts[currentQuestion.ans]}
                      </span>
                    ) : savedAnswer.selected !== null ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        ✗ Incorrect — Correct Answer: {letters[currentQuestion.ans]}. {currentQuestion.opts[currentQuestion.ans]}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Answer Revealed — {letters[currentQuestion.ans]}. {currentQuestion.opts[currentQuestion.ans]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <span>
                      Next Review:{' '}
                      {savedAnswer.intervalDays && savedAnswer.intervalDays > 0
                        ? `in ${savedAnswer.intervalDays}d`
                        : 'Urgent (Revision Queue)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onClearSingleQuestion(currentQuestion.id)}
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-sans font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry Question
                    </button>
                  </div>
                </div>

                <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  <b className="text-slate-900 dark:text-slate-100">Step-by-Step Solution:</b>
                  <div className="mt-1">{currentQuestion.sol}</div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200">
                  <b className="font-sans text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                    Formula / Key Concept Takeaway
                  </b>
                  {currentQuestion.form}
                </div>
              </div>
            </div>
          )}

          {/* Personal Note Editor */}
          {showNoteEditor && (
            <div className="px-5 sm:px-6 pb-5">
              <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-2">
                <label
                  htmlFor="personalNoteInput"
                  className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  Personal Revision Note for {currentQuestion.id}
                </label>
                <textarea
                  id="personalNoteInput"
                  rows={2}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Write your own shortcut, mnemonic, or mistake reminder for this question..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveNote(currentQuestion.id, noteDraft);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          <div className="px-5 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-300/70 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:inline font-mono">
                Shortcuts: [1–4] Answer · [←/→] Nav · [B] Bookmark · [S] Solution
              </span>
              <button
                type="button"
                onClick={() => {
                  const elapsed = Math.max(500, Date.now() - questionStartTime);
                  onRevealAnswer(currentQuestion.id, elapsed);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                {savedAnswer ? 'Answer Shown' : 'Show Answer'}
              </button>
            </div>
          </div>
        </article>
      )}

      {/* Flag / Report Question Modal */}
      {showReportModal && currentQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reportModalTitle"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 id="reportModalTitle" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Flag Question {currentQuestion.id} for Review
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Original questions and answer keys are preserved intact. Flagging records an entry in your local review log so you can inspect or annotate questionable items.
            </p>
            <div>
              <label htmlFor="reportReasonSelect" className="block text-xs font-semibold mb-1">
                Issue Category
              </label>
              <select
                id="reportReasonSelect"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as QuestionReport['reason'])}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="unclear_explanation">Explanation needs more detail</option>
                <option value="wrong_answer">Suspected answer key discrepancy</option>
                <option value="typo_in_question">Formatting or typographical issue</option>
                <option value="duplicate_question">Duplicate question stem</option>
                <option value="other">Other note</option>
              </select>
            </div>
            <div>
              <label htmlFor="reportCommentInput" className="block text-xs font-semibold mb-1">
                Your Observation
              </label>
              <textarea
                id="reportCommentInput"
                rows={3}
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                placeholder="Describe the discrepancy or verification note..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSubmitReport({
                    questionId: currentQuestion.id,
                    reason: reportReason,
                    comment: reportComment,
                  });
                  setReportComment('');
                  setShowReportModal(false);
                  setReportSubmittedToast(true);
                  setTimeout(() => setReportSubmittedToast(false), 3000);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer"
              >
                Save Flag
              </button>
            </div>
          </div>
        </div>
      )}

      {reportSubmittedToast && (
        <div className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg">
          ✓ Question flagged and added to your verification log.
        </div>
      )}
    </div>
  );
};
