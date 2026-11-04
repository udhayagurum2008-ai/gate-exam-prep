export type SectionType = 'technical' | 'quant' | 'reasoning';
export type DifficultyType = 'Easy' | 'Medium' | 'Hard';
export type ExamCategory = 'GATE' | 'Placement' | 'GATE + Placement';

export type SubjectDomain =
  | 'ece_core'
  | 'eng_math'
  | 'cs_placement'
  | 'quant_aptitude'
  | 'reasoning_verbal';

export interface RawQuestion {
  id: string;
  sec: SectionType;
  topic: string;
  diff: DifficultyType;
  q: string;
  opts: string[];
  ans: number;
  sol: string;
  form: string;
  exam: ExamCategory;
}

export interface EnrichedQuestion extends RawQuestion {
  domain: SubjectDomain;
  searchIndex: string;
  isDuplicateStem: boolean;
  canonicalId: string;
  sourceFile: 'questions_part1.js' | 'questions_part2.js';
}

export interface AnswerRecord {
  selected: number | null;
  correct: boolean;
  revealed?: boolean;
  time: number;
  timeSpentMs?: number;
  attempts?: number;
  wrongCount?: number;
  intervalDays?: number;
  easeFactor?: number;
  nextReviewAt?: number;
}

export interface QuestionNote {
  questionId: string;
  text: string;
  updatedAt: number;
}

export interface QuestionReport {
  questionId: string;
  reason: 'wrong_answer' | 'typo_in_question' | 'unclear_explanation' | 'duplicate_question' | 'other';
  comment: string;
  createdAt: number;
}

export interface CustomRevisionList {
  id: string;
  name: string;
  description: string;
  questionIds: string[];
  createdAt: number;
}

export interface ExamMarkingScheme {
  id: string;
  name: string;
  correctMarks: number;
  negativeMarks: number;
  description: string;
}

export interface ExamSessionResult {
  id: string;
  title: string;
  mode: string;
  createdAt: number;
  durationSec: number;
  timeLimitSec: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxScore: number;
  accuracy: number;
  markingScheme: ExamMarkingScheme;
  topicBreakdown: Record<string, { total: number; correct: number; wrong: number }>;
  questionIds: string[];
}

export interface StudyTask {
  id: string;
  title: string;
  domain: SubjectDomain | 'general';
  topic?: string;
  targetQuestions: number;
  completed: boolean;
  dueDate: string;
}

export interface StudyPlanConfig {
  targetExam: 'GATE ECE' | 'Core ECE Placements' | 'GATE + PSU + Placements' | 'IT & Software Placements';
  targetDate: string;
  dailyQuestionGoal: number;
  dailyStudyMinutesGoal: number;
  weeklyRevisionTarget: number;
  tasks: StudyTask[];
  completedRevisionSessions: number;
}

export type PracticeMode =
  | 'normal'
  | 'exam'
  | 'topic'
  | 'weakness'
  | 'revision'
  | 'random';

export type StatusFilter =
  | 'all'
  | 'unanswered'
  | 'answered'
  | 'correct'
  | 'wrong'
  | 'revealed'
  | 'bookmarked'
  | 'due_revision'
  | 'repeated_mistakes';

export type SortOption =
  | 'default'
  | 'id_asc'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'most_mistakes'
  | 'recently_attempted';

export interface FilterState {
  sec: 'all' | SectionType;
  domain: 'all' | SubjectDomain;
  topic: string;
  diff: 'all' | DifficultyType;
  exam: 'all' | ExamCategory;
  status: StatusFilter;
  search: string;
  sortBy: SortOption;
  uniqueStemsOnly: boolean;
  revisionListId?: string;
}

export interface AuditAnomaly {
  id: string;
  type: 'duplicate_stem' | 'section_topic_mismatch';
  description: string;
  canonicalId?: string;
}

export interface AuditReport {
  part1Count: number;
  part2Count: number;
  totalCount: number;
  uniqueIdsCount: number;
  uniqueStemsCount: number;
  duplicateStemsCount: number;
  validOptionsCount: number;
  validAnsCount: number;
  withSolutionCount: number;
  withFormulaCount: number;
  sectionCounts: Record<string, number>;
  domainCounts: Record<SubjectDomain, number>;
  difficultyCounts: Record<string, number>;
  examCounts: Record<string, number>;
  sampleAnomalies: AuditAnomaly[];
  isHealthy: boolean;
}

export interface TopicStat {
  topic: string;
  sec: SectionType;
  domain: SubjectDomain;
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  revealed: number;
  accuracy: number;
  completionPercent: number;
  avgTimeMs: number;
  repeatedMistakes: number;
}

export interface AnalyticsSummary {
  totalQuestions: number;
  attempted: number;
  remaining: number;
  correct: number;
  wrong: number;
  revealed: number;
  accuracy: number;
  gateScore: number;
  legacyScore: number;
  avgTimeSec: number;
  repeatedMistakesCount: number;
  dueForRevisionCount: number;
  bookmarkedCount: number;
  byDomain: Record<
    SubjectDomain,
    {
      label: string;
      total: number;
      attempted: number;
      correct: number;
      wrong: number;
      accuracy: number;
      completion: number;
    }
  >;
  byDifficulty: Record<
    DifficultyType,
    {
      total: number;
      attempted: number;
      correct: number;
      wrong: number;
      accuracy: number;
    }
  >;
  topicStats: TopicStat[];
  weakestTopics: TopicStat[];
  strongestTopics: TopicStat[];
  recentQuestionIds: string[];
  recommendations: string[];
}
