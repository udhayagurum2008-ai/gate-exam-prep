import {
  AnalyticsSummary,
  AnswerRecord,
  AuditAnomaly,
  AuditReport,
  CustomRevisionList,
  DifficultyType,
  EnrichedQuestion,
  ExamMarkingScheme,
  FilterState,
  RawQuestion,
  SubjectDomain,
  TopicStat,
} from '../types/gate';

export const DOMAIN_LABELS: Record<SubjectDomain, string> = {
  ece_core: 'GATE ECE Core Subjects',
  eng_math: 'Engineering Mathematics',
  cs_placement: 'CS / IT & Coding Placement',
  quant_aptitude: 'Quantitative Aptitude',
  reasoning_verbal: 'Logical Reasoning & Verbal',
};

export const DOMAIN_SHORT_LABELS: Record<SubjectDomain, string> = {
  ece_core: 'ECE Core',
  eng_math: 'Eng. Math',
  cs_placement: 'CS & Coding',
  quant_aptitude: 'Quant Aptitude',
  reasoning_verbal: 'Reasoning & Verbal',
};

export const ECE_CORE_TOPICS = new Set<string>([
  'Network Theory',
  'Signals & Systems',
  'Electronic Devices',
  'Analog Circuits',
  'Digital Circuits',
  'Digital Logic',
  'Control Systems',
  'Communications',
  'Electromagnetics',
  'Computer Architecture',
]);

export const ENG_MATH_TOPICS = new Set<string>([
  'Engineering Mathematics',
  'Linear Algebra',
  'Calculus',
  'Probability & Statistics',
  'Statistics',
  'Discrete Mathematics',
  'Graph Theory',
]);

export const CS_PLACEMENT_TOPICS = new Set<string>([
  'C Programming',
  'Data Structures',
  'Heaps',
  'Graphs',
  'Algorithms',
  'Sorting',
  'Searching',
  'Dynamic Programming',
  'Greedy Algorithms',
  'Operating Systems',
  'File Systems',
  'Computer Networks',
  'DBMS',
  'Compiler Design',
  'Theory of Computation',
]);

export const EXAM_MARKING_SCHEMES: ExamMarkingScheme[] = [
  {
    id: 'gate_standard',
    name: 'GATE Standard (+1 / −0.33)',
    correctMarks: 1,
    negativeMarks: 1 / 3,
    description: '+1 mark for correct MCQ response, −1/3 mark negative penalty for wrong response, 0 for unattempted.',
  },
  {
    id: 'gate_2mark',
    name: 'GATE 2-Mark Pattern (+2 / −0.67)',
    correctMarks: 2,
    negativeMarks: 2 / 3,
    description: '+2 marks for correct MCQ response, −2/3 mark penalty for wrong response, 0 for unattempted.',
  },
  {
    id: 'placement_noneg',
    name: 'Placement Standard (+1 / 0)',
    correctMarks: 1,
    negativeMarks: 0,
    description: '+1 mark for correct response, no negative marking for wrong response.',
  },
  {
    id: 'legacy_net',
    name: 'Original Bank Net Score (+1 / −1)',
    correctMarks: 1,
    negativeMarks: 1,
    description: 'Matches original index.html formula: Score = Correct − Wrong.',
  },
];

export function classifyQuestionDomain(sec: string, topic: string): SubjectDomain {
  if (ECE_CORE_TOPICS.has(topic)) {
    return 'ece_core';
  }
  if (ENG_MATH_TOPICS.has(topic)) {
    return 'eng_math';
  }
  if (CS_PLACEMENT_TOPICS.has(topic)) {
    return 'cs_placement';
  }
  if (sec === 'reasoning') {
    return 'reasoning_verbal';
  }
  if (sec === 'quant') {
    return 'quant_aptitude';
  }
  return 'cs_placement';
}

