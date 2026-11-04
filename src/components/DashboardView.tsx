import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Play,
  RefreshCw,
  Shuffle,
  Target,
  TrendingUp,
  Trophy,
  AlertTriangle,
  Bookmark,
  ArrowRight,
  Award,
  Zap,
} from 'lucide-react';
import {
  AnalyticsSummary,
  AuditReport,
  EnrichedQuestion,
  PracticeMode,
  StudyPlanConfig,
  SubjectDomain,
} from '../types/gate';
import { DOMAIN_SHORT_LABELS } from '../lib/engine';

interface DashboardViewProps {
  analytics: AnalyticsSummary;
  audit: AuditReport;
  studyPlan: StudyPlanConfig;
  streakDays: number;
  totalPracticeTimeSec: number;
  todayAnsweredCount: number;
  questionsById: Map<string, EnrichedQuestion>;
  bookmarks: string[];
  onStartMode: (mode: PracticeMode, options?: { domain?: SubjectDomain; topic?: string }) => void;
  onJumpToQuestion: (questionId: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'practice' | 'analytics' | 'revision' | 'learning' | 'formulas' | 'planner') => void;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  audit,
  studyPlan,
  streakDays,
  totalPracticeTimeSec,
  todayAnsweredCount,
  questionsById,
  bookmarks,
  onStartMode,
  onJumpToQuestion,
  onNavigateTab,
}) => {
  const dailyProgressPct = Math.min(
    100,
    Math.round((todayAnsweredCount / Math.max(1, studyPlan.dailyQuestionGoal)) * 100)
  );

  const milestones = [
    {
      id: 'first_step',
      title: 'First Circuit Closed',
      desc: 'Attempt your first practice question',
      unlocked: analytics.attempted >= 1,
      progress: `${Math.min(1, analytics.attempted)}/1`,
    },
    {
      id: 'sprint_25',
      title: '25-Question Milestone',
      desc: 'Solve 25 questions across the bank',
      unlocked: analytics.attempted >= 25,
      progress: `${Math.min(25, analytics.attempted)}/25`,
    },
    {
      id: 'century_100',
      title: 'Centurion Scholar',
      desc: 'Complete 100 practice questions',
      unlocked: analytics.attempted >= 100,
      progress: `${Math.min(100, analytics.attempted)}/100`,
    },
    {
      id: 'ece_specialist',
      title: 'Core ECE Specialist',
      desc: 'Solve 20+ questions in GATE ECE Core subjects',
      unlocked: analytics.byDomain.ece_core.attempted >= 20,
      progress: `${Math.min(20, analytics.byDomain.ece_core.attempted)}/20`,
    },
    {
      id: 'high_precision',
      title: 'High-Precision Engineer',
      desc: 'Maintain 75%+ accuracy over at least 10 attempts',
      unlocked: analytics.attempted >= 10 && analytics.accuracy >= 75,
      progress: analytics.attempted >= 10 ? `${analytics.accuracy}%` : `${analytics.attempted}/10 q`,
    },
    {
      id: 'consistent_streak',
      title: 'Consistency Streak',
      desc: 'Maintain an active daily study streak',
      unlocked: streakDays >= 1,
      progress: `${streakDays}d streak`,
    },
  ];

  const practiceModes: {
    mode: PracticeMode;
    title: string;
    desc: string;
    meta: string;
    icon: React.ReactNode;
    primary?: boolean;
  }[] = [
    {
      mode: 'normal',
      title: 'Normal Practice',
      desc: 'Solve one question at a time with instant answer validation, step-by-step solutions, and formulas.',
      meta: `${analytics.totalQuestions.toLocaleString()} questions available`,
      icon: <BookOpen className="w-4 h-4" />,
      primary: true,
    },
    {
      mode: 'exam',
      title: 'Timed Exam Simulation',
      desc: 'Realistic timed test with configurable GATE (+1 / −0.33) or Placement (+1 / 0) marking & review palette.',
      meta: '15, 30, or 65 question presets',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      mode: 'topic',
      title: 'Subject & Topic Drill',
      desc: 'Focus on a single ECE Core subject, Engineering Math module, or Placement topic.',
      meta: `${analytics.topicStats.length} distinct topics`,
      icon: <Compass className="w-4 h-4" />,
    },
    {
      mode: 'weakness',
      title: 'Weakness Recovery Mode',
      desc: 'Automatically prioritizes topics with low accuracy and questions previously answered wrong.',
      meta: `${analytics.wrong} incorrect · ${analytics.repeatedMistakesCount} repeated`,
      icon: <Target className="w-4 h-4" />,
    },
    {
      mode: 'revision',
      title: 'Spaced Revision Mode',
      desc: 'Review due spaced-repetition cards, bookmarked questions, and incorrect responses.',
      meta: `${analytics.dueForRevisionCount} due · ${analytics.bookmarkedCount} bookmarked`,
      icon: <RefreshCw className="w-4 h-4" />,
    },
    {
      mode: 'random',
      title: 'Random 20 Challenge',
      desc: `Shuffled mixed-bag sprint drawn from the verified ${analytics.totalQuestions.toLocaleString()}-question repository.`,
      meta: 'Instant shuffled deck',
      icon: <Shuffle className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Hero Banner + Daily Target Strip */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Verified Question Repository</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span className="font-mono tabular-nums">{audit.part1Count.toLocaleString()} Part 1 + {audit.part2Count.toLocaleString()} Part 2</span>
              <span aria-hidden="true" className="mx-2">·</span>
              <span>Target: {studyPlan.targetExam}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
              Engineering &amp; Placement Preparation Command Centre
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Master GATE ECE Core subjects, Engineering Mathematics, CS/IT Data Structures, Quantitative Aptitude, and Reasoning with real-time telemetry and spaced repetition.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onStartMode('normal')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4" />
              Resume Practice
            </button>
            <button
              type="button"
              onClick={() => onStartMode('exam')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Clock className="w-4 h-4" />
              Start Mock Exam
            </button>
          </div>
        </div>

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Bank</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {analytics.totalQuestions.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              {audit.uniqueStemsCount.toLocaleString()} unique stems
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Attempted</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {analytics.attempted.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              {analytics.remaining.toLocaleString()} left
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {analytics.correct.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              +{analytics.correct} pts raw
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {analytics.wrong.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              {analytics.repeatedMistakesCount} repeated
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {analytics.accuracy}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              GATE Net: {analytics.gateScore}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Study Streak</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Flame className="w-4 h-4 shrink-0" />
              {streakDays}d
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              Today: {todayAnsweredCount}/{studyPlan.dailyQuestionGoal}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Practice Time</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatDuration(totalPracticeTimeSec)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              Avg: {analytics.avgTimeSec}s / q
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Revision Queue</div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {analytics.dueForRevisionCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              {analytics.bookmarkedCount} bookmarked
            </div>
          </div>
        </div>
      </section>

      {/* Actionable Diagnostic Insights Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Diagnostic Learning Recommendations
            </h2>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Daily Goal Progress: {todayAnsweredCount} / {studyPlan.dailyQuestionGoal} questions ({dailyProgressPct}%)
          </div>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${dailyProgressPct}%` }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analytics.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
            >
              {rec}
            </div>
          ))}
        </div>
      </section>

      {/* 6 Practice Modes Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Practice &amp; Simulation Modes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a specialized mode tailored to your current preparation phase
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('practice')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Open Practice Workspace <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {practiceModes.map((pm) => (
            <div
              key={pm.mode}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="font-mono tabular-nums">{pm.meta}</span>
                  <span className="text-blue-600 dark:text-blue-400">{pm.icon}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {pm.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pm.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => onStartMode(pm.mode)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Launch {pm.title.split(' ')[0]} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Domain Performance + Weakest/Strongest Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Domain Breakdown (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Subject-Domain Performance &amp; Coverage
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accurate separation of GATE ECE Core, Engineering Math, CS Placement, and Aptitude
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('learning')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Explore Syllabus
            </button>
          </div>

          <div className="space-y-4">
            {(Object.keys(analytics.byDomain) as SubjectDomain[]).map((domKey) => {
              const d = analytics.byDomain[domKey];
              return (
                <div
                  key={domKey}
                  className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {d.label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono tabular-nums">
                        {d.attempted} / {d.total} attempted ({d.completion}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        ✓ {d.correct}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        ✗ {d.wrong}
                      </span>
                      <span className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {d.accuracy}% acc
                      </span>
                      <button
                        type="button"
                        onClick={() => onStartMode('topic', { domain: domKey })}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                      >
                        Practice
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(d.attempted > 0 ? 2 : 0, d.completion))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weakest & Strongest Topics (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Priority Focus Topics (Weakest)
              </h2>
              <button
                type="button"
                onClick={() => onStartMode('weakness')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Drill Weaknesses
              </button>
            </div>

            {analytics.weakestTopics.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                Attempt questions across topics to automatically detect weak areas and accuracy gaps.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.weakestTopics.slice(0, 4).map((t) => (
                  <div key={t.topic} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {t.topic}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {DOMAIN_SHORT_LABELS[t.domain]} · {t.correct}/{t.attempted} correct
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {t.accuracy}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onStartMode('topic', { topic: t.topic })}
                        className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Fix
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Strongest Topics
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab('analytics')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Full Analytics
              </button>
            </div>

            {analytics.strongestTopics.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                Topics with ≥60% accuracy will appear here as you practice.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.strongestTopics.slice(0, 4).map((t) => (
                  <div key={t.topic} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {t.topic}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {DOMAIN_SHORT_LABELS[t.domain]} · {t.correct}/{t.attempted} correct
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {t.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent Activity & Bookmarks + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent & Bookmarked Questions (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recently Attempted */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Recently Attempted Questions
              </h3>
              {analytics.recentQuestionIds.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  No questions attempted yet. Click "Resume Practice" above to solve your first question.
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.recentQuestionIds.slice(0, 5).map((qId) => {
                    const q = questionsById.get(qId);
                    if (!q) return null;
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => onJumpToQuestion(qId)}
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
                      >
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {q.id} · {q.topic} · {q.diff}
                        </div>
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1 mt-0.5">
                          {q.q}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bookmarked Questions */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-500" />
                Bookmarked Questions ({bookmarks.length})
              </h3>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                  Bookmark tricky questions or key derivations during practice to access them here.
                </p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.slice(0, 5).map((qId) => {
                    const q = questionsById.get(qId);
                    if (!q) return null;
                    return (
                      <button
                        key={qId}
                        type="button"
                        onClick={() => onJumpToQuestion(qId)}
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
                      >
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {q.id} · {q.topic} · {q.diff}
                        </div>
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1 mt-0.5">
                          {q.q}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Earned Milestones & Gamification (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              Engineering Mastery Milestones
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {milestones.filter((m) => m.unlocked).length} / {milestones.length} unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg border ${
                  m.unlocked
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Award className={`w-3.5 h-3.5 ${m.unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    {m.title}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {m.progress}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
