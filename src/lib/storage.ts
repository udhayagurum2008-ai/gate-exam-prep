import {
  AnswerRecord,
  CustomRevisionList,
  ExamSessionResult,
  QuestionNote,
  QuestionReport,
  StudyPlanConfig,
} from '../types/gate';

export const LEGACY_STORAGE_KEY = 'gatePrepProgress_v10000';
export const PLATFORM_STORAGE_KEY = 'gateEcePlatform_v2';

export interface PlatformStorageData {
  version: number;
  answers: Record<string, AnswerRecord>;
  bookmarks: string[];
  savedFormulas: string[];
  notes: Record<string, QuestionNote>;
  reports: QuestionReport[];
  customLists: CustomRevisionList[];
  examHistory: ExamSessionResult[];
  studyPlan: StudyPlanConfig;
  totalPracticeTimeSec: number;
  dailyActivity: Record<string, { questionsAnswered: number; correct: number; studySeconds: number }>;
  streakDays: number;
  lastActiveDate: string;
  theme: 'light' | 'dark';
}

export function getTodayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDefaultStudyPlan(): StudyPlanConfig {
  const future = new Date();
  future.setDate(future.getDate() + 90);
  const yyyy = future.getFullYear();
  const mm = String(future.getMonth() + 1).padStart(2, '0');
  const dd = String(future.getDate()).padStart(2, '0');

  return {
    targetExam: 'GATE + PSU + Placements',
    targetDate: `${yyyy}-${mm}-${dd}`,
    dailyQuestionGoal: 30,
    dailyStudyMinutesGoal: 90,
    weeklyRevisionTarget: 50,
    completedRevisionSessions: 0,
    tasks: [
      {
        id: 'task_default_1',
        title: 'Network Theory — Transient & Phasor Analysis Drill',
        domain: 'ece_core',
        topic: 'Network Theory',
        targetQuestions: 20,
        completed: false,
        dueDate: getTodayISO(),
      },
      {
        id: 'task_default_2',
        title: 'Signals & Systems — Fourier & Sampling Practice',
        domain: 'ece_core',
        topic: 'Signals & Systems',
        targetQuestions: 20,
        completed: false,
        dueDate: getTodayISO(),
      },
      {
        id: 'task_default_3',
        title: 'Engineering Mathematics — Eigenvalues & Linear Algebra',
        domain: 'eng_math',
        topic: 'Linear Algebra',
        targetQuestions: 15,
        completed: false,
        dueDate: getTodayISO(),
      },
      {
        id: 'task_default_4',
        title: 'Core Placement — C Pointers & Data Structures',
        domain: 'cs_placement',
        topic: 'C Programming',
        targetQuestions: 15,
        completed: false,
        dueDate: getTodayISO(),
      },
    ],
  };
}

export function getDefaultStorageData(): PlatformStorageData {
  return {
    version: 2,
    answers: {},
    bookmarks: [],
    savedFormulas: ['f_ece_nt_1', 'f_ece_ss_1', 'f_math_la_1'],
    notes: {},
    reports: [],
    customLists: [
      {
        id: 'list_high_yield_ece',
        name: 'High-Yield GATE ECE Must-Revise',
        description: 'Key conceptual and numerical questions across Network Theory, Signals, and Digital Circuits.',
        questionIds: [],
        createdAt: Date.now(),
      },
    ],
    examHistory: [],
    studyPlan: getDefaultStudyPlan(),
    totalPracticeTimeSec: 0,
    dailyActivity: {},
    streakDays: 0,
    lastActiveDate: '',
    theme: 'light',
  };
}