export function enrichQuestionBank(
  part1: RawQuestion[],
  part2: RawQuestion[]
): { questions: EnrichedQuestion[]; audit: AuditReport } {
  const stemToCanonicalId = new Map<string, string>();
  const sampleAnomalies: AuditAnomaly[] = [];
  const sectionCounts: Record<string, number> = {};
  const domainCounts: Record<SubjectDomain, number> = {
    ece_core: 0,
    eng_math: 0,
    cs_placement: 0,
    quant_aptitude: 0,
    reasoning_verbal: 0,
  };
  const difficultyCounts: Record<string, number> = {};
  const examCounts: Record<string, number> = {};
  const seenIds = new Set<string>();

  let duplicateStemsCount = 0;
  let validOptionsCount = 0;
  let validAnsCount = 0;
  let withSolutionCount = 0;
  let withFormulaCount = 0;

  const questions: EnrichedQuestion[] = [];

  const processItem = (raw: RawQuestion, sourceFile: 'questions_part1.js' | 'questions_part2.js') => {
    seenIds.add(raw.id);
    const domain = classifyQuestionDomain(raw.sec, raw.topic);
    const normStem = raw.q.trim().toLowerCase();

    let isDuplicateStem = false;
    let canonicalId = raw.id;
    if (stemToCanonicalId.has(normStem)) {
      isDuplicateStem = true;
      canonicalId = stemToCanonicalId.get(normStem)!;
      duplicateStemsCount++;
      if (sampleAnomalies.length < 25) {
        sampleAnomalies.push({
          id: raw.id,
          type: 'duplicate_stem',
          canonicalId,
          description: `Question stem matches earlier question ${canonicalId} in topic "${raw.topic}". Preserved per data integrity rules.`,
        });
      }
    } else {
      stemToCanonicalId.set(normStem, raw.id);
    }

    if (raw.sec === 'quant' && ENG_MATH_TOPICS.has(raw.topic)) {
      sampleAnomalies.push({
        id: raw.id,
        type: 'section_topic_mismatch',
        description: `Question ${raw.id} has section "${raw.sec}" with engineering math topic "${raw.topic}". Mapped to Engineering Mathematics domain while preserving raw sec="quant".`,
      });
    }

    if (Array.isArray(raw.opts) && raw.opts.length === 4) {
      validOptionsCount++;
    }
    if (typeof raw.ans === 'number' && raw.ans >= 0 && raw.ans < (raw.opts?.length || 0)) {
      validAnsCount++;
    }
    if (raw.sol && raw.sol.trim().length > 0) {
      withSolutionCount++;
    }
    if (raw.form && raw.form.trim().length > 0) {
      withFormulaCount++;
    }

    sectionCounts[raw.sec] = (sectionCounts[raw.sec] || 0) + 1;
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    difficultyCounts[raw.diff] = (difficultyCounts[raw.diff] || 0) + 1;
    examCounts[raw.exam] = (examCounts[raw.exam] || 0) + 1;

    const searchIndex = `${raw.id} ${raw.q} ${raw.topic} ${raw.exam} ${raw.sec} ${raw.sol} ${raw.form}`.toLowerCase();

    questions.push({
      ...raw,
      domain,
      searchIndex,
      isDuplicateStem,
      canonicalId,
      sourceFile,
    });
  };

  for (let i = 0; i < part1.length; i++) {
    processItem(part1[i], 'questions_part1.js');
  }
  for (let i = 0; i < part2.length; i++) {
    processItem(part2[i], 'questions_part2.js');
  }

  const totalCount = questions.length;
  const audit: AuditReport = {
    part1Count: part1.length,
    part2Count: part2.length,
    totalCount,
    uniqueIdsCount: seenIds.size,
    uniqueStemsCount: stemToCanonicalId.size,
    duplicateStemsCount,
    validOptionsCount,
    validAnsCount,
    withSolutionCount,
    withFormulaCount,
    sectionCounts,
    domainCounts,
    difficultyCounts,
    examCounts,
    sampleAnomalies,
    isHealthy:
      totalCount >= 20000 &&
      seenIds.size === totalCount &&
      validOptionsCount === totalCount &&
      validAnsCount === totalCount &&
      duplicateStemsCount === 0,
  };

  return { questions, audit };
}

