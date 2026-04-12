import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateThinkingWeek, createEmptyThinkingDayRecord } from './thinkingReflection';

test('aggregateThinkingWeek groups identical daily patterns and insights across the week', () => {
  const dayA = {
    ...createEmptyThinkingDayRecord('2026-04-06'),
    thinkingReflection: {
      date: '2026-04-06',
      mode: 'thinking' as const,
      cards: [],
      daily_patterns: ['悪い想定を先に置きやすい', '確認すると落ち着く'],
      insight_candidates: ['確認後の落差が大きい'],
      questions: [],
      importedAt: '2026-04-06T21:00:00.000Z',
      rawJson: '{}',
    },
  };

  const dayB = {
    ...createEmptyThinkingDayRecord('2026-04-07'),
    thinkingReflection: {
      date: '2026-04-07',
      mode: 'thinking' as const,
      cards: [],
      daily_patterns: ['悪い想定を先に置きやすい'],
      insight_candidates: ['確認後の落差が大きい', '小さく始めると動ける'],
      questions: [],
      importedAt: '2026-04-07T21:00:00.000Z',
      rawJson: '{}',
    },
  };

  const aggregate = aggregateThinkingWeek('2026-04-06', [dayA, dayB]);

  assert.equal(aggregate.patterns[0]?.text, '悪い想定を先に置きやすい');
  assert.equal(aggregate.patterns[0]?.count, 2);
  assert.equal(aggregate.insights[0]?.text, '確認後の落差が大きい');
  assert.equal(aggregate.insights[0]?.count, 2);
});
