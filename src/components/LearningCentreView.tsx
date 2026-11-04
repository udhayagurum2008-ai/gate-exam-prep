import React, { useState } from 'react';
import {
  BookOpen,
  Cpu,
  Calculator,
  Code2,
  Brain,
  ArrowRight,
  CheckCircle2,
  BookMarked,
} from 'lucide-react';
import {
  AnalyticsSummary,
  PracticeMode,
  SubjectDomain,
  TopicStat,
} from '../types/gate';
import { DOMAIN_LABELS } from '../lib/engine';

interface LearningCentreViewProps {
  analytics: AnalyticsSummary;
  onStartTopicPractice: (topic: string, domain: SubjectDomain) => void;
  onOpenFormulasForTopic: (topic: string) => void;
}

const DOMAIN_DESCRIPTIONS: Record<SubjectDomain, { subtitle: string; syllabusNote: string }> = {
  ece_core: {
    subtitle: 'Official GATE ECE Core Technical Syllabus Subjects',
    syllabusNote:
      'Covers Network Theory, Signals & Systems, Electronic Devices (EDC), Analog Circuits, Digital Circuits & Logic, Control Systems, Communications, Electromagnetics (EMT), and Computer Organization.',
  },
  eng_math: {
    subtitle: 'High-Weightage Engineering Mathematics (~13–15% of GATE Marks)',
    syllabusNote:
      'Covers Linear Algebra, Calculus, Differential Equations, Probability & Statistics, Discrete Mathematics, and Graph Theory.',
  },
  cs_placement: {
    subtitle: 'Core Software, Embedded & IT Placement Technical Preparation',
    syllabusNote:
      'Distinctly classified CS/IT placement modules: C Programming, Data Structures, Heaps, Graphs, Algorithms, Sorting, Searching, Dynamic Programming, Operating Systems, DBMS, and Computer Networks.',
  },
  quant_aptitude: {
    subtitle: 'GATE General Aptitude (Numerical) & Placement Quantitative Aptitude',
    syllabusNote:
      'Covers Time & Work, Speed-Time-Distance, Percentages, Profit & Loss, Ratio & Proportion, Simple/Compound Interest, Permutations, Mensuration, and Number Systems.',
  },
  reasoning_verbal: {
    subtitle: 'Analytical Reasoning, Spatial Aptitude & Verbal Ability',
    syllabusNote:
      'Covers Syllogisms, Blood Relations, Seating Arrangements, Coding-Decoding, Direction Sense, Critical Reasoning, Vocabulary, Grammar, and Sentence Correction.',
  },
};

export const LearningCentreView: React.FC<LearningCentreViewProps> = ({
  analytics,
  onStartTopicPractice,
  onOpenFormulasForTopic,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<SubjectDomain>('ece_core');

  const domains: SubjectDomain[] = [
    'ece_core',
    'eng_math',
    'cs_placement',
    'quant_aptitude',
    'reasoning_verbal',
  ];

  const topicsInDomain: TopicStat[] = analytics.topicStats
    .filter((t) => t.domain === selectedDomain)
    .sort((a, b) => a.topic.localeCompare(b.topic));

  const domSummary = analytics.byDomain[selectedDomain];
  const domMeta = DOMAIN_DESCRIPTIONS[selectedDomain];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="max-w-3xl space-y-2">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Structured Curriculum Taxonomy</span>
            <span className="mx-2">·</span>
            <span>Strict Domain Separation: ECE Core vs Engineering Math vs CS/IT Placement vs Aptitude</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            GATE ECE &amp; Engineering Placement Learning Centre
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Every topic in the 10,000-question bank is mapped to its accurate academic discipline so ECE core preparation and software placement modules remain cleanly organized without cross-labeling.
          </p>
        </div>

        {/* 5 Domain Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          {domains.map((dom) => {
            const dStat = analytics.byDomain[dom];
            const active = selectedDomain === dom;
            return (
              <button
                key={dom}
                type="button"
                onClick={() => setSelectedDomain(dom)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {DOMAIN_LABELS[dom]}
                </div>
                <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {dStat.total.toLocaleString()} Q
                  </span>
                  <span className="text-xs text-slate-500">
                    {dStat.completion}% done
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500"
                    style={{ width: `${Math.min(100, dStat.completion)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Domain Overview Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {domMeta.subtitle}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {DOMAIN_LABELS[selectedDomain]} ({topicsInDomain.length} Modules · {domSummary.total.toLocaleString()} Questions)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              {domMeta.syllabusNote}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums text-xs">
            <div>
              <span className="text-slate-500 block">Attempted</span>
              <b className="text-sm text-slate-900 dark:text-slate-100">
                {domSummary.attempted} / {domSummary.total}
              </b>
            </div>
            <div>
              <span className="text-slate-500 block">Accuracy</span>
              <b className="text-sm text-emerald-600 dark:text-emerald-400">
                {domSummary.accuracy}%
              </b>
            </div>
          </div>
        </div>
      </section>

      {/* Subject / Topic Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topicsInDomain.map((t) => (
          <div
            key={t.topic}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>{t.total} Questions</span>
                <span>
                  {t.attempted > 0 ? `${t.accuracy}% Accuracy` : 'Not Started'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                {t.topic}
              </h3>

              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span>Progress: {t.attempted}/{t.total}</span>
                  <span>
                    ✓ {t.correct} · ✗ {t.wrong}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, t.completionPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onOpenFormulasForTopic(t.topic)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5" />
                Formulas
              </button>

              <button
                type="button"
                onClick={() => onStartTopicPractice(t.topic, t.domain)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Practice Topic <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