export function calculateSpacedRepetition(
  prev: AnswerRecord | undefined,
  selected: number | null,
  isCorrect: boolean,
  revealed: boolean,
  timeSpentMs: number,
  now: number = Date.now()
): AnswerRecord {
  const prevAttempts = prev?.attempts ?? 0;
  const prevWrongCount = prev?.wrongCount ?? 0;
  const prevEase = prev?.easeFactor ?? 2.5;
  const prevInterval = prev?.intervalDays ?? 0;

  if (revealed && selected === null) {
    return {
      selected: null,
      correct: false,
      revealed: true,
      time: now,
      timeSpentMs: (prev?.timeSpentMs ?? 0) + timeSpentMs,
      attempts: prevAttempts + 1,
      wrongCount: prevWrongCount + 1,
      intervalDays: 0,
      easeFactor: Math.max(1.3, prevEase - 0.2),
      nextReviewAt: now + 6 * 3600 * 1000, // Review in 6 hours
    };
  }

  if (isCorrect) {
    let nextInterval = 1;
    if (prevInterval === 0) nextInterval = 1;
    else if (prevInterval === 1) nextInterval = 3;
    else if (prevInterval <= 3) nextInterval = 7;
    else nextInterval = Math.min(60, Math.round(prevInterval * prevEase));

    const nextEase = Math.min(3.0, prevEase + 0.1);
    return {
      selected,
      correct: true,
      revealed: false,
      time: now,
      timeSpentMs: (prev?.timeSpentMs ?? 0) + timeSpentMs,
      attempts: prevAttempts + 1,
      wrongCount: prevWrongCount,
      intervalDays: nextInterval,
      easeFactor: nextEase,
      nextReviewAt: now + nextInterval * 86400 * 1000,
    };
  } else {
    return {
      selected,
      correct: false,
      revealed: false,
      time: now,
      timeSpentMs: (prev?.timeSpentMs ?? 0) + timeSpentMs,
      attempts: prevAttempts + 1,
      wrongCount: prevWrongCount + 1,
      intervalDays: 0,
      easeFactor: Math.max(1.3, prevEase - 0.25),
      nextReviewAt: now + 4 * 3600 * 1000, // Urgent review in 4 hours (or immediate in Revision tab)
    };
  }
}

export function isQuestionDueForRevision(ans: AnswerRecord | undefined, now: number = Date.now()): boolean {
  if (!ans) return false;
  if (ans.correct === false) return true;
  if (ans.nextReviewAt && ans.nextReviewAt <= now) return true;
  return false;
}

