import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart2,
  BookMarked,
  BookOpen,
  Calendar,
  Compass,
  LayoutDashboard,
  Moon,
  RefreshCw,
  Sun,
  Play,
} from 'lucide-react';
import {
  CustomRevisionList,
  EnrichedQuestion,
  ExamSessionResult,
  FilterState,
  PracticeMode,
  QuestionReport,
  RawQuestion,
  StudyPlanConfig,
  SubjectDomain,
} from './types/gate';
import {
  buildWeaknessPracticeSet,
  calculateSpacedRepetition,
  computeAnalytics,
  enrichQuestionBank,
  filterAndSortQuestions,
} from './lib/engine';
import { buildCompleteFormulaLibrary } from './lib/formulaLibrary';
import {
  getTodayISO,
  loadPlatformStorage,
  PlatformStorageData,
  savePlatformStorage,
  validateAndImportBackup,
} from './lib/storage';
import { DashboardView } from './components/DashboardView';
import { PracticeEngineView } from './components/PracticeEngineView';
import { AnalyticsView } from './components/AnalyticsView';
import { RevisionCentreView } from './components/RevisionCentreView';
import { LearningCentreView } from './components/LearningCentreView';
import { FormulaLibraryView } from './components/FormulaLibraryView';
import { StudyPlannerAndDataView } from './components/StudyPlannerAndDataView';

declare global {
  interface Window {
    GATE_QUESTIONS_PART1?: RawQuestion[];
    GATE_QUESTIONS_PART2?: RawQuestion[];
  }
}

type ActiveTab =
  | 'dashboard'
  | 'practice'
  | 'analytics'
  | 'revision'
  | 'learning'
  | 'formulas'
  | 'planner';

const DEFAULT_FILTERS: FilterState = {
  sec: 'all',
  domain: 'all',
  topic: 'all',
  diff: 'all',
  exam: 'all',
  status: 'all',
  search: '',
  sortBy: 'default',
  uniqueStemsOnly: false,
  revisionListId: 'all',
};

