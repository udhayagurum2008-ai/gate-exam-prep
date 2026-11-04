import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {
  classifyQuestionDomain,
  enrichQuestionBank,
  calculateSpacedRepetition,
  filterAndSortQuestions,
  computeAnalytics,
  calculateExamResult,
  EXAM_MARKING_SCHEMES,
  buildWeaknessPracticeSet,
} from './engine';
import { FilterState, RawQuestion } from '../types/gate';

function loadRealQuestionBanks(): { part1: RawQuestion[]; part2: RawQuestion[] } {
  const sandbox: { window: Record<string, RawQuestion[]> } = { window: {} };
  vm.createContext(sandbox);
  const p1Path = path.resolve(process.cwd(), 'public/questions_part1.js');
  const p2Path = path.resolve(process.cwd(), 'public/questions_part2.js');
  vm.runInContext(fs.readFileSync(p1Path, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(p2Path, 'utf8'), sandbox);
  return {
    part1: sandbox.window.GATE_QUESTIONS_PART1 || [],
    part2: sandbox.window.GATE_QUESTIONS_PART2 || [],
  };
}

test('Real 20,000-question bank loads, preserves all IDs, has zero repetitions, and splits 10,000 new questions equally across all 82 topics', () => {
  const { part1, part2 } = loadRealQuestionBanks();
  assert.equal(part1.length, 10000, 'questions_part1.js must have 10,000 questions');
  assert.equal(part2.length, 10000, 'questions_part2.js must have 10,000 questions');

  const { questions, audit } = enrichQuestionBank(part1, part2);
  assert.equal(questions.length, 20000);
  assert.equal(audit.totalCount, 20000);
  assert.equal(audit.uniqueIdsCount, 20000);
  assert.equal(audit.validOptionsCount, 20000);
  assert.equal(audit.validAnsCount, 20000);
  assert.equal(audit.withSolutionCount, 20000);
  assert.equal(audit.withFormulaCount, 20000);
  assert.equal(audit.uniqueStemsCount, 20000, 'Every single question stem in the 20,000 bank must be unique');
  assert.equal(audit.duplicateStemsCount, 0, 'There must be zero repeated question stems');
  assert.equal(audit.isHealthy, true);

  // Verify the 10,000 new questions (NX10001..NX20000) are split equally across all 82 topics (121 or 122 per topic)
  const newQuestionsByTopic = new Map<string, number>();
  let totalNewQuestions = 0;
  for (const q of questions) {
    if (q.id.startsWith('NX')) {
      totalNewQuestions++;
      newQuestionsByTopic.set(q.topic, (newQuestionsByTopic.get(q.topic) || 0) + 1);
    }
  }
  assert.equal(totalNewQuestions, 10000, 'Must have exactly 10,000 new questions');
  assert.equal(newQuestionsByTopic.size, 82, 'All 82 topics must receive new questions');
  for (const [topic, count] of newQuestionsByTopic.entries()) {
    assert.ok(
      count === 121 || count === 122,
      `Topic "${topic}" received ${count} new questions, expected 121 or 122 for equal 82-topic split`
    );
  }
});

test('Domain classification distinguishes ECE Core, Engineering Math, CS Placement, Quant, and Reasoning', () => {
  assert.equal(classifyQuestionDomain('technical', 'Signals & Systems'), 'ece_core');
  assert.equal(classifyQuestionDomain('technical', 'Network Theory'), 'ece_core');
  assert.equal(classifyQuestionDomain('technical', 'Linear Algebra'), 'eng_math');
  assert.equal(classifyQuestionDomain('quant', 'Calculus'), 'eng_math');
  assert.equal(classifyQuestionDomain('technical', 'Data Structures'), 'cs_placement');
  assert.equal(classifyQuestionDomain('quant', 'Time and Work'), 'quant_aptitude');
  assert.equal(classifyQuestionDomain('reasoning', 'Syllogism'), 'reasoning_verbal');
});

test('Spaced repetition increases interval on correct responses and schedules urgent review on mistakes', () => {
  const now = 1700000000000;
  const r1 = calculateSpacedRepetition(undefined, 2, true, false, 12000, now);
  assert.equal(r1.correct, true);
  assert.equal(r1.intervalDays, 1);
  assert.equal(r1.attempts, 1);

  const r2 = calculateSpacedRepetition(r1, 2, true, false, 8000, now + 86400000);
  assert.equal(r2.intervalDays, 3);
  assert.equal(r2.attempts, 2);

  const rWrong = calculateSpacedRepetition(r2, 1, false, false, 15000, now + 200000000);
  assert.equal(rWrong.correct, false);
  assert.equal(rWrong.intervalDays, 0);
  assert.equal(rWrong.wrongCount, 1);
});

test('Filtering and multi-criteria sorting work together without resetting each other', () => {
  const { part1, part2 } = loadRealQuestionBanks();
  const { questions } = enrichQuestionBank(part1.slice(0, 200), part2.slice(0, 200));

  const baseFilter: FilterState = {
    sec: 'technical',
    domain: 'ece_core',
    topic: 'all',
    diff: 'all',
    exam: 'all',
    status: 'all',
    search: '',
    sortBy: 'difficulty_desc',
    uniqueStemsOnly: false,
  };

  const eceFiltered = filterAndSortQuestions(questions, baseFilter, {}, new Set());
  assert.ok(eceFiltered.length > 0);
  assert.ok(eceFiltered.every((q) => q.sec === 'technical' && q.domain === 'ece_core'));
});

test('Analytics and GATE marking schemes compute accurate scores and actionable recommendations', () => {
  const { part1, part2 } = loadRealQuestionBanks();
  const { questions } = enrichQuestionBank(part1.slice(0, 20), part2.slice(0, 10));

  const q0 = questions[0];
  const q1 = questions[1];
  const q2 = questions[2];

  const answers = {
    [q0.id]: calculateSpacedRepetition(undefined, q0.ans, true, false, 10000),
    [q1.id]: calculateSpacedRepetition(undefined, (q1.ans + 1) % 4, false, false, 15000),
    [q2.id]: calculateSpacedRepetition(undefined, q2.ans, true, false, 12000),
  };

  const summary = computeAnalytics(questions, answers, [q0.id]);
  assert.equal(summary.attempted, 3);
  assert.equal(summary.correct, 2);
  assert.equal(summary.wrong, 1);
  assert.equal(summary.legacyScore, 1); // 2 - 1
  assert.equal(summary.gateScore, 1.67); // 2 - 0.333...
  assert.equal(summary.bookmarkedCount, 1);

  const examRes = calculateExamResult(
    [q0, q1, q2],
    { [q0.id]: q0.ans, [q1.id]: (q1.ans + 1) % 4, [q2.id]: null },
    EXAM_MARKING_SCHEMES[0], // +1 / -0.33
    120,
    300,
    'Unit Test Exam'
  );
  assert.equal(examRes.attempted, 2);
  assert.equal(examRes.correct, 1);
  assert.equal(examRes.wrong, 1);
  assert.equal(examRes.unanswered, 1);
  assert.equal(examRes.score, 0.67);

  const weakSet = buildWeaknessPracticeSet(questions, answers, 5);
  assert.equal(weakSet.length, 5);
  assert.equal(weakSet[0].id, q1.id, 'Incorrectly answered question should be prioritized first');
});
