import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyThinkingDayRecord } from '../domain/thinkingReflection';
import { parseWeeklyReflectionImport } from './weeklyReflectionImport';
import { generateWeeklyReflectionPrompt } from './weeklyReflectionPrompt';

const sourceDays = [
  {
    ...createEmptyThinkingDayRecord('2026-04-06'),
    thinkingReflection: {
      date: '2026-04-06',
      mode: 'thinking' as const,
      cards: [],
      daily_patterns: ['悪い想定を先に置きやすい', '確認すると落ち着く'],
      insight_candidates: ['確認後の落差が大きい'],
      questions: ['通知直後に何を前提にしているか'],
      importedAt: '2026-04-06T21:00:00.000Z',
      rawJson: '{}',
    },
    questionResponses: [
      {
        id: 'qr-1',
        question: '通知直後に何を前提にしているか',
        response: '最悪ケースを先に置いている',
        createdAt: '2026-04-06T22:00:00.000Z',
        updatedAt: '2026-04-06T22:00:00.000Z',
      },
    ],
  },
];

test('generateWeeklyReflectionPrompt renders weekly source data', () => {
  const prompt = generateWeeklyReflectionPrompt('2026-04-06', sourceDays);

  assert.match(prompt, /week_start: 2026-04-06/);
  assert.match(prompt, /week_end: 2026-04-12/);
  assert.match(prompt, /## date: 2026-04-06/);
  assert.match(prompt, /answer_memos:\n- 最悪ケースを先に置いている/);
});

test('parseWeeklyReflectionImport accepts a valid weekly payload', () => {
  const reflection = parseWeeklyReflectionImport(
    `\`\`\`json
{
  "week_start": "2026-04-06",
  "week_end": "2026-04-12",
  "mode": "weekly_reflection",
  "weekly_summary": "今週は通知や着手時の初動で最悪ケースを先に置く傾向がありつつも、確認や小さな着手によって落ち着きを取り戻せる場面が見えた。問いに答えることで、自分が何を前提に不安を増幅しているかを少し言語化できている。来週は、反射的な想定と実際の事実の差をより丁寧に観察することが有効そうである。",
  "repeated_patterns": [{"pattern":"悪い想定を先に置きやすい","count":2}],
  "notable_changes": ["確認すると落ち着ける場面が増えた"],
  "question_answer_patterns": ["問いに答えると前提の置き方が見えやすい"],
  "unanswered_question_patterns": ["根本的な価値観に触れる問いは残りやすい"],
  "growing_insights": ["確認前の想定が強すぎると気づき始めた"],
  "source_days": [{"date":"2026-04-06"}]
}
\`\`\``,
    '2026-04-06',
    sourceDays
  );

  assert.equal(reflection.mode, 'weekly_reflection');
  assert.equal(reflection.source_days[0]?.date, '2026-04-06');
});