export function getAvailableTopics(
  questions: EnrichedQuestion[],
  sec: FilterState['sec'],
  domain: FilterState['domain']
): { topic: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (sec !== 'all' && q.sec !== sec) continue;
    if (domain !== 'all' && q.domain !== domain) continue;
    counts.set(q.topic, (counts.get(q.topic) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

const DIFF_WEIGHT: Record<DifficultyType, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

export function filterAndSortQuestions(
  questions: EnrichedQuestion[],
  filters: FilterState,
  answers: Record<string, AnswerRecord>,
  bookmarks: Set<string>,
  customLists: CustomRevisionList[] = [],
  now: number = Date.now()
): EnrichedQuestion[] {
  const searchNorm = filters.search.trim().toLowerCase();
  const searchTerms = searchNorm ? searchNorm.split(/\s+/).filter(Boolean) : [];

  let listFilterSet: Set<string> | null = null;
  if (filters.revisionListId && filters.revisionListId !== 'all') {
    const foundList = customLists.find((l) => l.id === filters.revisionListId);
    if (foundList) {
      listFilterSet = new Set(foundList.questionIds);
    }
  }

  const result: EnrichedQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (filters.uniqueStemsOnly && q.isDuplicateStem) continue;
    if (filters.sec !== 'all' && q.sec !== filters.sec) continue;
    if (filters.domain !== 'all' && q.domain !== filters.domain) continue;
    if (filters.topic !== 'all' && q.topic !== filters.topic) continue;
    if (filters.diff !== 'all' && q.diff !== filters.diff) continue;
    if (filters.exam !== 'all' && q.exam !== filters.exam) continue;
    if (listFilterSet && !listFilterSet.has(q.id)) continue;

    const saved = answers[q.id];
    if (filters.status !== 'all') {
      if (filters.status === 'unanswered' && saved) continue;
      if (filters.status === 'answered' && !saved) continue;
      if (filters.status === 'correct' && (!saved || saved.correct !== true)) continue;
      if (
        filters.status === 'wrong' &&
        (!saved || saved.correct !== false || saved.selected === null)
      )
        continue;
      if (filters.status === 'revealed' && (!saved || !saved.revealed)) continue;
      if (filters.status === 'bookmarked' && !bookmarks.has(q.id)) continue;
      if (filters.status === 'due_revision' && !isQuestionDueForRevision(saved, now)) continue;
      if (filters.status === 'repeated_mistakes' && (!saved || (saved.wrongCount ?? 0) < 2))
        continue;
    }

    if (searchTerms.length > 0) {
      let matchedAll = true;
      for (let t = 0; t < searchTerms.length; t++) {
        if (!q.searchIndex.includes(searchTerms[t])) {
          matchedAll = false;
          break;
        }
      }
      if (!matchedAll) continue;
    }

    result.push(q);
  }

  if (filters.sortBy !== 'default') {
    result.sort((a, b) => {
      if (filters.sortBy === 'id_asc') {
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      }
      if (filters.sortBy === 'difficulty_asc') {
        return DIFF_WEIGHT[a.diff] - DIFF_WEIGHT[b.diff];
      }
      if (filters.sortBy === 'difficulty_desc') {
        return DIFF_WEIGHT[b.diff] - DIFF_WEIGHT[a.diff];
      }
      if (filters.sortBy === 'most_mistakes') {
        const wa = answers[a.id]?.wrongCount ?? 0;
        const wb = answers[b.id]?.wrongCount ?? 0;
        return wb - wa;
      }
      if (filters.sortBy === 'recently_attempted') {
        const ta = answers[a.id]?.time ?? 0;
        const tb = answers[b.id]?.time ?? 0;
        return tb - ta;
      }
      return 0;
    });
  }

  return result;
}

export function computeAnalytics(
  questions: EnrichedQuestion[],
  answers: Record<string, AnswerRecord>,
  bookmarks: string[],
  now: number = Date.now()
): AnalyticsSummary {
  const totalQuestions = questions.length;
  let attempted = 0;
  let correct = 0;
  let wrong = 0;
  let revealed = 0;
  let totalTimeMs = 0;
  let timedAnswersCount = 0;
  let repeatedMistakesCount = 0;
  let dueForRevisionCount = 0;

  const byDomain: AnalyticsSummary['byDomain'] = {
    ece_core: { label: DOMAIN_LABELS.ece_core, total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0, completion: 0 },
    eng_math: { label: DOMAIN_LABELS.eng_math, total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0, completion: 0 },
    cs_placement: { label: DOMAIN_LABELS.cs_placement, total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0, completion: 0 },
    quant_aptitude: { label: DOMAIN_LABELS.quant_aptitude, total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0, completion: 0 },
    reasoning_verbal: { label: DOMAIN_LABELS.reasoning_verbal, total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0, completion: 0 },
  };

  const byDifficulty: AnalyticsSummary['byDifficulty'] = {
    Easy: { total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0 },
    Medium: { total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0 },
    Hard: { total: 0, attempted: 0, correct: 0, wrong: 0, accuracy: 0 },
  };

  const topicMap = new Map<
    string,
    {
      topic: string;
      sec: EnrichedQuestion['sec'];
      domain: SubjectDomain;
      total: number;
      attempted: number;
      correct: number;
      wrong: number;
      revealed: number;
      totalTimeMs: number;
      timedCount: number;
      repeatedMistakes: number;
    }
  >();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const dom = byDomain[q.domain];
    dom.total++;

    const diffStat = byDifficulty[q.diff];
    if (diffStat) diffStat.total++;

    let tStat = topicMap.get(q.topic);
    if (!tStat) {
      tStat = {
        topic: q.topic,
        sec: q.sec,
        domain: q.domain,
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        revealed: 0,
        totalTimeMs: 0,
        timedCount: 0,
        repeatedMistakes: 0,
      };
      topicMap.set(q.topic, tStat);
    }
    tStat.total++;

    const a = answers[q.id];
    if (a) {
      if (isQuestionDueForRevision(a, now)) {
        dueForRevisionCount++;
      }
      if ((a.wrongCount ?? 0) >= 2) {
        repeatedMistakesCount++;
        tStat.repeatedMistakes++;
      }
      if (a.timeSpentMs && a.timeSpentMs > 0) {
        totalTimeMs += a.timeSpentMs;
        timedAnswersCount++;
        tStat.totalTimeMs += a.timeSpentMs;
        tStat.timedCount++;
      }

      if (a.correct === true) {
        correct++;
        attempted++;
        dom.correct++;
        dom.attempted++;
        if (diffStat) {
          diffStat.correct++;
          diffStat.attempted++;
        }
        tStat.correct++;
        tStat.attempted++;
      } else if (a.correct === false && a.selected !== null) {
        wrong++;
        attempted++;
        dom.wrong++;
        dom.attempted++;
        if (diffStat) {
          diffStat.wrong++;
          diffStat.attempted++;
        }
        tStat.wrong++;
        tStat.attempted++;
      } else if (a.revealed) {
        revealed++;
        tStat.revealed++;
      }
    }
  }

  for (const key of Object.keys(byDomain) as SubjectDomain[]) {
    const d = byDomain[key];
    d.accuracy = d.attempted > 0 ? Math.round((d.correct / d.attempted) * 1000) / 10 : 0;
    d.completion = d.total > 0 ? Math.round((d.attempted / d.total) * 1000) / 10 : 0;
  }

  for (const key of ['Easy', 'Medium', 'Hard'] as DifficultyType[]) {
    const df = byDifficulty[key];
    df.accuracy = df.attempted > 0 ? Math.round((df.correct / df.attempted) * 1000) / 10 : 0;
  }

  const topicStats: TopicStat[] = Array.from(topicMap.values()).map((t) => ({
    topic: t.topic,
    sec: t.sec,
    domain: t.domain,
    total: t.total,
    attempted: t.attempted,
    correct: t.correct,
    wrong: t.wrong,
    revealed: t.revealed,
    accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 1000) / 10 : 0,
    completionPercent: t.total > 0 ? Math.round((t.attempted / t.total) * 1000) / 10 : 0,
    avgTimeMs: t.timedCount > 0 ? Math.round(t.totalTimeMs / t.timedCount) : 0,
    repeatedMistakes: t.repeatedMistakes,
  }));

  const attemptedTopics = topicStats.filter((t) => t.attempted >= 1);
  const weakestTopics = [...attemptedTopics]
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong)
    .slice(0, 6);
  const strongestTopics = [...attemptedTopics]
    .filter((t) => t.accuracy >= 60)
    .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct)
    .slice(0, 6);

  const recentQuestionIds = Object.entries(answers)
    .sort((a, b) => (b[1].time || 0) - (a[1].time || 0))
    .slice(0, 12)
    .map(([id]) => id);

  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;
  const gateScore = Math.round((correct - wrong / 3) * 100) / 100;
  const legacyScore = correct - wrong;
  const avgTimeSec = timedAnswersCount > 0 ? Math.round(totalTimeMs / timedAnswersCount / 100) / 10 : 0;

  const recommendations: string[] = [];
  if (attempted === 0) {
    recommendations.push(
      'Start with a 15-question Topic Practice session in Network Theory, Signals & Systems, or Engineering Mathematics to establish your baseline accuracy.'
    );
  } else {
    if (weakestTopics.length > 0 && strongestTopics.length > 0 && weakestTopics[0].topic !== strongestTopics[0].topic) {
      recommendations.push(
        `You are performing well in ${strongestTopics[0].topic} (${strongestTopics[0].accuracy}% accuracy), but your accuracy in ${weakestTopics[0].topic} is ${weakestTopics[0].accuracy}%. Review ${weakestTopics[0].topic} formulas and attempt a Weakness Practice session.`
      );
    } else if (weakestTopics.length > 0 && weakestTopics[0].accuracy < 65) {
      recommendations.push(
        `Your accuracy in ${weakestTopics[0].topic} is ${weakestTopics[0].accuracy}% (${weakestTopics[0].wrong} incorrect). Open the Formula & Quick-Revision Centre for ${weakestTopics[0].topic} before re-attempting.`
      );
    }

    if (byDomain.ece_core.attempted === 0) {
      recommendations.push(
        'You have not attempted any GATE ECE Core subject questions yet. Explore Network Theory, Signals & Systems, or Digital Circuits in the Learning Centre.'
      );
    } else if (byDomain.eng_math.attempted === 0) {
      recommendations.push(
        'Engineering Mathematics carries ~13% weightage in GATE ECE. Add Linear Algebra and Calculus to your daily practice.'
      );
    }

    if (dueForRevisionCount > 0) {
      recommendations.push(
        `You have ${dueForRevisionCount} question${dueForRevisionCount > 1 ? 's' : ''} scheduled for spaced-repetition review. Clear your Revision Queue to lock concepts into long-term memory.`
      );
    }

    if (byDifficulty.Hard.attempted > 0 && byDifficulty.Hard.accuracy < 45) {
      recommendations.push(
        `Your accuracy on Hard-level questions is ${byDifficulty.Hard.accuracy}%. In GATE Exam Simulation, consider skipping uncertain Hard questions to avoid the −0.33 negative marking penalty.`
      );
    }
  }

  return {
    totalQuestions,
    attempted,
    remaining: totalQuestions - attempted,
    correct,
    wrong,
    revealed,
    accuracy,
    gateScore,
    legacyScore,
    avgTimeSec,
    repeatedMistakesCount,
    dueForRevisionCount,
    bookmarkedCount: bookmarks.length,
    byDomain,
    byDifficulty,
    topicStats,
    weakestTopics,
    strongestTopics,
    recentQuestionIds,
    recommendations,
  };
}

