import assert from 'node:assert/strict';
import test from 'node:test';
import { DynamoDbJournalRepository } from './dynamoDbJournalRepository';

const createClientStub = () => {
  const dayItems = new Map<string, any>();
  const summaryItems = new Map<string, any>();

  const keyOf = (PK: string, SK: string) => `${PK}|${SK}`;

  return {
    seedDay(item: any) {
      dayItems.set(keyOf(item.PK, item.SK), item);
    },
    seedSummary(item: any) {
      summaryItems.set(keyOf(item.PK, item.SK), item);
    },
    async getItem<T>(key: Record<string, string>) {
      return (dayItems.get(keyOf(key.PK, key.SK)) ?? summaryItems.get(keyOf(key.PK, key.SK))) as T | undefined;
    },
    async putItem(item: any) {
      if (item.entityType === 'DAY') {
        dayItems.set(keyOf(item.PK, item.SK), item);
        return;
      }
      summaryItems.set(keyOf(item.PK, item.SK), item);
    },
    async deleteItem(key: Record<string, string>) {
      dayItems.delete(keyOf(key.PK, key.SK));
      summaryItems.delete(keyOf(key.PK, key.SK));
    },
    async queryByPartition<T>(pk: string) {
      return [...dayItems.values(), ...summaryItems.values()].filter((item) => item.PK === pk) as T[];
    },
    async queryByPrefix<T>(pk: string, prefix: string) {
      return [...dayItems.values(), ...summaryItems.values()].filter((item) => item.PK === pk && item.SK.startsWith(prefix)) as T[];
    },
    async queryBetween<T>(pk: string, startSk: string, endSk: string) {
      return [...dayItems.values()].filter((item) => item.PK === pk && item.SK >= startSk && item.SK <= endSk) as T[];
    },
    async batchGetItems<T>(keys: Record<string, string>[]) {
      return keys
        .map((key) => summaryItems.get(keyOf(key.PK, key.SK)))
        .filter(Boolean) as T[];
    },
  };
};

test('getMonth returns month days and overlapping weekly summaries', async () => {
  const client = createClientStub();
  const repository = new DynamoDbJournalRepository(client as never);

  client.seedDay({
    PK: 'USER#user-1',
    SK: 'DAY#2026-03-01',
    entityType: 'DAY',
    date: '2026-03-01',
    dailySummary: '',
    cards: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  });
  client.seedSummary({
    PK: 'USER#user-1',
    SK: 'WEEK#2026-03-01',
    entityType: 'WEEKLY_SUMMARY',
    weekKey: '2026-03-01',
    summary: 'week summary',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  });
  client.seedSummary({
    PK: 'USER#user-1',
    SK: 'MONTH#2026-03',
    entityType: 'MONTHLY_SUMMARY',
    monthKey: '2026-03',
    summary: 'month summary',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  });

  const month = await repository.getMonth('user-1', '2026-03');

  assert.deepEqual(month.days.map((day) => day.date), ['2026-03-01']);
  assert.deepEqual(month.weeklySummaries.map((summary) => summary.weekKey), ['2026-03-01']);
  assert.equal(month.summary?.summary, 'month summary');
});

test('createCard stores a new card in the day item', async () => {
  const client = createClientStub();
  const repository = new DynamoDbJournalRepository(client as never);

  const created = await repository.createCard('user-1', '2026-03-20', {
    fact: 'fact',
    thought: 'thought',
    emotion: 'emotion',
    bodySensation: 'body',
  });
  const day = await repository.getDay('user-1', '2026-03-20');

  assert.equal(day?.cards.length, 1);
  assert.equal(day?.cards[0]?.id, created.id);
});
