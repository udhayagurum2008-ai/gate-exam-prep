import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  FolderPlus,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
  FileText,
  Repeat,
} from 'lucide-react';
import {
  AnswerRecord,
  CustomRevisionList,
  EnrichedQuestion,
  QuestionNote,
} from '../types/gate';
import { isQuestionDueForRevision } from '../lib/engine';

interface RevisionCentreViewProps {
  allQuestions: EnrichedQuestion[];
  questionsById: Map<string, EnrichedQuestion>;
  answers: Record<string, AnswerRecord>;
  bookmarks: string[];
  notes: Record<string, QuestionNote>;
  customLists: CustomRevisionList[];
  completedRevisionSessions: number;
  onJumpToQuestion: (questionId: string) => void;
  onLaunchRevisionFilter: (statusFilter: 'due_revision' | 'wrong' | 'bookmarked' | 'repeated_mistakes', listId?: string) => void;
  onCreateCustomList: (name: string, description: string) => void;
  onDeleteCustomList: (listId: string) => void;
  onIncrementRevisionSession: () => void;
}

export const RevisionCentreView: React.FC<RevisionCentreViewProps> = ({
  allQuestions,
  questionsById,
  answers,
  bookmarks,
  notes,
  customLists,
  completedRevisionSessions,
  onJumpToQuestion,
  onLaunchRevisionFilter,
  onCreateCustomList,
  onDeleteCustomList,
  onIncrementRevisionSession,
}) => {
  const [activeBucket, setActiveBucket] = useState<
    'spaced_due' | 'incorrect' | 'bookmarks' | 'repeated' | 'notes' | 'lists'
  >('spaced_due');
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  const now = Date.now();

  const dueQuestions = useMemo(
    () => allQuestions.filter((q) => isQuestionDueForRevision(answers[q.id], now)),
    [allQuestions, answers, now]
  );

  const incorrectQuestions = useMemo(
    () =>
      allQuestions.filter(
        (q) => answers[q.id] && answers[q.id].correct === false && answers[q.id].selected !== null
      ),
    [allQuestions, answers]
  );

  const repeatedMistakeQuestions = useMemo(
    () => allQuestions.filter((q) => (answers[q.id]?.wrongCount ?? 0) >= 2),
    [allQuestions, answers]
  );

  const bookmarkedQuestions = useMemo(
    () => bookmarks.map((id) => questionsById.get(id)).filter(Boolean) as EnrichedQuestion[],
    [bookmarks, questionsById]
  );

  const noteEntries = useMemo(
    () =>
      Object.values(notes)
        .filter((n) => n.text && n.text.trim().length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [notes]
  );

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    onCreateCustomList(newListName.trim(), newListDesc.trim());
    setNewListName('');
    setNewListDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Spaced Repetition Summary */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Spaced-Repetition &amp; Active Memory Centre
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Automatically schedules reviews based on your response accuracy (1d → 3d → 7d → 21d intervals) while prioritizing incorrect and bookmarked concepts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onIncrementRevisionSession();
                onLaunchRevisionFilter('due_revision');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Start Due Revision Session ({dueQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => onLaunchRevisionFilter('wrong')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Retry Incorrect ({incorrectQuestions.length})
            </button>
          </div>
        </div>

        {/* 6 Bucket Selector Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveBucket('spaced_due')}
            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              activeBucket === 'spaced_due'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-xs text-slate-500">Due for Review</div>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
              {dueQuestions.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket('incorrect')}
            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              activeBucket === 'incorrect'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-xs text-slate-500">Incorrect Bank</div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
              {incorrectQuestions.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket('repeated')}
            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              activeBucket === 'repeated'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-xs text-slate-500">Repeated Errors</div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {repeatedMistakeQuestions.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket('bookmarks')}
            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              activeBucket === 'bookmarks'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-xs text-slate-500">Bookmarked</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {bookmarkedQuestions.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket('notes')}
            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              activeBucket === 'notes'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-xs text-slate-500">Personal Notes</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {noteEntries.length}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveBucket('lists')}
            className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
              activeBucket === 'lists'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="text-xs text-slate-500">Custom Lists</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {customLists.length}
            </div>
          </button>
        </div>
      </section>

      {/* Active Bucket Content */}
      {activeBucket === 'lists' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Custom List Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Create Personal Revision List
            </h2>
            <form onSubmit={handleCreateListSubmit} className="space-y-3">
              <div>
                <label htmlFor="customListName" className="block text-xs font-semibold mb-1">
                  List Title
                </label>
                <input
                  id="customListName"
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Bode Plot & Nyquist Tricky Problems"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label htmlFor="customListDesc" className="block text-xs font-semibold mb-1">
                  Focus Goal / Notes
                </label>
                <textarea
                  id="customListDesc"
                  rows={2}
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  placeholder="Questions to revise 1 week before exam..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Revision List
              </button>
            </form>
          </div>

          {/* Existing Lists */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Your Custom Revision Lists ({customLists.length})
            </h2>
            <div className="space-y-3">
              {customLists.map((lst) => (
                <div
                  key={lst.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {lst.name}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {lst.description || 'Custom curated revision deck'}
                    </p>
                    <div className="text-xs font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                      {lst.questionIds.length} saved questions
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={lst.questionIds.length === 0}
                      onClick={() => onLaunchRevisionFilter('due_revision', lst.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Practice List
                    </button>
                    {lst.id !== 'list_high_yield_ece' && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomList(lst.id)}
                        aria-label={`Delete list ${lst.name}`}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeBucket === 'notes' ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Personal Question Notes ({noteEntries.length})
          </h2>
          {noteEntries.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
              You have not added any personal study notes yet. Click the "Note" button on any question card during practice to save your own insights and mnemonics.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {noteEntries.map((note) => {
                const q = questionsById.get(note.questionId);
                return (
                  <div
                    key={note.questionId}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>
                        {note.questionId} {q ? `· ${q.topic}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => onJumpToQuestion(note.questionId)}
                        className="text-blue-600 dark:text-blue-400 font-sans font-semibold hover:underline cursor-pointer"
                      >
                        Open Question →
                      </button>
                    </div>
                    {q && (
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                        {q.q}
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                      {note.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* Questions List for spaced_due, incorrect, repeated, bookmarks */
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {activeBucket === 'spaced_due' && `Due for Spaced Repetition Review (${dueQuestions.length})`}
              {activeBucket === 'incorrect' && `Automatically Collected Incorrect Responses (${incorrectQuestions.length})`}
              {activeBucket === 'repeated' && `Repeated Mistakes — Missed 2+ Times (${repeatedMistakeQuestions.length})`}
              {activeBucket === 'bookmarks' && `Bookmarked Questions (${bookmarkedQuestions.length})`}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              Completed Revision Sessions: {completedRevisionSessions}
            </span>
          </div>

          {(() => {
            const list =
              activeBucket === 'spaced_due'
                ? dueQuestions
                : activeBucket === 'incorrect'
                ? incorrectQuestions
                : activeBucket === 'repeated'
                ? repeatedMistakeQuestions
                : bookmarkedQuestions;

            if (list.length === 0) {
              return (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                  No questions currently in this revision bucket. Keep practicing to populate your personalized review deck!
                </p>
              );
            }

            return (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.slice(0, 50).map((q) => {
                  const ans = answers[q.id];
                  return (
                    <div
                      key={q.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {q.id} · {q.topic} · {q.diff} · {q.exam}
                          {ans?.wrongCount ? ` · Missed ${ans.wrongCount}×` : ''}
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                          {q.q}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                          Takeaway: {q.form}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onJumpToQuestion(q.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shrink-0 self-start sm:self-center cursor-pointer"
                      >
                        Revise Question →
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
};
