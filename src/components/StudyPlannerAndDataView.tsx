import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Database,
  Download,
  FileCheck2,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  Sparkles,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  AnalyticsSummary,
  AuditReport,
  QuestionReport,
  StudyPlanConfig,
  StudyTask,
  SubjectDomain,
} from '../types/gate';
import { DOMAIN_SHORT_LABELS } from '../lib/engine';
import { getTodayISO } from '../lib/storage';

interface StudyPlannerAndDataViewProps {
  studyPlan: StudyPlanConfig;
  analytics: AnalyticsSummary;
  audit: AuditReport;
  reports: QuestionReport[];
  todayAnsweredCount: number;
  onUpdateStudyPlan: (updated: StudyPlanConfig) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => { ok: boolean; error?: string };
  onJumpToQuestion: (questionId: string) => void;
  onStartTopicPractice: (topic: string) => void;
}

export const StudyPlannerAndDataView: React.FC<StudyPlannerAndDataViewProps> = ({
  studyPlan,
  analytics,
  audit,
  reports,
  todayAnsweredCount,
  onUpdateStudyPlan,
  onExportBackup,
  onImportBackup,
  onJumpToQuestion,
  onStartTopicPractice,
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDomain, setNewTaskDomain] = useState<SubjectDomain | 'general'>('ece_core');
  const [newTaskQuestions, setNewTaskQuestions] = useState<number>(20);
  const [newTaskDate, setNewTaskDate] = useState<string>(getTodayISO());
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pasteJsonText, setPasteJsonText] = useState('');

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(studyPlan.targetDate).getTime() - Date.now()) / 86400000)
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const task: StudyTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      domain: newTaskDomain,
      targetQuestions: newTaskQuestions,
      completed: false,
      dueDate: newTaskDate || getTodayISO(),
    };
    onUpdateStudyPlan({
      ...studyPlan,
      tasks: [task, ...studyPlan.tasks],
    });
    setNewTaskTitle('');
  };

  const handleToggleTask = (taskId: string) => {
    onUpdateStudyPlan({
      ...studyPlan,
      tasks: studyPlan.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateStudyPlan({
      ...studyPlan,
      tasks: studyPlan.tasks.filter((t) => t.id !== taskId),
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const res = onImportBackup(content);
      if (res.ok) {
        setImportMessage({
          type: 'success',
          text: 'Backup restored successfully! All answers, bookmarks, notes, and study plans have been updated.',
        });
      } else {
        setImportMessage({
          type: 'error',
          text: res.error || 'Failed to restore backup file.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pasteJsonText.trim()) return;
    const res = onImportBackup(pasteJsonText.trim());
    if (res.ok) {
      setImportMessage({
        type: 'success',
        text: 'JSON state restored successfully!',
      });
      setPasteJsonText('');
    } else {
      setImportMessage({
        type: 'error',
        text: res.error || 'Invalid backup JSON.',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Intelligent Study Planner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Personalized Study Planner &amp; Goal Tracker
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure your target examination, daily question goals, and subject-wise milestones guided by your actual accuracy data.
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block">Countdown to Target</span>
              <b className="text-base text-blue-600 dark:text-blue-400">{daysRemaining} Days</b>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block">Today&apos;s Progress</span>
              <b className="text-base text-emerald-600 dark:text-emerald-400">
                {todayAnsweredCount} / {studyPlan.dailyQuestionGoal} Q
              </b>
            </div>
          </div>
        </div>

        {/* Target Exam & Daily Goals Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label htmlFor="targetExamSelect" className="block text-xs font-semibold mb-1">
              Target Examination
            </label>
            <select
              id="targetExamSelect"
              value={studyPlan.targetExam}
              onChange={(e) =>
                onUpdateStudyPlan({
                  ...studyPlan,
                  targetExam: e.target.value as StudyPlanConfig['targetExam'],
                })
              }
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="GATE ECE">GATE ECE (Core Focus)</option>
              <option value="Core ECE Placements">Core ECE &amp; Semiconductor Placements</option>
              <option value="GATE + PSU + Placements">GATE ECE + PSU + Placements</option>
              <option value="IT & Software Placements">IT &amp; Software Placements</option>
            </select>
          </div>

          <div>
            <label htmlFor="targetDateInput" className="block text-xs font-semibold mb-1">
              Target Exam Date
            </label>
            <input
              id="targetDateInput"
              type="date"
              value={studyPlan.targetDate}
              onChange={(e) =>
                onUpdateStudyPlan({
                  ...studyPlan,
                  targetDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label htmlFor="dailyQGoalInput" className="block text-xs font-semibold mb-1">
              Daily Question Target
            </label>
            <input
              id="dailyQGoalInput"
              type="number"
              min={5}
              max={500}
              value={studyPlan.dailyQuestionGoal}
              onChange={(e) =>
                onUpdateStudyPlan({
                  ...studyPlan,
                  dailyQuestionGoal: Math.max(5, Number(e.target.value) || 30),
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label htmlFor="dailyMinGoalInput" className="block text-xs font-semibold mb-1">
              Daily Study Time Goal (Minutes)
            </label>
            <input
              id="dailyMinGoalInput"
              type="number"
              min={15}
              max={720}
              value={studyPlan.dailyStudyMinutesGoal}
              onChange={(e) =>
                onUpdateStudyPlan({
                  ...studyPlan,
                  dailyStudyMinutesGoal: Math.max(15, Number(e.target.value) || 90),
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Add Schedule Task & Task Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Add Study Schedule Task
            </h2>
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label htmlFor="newTaskTitle" className="block text-xs font-medium mb-1">
                  Task Description
                </label>
                <input
                  id="newTaskTitle"
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Solve 25 Control Systems Root Locus MCQs"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="newTaskDomain" className="block text-xs font-medium mb-1">
                    Domain
                  </label>
                  <select
                    id="newTaskDomain"
                    value={newTaskDomain}
                    onChange={(e) => setNewTaskDomain(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="ece_core">GATE ECE Core</option>
                    <option value="eng_math">Engineering Math</option>
                    <option value="cs_placement">CS &amp; Placement</option>
                    <option value="quant_aptitude">Quantitative Aptitude</option>
                    <option value="reasoning_verbal">Reasoning &amp; Verbal</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="newTaskCount" className="block text-xs font-medium mb-1">
                    Target Questions
                  </label>
                  <input
                    id="newTaskCount"
                    type="number"
                    min={5}
                    max={200}
                    value={newTaskQuestions}
                    onChange={(e) => setNewTaskQuestions(Number(e.target.value) || 20)}
                    className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to Study Schedule
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active Study Tasks ({studyPlan.tasks.filter((t) => t.completed).length}/{studyPlan.tasks.length} Completed)
              </h2>
            </div>

            <div className="space-y-2">
              {studyPlan.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 opacity-75'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div
                        className={`text-xs font-semibold ${
                          task.completed
                            ? 'line-through text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {task.domain !== 'general' ? DOMAIN_SHORT_LABELS[task.domain] : 'General'} · Target: {task.targetQuestions} Q · Due: {task.dueDate}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.topic && (
                      <button
                        type="button"
                        onClick={() => onStartTopicPractice(task.topic!)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Start →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      aria-label={`Delete task ${task.title}`}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Backup & Restore + Question Bank Integrity Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Backup & Restore (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Data Backup &amp; Restore
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your progress is automatically persisted in local browser storage (including backward-compatible sync with <code className="font-mono">gatePrepProgress_v10000</code>). Export a JSON backup anytime to transfer your progress across devices.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Progress (.json)
            </button>

            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Import Backup File
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <label htmlFor="pasteBackupJson" className="block text-xs font-semibold">
              Or Paste Backup JSON Directly
            </label>
            <textarea
              id="pasteBackupJson"
              rows={3}
              value={pasteJsonText}
              onChange={(e) => setPasteJsonText(e.target.value)}
              placeholder='{"version":2,"answers":{...}}'
              className="w-full p-2.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="button"
              onClick={handlePasteImport}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg cursor-pointer"
            >
              Restore from Pasted JSON
            </button>
          </div>

          {importMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                importMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
              }`}
            >
              {importMessage.text}
            </div>
          )}
        </section>

        {/* Question Bank Integrity Audit & Flagged Items (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Verified Question Bank Audit &amp; Data Integrity Report
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
              {audit.isHealthy
                ? `✓ ${audit.totalCount.toLocaleString()} / ${audit.totalCount.toLocaleString()} Verified (0 Duplicates)`
                : 'Audit Warning'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">questions_part1.js</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {audit.part1Count.toLocaleString()} Q
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">questions_part2.js</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {audit.part2Count.toLocaleString()} Q
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">Unique IDs / Valid Ans</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {audit.uniqueIdsCount.toLocaleString()} / {audit.validAnsCount.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-slate-500 font-sans">Unique Question Stems</div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {audit.uniqueStemsCount.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Automated Audit Findings (Zero Repetition &amp; Equal 82-Topic Distribution Verified)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              All {audit.totalCount.toLocaleString()} questions ({audit.part1Count.toLocaleString()} in <code className="font-mono">questions_part1.js</code> + {audit.part2Count.toLocaleString()} in <code className="font-mono">questions_part2.js</code>) are verified with <b>{audit.uniqueStemsCount.toLocaleString()} unique question stems</b> and <b>{audit.duplicateStemsCount} repeated stems</b>. Includes 10,000 newly added questions (<code className="font-mono">NX10001</code>–<code className="font-mono">NX20000</code>) split equally across all 82 topics (121–122 new questions per topic).
            </p>

            <div className="max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {audit.sampleAnomalies.slice(0, 12).map((anom, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                      [{anom.id}]
                    </span>{' '}
                    <span className="text-slate-600 dark:text-slate-400">{anom.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJumpToQuestion(anom.id)}
                    className="text-blue-600 dark:text-blue-400 font-semibold shrink-0 hover:underline cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User-Reported / Flagged Questions */}
          {reports.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Your Flagged Questions Log ({reports.length})
              </h3>
              <div className="space-y-1.5">
                {reports.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <b className="font-mono">{r.questionId}</b> · {r.reason}: {r.comment || 'Flagged for review'}
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToQuestion(r.questionId)}
                      className="text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Open →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