export function buildWeaknessPracticeSet(
  questions: EnrichedQuestion[],
  answers: Record<string, AnswerRecord>,
  limit: number = 30
): EnrichedQuestion[] {
  // Calculate topic accuracy
  const topicScores = new Map<string, { attempted: number; correct: number; wrong: number }>();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const a = answers[q.id];
    if (!a || a.selected === null) continue;
    const prev = topicScores.get(q.topic) || { attempted: 0, correct: 0, wrong: 0 };
    prev.attempted++;
    if (a.correct) prev.correct++;
    else prev.wrong++;
    topicScores.set(q.topic, prev);
  }

  // Score each question by weakness priority
  const scored = questions
    .filter((q) => !q.isDuplicateStem)
    .map((q) => {
      const a = answers[q.id];
      const tStat = topicScores.get(q.topic);
      let priority = 0;

      // 1. Previously answered wrong -> highest priority
      if (a && a.correct === false) {
        priority += 100 + (a.wrongCount ?? 1) * 25;
      }
      // 2. Unanswered in a weak topic -> high priority
      if (tStat && tStat.attempted > 0) {
        const acc = tStat.correct / tStat.attempted;
        priority += Math.round((1 - acc) * 60);
      }
      // 3. Prefer ECE core and Engineering Math when no history exists
      if (q.domain === 'ece_core') priority += 15;
      if (q.domain === 'eng_math') priority += 12;
      if (q.diff === 'Medium') priority += 5;
      if (q.diff === 'Hard') priority += 8;

      // Avoid already mastered questions
      if (a && a.correct === true) {
        priority -= 80;
      }

      return { q, priority };
    });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit).map((item) => item.q);
}

