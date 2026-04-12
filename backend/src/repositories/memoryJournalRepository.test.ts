import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryJournalRepository } from './memoryJournalRepository';

test('memory repository isolates snapshots per user', async () => {
  const repository = new MemoryJournalRepository();

  await repository.saveDailySummary('user-a', '2026-03-20', 'A summary');
  const dayForOtherUser = await repository.getDay('user-b', '2026-03-20');

  assert.equal(dayForOtherUser, null);
});

test('memory repository returns month-scoped data for getMonth', async () => {
  const repository = new MemoryJournalRepository();

  await repository.saveDailySummary('user-a', '2026-03-20', 'today');
  await repository.saveDailySummary('user-a', '2026-04-01', 'next month');
  await repository.saveWeekSummary('user-a', '2026-03-15', 'week summary');
  await repository.saveMonthSummary('user-a', '2026-03', 'month summary');

  const month = await repository.getMonth('user-a', '2026-03');

  assert.deepEqual(
    month.days.map((day) => day.date),
    ['2026-03-20']
  );
  assert.deepEqual(
    month.weeklySummaries.map((summary) => summary.weekKey),
    ['2026-03-15']
  );
  assert.equal(month.summary?.summary, 'month summary');
});

test('memory repository rejects empty cards', async () => {
  const repository = new MemoryJournalRepository();

  await assert.rejects(
    repository.createCard('user-a', '2026-03-20', {
      trigger: {
        type: 'external',
        content: '   ',
      },
      steps: [],
    }),
    /Card must include trigger content or at least one step/
  );
});

test('memory repository stores thinking memo cards and imported reflection separately from legacy days', async () => {
  const repository = new MemoryJournalRepository();

  await repository.createThinkingMemoCard('user-a', '2026-04-10', {
    trigger: 'Teamsの通知が来た',
    body: '急ぎ依頼かと思って身構えた。',
  });

  const dayAfterMemo = await repository.getThinkingDay('user-a', '2026-04-10');
  assert.equal(dayAfterMemo?.memoCards.length, 1);
  assert.equal(dayAfterMemo?.thinkingReflection, null);

  const savedDay = await repository.saveThinkingReflection('user-a', '2026-04-10', {
    date: '2026-04-10',
    mode: 'thinking',
    cards: [
      {
        card_id: dayAfterMemo!.memoCards[0].id,
        trigger: 'Teamsの通知が来た',
        thoughts: ['通知に身構えやすい'],
        emotions: ['不安'],
        body_reactions: [],
        actions: ['内容を確認した'],
      },
    ],
    daily_patterns: ['悪い想定を先に置きやすい', '確認すると落ち着く'],
    insight_candidates: ['通知直後の前提が強い', '確認後の落差が大きい'],
    questions: ['通知直後に何を前提にしているか'],
    importedAt: '2026-04-10T23:00:00.000Z',
    rawJson: '{}',
  });

  assert.equal(savedDay.thinkingReflection?.mode, 'thinking');
  assert.equal((await repository.getDay('user-a', '2026-04-10'))?.cards.length ?? 0, 0);
});

test('memory repository stores question responses separately from thinking memo cards', async () => {
  const repository = new MemoryJournalRepository();

  await repository.saveThinkingQuestionResponses('user-a', '2026-04-10', [
    {
      question: '通知直後に何を前提にしているか',
      response: 'まず最悪ケースを置いている',
    },
  ]);

  const day = await repository.getThinkingDay('user-a', '2026-04-10');
  assert.equal(day?.questionResponses.length, 1);
  assert.equal(day?.memoCards.length, 0);
  assert.equal(day?.questionResponses[0]?.response, 'まず最悪ケースを置いている');
});

test('memory repository stores weekly reflection and user note', async () => {
  const repository = new MemoryJournalRepository();

  await repository.saveWeeklyReflection('user-a', '2026-04-06', {
    week_start: '2026-04-06',
    week_end: '2026-04-12',
    mode: 'weekly_reflection',
    weekly_summary: '今週は反射的な想定と確認後の落ち着きの差を見直した週だった。問いへの回答を通して、自分が何を前提にしているのかを言語化し始めている。来週はその前提が現れる瞬間をより丁寧に観察したい。',
    repeated_patterns: [{ pattern: '悪い想定を先に置きやすい', count: 2 }],
    notable_changes: ['確認後に落ち着きを取り戻しやすくなった'],
    question_answer_patterns: ['問いに答えると前提が見えやすい'],
    unanswered_question_patterns: [],
    growing_insights: ['前提の置き方が感情に影響すると気づいた'],
    source_days: [{ date: '2026-04-06' }],
    importedAt: '2026-04-12T10:00:00.000Z',
    rawJson: '{}',
  });

  await repository.saveWeeklyUserNote('user-a', '2026-04-06', {
    week_start: '2026-04-06',
    week_end: '2026-04-12',
    note: '自分の反応を少し客観視できた週だった。',
    updated_at: '2026-04-12T11:00:00.000Z',
  });

  const week = await repository.getThinkingWeek('user-a', '2026-04-06');
  assert.equal(week.reflection?.mode, 'weekly_reflection');
  assert.equal(week.userNote?.note, '自分の反応を少し客観視できた週だった。');
});
