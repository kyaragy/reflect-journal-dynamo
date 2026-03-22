import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDayRows, mapMonthlySummary, mapWeeklySummary, mapYearlySummary } from './mappers';

test('mapDayRows groups cards under a single day', () => {
  const rows = [
    {
      date: '2026-03-10',
      daily_summary: 'summary',
      day_created_at: '2026-03-10T00:00:00.000Z',
      day_updated_at: '2026-03-10T12:00:00.000Z',
      card_id: 'card-1',
      fact: 'fact-1',
      thought: 'thought-1',
      emotion: 'emotion-1',
      body_sensation: 'body-1',
      card_created_at: '2026-03-10T01:00:00.000Z',
      card_updated_at: '2026-03-10T01:00:00.000Z',
    },
    {
      date: '2026-03-10',
      daily_summary: 'summary',
      day_created_at: '2026-03-10T00:00:00.000Z',
      day_updated_at: '2026-03-10T12:00:00.000Z',
      card_id: 'card-2',
      fact: 'fact-2',
      thought: 'thought-2',
      emotion: 'emotion-2',
      body_sensation: 'body-2',
      card_created_at: '2026-03-10T02:00:00.000Z',
      card_updated_at: '2026-03-10T02:00:00.000Z',
    },
  ];

  const [day] = mapDayRows(rows);
  assert.equal(day.date, '2026-03-10');
  assert.equal(day.cards.length, 2);
  assert.equal(day.cards[1].id, 'card-2');
  assert.equal(day.cards[0].trigger.content, 'fact-1');
  assert.equal(day.cards[0].steps[0].type, 'thought');
  assert.equal(day.cards[1].steps[1].type, 'emotion');
});

test('summary mappers attach the correct keys', () => {
  const row = {
    summary: 'summary',
    created_at: '2026-03-10T00:00:00.000Z',
    updated_at: '2026-03-10T12:00:00.000Z',
  };

  assert.equal(mapWeeklySummary('2026-03-08', row)?.weekKey, '2026-03-08');
  assert.equal(mapMonthlySummary('2026-03', row)?.monthKey, '2026-03');
  assert.equal(mapYearlySummary('2026', row)?.yearKey, '2026');
});