export function calculateExamResult(
  examQuestions: EnrichedQuestion[],
  examSelections: Record<string, number | null>,
  scheme: ExamMarkingScheme,
  durationSec: number,
  timeLimitSec: number,
  title: string
) {
  let attempted = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  const topicBreakdown: Record<string, { total: number; correct: number; wrong: number }> = {};

  for (let i = 0; i < examQuestions.length; i++) {
    const q = examQuestions[i];
    if (!topicBreakdown[q.topic]) {
      topicBreakdown[q.topic] = { total: 0, correct: 0, wrong: 0 };
    }
    topicBreakdown[q.topic].total++;

    const sel = examSelections[q.id];
    if (sel === undefined || sel === null) {
      unanswered++;
    } else {
      attempted++;
      if (sel === q.ans) {
        correct++;
        topicBreakdown[q.topic].correct++;
      } else {
        wrong++;
        topicBreakdown[q.topic].wrong++;
      }
    }
  }

  const rawScore = correct * scheme.correctMarks - wrong * scheme.negativeMarks;
  const score = Math.round(rawScore * 100) / 100;
  const maxScore = examQuestions.length * scheme.correctMarks;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 1000) / 10 : 0;

  return {
    id: `exam_${Date.now()}`,
    title,
    mode: scheme.name,
    createdAt: Date.now(),
    durationSec,
    timeLimitSec,
    totalQuestions: examQuestions.length,
    attempted,
    correct,
    wrong,
    unanswered,
    score,
    maxScore,
    accuracy,
    markingScheme: scheme,
    topicBreakdown,
    questionIds: examQuestions.map((q) => q.id),
  };
}