export default function App() {
  // 1. Load & enrich the 10,000-question bank once from window.GATE_QUESTIONS_PART1 & PART2
  const { questions: allQuestions, audit } = useMemo(() => {
    const p1 = window.GATE_QUESTIONS_PART1 || [];
    const p2 = window.GATE_QUESTIONS_PART2 || [];
    return enrichQuestionBank(p1, p2);
  }, []);

  const questionsById = useMemo(() => {
    const map = new Map<string, EnrichedQuestion>();
    for (let i = 0; i < allQuestions.length; i++) {
      map.set(allQuestions[i].id, allQuestions[i]);
    }
    return map;
  }, [allQuestions]);

  const formulaLibrary = useMemo(
    () => buildCompleteFormulaLibrary(allQuestions),
    [allQuestions]
  );

  // 2. Load persisted platform state (including backward-compatible gatePrepProgress_v10000)
  const [storage, setStorage] = useState<PlatformStorageData>(() => loadPlatformStorage());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('normal');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [customDeckOrder, setCustomDeckOrder] = useState<EnrichedQuestion[] | null>(null);
  const [formulaInitialTopic, setFormulaInitialTopic] = useState<string>('all');

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (storage.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [storage.theme]);

  // Persist storage on change
  useEffect(() => {
    savePlatformStorage(storage);
  }, [storage]);

  // Active study time tracker (increments every 5 seconds while app is open)
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        const today = getTodayISO();
        setStorage((prev) => {
          const prevDay = prev.dailyActivity[today] || {
            questionsAnswered: 0,
            correct: 0,
            studySeconds: 0,
          };
          return {
            ...prev,
            totalPracticeTimeSec: prev.totalPracticeTimeSec + 5,
            dailyActivity: {
              ...prev.dailyActivity,
              [today]: {
                ...prevDay,
                studySeconds: prevDay.studySeconds + 5,
              },
            },
          };
        });
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const bookmarksSet = useMemo(() => new Set(storage.bookmarks), [storage.bookmarks]);

  // Compute filtered questions (or custom deck when in Weakness / Random Challenge mode)
  const filteredQuestions = useMemo(() => {
    if (customDeckOrder) {
      return customDeckOrder;
    }
    return filterAndSortQuestions(
      allQuestions,
      filters,
      storage.answers,
      bookmarksSet,
      storage.customLists
    );
  }, [allQuestions, filters, storage.answers, bookmarksSet, storage.customLists, customDeckOrder]);

  // Keep currentIndex within bounds
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions.length, currentIndex]);

  // Clear customDeckOrder when user changes filters manually
  const handleSetFilters: React.Dispatch<React.SetStateAction<FilterState>> = useCallback(
    (updater) => {
      setCustomDeckOrder(null);
      setFilters(updater);
    },
    []
  );

  // Compute comprehensive analytics
  const analytics = useMemo(
    () => computeAnalytics(allQuestions, storage.answers, storage.bookmarks),
    [allQuestions, storage.answers, storage.bookmarks]
  );

  const todayISO = getTodayISO();
  const todayAnsweredCount = storage.dailyActivity[todayISO]?.questionsAnswered ?? 0;

  // Handlers
  const handleToggleTheme = () => {
    setStorage((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleAnswerQuestion = useCallback(
    (questionId: string, selectedIndex: number, timeSpentMs: number) => {
      const q = questionsById.get(questionId);
      if (!q) return;

      setStorage((prev) => {
        if (prev.answers[questionId]) return prev; // Already answered unless cleared
        const isCorrect = selectedIndex === q.ans;
        const record = calculateSpacedRepetition(
          prev.answers[questionId],
          selectedIndex,
          isCorrect,
          false,
          timeSpentMs
        );
        const today = getTodayISO();
        const prevDay = prev.dailyActivity[today] || {
          questionsAnswered: 0,
          correct: 0,
          studySeconds: 0,
        };

        return {
          ...prev,
          lastActiveDate: today,
          answers: {
            ...prev.answers,
            [questionId]: record,
          },
          dailyActivity: {
            ...prev.dailyActivity,
            [today]: {
              ...prevDay,
              questionsAnswered: prevDay.questionsAnswered + 1,
              correct: prevDay.correct + (isCorrect ? 1 : 0),
            },
          },
        };
      });
    },
    [questionsById]
  );

  const handleRevealAnswer = useCallback(
    (questionId: string, timeSpentMs: number) => {
      setStorage((prev) => {
        if (prev.answers[questionId]) return prev;
        const record = calculateSpacedRepetition(
          prev.answers[questionId],
          null,
          false,
          true,
          timeSpentMs
        );
        return {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: record,
          },
        };
      });
    },
    []
  );

  const handleClearSingleQuestion = useCallback((questionId: string) => {
    setStorage((prev) => {
      const nextAnswers = { ...prev.answers };
      delete nextAnswers[questionId];
      return {
        ...prev,
        answers: nextAnswers,
      };
    });
  }, []);

  const handleToggleBookmark = useCallback((questionId: string) => {
    setStorage((prev) => {
      const exists = prev.bookmarks.includes(questionId);
      const nextBookmarks = exists
        ? prev.bookmarks.filter((id) => id !== questionId)
        : [questionId, ...prev.bookmarks];
      return {
        ...prev,
        bookmarks: nextBookmarks,
      };
    });
  }, []);

  const handleSaveNote = useCallback((questionId: string, text: string) => {
    setStorage((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [questionId]: {
          questionId,
          text,
          updatedAt: Date.now(),
        },
      },
    }));
  }, []);

  const handleSubmitReport = useCallback((report: Omit<QuestionReport, 'createdAt'>) => {
    setStorage((prev) => ({
      ...prev,
      reports: [
        {
          ...report,
          createdAt: Date.now(),
        },
        ...prev.reports,
      ],
    }));
  }, []);

  const handleToggleQuestionInList = useCallback((listId: string, questionId: string) => {
    setStorage((prev) => ({
      ...prev,
      customLists: prev.customLists.map((lst) => {
        if (lst.id !== listId) return lst;
        const has = lst.questionIds.includes(questionId);
        return {
          ...lst,
          questionIds: has
            ? lst.questionIds.filter((id) => id !== questionId)
            : [...lst.questionIds, questionId],
        };
      }),
    }));
  }, []);

  const handleShuffleFiltered = useCallback(() => {
    const copy = [...filteredQuestions];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setCustomDeckOrder(copy);
    setCurrentIndex(0);
  }, [filteredQuestions]);

  const handleResetFilters = useCallback(() => {
    setCustomDeckOrder(null);
    setFilters(DEFAULT_FILTERS);
    setCurrentIndex(0);
  }, []);

  const handleResetAllProgress = useCallback(() => {
    setStorage((prev) => ({
      ...prev,
      answers: {},
      dailyActivity: {},
      streakDays: 0,
    }));
  }, []);

  const handleStartMode = useCallback(
    (mode: PracticeMode, options?: { domain?: SubjectDomain; topic?: string }) => {
      setPracticeMode(mode);
      setActiveTab('practice');
      setCurrentIndex(0);

      if (mode === 'weakness') {
        const weakSet = buildWeaknessPracticeSet(allQuestions, storage.answers, 40);
        setCustomDeckOrder(weakSet);
      } else if (mode === 'random') {
        const pool = allQuestions.filter((q) => !q.isDuplicateStem);
        const copy = [...pool];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        setCustomDeckOrder(copy.slice(0, 20));
      } else if (mode === 'revision') {
        setCustomDeckOrder(null);
        setFilters({
          ...DEFAULT_FILTERS,
          status:
            analytics.dueForRevisionCount > 0
              ? 'due_revision'
              : analytics.bookmarkedCount > 0
              ? 'bookmarked'
              : 'answered',
        });
      } else if (mode === 'topic') {
        setCustomDeckOrder(null);
        setFilters({
          ...DEFAULT_FILTERS,
          domain: options?.domain || 'all',
          topic: options?.topic || 'all',
        });
      } else {
        setCustomDeckOrder(null);
        if (options?.domain || options?.topic) {
          setFilters({
            ...DEFAULT_FILTERS,
            domain: options.domain || 'all',
            topic: options.topic || 'all',
          });
        }
      }
    },
    [allQuestions, storage.answers, analytics.dueForRevisionCount, analytics.bookmarkedCount]
  );

  const handleJumpToQuestion = useCallback(
    (questionId: string) => {
      setCustomDeckOrder(null);
      setFilters(DEFAULT_FILTERS);
      setPracticeMode('normal');
      setActiveTab('practice');
      const idx = allQuestions.findIndex((q) => q.id === questionId);
      if (idx >= 0) {
        setCurrentIndex(idx);
      }
    },
    [allQuestions]
  );

  const handleCompleteExam = useCallback(
    (
      result: ExamSessionResult,
      examQuestions: EnrichedQuestion[],
      selections: Record<string, number | null>
    ) => {
      const today = getTodayISO();
      setStorage((prev) => {
        const nextAnswers = { ...prev.answers };
        let newlyAnswered = 0;
        let newlyCorrect = 0;

        for (const q of examQuestions) {
          const sel = selections[q.id];
          if (sel !== undefined && sel !== null) {
            const isCorrect = sel === q.ans;
            nextAnswers[q.id] = calculateSpacedRepetition(
              prev.answers[q.id],
              sel,
              isCorrect,
              false,
              Math.round((result.durationSec * 1000) / Math.max(1, result.attempted))
            );
            newlyAnswered++;
            if (isCorrect) newlyCorrect++;
          }
        }

        const prevDay = prev.dailyActivity[today] || {
          questionsAnswered: 0,
          correct: 0,
          studySeconds: 0,
        };

        return {
          ...prev,
          lastActiveDate: today,
          answers: nextAnswers,
          examHistory: [result, ...prev.examHistory],
          dailyActivity: {
            ...prev.dailyActivity,
            [today]: {
              ...prevDay,
              questionsAnswered: prevDay.questionsAnswered + newlyAnswered,
              correct: prevDay.correct + newlyCorrect,
            },
          },
        };
      });
    },
    []
  );

  const handleExportBackup = useCallback(() => {
    const json = JSON.stringify(storage, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gate_ece_backup_${getTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [storage]);

  const handleImportBackup = useCallback((jsonString: string) => {
    const res = validateAndImportBackup(jsonString);
    if (res.ok && res.data) {
      setStorage(res.data);
    }
    return { ok: res.ok, error: res.error };
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'practice', label: 'Practice Engine', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'learning', label: 'Learning Centre', icon: <Compass className="w-4 h-4" /> },
    { id: 'formulas', label: 'Formulas', icon: <BookMarked className="w-4 h-4" /> },
    { id: 'revision', label: 'Revision', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'planner', label: 'Study Planner', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: 3 Zones */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6 lg:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate cursor-pointer"
          >
            GATE ECE &amp; Placement Prep
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  activeTab === item.id
                    ? 'border-blue-600 text-slate-900 dark:text-slate-100 font-semibold'
                    : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Theme Toggle + Primary Action */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={storage.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {storage.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setPracticeMode('normal');
                setActiveTab('practice');
              }}
              className="px-2.5 sm:px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Practice
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Scrollable Navigation Strip */}
        <nav
          aria-label="Mobile Navigation"
          className="flex lg:hidden items-center gap-1.5 overflow-x-auto pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 no-scrollbar"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/70'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            analytics={analytics}
            audit={audit}
            studyPlan={storage.studyPlan}
            streakDays={storage.streakDays}
            totalPracticeTimeSec={storage.totalPracticeTimeSec}
            todayAnsweredCount={todayAnsweredCount}
            questionsById={questionsById}
            bookmarks={storage.bookmarks}
            onStartMode={handleStartMode}
            onJumpToQuestion={handleJumpToQuestion}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeEngineView
            allQuestions={allQuestions}
            filteredQuestions={filteredQuestions}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            practiceMode={practiceMode}
            setPracticeMode={(m) => handleStartMode(m)}
            filters={filters}
            setFilters={handleSetFilters}
            answers={storage.answers}
            bookmarks={bookmarksSet}
            notes={storage.notes}
            customLists={storage.customLists}
            onAnswerQuestion={handleAnswerQuestion}
            onRevealAnswer={handleRevealAnswer}
            onClearSingleQuestion={handleClearSingleQuestion}
            onToggleBookmark={handleToggleBookmark}
            onSaveNote={handleSaveNote}
            onSubmitReport={handleSubmitReport}
            onToggleQuestionInList={handleToggleQuestionInList}
            onShuffleFiltered={handleShuffleFiltered}
            onResetFilters={handleResetFilters}
            onResetAllProgress={handleResetAllProgress}
            onCompleteExam={handleCompleteExam}
          />
        )}

        {activeTab === 'learning' && (
          <LearningCentreView
            analytics={analytics}
            onStartTopicPractice={(topic, domain) =>
              handleStartMode('topic', { topic, domain })
            }
            onOpenFormulasForTopic={(topic) => {
              setFormulaInitialTopic(topic);
              setActiveTab('formulas');
            }}
          />
        )}

        {activeTab === 'formulas' && (
          <FormulaLibraryView
            formulas={formulaLibrary}
            savedFormulaIds={storage.savedFormulas}
            initialTopicFilter={formulaInitialTopic}
            onToggleSaveFormula={(fId) => {
              setStorage((prev) => {
                const exists = prev.savedFormulas.includes(fId);
                return {
                  ...prev,
                  savedFormulas: exists
                    ? prev.savedFormulas.filter((id) => id !== fId)
                    : [fId, ...prev.savedFormulas],
                };
              });
            }}
            onPracticeTopic={(topic) => handleStartMode('topic', { topic })}
            onJumpToQuestion={handleJumpToQuestion}
          />
        )}

        {activeTab === 'revision' && (
          <RevisionCentreView
            allQuestions={allQuestions}
            questionsById={questionsById}
            answers={storage.answers}
            bookmarks={storage.bookmarks}
            notes={storage.notes}
            customLists={storage.customLists}
            completedRevisionSessions={storage.studyPlan.completedRevisionSessions}
            onJumpToQuestion={handleJumpToQuestion}
            onLaunchRevisionFilter={(statusFilter, listId) => {
              setCustomDeckOrder(null);
              setPracticeMode('revision');
              setFilters({
                ...DEFAULT_FILTERS,
                status: listId ? 'all' : statusFilter,
                revisionListId: listId || 'all',
              });
              setCurrentIndex(0);
              setActiveTab('practice');
            }}
            onCreateCustomList={(name, description) => {
              const newList: CustomRevisionList = {
                id: `list_${Date.now()}`,
                name,
                description,
                questionIds: [],
                createdAt: Date.now(),
              };
              setStorage((prev) => ({
                ...prev,
                customLists: [newList, ...prev.customLists],
              }));
            }}
            onDeleteCustomList={(listId) => {
              setStorage((prev) => ({
                ...prev,
                customLists: prev.customLists.filter((l) => l.id !== listId),
              }));
            }}
            onIncrementRevisionSession={() => {
              setStorage((prev) => ({
                ...prev,
                studyPlan: {
                  ...prev.studyPlan,
                  completedRevisionSessions: prev.studyPlan.completedRevisionSessions + 1,
                },
              }));
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            analytics={analytics}
            answers={storage.answers}
            examHistory={storage.examHistory}
            questionsById={questionsById}
            dailyActivity={storage.dailyActivity}
            onStartMode={handleStartMode}
            onJumpToQuestion={handleJumpToQuestion}
          />
        )}

        {activeTab === 'planner' && (
          <StudyPlannerAndDataView
            studyPlan={storage.studyPlan}
            analytics={analytics}
            audit={audit}
            reports={storage.reports}
            todayAnsweredCount={todayAnsweredCount}
            onUpdateStudyPlan={(updated: StudyPlanConfig) =>
              setStorage((prev) => ({ ...prev, studyPlan: updated }))
            }
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onJumpToQuestion={handleJumpToQuestion}
            onStartTopicPractice={(topic) => handleStartMode('topic', { topic })}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            GATE ECE &amp; Placement Intelligence Platform · Connected to{' '}
            <code className="font-mono">questions_part1.js</code> ({audit.part1Count.toLocaleString()}) &amp;{' '}
            <code className="font-mono">questions_part2.js</code> ({audit.part2Count.toLocaleString()})
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Backup &amp; Integrity Audit
            </button>
            <button
              type="button"
              onClick={handleExportBackup}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
            >
              Export Progress JSON
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
