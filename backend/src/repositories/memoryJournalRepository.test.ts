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
