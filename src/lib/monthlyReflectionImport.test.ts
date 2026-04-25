import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyThinkingWeekRecord } from '../domain/thinkingReflection';
import { parseMonthlyReflectionImport } from './monthlyReflectionImport';
import { generateMonthlyReflectionPrompt } from './monthlyReflectionPrompt';

const sourceWeeks = [
  {
    ...createEmptyThinkingWeekRecord('2026-04-05', '2026-04-11'),
    reflection: {
      week_start: '2026-04-05',
      week_end: '2026-04-11',
      mode: 'weekly_reflection' as const,
      weekly_summary: '通知直後の最悪想定が強いが、確認で落ち着ける場面が増えた。',
      repeated_patterns: [{ pattern: '通知直後に最悪想定を置く', count: 3 }],
      notable_changes: ['確認を先に置く頻度が増えた'],
      question_answer_patterns: ['問いに答えると前提が見えやすい'],
      unanswered_question_patterns: [],
      growing_insights: ['初動の解釈が感情を決める'],
      source_days: [{ date: '2026-04-06' }],
      importedAt: '2026-04-11T12:00:00.000Z',
      rawJson: '{}',
    },
    userNote: null,
  },
];

test('generateMonthlyReflectionPrompt renders monthly source week data', () => {
  const prompt = generateMonthlyReflectionPrompt('2026-04', sourceWeeks);

  assert.match(prompt, /month_start: 2026-04-01/);
  assert.match(prompt, /month_end: 2026-04-30/);
  assert.match(prompt, /## week_start: 2026-04-05/);
  assert.match(prompt, /repeated_patterns:\n- 通知直後に最悪想定を置く \(3回\)/);
});

test('parseMonthlyReflectionImport accepts a valid monthly payload', () => {
  const reflection = parseMonthlyReflectionImport(
    `\`\`\`json
{
  "month_start": "2026-04-01",
  "month_end": "2026-04-30",
  "mode": "monthly_reflection",
  "monthly_summary": "4月は通知直後の最悪想定が繰り返し出た一方で、確認を先に置くことで落ち着きを取り戻す流れが徐々に増えた。週を追って、初動の解釈が感情を左右するという認識が強まり、問いに答えることで前提を言語化する習慣も進んだ。",
  "looping_patterns": ["通知直後に最悪想定を置く"],
  "evolving_insights": ["確認を先に置くと反応の強さが下がる"],
  "new_patterns": ["問いに答えて前提を記録する習慣"],
  "resolved_or_reduced_patterns": ["通知を見る前の回避行動が減った"],
  "monthly_focus_points": ["初動の解釈と事実確認の差"],
  "source_weeks": [
    {
      "week_start": "2026-04-05",
      "week_end": "2026-04-11"
    }
  ]
}
\`\`\``,
    '2026-04',
    sourceWeeks
  );

  assert.equal(reflection.mode, 'monthly_reflection');
  assert.equal(reflection.source_weeks[0]?.week_start, '2026-04-05');
});