export function computeStreak(dailyActivity: PlatformStorageData['dailyActivity']): number {
  const dates = Object.keys(dailyActivity)
    .filter((d) => (dailyActivity[d]?.questionsAnswered ?? 0) > 0)
    .sort()
    .reverse();

  if (dates.length === 0) return 0;

  const today = getTodayISO();
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = `${yesterdayObj.getFullYear()}-${String(yesterdayObj.getMonth() + 1).padStart(2, '0')}-${String(
    yesterdayObj.getDate()
  ).padStart(2, '0')}`;

  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  let curr = new Date(dates[0] + 'T00:00:00');
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(curr);
    prev.setDate(prev.getDate() - 1);
    const prevIso = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
      prev.getDate()
    ).padStart(2, '0')}`;
    if (dates[i] === prevIso) {
      streak++;
      curr = prev;
    } else {
      break;
    }
  }
  return streak;
}

export function loadPlatformStorage(): PlatformStorageData {
  const defaults = getDefaultStorageData();
  try {
    let legacyAnswers: Record<string, AnswerRecord> = {};
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const parsedLegacy = JSON.parse(rawLegacy);
      if (parsedLegacy && typeof parsedLegacy.answers === 'object' && parsedLegacy.answers !== null) {
        legacyAnswers = parsedLegacy.answers;
      }
    }

    const rawPlatform = localStorage.getItem(PLATFORM_STORAGE_KEY);
    if (!rawPlatform) {
      const merged = {
        ...defaults,
        answers: legacyAnswers,
      };
      return merged;
    }

    const parsed = JSON.parse(rawPlatform);
    if (!parsed || typeof parsed !== 'object') {
      return { ...defaults, answers: legacyAnswers };
    }

    const combinedAnswers: Record<string, AnswerRecord> = {
      ...legacyAnswers,
      ...(parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {}),
    };

    const dailyActivity =
      parsed.dailyActivity && typeof parsed.dailyActivity === 'object' ? parsed.dailyActivity : {};

    return {
      version: 2,
      answers: combinedAnswers,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : defaults.bookmarks,
      savedFormulas: Array.isArray(parsed.savedFormulas) ? parsed.savedFormulas : defaults.savedFormulas,
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      customLists: Array.isArray(parsed.customLists) && parsed.customLists.length > 0 ? parsed.customLists : defaults.customLists,
      examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : [],
      studyPlan:
        parsed.studyPlan && typeof parsed.studyPlan === 'object'
          ? { ...defaults.studyPlan, ...parsed.studyPlan }
          : defaults.studyPlan,
      totalPracticeTimeSec:
        typeof parsed.totalPracticeTimeSec === 'number' && parsed.totalPracticeTimeSec >= 0
          ? parsed.totalPracticeTimeSec
          : 0,
      dailyActivity,
      streakDays: computeStreak(dailyActivity),
      lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : '',
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return defaults;
  }
}

export function savePlatformStorage(data: PlatformStorageData): void {
  try {
    const updated: PlatformStorageData = {
      ...data,
      streakDays: computeStreak(data.dailyActivity),
    };
    localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(updated));
    // Also keep the original gatePrepProgress_v10000 key in sync for 100% compatibility
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        answers: updated.answers,
      })
    );
  } catch {
    // Ignore quota errors gracefully
  }
}

export function validateAndImportBackup(jsonString: string): {
  ok: boolean;
  data?: PlatformStorageData;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Backup file must contain a valid JSON object.' };
    }
    if (!parsed.answers || typeof parsed.answers !== 'object') {
      return { ok: false, error: 'Backup JSON is missing the "answers" object.' };
    }
    const defaults = getDefaultStorageData();
    const dailyActivity =
      parsed.dailyActivity && typeof parsed.dailyActivity === 'object' ? parsed.dailyActivity : {};

    const restored: PlatformStorageData = {
      version: 2,
      answers: parsed.answers,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      savedFormulas: Array.isArray(parsed.savedFormulas) ? parsed.savedFormulas : defaults.savedFormulas,
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      customLists: Array.isArray(parsed.customLists) ? parsed.customLists : defaults.customLists,
      examHistory: Array.isArray(parsed.examHistory) ? parsed.examHistory : [],
      studyPlan:
        parsed.studyPlan && typeof parsed.studyPlan === 'object'
          ? { ...defaults.studyPlan, ...parsed.studyPlan }
          : defaults.studyPlan,
      totalPracticeTimeSec: typeof parsed.totalPracticeTimeSec === 'number' ? parsed.totalPracticeTimeSec : 0,
      dailyActivity,
      streakDays: computeStreak(dailyActivity),
      lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : getTodayISO(),
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
    return { ok: true, data: restored };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON format.' };
  }
}
