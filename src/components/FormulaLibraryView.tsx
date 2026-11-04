import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Eye,
  Play,
  RotateCw,
  Search,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { EnrichedQuestion, SubjectDomain } from '../types/gate';
import { FormulaCardItem } from '../lib/formulaLibrary';
import { DOMAIN_SHORT_LABELS } from '../lib/engine';

interface FormulaLibraryViewProps {
  formulas: FormulaCardItem[];
  savedFormulaIds: string[];
  initialTopicFilter?: string;
  onToggleSaveFormula: (formulaId: string) => void;
  onPracticeTopic: (topic: string) => void;
  onJumpToQuestion: (questionId: string) => void;
}

export const FormulaLibraryView: React.FC<FormulaLibraryViewProps> = ({
  formulas,
  savedFormulaIds,
  initialTopicFilter = 'all',
  onToggleSaveFormula,
  onPracticeTopic,
  onJumpToQuestion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<'all' | SubjectDomain>('all');
  const [topicFilter, setTopicFilter] = useState<string>(initialTopicFilter);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified_core' | 'saved'>('all');
  const [flashcardMode, setFlashcardMode] = useState<boolean>(false);
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [flashcardRevealed, setFlashcardRevealed] = useState<boolean>(false);

  const savedSet = useMemo(() => new Set(savedFormulaIds), [savedFormulaIds]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    for (const f of formulas) {
      if (domainFilter === 'all' || f.domain === domainFilter) {
        set.add(f.topic);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [formulas, domainFilter]);

  const filteredFormulas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return formulas.filter((f) => {
      if (domainFilter !== 'all' && f.domain !== domainFilter) return false;
      if (topicFilter !== 'all' && f.topic !== topicFilter) return false;
      if (verificationFilter === 'verified_core' && f.verificationStatus !== 'verified_core')
        return false;
      if (verificationFilter === 'saved' && !savedSet.has(f.id)) return false;
      if (q) {
        const hay = `${f.title} ${f.topic} ${f.formula} ${f.definition} ${f.applicationHint}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [formulas, domainFilter, topicFilter, verificationFilter, searchQuery, savedSet]);

  const currentFlashcard = filteredFormulas[flashcardIndex] || filteredFormulas[0];

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Formula &amp; Quick-Revision Reference Library
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Subject-wise verified engineering formulas, key definitions, and question-bank takeaways with explicit verification status indicators.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFlashcardMode((prev) => !prev);
                setFlashcardIndex(0);
                setFlashcardRevealed(false);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                flashcardMode
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              {flashcardMode ? 'Exit Flashcard Mode' : 'Quick Revision Flashcards'}
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFlashcardIndex(0);
              }}
              placeholder="Search formula, theorem, or symbol..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <select
            aria-label="Filter formulas by domain"
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value as 'all' | SubjectDomain);
              setTopicFilter('all');
              setFlashcardIndex(0);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="all">All Engineering Domains</option>
            <option value="ece_core">GATE ECE Core Subjects</option>
            <option value="eng_math">Engineering Mathematics</option>
            <option value="cs_placement">CS / IT &amp; Coding</option>
            <option value="quant_aptitude">Quantitative Aptitude</option>
            <option value="reasoning_verbal">Logical &amp; Verbal</option>
          </select>

          <select
            aria-label="Filter formulas by topic"
            value={topicFilter}
            onChange={(e) => {
              setTopicFilter(e.target.value);
              setFlashcardIndex(0);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="all">All Topics ({availableTopics.length})</option>
            {availableTopics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter formulas by verification status or saved"
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value as any);
              setFlashcardIndex(0);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="all">All Formulas ({formulas.length})</option>
            <option value="verified_core">Verified Core Reference Only</option>
            <option value="saved">Saved / Bookmarked Formulas ({savedFormulaIds.length})</option>
          </select>
        </div>
      </section>

      {/* Interactive Flashcard Deck Mode */}
      {flashcardMode && currentFlashcard ? (
        <section className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
            <span>
              Card {flashcardIndex + 1} of {filteredFormulas.length} · {currentFlashcard.topic}
            </span>
            <span>
              {currentFlashcard.verificationStatus === 'verified_core'
                ? '✓ Verified Core Formula'
                : 'Question Bank Takeaway'}
            </span>
          </div>

          <div className="py-6 text-center space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              {currentFlashcard.title}
            </h2>

            {!flashcardRevealed ? (
              <div className="py-8">
                <button
                  type="button"
                  onClick={() => setFlashcardRevealed(true)}
                  className="px-5 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                >
                  Reveal Formula &amp; Application Note
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-left p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {currentFlashcard.formula}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <b>Definition &amp; Context:</b> {currentFlashcard.definition}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <b>Exam Application Hint:</b> {currentFlashcard.applicationHint}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setFlashcardRevealed(false);
                setFlashcardIndex((i) => (i > 0 ? i - 1 : filteredFormulas.length - 1));
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
            >
              ← Previous Card
            </button>
            <button
              type="button"
              onClick={() => onToggleSaveFormula(currentFlashcard.id)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              {savedSet.has(currentFlashcard.id) ? '★ Saved' : '☆ Save Formula'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFlashcardRevealed(false);
                setFlashcardIndex((i) => (i < filteredFormulas.length - 1 ? i + 1 : 0));
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white cursor-pointer"
            >
              Next Card →
            </button>
          </div>
        </section>
      ) : (
        /* Formula Cards Grid */
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFormulas.slice(0, 60).map((f) => {
            const isSaved = savedSet.has(f.id);
            return (
              <div
                key={f.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {DOMAIN_SHORT_LABELS[f.domain]} · <b className="text-slate-800 dark:text-slate-200">{f.topic}</b>
                    </span>
                    <div className="flex items-center gap-2">
                      {f.verificationStatus === 'verified_core' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified Core
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
                          title="Extracted from original question bank takeaway; verify against standard reference textbook for edge cases."
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Bank Takeaway
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleSaveFormula(f.id)}
                        className={`px-2 py-1 rounded border text-[11px] font-medium cursor-pointer ${
                          isSaved
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-800 dark:text-amber-300'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isSaved ? '★ Saved' : 'Save'}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {f.title}
                  </h3>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 font-mono text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 overflow-x-auto">
                    {f.formula}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {f.definition}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {f.applicationHint}
                  </span>
                  <div className="flex items-center gap-2">
                    {f.relatedQuestionIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onJumpToQuestion(f.relatedQuestionIds[0])}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                      >
                        Sample Q ({f.relatedQuestionIds[0]})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onPracticeTopic(f.topic)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Practice {f.topic} →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};
