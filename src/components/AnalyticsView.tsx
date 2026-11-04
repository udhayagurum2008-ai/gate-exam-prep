import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Search,
  Target,
  TrendingUp,
  Zap,
  ArrowUpDown,
} from 'lucide-react';
import {
  AnalyticsSummary,
  AnswerRecord,
  DifficultyType,
  EnrichedQuestion,
  ExamSessionResult,
  PracticeMode,
  SubjectDomain,
} from '../types/gate';
import { DOMAIN_SHORT_LABELS } from '../lib/engine';

interface AnalyticsViewProps {
  analytics: AnalyticsSummary;
  answers: Record<string, AnswerRecord>;
  examHistory: ExamSessionResult[];
  questionsById: Map<string, EnrichedQuestion>;
  dailyActivity: Record<string, { questionsAnswered: number; correct: number; studySeconds: number }>;
  onStartMode: (mode: PracticeMode, options?: { domain?: SubjectDomain; topic?: string }) => void;
  onJumpToQuestion: (questionId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  answers,
  examHistory,
  questionsById,
  dailyActivity,
  onStartMode,
  onJumpToQuestion,
}) => {
  const [topicSearch, setTopicSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<'all' | SubjectDomain>('all');
  const [sortField, setSortField] = useState<'attempted' | 'accuracy' | 'total' | 'wrong'>('attempted');

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    return analytics.topicStats
      .filter((t) => {
        if (domainFilter !== 'all' && t.domain !== domainFilter) return false;
        if (q && !t.topic.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'attempted') return b.attempted - a.attempted || b.accuracy - a.accuracy;
        if (sortField === 'accuracy') return b.accuracy - a.accuracy || b.attempted - a.attempted;
        if (sortField === 'wrong') return b.wrong - a.wrong || a.accuracy - b.accuracy;
        return b.total - a.total;
      });
  }, [analytics.topicStats, topicSearch, domainFilter, sortField]);

  const frequentMistakes = useMemo(() => {
    return Object.entries(answers)
      .filter(([, a]) => (a.wrongCount ?? 0) >= 1 && a.correct === false)
      .sort((a, b) => (b[1].wrongCount ?? 0) - (a[1].wrongCount ?? 0) || b[1].time - a[1].time)
      .slice(0, 10);
  }, [answers]);

  const recentDates = useMemo(() => {
    const days: { date: string; answered: number; correct: number; acc: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const entry = dailyActivity[iso] || { questionsAnswered: 0, correct: 0, studySeconds: 0 };
      const acc =
        entry.questionsAnswered > 0
          ? Math.round((entry.correct / entry.questionsAnswered) * 100)
          : 0;
      days.push({
        date: iso.slice(5),
        answered: entry.questionsAnswered,
        correct: entry.correct,
        acc,
      });
    }
    return days;
  }, [dailyActivity]);

  return (
    <div className="space-y-6">
      {/* Header & Top Summary */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Performance Telemetry &amp; Weakness Diagnostics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Real-time analytics computed strictly from your actual practice responses and timed mock examinations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStartMode('weakness')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer self-start sm:self-auto"
          >
            <Target className="w-4 h-4" />
            Practice Weakest Topics
          </button>
        </div>

        {/* Difficulty Breakdown + 7-Day Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          {/* Difficulty Performance (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Accuracy by Question Difficulty
            </h2>
            {(['Easy', 'Medium', 'Hard'] as DifficultyType[]).map((diff) => {
              const st = analytics.byDifficulty[diff];
              return (
                <div
                  key={diff}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {diff} Level ({st.total.toLocaleString()} total)
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {st.correct}/{st.attempted} correct · <b>{st.accuracy}%</b>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        diff === 'Easy'
                          ? 'bg-emerald-500'
                          : diff === 'Medium'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${st.accuracy}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7-Day Activity Bar Chart (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  7-Day Practice Consistency &amp; Accuracy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily questions attempted and correct answers over the past 7 days
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                Avg Time / Q: {analytics.avgTimeSec}s
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
              {recentDates.map((d) => {
                const maxBar = Math.max(20, ...recentDates.map((x) => x.answered));
                const heightPct = d.answered > 0 ? Math.max(12, Math.round((d.answered / maxBar) * 100)) : 4;
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {d.answered}
                    </span>
                    <div className="w-full max-w-[36px] bg-slate-200 dark:bg-slate-700 rounded-t-md overflow-hidden flex items-end h-24">
                      <div
                        className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-md transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${d.date}: ${d.answered} answered (${d.acc}% accuracy)`}
                      />
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      {d.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Actionable Diagnostic Recommendations + Frequent Mistakes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            Actionable Study Recommendations
          </h2>
          <div className="space-y-2.5">
            {analytics.recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {rec}
              </div>
            ))}
          </div>

          {/* Exam Simulation History */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2.5">
              Recent Timed Exam Simulations ({examHistory.length})
            </h3>
            {examHistory.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No timed mock exams completed yet. Take a 15-question sprint in Exam Simulation mode to benchmark your speed.
              </p>
            ) : (
              <div className="space-y-2">
                {examHistory.slice(0, 4).map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{ex.title}</div>
                      <div className="text-slate-500 font-mono tabular-nums">
                        {ex.attempted}/{ex.totalQuestions} attempted · {ex.accuracy}% accuracy
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-bold text-blue-600 dark:text-blue-400">
                        {ex.score} / {ex.maxScore}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ✓{ex.correct} · ✗{ex.wrong}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Questions Answered Incorrectly / Repeated Mistakes */}
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Mistake Log &amp; Frequently Missed Questions
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {analytics.wrong} incorrect · {analytics.repeatedMistakesCount} repeated
            </span>
          </div>

          {frequentMistakes.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
              No incorrect responses logged yet. Any question you miss during practice or mock exams will be tracked here for targeted remediation.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {frequentMistakes.map(([qId, rec]) => {
                const q = questionsById.get(qId);
                if (!q) return null;
                return (
                  <button
                    key={qId}
                    type="button"
                    onClick={() => onJumpToQuestion(qId)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                      <span>
                        {q.id} · {q.topic} · {q.diff}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        Missed {rec.wrongCount || 1}×
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-1 mt-1">
                      {q.q}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Topic-Wise Performance Table (All 77 Topics) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Complete Topic-Wise Performance Matrix ({filteredTopics.length} Topics)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track completion percentage, accuracy, average response speed, and repeated errors per topic
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                placeholder="Filter topic name..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <select
              aria-label="Filter topic matrix by domain"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as 'all' | SubjectDomain)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="all">All Domains</option>
              <option value="ece_core">GATE ECE Core</option>
              <option value="eng_math">Engineering Math</option>
              <option value="cs_placement">CS &amp; Coding</option>
              <option value="quant_aptitude">Quantitative Aptitude</option>
              <option value="reasoning_verbal">Reasoning &amp; Verbal</option>
            </select>

            <select
              aria-label="Sort topic matrix"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="attempted">Sort by Attempted</option>
              <option value="accuracy">Sort by Accuracy</option>
              <option value="wrong">Sort by Mistakes</option>
              <option value="total">Sort by Question Count</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4">Topic</th>
                <th className="py-2.5 px-3">Domain</th>
                <th className="py-2.5 px-3 text-right">Attempted</th>
                <th className="py-2.5 px-3 text-right">Correct</th>
                <th className="py-2.5 px-3 text-right">Wrong</th>
                <th className="py-2.5 px-3 text-right">Accuracy</th>
                <th className="py-2.5 px-3 text-right">Avg Time</th>
                <th className="py-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {filteredTopics.map((t) => (
                <tr key={t.topic} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                    {t.topic}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                    {DOMAIN_SHORT_LABELS[t.domain]}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {t.attempted} / {t.total} ({t.completionPercent}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {t.correct}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    {t.wrong}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                    {t.attempted > 0 ? `${t.accuracy}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                    {t.avgTimeMs > 0 ? `${Math.round(t.avgTimeMs / 100) / 10}s` : '—'}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => onStartMode('topic', { topic: t.topic })}
                      className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Practice →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
